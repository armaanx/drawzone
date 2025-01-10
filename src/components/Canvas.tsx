"use client";
import { useLayoutEffect, useRef, useState } from "react";
import rough from "roughjs";
import { Drawable } from "roughjs/bin/core";
import Toolbar from "./Toolbar";

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

type Action = "none" | "drawing" | "moving";

interface Element {
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
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    const roughElement = generator.ellipse(cx, cy, width, height);
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

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [elements, setElements] = useState<Element[]>([]);
  const [action, setAction] = useState<Action>("none");
  const [tool, setTool] = useState<Tools>(Tools.line);
  const [selectedElement, setSelectedElement] =
    useState<SelectedElement | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const roughCanvas = rough.canvas(canvas);
    elements.forEach(({ roughElement }) => roughCanvas.draw(roughElement));
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
    setElements(elementsCopy);
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { clientX, clientY } = e;
    if (tool === Tools.select) {
      const element = getElementAtPosition(clientX, clientY, elements);
      if (element) {
        setAction("moving");
        const offsetX = clientX - element.x1;
        const offsetY = clientY - element.y1;
        setSelectedElement({ element, offsetX, offsetY });
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
        setElements((prev) => [...prev, element]);
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
    }
  };

  const onMouseUp = () => {
    if (elements.length > 0 && action === "drawing") {
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
    </div>
  );
}
