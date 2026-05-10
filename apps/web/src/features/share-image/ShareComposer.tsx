import { forwardRef } from "react";
import type { BrewSession } from "@pourover/domain/session";
import { getVariant } from "./variants/registry";
import type { ShareColor, ShareLayout } from "./variants/types";

type Props = {
  readonly session: BrewSession;
  readonly photoUrl: string;
  readonly layout: ShareLayout;
  readonly color: ShareColor;
};

export const ShareComposer = forwardRef<HTMLDivElement, Props>(
  function ShareComposer({ session, photoUrl, layout, color }, ref) {
    const variant = getVariant(layout);
    const { width, height } = variant.exportSize;
    const Component = variant.Component;
    return (
      <div
        ref={ref}
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        <Component session={session} photoUrl={photoUrl} color={color} />
      </div>
    );
  },
);
