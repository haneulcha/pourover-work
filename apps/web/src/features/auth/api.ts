// better-auth client 흐름:
// - 로그인: 브라우저를 /api/auth/sign-in/social?provider=google&callbackURL=... 로 이동
// - 세션 조회: GET /api/auth/get-session (credentials: include)
// - 로그아웃: POST /api/auth/sign-out
//
// API_BASE는 빌드 시 Vite env로 주입. 프로덕션에서 VITE_API_BASE_URL이
// 누락되면 localhost로 폴백하지 않고 빌드를 의도적으로 깨뜨려서, 잘못된
// 빌드가 사용자에게 도달하지 않도록 한다.

const API_BASE: string = (() => {
  const explicit = import.meta.env.VITE_API_BASE_URL;
  if (explicit) return explicit;
  if (import.meta.env.PROD) {
    throw new Error(
      "VITE_API_BASE_URL must be set at build time for production",
    );
  }
  return "http://localhost:8787";
})();

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

export async function signOut(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/sign-out`, {
    method: "POST",
    credentials: "include",
  });
}
