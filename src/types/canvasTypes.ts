import { Drawable } from "roughjs/bin/core";

export enum Tools {
  line = "line",
  rectangle = "rectangle",
  ellipse = "ellipse",
  select = "select",
  pen = "pen",
  text = "text",
}

export interface Point {
  x: number;
  y: number;
}

export type Action = "none" | "drawing" | "moving" | "resizing" | "writing";

export interface LineElement {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  roughElement: Drawable;
  elementType: Tools.line;
  position?: "start" | "end" | "inside";
}

export interface RectangleElement {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  roughElement: Drawable;
  position?: "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "inside";
  elementType: Tools.rectangle;
}

export interface EllipseElement {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  roughElement: Drawable;
  elementType: Tools.ellipse;
  position?: "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "inside";
}

export interface PenElement {
  id: number;
  points: Point[];
  elementType: Tools.pen;
  position?: "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "inside";
}

export interface TextElement {
  id: number;
  x1: number;
  y1: number;
  text: string;
  elementType: Tools.text;
  position?: "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "inside";
}

export type Element =
  | LineElement
  | RectangleElement
  | EllipseElement
  | PenElement
  | TextElement;

export interface SelectedElement {
  element: Element;
  offsetX: number;
  offsetY: number;
  xOffsets?: number[];
  yOffsets?: number[];
}

export interface ElementCoordinates {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
