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

// interface Point {
//   x: number;
//   y: number;
// }

type Action = "none" | "drawing" | "moving";
interface SelectedElement {
  element: Element;
  offsetX: number;
  offsetY: number;
}

interface Element {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  roughElement: Drawable;
  elementType: Tools;
}

const generator = rough.generator();

function createElement(
  id: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  elementType: Tools
) {
  if (elementType == Tools.select) {
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
}

const isWithinElement = (x: number, y: number, element: Element) => {
  const { x1, y1, x2, y2, elementType } = element;
  if (elementType === Tools.rectangle) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  } else if (elementType === Tools.line) {
    const a = { x: x1, y: y1 };
    const b = { x: x2, y: y2 };
    const distanceFromLine =
      Math.abs((b.y - a.y) * x - (b.x - a.x) * y + b.x * a.y - b.y * a.x) /
      Math.sqrt((b.y - a.y) ** 2 + (b.x - a.x) ** 2);
    const withinLineBounds =
      Math.min(a.x, b.x) <= x &&
      x <= Math.max(a.x, b.x) &&
      Math.min(a.y, b.y) <= y &&
      y <= Math.max(a.y, b.y);

    return distanceFromLine <= 5 && withinLineBounds;
  } else if (elementType === Tools.ellipse) {
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const a = Math.abs(x2 - x1) / 2;
    const b = Math.abs(y2 - y1) / 2;
    const normalizedX = (x - centerX) / a;
    const normalizedY = (y - centerY) / b;
    return normalizedX ** 2 + normalizedY ** 2 <= 1;
  }
};

function getElementAtPosition(x: number, y: number, elements: Element[]) {
  return elements.find((element) => isWithinElement(x, y, element));
}

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [elements, setElements] = useState<Element[]>([]);
  const [action, setAction] = useState<Action>("none");
  const [tool, setTool] = useState<Tools>(Tools.line);
  const [selectedElement, setSelectedElement] =
    useState<SelectedElement | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);

      const roughCanvas = rough.canvas(canvas);
      elements.forEach((element) => roughCanvas.draw(element.roughElement));
    }
  }, [elements]);

  const updateElement = (
    index: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    elementType: Tools
  ) => {
    const updatedElement = createElement(index, x1, y1, x2, y2, elementType);
    const updatedElements = [...elements];
    updatedElements[index] = updatedElement!;
    setElements(updatedElements);
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
      setElements((prev) => [...prev, element!]);
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { clientX, clientY } = e;
    if (action === "none") {
      if (tool === Tools.select) {
        const element = getElementAtPosition(clientX, clientY, elements);
        e.currentTarget.style.cursor = element ? "move" : "default";
      }
      return;
    }
    if (
      tool === Tools.ellipse ||
      tool === Tools.rectangle ||
      tool === Tools.line
    ) {
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
    setAction("none");
    setSelectedElement(null);
    if (canvasRef.current && tool === Tools.select) {
      canvasRef.current.style.cursor = "default";
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
        //style={{ backgroundColor: "blue" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      ></canvas>
    </div>
  );
}
