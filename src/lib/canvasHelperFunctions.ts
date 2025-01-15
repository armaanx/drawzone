import {
  Element,
  EllipseElement,
  LineElement,
  PenElement,
  RectangleElement,
  Tools,
} from "@/types/canvasTypes";
import { ElementCoordinates, Point } from "@/types/canvasTypes";
import { RoughCanvas } from "roughjs/bin/canvas";
import rough from "roughjs/bin/rough";
import { getStroke } from "perfect-freehand";

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
  let roughElement;
  switch (elementType) {
    case Tools.line:
      roughElement = generator.line(x1, y1, x2, y2);
      return { id, x1, y1, x2, y2, roughElement, elementType };
    case Tools.rectangle:
      roughElement = generator.rectangle(x1, y1, x2 - x1, y2 - y1);
      return { id, x1, y1, x2, y2, roughElement, elementType };
    case Tools.ellipse:
      const width = Math.abs(x2 - x1);
      const height = Math.abs(y2 - y1);
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      roughElement = generator.ellipse(cx, cy, width, height);
      return { id, x1, y1, x2, y2, roughElement, elementType };
    case Tools.pen:
      //todo
      return { id, elementType, points: [{ x: x1, y: y1 }] };
    default:
      return null;
  }
}

export const drawElement = (
  roughCanvas: RoughCanvas,
  element: Element,
  ctx: CanvasRenderingContext2D
) => {
  switch (element.elementType) {
    case Tools.line:
    case Tools.rectangle:
    case Tools.ellipse:
      roughCanvas.draw(element.roughElement);
      break;
    case Tools.pen:
      const stroke = getStroke(element.points, {
        size: 4,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
      });

      //ctx.beginPath();
      ctx.fillStyle = "#000";
      const pathData = getSvgPathFromStroke(stroke);
      const path = new Path2D(pathData);
      ctx.fill(path);
      break;
    default:
  }
};

export const positionWithinElement = (
  x: number,
  y: number,
  element: Element
):
  | "start"
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight"
  | "end"
  | "inside"
  | null => {
  const { x1, y1, x2, y2, elementType } = element as
    | RectangleElement
    | LineElement
    | EllipseElement;
  if (elementType === Tools.rectangle) {
    const topLeft = nearPoint(x, y, x1, y1, "topLeft");
    const topRight = nearPoint(x, y, x2, y1, "topRight");
    const bottomLeft = nearPoint(x, y, x1, y2, "bottomLeft");
    const bottomRight = nearPoint(x, y, x2, y2, "bottomRight");
    const inside = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
    return (
      (topLeft as "topLeft" | null) ||
      inside ||
      (topRight as "topRight" | null) ||
      (bottomLeft as "bottomLeft" | null) ||
      (bottomRight as "bottomRight" | null)
    );
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
    return (
      (start as "start" | null) ||
      (end as "end" | null) ||
      (inside as "inside" | null)
    );
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
    return (
      (inside as "inside" | null) ||
      (topLeft as "topLeft" | null) ||
      (topRight as "topRight" | null) ||
      (bottomLeft as "bottomLeft" | null) ||
      (bottomRight as "bottomRight" | null)
    );
  } else if (elementType === Tools.pen) {
    const { points } = element as PenElement;
    return points.some((point) => {
      const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
      return distance <= 10;
    })
      ? "inside"
      : null;
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
    .find((element) => element.position !== null) as Element | undefined;
}

export const adjustElementCoordinates = (
  element: Element
): ElementCoordinates => {
  const { x1, y1, x2, y2, elementType } = element as
    | RectangleElement
    | LineElement
    | EllipseElement;
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

function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );

  d.push("Z");
  return d.join(" ");
}
