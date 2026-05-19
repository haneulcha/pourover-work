// better-auth client 흐름:
// - 로그인: 브라우저를 /api/auth/sign-in/social?provider=google&callbackURL=... 로 이동
// - 세션 조회: GET /api/auth/get-session (credentials: include)
// - 로그아웃: POST /api/auth/sign-out
//
// 프로덕션 누락 가드는 vite.config.ts(빌드타임)로 옮겼다. 여기서는
// dev 폴백만 담당.

const API_BASE: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export type Session = {
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly image?: string | null;
  };
  readonly session: {
    readonly id: string;
    readonly expiresAt: string;
  };
} | null;

export async function getSession(): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/auth/get-session`, {
    credentials: "include",
  });
  if (!res.ok) return null;
  const body = (await res.json()) as Session | { user: null };
  if (!body || !("user" in body) || body.user == null) return null;
  return body as Session;
}

// better-auth의 social sign-in은 POST 엔드포인트라 단순 navigation으론
// 못 시작한다. POST로 흐름을 개시해서 Google authorize URL을 받은 뒤
// 그쪽으로 window.location 이동.
export async function signInWithGoogle(callbackUrl: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/sign-in/social`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ provider: "google", callbackURL: callbackUrl }),
  });
  if (!res.ok) {
    throw new Error(`sign-in failed: ${res.status}`);
  }
  const body = (await res.json()) as { url?: string };
  if (!body.url) {
    throw new Error("sign-in response missing url");
  }
  window.location.href = body.url;
}

// better-auth는 빈 body라도 Content-Type: application/json + JSON body를
// 요구한다. 헤더/바디 빠지면 415로 거부되고 세션은 그대로 살아 있다.
export async function signOut(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/sign-out`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: "{}",
  });
  if (!res.ok) {
    throw new Error(`sign-out failed: ${res.status}`);
  }
}
