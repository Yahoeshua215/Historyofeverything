import { describe, it, expect, vi, beforeEach } from "vitest";
import { IdentifyError, type WhyStep } from "@/lib/types";

// Mock only the live model call.
const { deeperWhy } = vi.hoisted(() => ({ deeperWhy: vi.fn() }));
vi.mock("@/lib/openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/openai")>();
  return { ...actual, deeperWhy };
});

import { POST } from "./route";

const step: WhyStep = {
  question: "Why does it exist?",
  answer: "To keep traffic safe at intersections.",
};

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/why", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  deeperWhy.mockReset();
});

describe("POST /api/why", () => {
  it("returns 200 with the next why-step on the happy path", async () => {
    deeperWhy.mockResolvedValue(step);
    const res = await POST(postRequest({ topic: "Stop sign", chain: [] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(step);
    expect(deeperWhy).toHaveBeenCalledWith("Stop sign", [], "adult");
  });

  it("passes the prior chain through to the model", async () => {
    deeperWhy.mockResolvedValue(step);
    const chain = [{ question: "Why?", answer: "Because." }];
    await POST(postRequest({ topic: "Stop sign", chain }));
    expect(deeperWhy).toHaveBeenCalledWith("Stop sign", chain, "adult");
  });

  it("defaults a missing chain to an empty array", async () => {
    deeperWhy.mockResolvedValue(step);
    await POST(postRequest({ topic: "Stop sign" }));
    expect(deeperWhy).toHaveBeenCalledWith("Stop sign", [], "adult");
  });

  it("passes kid mode through to the model", async () => {
    deeperWhy.mockResolvedValue(step);
    await POST(postRequest({ topic: "Stop sign", mode: "kid" }));
    expect(deeperWhy).toHaveBeenCalledWith("Stop sign", [], "kid");
  });

  it("returns 400 for an invalid mode", async () => {
    const res = await POST(postRequest({ topic: "Stop sign", mode: "teen" }));
    expect(res.status).toBe(400);
    expect(deeperWhy).not.toHaveBeenCalled();
  });

  it("returns 400 with no model call for a missing topic", async () => {
    const res = await POST(postRequest({ chain: [] }));
    expect(res.status).toBe(400);
    expect(deeperWhy).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed chain", async () => {
    const res = await POST(postRequest({ topic: "x", chain: [{ question: "q" }] }));
    expect(res.status).toBe(400);
    expect(deeperWhy).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(postRequest("{nope"));
    expect(res.status).toBe(400);
    expect(deeperWhy).not.toHaveBeenCalled();
  });

  it("maps a refusal to a typed 422", async () => {
    deeperWhy.mockRejectedValue(new IdentifyError("refused", "declined"));
    const res = await POST(postRequest({ topic: "x" }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.kind).toBe("refused");
  });

  it("maps an upstream failure to a 502", async () => {
    deeperWhy.mockRejectedValue(new IdentifyError("upstream", "network"));
    const res = await POST(postRequest({ topic: "x" }));
    expect(res.status).toBe(502);
  });

  it("maps an unexpected error to a 502", async () => {
    deeperWhy.mockRejectedValue(new Error("boom"));
    const res = await POST(postRequest({ topic: "x" }));
    expect(res.status).toBe(502);
  });
});
