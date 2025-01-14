"use client";
import useHistory from "@/hooks/useHistory";
import {
  adjustElementCoordinates,
  createElement,
  cursorForPosition,
  getElementAtPosition,
  resizedCoordinates,
} from "@/lib/canvasHelperFunctions";
import { Action, SelectedElement, Tools } from "@/types/canvasTypes";
import { Redo2, Undo2 } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import rough from "roughjs";
import Toolbar from "./Toolbar";
import { Button } from "./ui/button";

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const {
    currentElements: elements,
    setState: setElements,
    undo,
    redo,
    canRedo,
    canUndo,
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
      <div className="absolute bottom-0 left-0 pl-8 z-50 transform  flex flex-row gap-2 pb-6">
        <Button
          onClick={undo}
          variant={"outline"}
          size={"icon"}
          disabled={!canUndo}
        >
          <Undo2 className="w-10 h-10" />
        </Button>
        <Button
          onClick={redo}
          variant={"outline"}
          size={"icon"}
          disabled={!canRedo}
        >
          <Redo2 className="w-10 h-10" />
        </Button>
      </div>
    </div>
  );
}
