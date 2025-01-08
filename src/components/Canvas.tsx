"use client";
import { useLayoutEffect, useRef, useState } from "react";
import rough from "roughjs";
import { Drawable } from "roughjs/bin/core";
import Toolbar from "./Toolbar";
export enum ElementType {
  line = "line",
  rectangle = "rectangle",
  circle = "circle",
}
interface Element {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  roughElement: Drawable;
  elementType: ElementType;
}

const generator = rough.generator();

function createElement(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  elementType: ElementType
) {
  if (elementType === ElementType.line) {
    const roughElement = generator.line(x1, y1, x2, y2);
    return { x1, y1, x2, y2, roughElement, elementType };
  }
  if (elementType === ElementType.rectangle) {
    const roughElement = generator.rectangle(x1, y1, x2 - x1, y2 - y1);
    return { x1, y1, x2, y2, roughElement, elementType };
  }
  if (elementType === ElementType.circle) {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    const roughElement = generator.ellipse(cx, cy, width, height);
    return { x1, y1, x2, y2, roughElement, elementType };
  }
}

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [elements, setElements] = useState<Element[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [elementType, setElementType] = useState<ElementType>(ElementType.line);

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

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrawing(true);
    const { clientX, clientY } = e;
    const element = createElement(
      clientX,
      clientY,
      clientX,
      clientY,
      elementType
    );
    setElements((prev) => [...prev, element!]);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const { clientX, clientY } = e;
    const index = elements.length - 1;
    const { x1, y1 } = elements[index];
    const updatedElement = createElement(x1, y1, clientX, clientY, elementType);
    const updatedElements = [...elements];
    updatedElements[index] = updatedElement!;
    setElements(updatedElements);
  };

  const onMouseUp = () => {
    setDrawing(false);
  };

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-0 left-1/2 z-10 flex items-center justify-center mt-4">
        <Toolbar setElementType={setElementType} />
      </div>
      <canvas
        ref={canvasRef}
        //style={{ backgroundColor: "blue" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      ></canvas>
    </div>
  );
}
