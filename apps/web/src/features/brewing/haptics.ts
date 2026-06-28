// iOS Safari 는 navigator.vibrate 미지원. <input type="checkbox" switch> 를
// 프로그램적으로 토글하면 단일 햅틱 틱이 발생하는 트릭으로 폴백한다.
let switchLabel: HTMLLabelElement | null = null;

function ensureSwitch(): HTMLLabelElement | null {
  if (typeof document === "undefined" || !document.body) return null;
  if (switchLabel) return switchLabel;
  const label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  Object.assign(label.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    overflow: "hidden",
    opacity: "0",
    pointerEvents: "none",
  } satisfies Partial<CSSStyleDeclaration>);
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", ""); // iOS switch control
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  switchLabel = label;
  return label;
}

export function vibrate(pattern: readonly number[]): void {
  const nav =
    typeof navigator !== "undefined"
      ? (navigator as { vibrate?: (p: number | number[]) => boolean })
      : undefined;
  if (nav && typeof nav.vibrate === "function") {
    try {
      nav.vibrate([...pattern]);
      return;
    } catch {
      // 폴백으로
    }
  }
  const label = ensureSwitch();
  if (label) {
    try {
      label.click();
    } catch {
      // no-op
    }
  }
}
