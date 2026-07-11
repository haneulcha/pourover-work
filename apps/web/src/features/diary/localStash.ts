// D7: 로그인 유저의 자동 저장이 네트워크 실패할 때, 에러 표시 없이(침묵)
// memo 포함 엔트리를 로컬에 보관. 후속 오프라인 동기화가 재전송할 대기열.
const KEY = "bloom-coffee:unsynced-logs:v1";

export type UnsyncedLog = {
  readonly id: string;
  readonly recipe: string; // recipeToJSON 결과
  readonly brewedAt: string;
  readonly durationSec: number;
  readonly feeling: string | null;
  readonly memo: string | null;
};

export function stashUnsynced(entry: UnsyncedLog): void {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as UnsyncedLog[]) : [];
    const next = [...list.filter((e) => e.id !== entry.id), entry];
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — drop silently.
  }
}
