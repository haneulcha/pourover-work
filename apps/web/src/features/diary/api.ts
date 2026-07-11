import type { Recipe } from "@pourover/domain/types";
import { recipeToJSON } from "@pourover/domain/serialize";
import type { Feeling } from "@pourover/domain/session";
import { stashUnsynced } from "./localStash";

const API_BASE: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export type LogSummary = {
  readonly id: string;
  readonly brewedAt: string;
  readonly durationSec: number;
  readonly method: string;
  readonly dripper: string;
  readonly coffee: number;
  readonly totalWater: number;
  readonly feeling: Feeling | null;
  readonly memoSnippet: string | null;
};

export type LogDetail = {
  readonly id: string;
  readonly brewedAt: string;
  readonly durationSec: number;
  readonly feeling: Feeling | null;
  readonly memo: string | null;
  readonly recipe: string; // recipeFromJSON 으로 rehydrate
};

type CreateInput = {
  readonly id: string;
  readonly recipe: Recipe;
  readonly brewedAt: string;
  readonly durationSec: number;
  readonly feeling: Feeling | null;
  readonly memo: string | null;
};

// D7: 실패해도 throw 하지 않는다 — 조용히 stash.
export async function createLog(input: CreateInput): Promise<void> {
  const recipe = recipeToJSON(input.recipe);
  const payload = {
    id: input.id,
    recipe,
    brewedAt: input.brewedAt,
    durationSec: input.durationSec,
    feeling: input.feeling,
    memo: input.memo,
  };
  try {
    const res = await fetch(`${API_BASE}/api/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`createLog ${res.status}`);
  } catch {
    stashUnsynced({ ...payload });
  }
}

export async function patchLog(
  id: string,
  patch: { feeling?: Feeling | null; memo?: string | null },
): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/log/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`patchLog ${res.status}`);
  } catch {
    // 조용히 무시 — v1은 patch 재시도 큐를 두지 않는다(YAGNI).
  }
}

export async function listLogs(): Promise<LogSummary[]> {
  const res = await fetch(`${API_BASE}/api/log`, { credentials: "include" });
  if (!res.ok) throw new Error(`listLogs ${res.status}`);
  return (await res.json()) as LogSummary[];
}

export async function getLog(id: string): Promise<LogDetail> {
  const res = await fetch(`${API_BASE}/api/log/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error(`getLog ${res.status}`);
  return (await res.json()) as LogDetail;
}

export async function deleteLog(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/log/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`deleteLog ${res.status}`);
}
