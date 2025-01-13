"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import rough from "roughjs";
import { Drawable } from "roughjs/bin/core";
import Toolbar from "./Toolbar";
import useHistory from "@/hooks/useHistory";
import { Button } from "./ui/button";

export enum Tools {
  line = "line",
  rectangle = "rectangle",
  ellipse = "ellipse",
  select = "select",
}

interface Point {
  x: number;
  y: number;
}

type Action = "none" | "drawing" | "moving" | "resizing";

export interface Element {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  roughElement: Drawable;
  elementType: Tools;
  position?: string | null;
}

interface SelectedElement {
  element: Element;
  offsetX: number;
  offsetY: number;
}

interface ElementCoordinates {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const generator = rough.generator();

function createElement(
  id: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  elementType: Tools
): Element | null {
  if (elementType === Tools.select) {
    return null;
  }
  if (elementType === Tools.line) {
    const roughElement = generator.line(x1, y1, x2, y2);
    return { id, x1, y1, x2, y2, roughElement, elementType };
  }
  if (elementType === Tools.rectangle) {
    const roughElement = generator.rectangle(x1, y1, x2 - x1, y2 - y1);
    return { id, x1, y1, x2, y2, roughElement, elementType };
  }
  if (elementType === Tools.ellipse) {
    // Ensure correct width and height calculation
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const roughElement = generator.ellipse(cx, cy, width, height);
    // Return with original coordinates for proper resizing
    return { id, x1, y1, x2, y2, roughElement, elementType };
  }
  return null;
}

const positionWithinElement = (
  x: number,
  y: number,
  element: Element
): string | null => {
  const { x1, y1, x2, y2, elementType } = element;
  if (elementType === Tools.rectangle) {
    const topLeft = nearPoint(x, y, x1, y1, "topLeft");
    const topRight = nearPoint(x, y, x2, y1, "topRight");
    const bottomLeft = nearPoint(x, y, x1, y2, "bottomLeft");
    const bottomRight = nearPoint(x, y, x2, y2, "bottomRight");
    const inside = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
    return topLeft || inside || topRight || bottomLeft || bottomRight;
  } else if (elementType === Tools.line) {
    const a: Point = { x: x1, y: y1 };
    const b: Point = { x: x2, y: y2 };
    const distanceFromLine =
      Math.abs((b.y - a.y) * x - (b.x - a.x) * y + b.x * a.y - b.y * a.x) /
      Math.sqrt((b.y - a.y) ** 2 + (b.x - a.x) ** 2);
    const withinLineBounds =
      Math.min(a.x, b.x) <= x &&
      x <= Math.max(a.x, b.x) &&
      Math.min(a.y, b.y) <= y &&
      y <= Math.max(a.y, b.y);
    const start = nearPoint(x, y, x1, y1, "start");
    const end = nearPoint(x, y, x2, y2, "end");
    const inside = distanceFromLine <= 10 && withinLineBounds ? "inside" : null;
    return start || end || inside;
  } else if (elementType === Tools.ellipse) {
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const a = Math.abs(x2 - x1) / 2;
    const b = Math.abs(y2 - y1) / 2;
    const normalizedX = (x - centerX) / a;
    const normalizedY = (y - centerY) / b;
    const inside = normalizedX ** 2 + normalizedY ** 2 <= 1 ? "inside" : null;
    const topLeft = nearPoint(x, y, x1, y1, "topLeft");
    const topRight = nearPoint(x, y, x2, y1, "topRight");
    const bottomLeft = nearPoint(x, y, x1, y2, "bottomLeft");
    const bottomRight = nearPoint(x, y, x2, y2, "bottomRight");
    return inside || topLeft || topRight || bottomLeft || bottomRight;
  }
  return null;
};

function nearPoint(
  x: number,
  y: number,
  x1: number,
  y1: number,
  pos: string
): string | null {
  return Math.abs(x - x1) < 5 && Math.abs(y - y1) < 5 ? pos : null;
}

function cursorForPosition(position: string | null): string {
  switch (position) {
    case "inside":
      return "move";
    case "start":
    case "end":
      return "nesw-resize";
    case "topLeft":
    case "bottomRight":
      return "nwse-resize";
    case "topRight":
    case "bottomLeft":
      return "nesw-resize";
    default:
      return "default";
  }
}

function getElementAtPosition(
  x: number,
  y: number,
  elements: Element[]
): Element | undefined {
  return elements
    .map((element) => ({
      ...element,
      position: positionWithinElement(x, y, element),
    }))
    .find((element) => element.position !== null);
}

const adjustElementCoordinates = (element: Element): ElementCoordinates => {
  const { x1, y1, x2, y2, elementType } = element;

  if (elementType === Tools.rectangle || elementType === Tools.ellipse) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
  } else if (elementType === Tools.line) {
    if (x1 < x2 || (x1 === x2 && y1 < y2)) {
      return { x1, y1, x2, y2 };
    } else {
      return { x1: x2, y1: y2, x2: x1, y2: y1 };
    }
  }

  return { x1, y1, x2, y2 };
};

