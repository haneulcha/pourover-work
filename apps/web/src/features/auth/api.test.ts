import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSession, signInWithGoogle, signOut } from "./api";

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

describe("signInWithGoogle", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "http://localhost:5173/" },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it("POSTs JSON with provider/callbackURL and credentials: include", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ url: "https://accounts.google.com/o/oauth2/v2/auth" }),
        { status: 200 },
      ),
    );

    await signInWithGoogle("http://localhost:5173/?logged-in=1");

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/api/auth/sign-in/social");
    expect(init).toMatchObject({
      method: "POST",
      credentials: "include",
    });
    expect((init as RequestInit | undefined)?.headers).toMatchObject({
      "Content-Type": "application/json",
    });
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body).toEqual({
      provider: "google",
      callbackURL: "http://localhost:5173/?logged-in=1",
    });
  });

  it("navigates to the URL returned by the API", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ url: "https://google.example/auth" }), {
        status: 200,
      }),
    );

    await signInWithGoogle("http://localhost:5173/");

    expect(window.location.href).toBe("https://google.example/auth");
  });

  it("throws when API responds non-ok", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 500 }));
    await expect(signInWithGoogle("http://localhost:5173/")).rejects.toThrow(
      /500/,
    );
  });

  it("throws when response body has no url", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 }),
    );
    await expect(signInWithGoogle("http://localhost:5173/")).rejects.toThrow(
      /missing url/,
    );
  });
});

describe("signOut", () => {
  it("POSTs JSON body with Content-Type and credentials: include", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    await signOut();

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init).toMatchObject({
      method: "POST",
      credentials: "include",
      body: "{}",
    });
    expect((init as RequestInit | undefined)?.headers).toMatchObject({
      "Content-Type": "application/json",
    });
  });

  it("throws when API responds non-ok (so caller knows session is still alive)", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 415 }));
    await expect(signOut()).rejects.toThrow(/415/);
  });
});
