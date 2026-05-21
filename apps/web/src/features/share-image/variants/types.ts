import type { BrewSession } from "@pourover/domain/session";

export type ShareLayout = "full" | "short";
export type ShareColor = "positive" | "negative";

export type DrawProps = {
  readonly session: BrewSession;
  readonly photo: HTMLImageElement;
  readonly color: ShareColor;
  readonly width: number;
  readonly height: number;
};

export type ShareVariant = {
  readonly id: ShareLayout;
  readonly name: string;
  readonly exportSize: { readonly width: number; readonly height: number };
  readonly draw: (ctx: CanvasRenderingContext2D, props: DrawProps) => void;
};
