import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "sm";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: Variant;
  readonly size?: Size;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-btn-primary-bg font-medium text-btn-primary-fg hover:bg-btn-primary-hover active:bg-btn-primary-active",
  secondary:
    "border border-btn-secondary-border text-btn-secondary-fg hover:bg-btn-hover-bg",
  ghost: "text-btn-ghost-fg hover:bg-btn-hover-bg",
};

const sizeClasses: Record<Size, string> = {
  md: "px-4 py-3",
  sm: "px-3 py-2 text-body-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-3 rounded-btn transition-colors disabled:pointer-events-none disabled:opacity-disabled",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    />
  );
}
