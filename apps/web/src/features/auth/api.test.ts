import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSession, googleSignInUrl, signOut } from "./api";

const fetchMock = vi.fn();
let originalFetch: typeof fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("getSession", () => {
  it("returns null when response is not ok", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 401 }));
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("returns null when body has no user", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ user: null }), { status: 200 }),
    );
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("returns the session when user is present", async () => {
    const payload = {
      user: { id: "u1", email: "a@b.com", name: "A" },
      session: { id: "s1", expiresAt: "2026-06-01T00:00:00Z" },
    };
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 200 }),
    );
    const session = await getSession();
    expect(session?.user.email).toBe("a@b.com");
  });

  it("sends credentials: include", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 401 }));
    await getSession();
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      credentials: "include",
    });
  });
});

describe("googleSignInUrl", () => {
  it("builds the correct URL with provider and encoded callbackURL", () => {
    const url = googleSignInUrl("http://localhost:5173/?logged-in=1");
    expect(url).toContain("/api/auth/sign-in/social");
    expect(url).toContain("provider=google");
    expect(url).toContain(
      `callbackURL=${encodeURIComponent("http://localhost:5173/?logged-in=1")}`,
    );
  });
});

describe("signOut", () => {
  it("POSTs with credentials: include", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 }));
    await signOut();
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      credentials: "include",
    });
  });
});
