import { useCallback, useState } from "react";

const KEY = "pourover.cue.muted";

function readMuted(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

export function useCueMuted(): readonly [boolean, () => void] {
  const [muted, setMuted] = useState<boolean>(readMuted);
  const toggle = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(KEY, String(next));
      } catch {
        // 영속 실패해도 세션 내 토글은 동작
      }
      return next;
    });
  }, []);
  return [muted, toggle] as const;
}
