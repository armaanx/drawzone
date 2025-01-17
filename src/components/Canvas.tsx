"use client";
import useHistory from "@/hooks/useHistory";
import {
  adjustElementCoordinates,
  createElement,
  cursorForPosition,
  drawElement,
  getElementAtPosition,
  resizedCoordinates,
} from "@/lib/canvasHelperFunctions";
import {
  Action,
  EllipseElement,
  LineElement,
  PenElement,
  RectangleElement,
  SelectedElement,
  TextElement,
  Tools,
} from "@/types/canvasTypes";
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
    clear,
  } = useHistory([]);
  const [action, setAction] = useState<Action>("none");
  const [tool, setTool] = useState<Tools>(Tools.pen);
  const [selectedElement, setSelectedElement] =
    useState<SelectedElement | null>(null);
  const editableRef = useRef<HTMLDivElement>(null);

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
      elements.forEach((element) => drawElement(roughCanvas, element, ctx));
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
    const elementsCopy = [...elements];
    if (elementType != Tools.pen) {
      const element = createElement(index, x1, y1, x2, y2, elementType);
      if (!element) return;
      elementsCopy[index] = element;
    } else if (elementType === Tools.pen) {
      const el = elementsCopy[index] as PenElement;
      el.points = [...el.points, { x: x2, y: y2 }];
    }
    setElements(elementsCopy, true);
  };

  const updateText = (id: number, x1: number, y1: number, text: string) => {
    const elementsCopy = [...elements];
    elementsCopy[id] = {
      id,
      elementType: Tools.text,
      x1,
      y1,
      text,
    };
    setElements(elementsCopy, true);
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (action === "writing") return;
    const { clientX, clientY } = e;
    if (tool === Tools.text) {
      const id = elements.length;
      const element = {
        id,
        elementType: Tools.text,
        x1: clientX,
        y1: clientY,
        text: "",
      } as TextElement;
      setElements([...elements, element]);
      setSelectedElement({ element, offsetX: 0, offsetY: 0 });
      setAction("writing");
      return;
    }
    if (tool === Tools.select) {
      const element = getElementAtPosition(clientX, clientY, elements);
      if (element) {
        if (element.position === "inside") {
          if (element.elementType === Tools.pen) {
            const { points } = element as PenElement;
            const xOffsets: number[] = points.map((point) => clientX - point.x);
            const yOffsets: number[] = points.map((point) => clientY - point.y);
            setSelectedElement({
              element,
              xOffsets,
              yOffsets,
              offsetX: 0,
              offsetY: 0,
            });
            setAction("moving");
            setElements((prev) => prev);
          } else {
            const { x1, y1 } = element as
              | RectangleElement
              | LineElement
              | EllipseElement;
            const offsetX = clientX - x1;
            const offsetY = clientY - y1;
            setSelectedElement({ element, offsetX, offsetY });
            setAction("moving");
            setElements((prev) => prev);
          }
        } else {
          setSelectedElement({ element, offsetX: 0, offsetY: 0 });
          setAction("resizing");
          setElements((prev) => prev);
        }
      }
    } else {
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
        setAction("drawing");
      }
    }
  };

  const handleTextFinish = () => {
    if (!selectedElement || !editableRef.current) return;

    const { element } = selectedElement;
    const { id, x1, y1 } = element as TextElement;
    const text = editableRef.current.innerText;

    if (text) {
      updateText(id, x1, y1, text);
    } else {
      setElements(elements.filter((el) => el.id !== id));
    }

    setAction("none");
    setSelectedElement(null);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { clientX, clientY } = e;
    if (action === "writing") return;
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
      const { x1, y1 } = elements[index] as
        | RectangleElement
        | LineElement
        | EllipseElement;
      updateElement(index, x1, y1, clientX, clientY, tool);
    } else if (action === "moving" && selectedElement) {
      const { element, offsetX, offsetY, xOffsets, yOffsets } = selectedElement;
      if (element.elementType === Tools.pen) {
        const { id } = element;
        const newPoints = (element as PenElement).points.map((_, index) => ({
          x: clientX - xOffsets![index],
          y: clientY - yOffsets![index],
        }));
        const elementsCopy = [...elements];
        elementsCopy[id] = {
          ...element,
          points: newPoints,
        };
        setElements(elementsCopy, true);
      } else {
        const { id, x1, y1, x2, y2, elementType } = element as
          | RectangleElement
          | LineElement
          | EllipseElement;

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
    } else if (
      action === "resizing" &&
      selectedElement &&
      selectedElement.element.elementType !== Tools.pen
    ) {
      const { element } = selectedElement;
      const { id, elementType, position, ...coordinates } = element as
        | RectangleElement
        | EllipseElement
        | LineElement;
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

  const isAdjustmentRequired = (tool: Tools) => {
    return (
      tool === Tools.rectangle || tool === Tools.ellipse || tool === Tools.line
    );
  };

  const onMouseUp = () => {
    if (
      ((elements.length > 0 && action === "drawing") ||
        action === "resizing") &&
      isAdjustmentRequired(tool)
    ) {
      const index = elements.length - 1;
      const { id, elementType } = elements[index];
      const { x1, y1, x2, y2 } = adjustElementCoordinates(elements[index]);
      updateElement(id, x1, y1, x2, y2, elementType);
    }

    if (action === "writing") {
      return;
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
        <Toolbar setElementType={setTool} onClick={onClick} clear={clear} />
      </div>

      {action === "writing" && selectedElement ? (
        <div
          contentEditable
          onBlur={handleTextFinish}
          className="absolute min-w-[1px] min-h-[24px] outline-none whitespace-nowrap"
          style={{
            position: "absolute",
            top: (selectedElement.element as TextElement).y1,
            left: (selectedElement.element as TextElement).x1,
            font: "24px sans-serif",
            padding: "4px",
            background: "white",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.1)",
            zIndex: 30,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          ref={(el) => {
            editableRef.current = el;
            if (el) {
              requestAnimationFrame(() => el.focus());
            }
          }}
        />
      ) : null}

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
