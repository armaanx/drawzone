import { Element, Tools } from "@/types/canvasTypes";
import { ElementCoordinates, Point } from "@/types/canvasTypes";
import rough from "roughjs/bin/rough";

export const generator = rough.generator({
  options: { maxRandomnessOffset: 0 },
});

export function createElement(
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

export const positionWithinElement = (
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

export function nearPoint(
  x: number,
  y: number,
  x1: number,
  y1: number,
  pos: string
): string | null {
  return Math.abs(x - x1) < 5 && Math.abs(y - y1) < 5 ? pos : null;
}

export function cursorForPosition(position: string | null): string {
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

export function getElementAtPosition(
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

export const adjustElementCoordinates = (
  element: Element
): ElementCoordinates => {
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

export const resizedCoordinates = (
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
