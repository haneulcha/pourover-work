import { useEffect, useState } from "react";
import { getMethodName } from "@pourover/domain/methods";
import { drippers } from "@pourover/domain/drippers";
import type { DripperId, BrewMethodId } from "@pourover/domain/types";
import { cx } from "@/ui/cx";
import { Footer } from "@/ui/Footer";
import { formatLogClock, formatLogDay, formatTime } from "@/ui/format";
import { FeelingGlyph } from "@/features/complete/FeelingGlyph";
import { listLogs, type LogSummary } from "./api";

type Load =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "loaded"; readonly logs: LogSummary[] };

type DayGroup = { readonly label: string; readonly logs: LogSummary[] };

// 같은 날에 내린 잔들을 한 그룹으로. 목록은 이미 최신순이므로 순서만 지키면 된다.
function groupByDay(logs: readonly LogSummary[], now = new Date()): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const log of logs) {
    const label = formatLogDay(log.brewedAt, now);
    const current = groups.at(-1);
    if (current && current.label === label) current.logs.push(log);
    else groups.push({ label, logs: [log] });
  }
  return groups;
}

// 메서드 이름에 이미 드리퍼가 들어있으면(Hoffmann V60) 드리퍼를 반복하지 않는다.
function metaLine(log: LogSummary): string {
  const method = getMethodName(log.method as BrewMethodId);
  const dripper = drippers[log.dripper as DripperId]?.name;
  const parts = [method];
  if (dripper && !method.includes(dripper)) parts.push(dripper);
  parts.push(`${log.coffee}g`, `${log.totalWater}g`, formatTime(log.durationSec));
  return parts.join(" · ");
}

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

      <div className="mt-4 flex-1">
        {state.status === "loading" && <LoadingRows />}
        {state.status === "error" && (
          <p className="mt-lg text-body-sm text-text-muted">기록을 불러오지 못했어요.</p>
        )}
        {state.status === "loaded" && state.logs.length === 0 && <EmptyDiary />}
        {state.status === "loaded" && state.logs.length > 0 && (
          groupByDay(state.logs).map((group) => (
            <section key={group.label} className="mt-xs">
              <h2 className="sticky top-0 z-sticky bg-surface pb-xxs pt-xs text-body-sm font-medium text-text-secondary">
                {group.label}
              </h2>
              <ul>
                {group.logs.map((log, i) => (
                  <li key={log.id}>
                    <LogRow
                      log={log}
                      onOpen={() => onOpen(log.id)}
                      first={i === 0}
                      last={i === group.logs.length - 1}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
      <Footer />
    </div>
  );
}

function LogRow({
  log,
  onOpen,
  first,
  last,
}: {
  readonly log: LogSummary;
  readonly onOpen: () => void;
  readonly first: boolean;
  readonly last: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group -mx-2 flex w-[calc(100%+1rem)] gap-sm rounded-card px-2 py-3 text-left transition-colors hover:bg-surface-soft"
    >
      <Rail feeling={log.feeling} first={first} last={last} />
      <span className="min-w-0 flex-1">
        <span className="block text-caption-sm tabular-nums text-text-muted">
          {formatLogClock(log.brewedAt)}
        </span>
        <span
          className={cx(
            "mt-0.5 block text-body-md",
            log.memoSnippet ? "text-text-primary" : "text-text-muted",
          )}
        >
          {log.memoSnippet ?? "한 줄 남겨둘까요"}
        </span>
        <span className="mt-1 block text-caption-sm tabular-nums text-text-muted">
          {metaLine(log)}
        </span>
      </span>
    </button>
  );
}

// 시간 축 — 같은 날의 잔들만 잇는다. 하루에 한 잔이면 선 없이 노드만 남는다.
// 노드 중심 = 행 위 여백(py-3 = 0.75rem) + 노드 반지름(h-8 = 1rem) = 1.75rem.
function Rail({
  feeling,
  first,
  last,
}: {
  readonly feeling: LogSummary["feeling"];
  readonly first: boolean;
  readonly last: boolean;
}) {
  const line = first && last
    ? null
    : cx(
        "absolute left-1/2 w-px -translate-x-1/2 bg-surface-hairline",
        first && "bottom-0 top-[1.75rem]",
        last && "bottom-[calc(100%-1.75rem)] top-0",
        !first && !last && "inset-y-0",
      );

  return (
    <span aria-hidden className="relative flex w-8 shrink-0 justify-center">
      {line && <span className={line} />}
      <span className="relative flex h-8 w-8 items-center justify-center rounded-pill bg-surface text-accent transition-colors group-hover:bg-surface-soft">
        {feeling ? (
          <FeelingGlyph kind={feeling} size={26} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-pill bg-surface-hairline" />
        )}
      </span>
    </span>
  );
}

function EmptyDiary() {
  return (
    <div className="mt-section text-center">
      <p className="text-body-md">아직 기록이 없어요</p>
      <p className="mt-xxs text-body-sm text-text-muted">
        커피를 한 잔 내리면 여기에 남아요.
      </p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div aria-hidden className="mt-lg motion-safe:animate-pulse">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-sm py-3">
          <span className="h-8 w-8 shrink-0 rounded-pill bg-surface-strong" />
          <span className="flex-1">
            <span className="block h-2.5 w-1/3 rounded-pill bg-surface-strong" />
            <span className="mt-2 block h-3 w-5/6 rounded-pill bg-surface-strong" />
            <span className="mt-2 block h-2.5 w-3/5 rounded-pill bg-surface-strong" />
          </span>
        </div>
      ))}
    </div>
  );
}