const resizedCoordinates = (
  clientX: number,
  clientY: number,
  position: string,
  coordinates: { x1: number; y1: number; x2: number; y2: number }
) => {
  const { x1, y1, x2, y2 } = coordinates;
  switch (position) {
    case "start":
      return { x1: clientX, y1: clientY, x2: x2, y2: y2 };
    case "end":
      return { x1: x1, y1: y1, x2: clientX, y2: clientY };
    case "topLeft":
      return { x1: clientX, y1: clientY, x2: x2, y2: y2 };
    case "topRight":
      return { x1: x1, y1: clientY, x2: clientX, y2: y2 };
    case "bottomLeft":
      return { x1: clientX, y1: y1, x2: x2, y2: clientY };
    case "bottomRight":
      return { x1: x1, y1: y1, x2: clientX, y2: clientY };
    default:
      return { x1, y1, x2, y2 };
  }
};

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const {
    currentElements: elements,
    setState: setElements,
    undo,
    redo,
  } = useHistory([]);
  const [action, setAction] = useState<Action>("none");
  const [tool, setTool] = useState<Tools>(Tools.line);
  const [selectedElement, setSelectedElement] =
    useState<SelectedElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "z" && event.ctrlKey) {
        event.preventDefault();
        undo();
      } else if (event.key === "y" && event.ctrlKey) {
        event.preventDefault();
        redo();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo, redo]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const roughCanvas = rough.canvas(canvas);
    if (elements.length > 0) {
      elements.forEach(({ roughElement }) => roughCanvas.draw(roughElement));
    }
    //elements.forEach(({ roughElement }) => roughCanvas.draw(roughElement));
  }, [elements]);

  const updateElement = (
    index: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    elementType: Tools
  ) => {
    const element = createElement(index, x1, y1, x2, y2, elementType);
    if (!element) return;

    const elementsCopy = [...elements];
    elementsCopy[index] = element;
    setElements(elementsCopy, true);
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { clientX, clientY } = e;
    if (tool === Tools.select) {
      const element = getElementAtPosition(clientX, clientY, elements);
      if (element) {
        if (element.position === "inside") {
          const offsetX = clientX - element.x1;
          const offsetY = clientY - element.y1;
          setSelectedElement({ element, offsetX, offsetY });
          setAction("moving");
          setElements((prev) => prev);
        } else {
          setSelectedElement({ element, offsetX: 0, offsetY: 0 });
          setAction("resizing");
          setElements((prev) => prev);
        }
      }
    } else {
      setAction("drawing");
      const id = elements.length;
      const element = createElement(
        id,
        clientX,
        clientY,
        clientX,
        clientY,
        tool
      );
      if (element) {
        setElements([...elements, element]);
        setSelectedElement({ element, offsetX: 0, offsetY: 0 });
      }
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { clientX, clientY } = e;

    if (action === "none" && tool === Tools.select) {
      const element = getElementAtPosition(clientX, clientY, elements);
      e.currentTarget.style.cursor = element
        ? cursorForPosition(element.position!)
        : "default";
      return;
    }

    if (tool !== Tools.select) {
      e.currentTarget.style.cursor = "crosshair";
    }

    if (action === "drawing") {
      const index = elements.length - 1;
      const { x1, y1 } = elements[index];
      updateElement(index, x1, y1, clientX, clientY, tool);
    } else if (action === "moving" && selectedElement) {
      const { element, offsetX, offsetY } = selectedElement;
      const { id, x1, y1, x2, y2, elementType } = element;

      const width = x2 - x1;
      const height = y2 - y1;
      const nextX1 = clientX - offsetX;
      const nextY1 = clientY - offsetY;

      updateElement(
        id,
        nextX1,
        nextY1,
        nextX1 + width,
        nextY1 + height,
        elementType
      );
    } else if (action === "resizing" && selectedElement) {
      const { element } = selectedElement;
      const { id, elementType, position, ...coordinates } = element;
      if (position) {
        const { x1, y1, x2, y2 } = resizedCoordinates(
          clientX,
          clientY,
          position,
          coordinates
        );
        updateElement(id, x1, y1, x2, y2, elementType);
      }
    }
  };

  const onMouseUp = () => {
    if (
      (elements.length > 0 && action === "drawing") ||
      action === "resizing"
    ) {
      const index = elements.length - 1;
      const { id, elementType } = elements[index];
      const { x1, y1, x2, y2 } = adjustElementCoordinates(elements[index]);
      updateElement(id, x1, y1, x2, y2, elementType);
    }

    setAction("none");
    setSelectedElement(null);

    if (canvasRef.current) {
      canvasRef.current.style.cursor =
        tool === Tools.select ? "default" : "crosshair";
    }
  };

  const onClick = () => {
    if (tool !== Tools.select && canvasRef.current) {
      canvasRef.current.style.cursor = "crosshair";
    }
  };

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-0 left-1/2 z-50 transform -translate-x-1/2 mt-4">
        <Toolbar setElementType={setTool} onClick={onClick} />
      </div>

      <canvas
        className="z-10"
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      />
      <div className="absolute bottom-0 left-0 pl-4 z-50 transform  mt-4 flex flex-row gap-2 pb-4">
        <Button onClick={undo}>Undo</Button>
        <Button onClick={redo}>Redo</Button>
      </div>
    </div>
  );
}
