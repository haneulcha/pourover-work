import { describe, expect, it, vi } from "vitest";
import { createGitHubIssue } from "./github";

const payload = {
  title: "T",
  body: "B",
  labels: ["idea"],
} as const;

describe("createGitHubIssue", () => {
  it("POSTs to /repos/{owner}/{repo}/issues with bearer token and JSON body", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ number: 7, html_url: "https://gh/i/7" }), {
        status: 201,
      }),
    );

    const result = await createGitHubIssue({
      repo: "haneulcha/pourover-work",
      token: "ghp_secret",
      payload,
      fetchImpl,
    });

    expect(result).toEqual({ number: 7, htmlUrl: "https://gh/i/7" });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://api.github.com/repos/haneulcha/pourover-work/issues");
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer ghp_secret");
    expect(headers["X-GitHub-Api-Version"]).toBe("2022-11-28");
    expect(JSON.parse(init?.body as string)).toEqual({
      title: "T",
      body: "B",
      labels: ["idea"],
    });
  });

  it("throws on non-2xx with status + body", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response("not authorized", { status: 401 }),
    );

    await expect(
      createGitHubIssue({
        repo: "haneulcha/pourover-work",
        token: "bad",
        payload,
        fetchImpl,
      }),
    ).rejects.toThrow(/401.*not authorized/);
  });
});
