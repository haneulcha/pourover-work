import { describe, expect, it } from "vitest";
import app from "./index";

describe("GET /healthz", () => {
  it("returns ok with package name and version", async () => {
    const res = await app.request("/healthz");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);

    const body = (await res.json()) as {
      ok: boolean;
      name: string;
      version: string;
    };
    expect(body).toEqual({
      ok: true,
      name: "@pourover/api",
      version: "0.0.0",
    });
  });

  it("returns 404 for unknown routes", async () => {
    const res = await app.request("/does-not-exist");
    expect(res.status).toBe(404);
  });
});
