import { useEffect, useState } from "react";
import { getSession, type Session } from "./api";

type State =
  | { readonly status: "loading"; readonly session: null }
  | { readonly status: "loaded"; readonly session: Session };

export function useSession(): State {
  const [state, setState] = useState<State>({
    status: "loading",
    session: null,
  });

  useEffect(() => {
    let alive = true;
    void getSession().then((session) => {
      if (!alive) return;
      setState({ status: "loaded", session });
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
