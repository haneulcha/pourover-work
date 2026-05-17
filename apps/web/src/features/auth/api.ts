// better-auth client 흐름:
// - 로그인: 브라우저를 /api/auth/sign-in/social?provider=google&callbackURL=... 로 이동
// - 세션 조회: GET /api/auth/get-session (credentials: include)
// - 로그아웃: POST /api/auth/sign-out
//
// API_BASE는 빌드 시 Vite env로 주입.

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

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

export function googleSignInUrl(callbackUrl: string): string {
  const params = new URLSearchParams({
    provider: "google",
    callbackURL: callbackUrl,
  });
  return `${API_BASE}/api/auth/sign-in/social?${params.toString()}`;
}

export async function signOut(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/sign-out`, {
    method: "POST",
    credentials: "include",
  });
}
