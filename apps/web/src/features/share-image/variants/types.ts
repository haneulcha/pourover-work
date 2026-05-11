import type { ComponentType } from "react";
import type { BrewSession } from "@pourover/domain/session";

export type ShareLayout = "full" | "short";
export type ShareColor = "positive" | "negative";

export type ShareVariantProps = {
  readonly session: BrewSession;
  readonly photoUrl: string;
  readonly color: ShareColor;
};

export type ShareVariant = {
  readonly id: ShareLayout;
  readonly name: string;
  readonly Component: ComponentType<ShareVariantProps>;
  readonly exportSize: { readonly width: number; readonly height: number };
};
