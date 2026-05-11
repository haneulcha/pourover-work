export const cx = (
  ...parts: readonly (string | false | null | undefined)[]
): string => parts.filter(Boolean).join(" ");
