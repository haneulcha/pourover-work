import { useEffect, useState } from "react";
import { getMethodName } from "@pourover/domain/methods";
import { drippers } from "@pourover/domain/drippers";
import type { DripperId, BrewMethodId } from "@pourover/domain/types";
import { Footer } from "@/ui/Footer";
import { formatTime } from "@/ui/format";
import { FeelingGlyph } from "@/features/complete/FeelingGlyph";
import { listLogs, type LogSummary } from "./api";

type Load =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "loaded"; readonly logs: LogSummary[] };

export function DiaryScreen({
  onBack,
  onOpen,
}: {
  readonly onBack: () => void;
  readonly onOpen: (id: string) => void;
}) {
  const [state, setState] = useState<Load>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    void listLogs()
      .then((logs) => alive && setState({ status: "loaded", logs }))
      .catch(() => alive && setState({ status: "error" }));
    return () => { alive = false; };
  }, []);

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-surface px-6 pb-4 pt-12 text-text-primary">
      <header className="flex items-center justify-between">
        <h1 className="text-heading-sm font-medium">내 기록</h1>
        <button type="button" onClick={onBack} className="text-body-sm text-text-secondary underline-offset-2 hover:underline">
          닫기
        </button>
      </header>

      <div className="mt-8 flex-1">
        {state.status === "loading" && (
          <p className="text-body-sm text-text-muted">불러오는 중…</p>
        )}
        {state.status === "error" && (
          <p className="text-body-sm text-text-muted">기록을 불러오지 못했어요.</p>
        )}
        {state.status === "loaded" && state.logs.length === 0 && (
          <p className="text-body-sm text-text-muted">아직 기록이 없어요.</p>
        )}
        {state.status === "loaded" && state.logs.length > 0 && (
          <ul className="flex flex-col divide-y divide-border">
            {state.logs.map((log) => (
              <li key={log.id}>
                <button
                  type="button"
                  onClick={() => onOpen(log.id)}
                  className="flex w-full items-center gap-3 py-4 text-left hover:bg-surface-soft/60"
                >
                  {log.feeling && <FeelingGlyph kind={log.feeling} size={28} />}
                  <span className="flex-1">
                    <span className="block text-body-md">
                      {getMethodName(log.method as BrewMethodId)} · {drippers[log.dripper as DripperId]?.name}
                    </span>
                    <span className="block text-caption-sm text-text-muted tabular-nums">
                      {log.coffee} · {log.totalWater} g · {formatTime(log.durationSec)}
                    </span>
                    {log.memoSnippet && (
                      <span className="mt-1 block text-body-sm text-text-secondary">{log.memoSnippet}</span>
                    )}
                  </span>
                  <span className="text-caption-sm text-text-muted tabular-nums">
                    {log.brewedAt.slice(0, 10)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Footer />
    </div>
  );
}
