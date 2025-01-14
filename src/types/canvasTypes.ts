import { Drawable } from "roughjs/bin/core";

export enum Tools {
  line = "line",
  rectangle = "rectangle",
  ellipse = "ellipse",
  select = "select",
}

export interface Point {
  x: number;
  y: number;
}

export type Action = "none" | "drawing" | "moving" | "resizing";

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

export interface SelectedElement {
  element: Element;
  offsetX: number;
  offsetY: number;
}

export interface ElementCoordinates {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
