import { useEffect, useState } from "react";
import { elapsedSec, type BrewSession } from "@pourover/domain/session";

const TICK_MS = 250;

export function useElapsed(session: BrewSession | null): number {
  const [elapsed, setElapsed] = useState<number>(() =>
    session ? elapsedSec(session, Date.now()) : 0,
  );

  useEffect(() => {
    if (!session) {
      setElapsed(0);
      return;
    }
    setElapsed(elapsedSec(session, Date.now()));
    const id = window.setInterval(() => {
      setElapsed(elapsedSec(session, Date.now()));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [session]);

  return elapsed;
}
