import { fullVariant } from "./full";
import type { ShareColor, ShareLayout, ShareVariant } from "./types";

export const SHARE_LAYOUTS: Partial<Readonly<Record<ShareLayout, ShareVariant>>> = {
  full: fullVariant,
};

export const DEFAULT_LAYOUT: ShareLayout = "full";
export const DEFAULT_COLOR: ShareColor = "positive";

export const getVariant = (layout: ShareLayout): ShareVariant => {
  const v = SHARE_LAYOUTS[layout];
  if (v == null) {
    throw new Error(`Unknown share layout: ${layout}`);
  }
  return v;
};
