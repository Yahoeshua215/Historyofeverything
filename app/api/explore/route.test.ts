import { describe, it, expect, vi, beforeEach } from "vitest";
import { IdentifyError, type IdentifyResult } from "@/lib/types";

const { exploreTopic } = vi.hoisted(() => ({ exploreTopic: vi.fn() }));
vi.mock("@/lib/openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/openai")>();
  return { ...actual, exploreTopic };
});

import { POST } from "./route";

const result: IdentifyResult = {
  name: "Wright brothers' first flight",
  confidence: 1,
  instantAnswer: "The first sustained powered flight, in 1903.",
};

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/explore", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => exploreTopic.mockReset());

describe("POST /api/explore", () => {
  it("returns 200 with a story for a topic", async () => {
    exploreTopic.mockResolvedValue(result);
    const res = await POST(postRequest({ topic: "Wright brothers" }));
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("Wright brothers' first flight");
    expect(exploreTopic).toHaveBeenCalledWith("Wright brothers", undefined, "adult");
  });

  it("passes a category lens and mode through", async () => {
    exploreTopic.mockResolvedValue(result);
    await POST(postRequest({ topic: "Stop sign", lens: "economics", mode: "kid" }));
    expect(exploreTopic).toHaveBeenCalledWith("Stop sign", "economics", "kid");
  });

  it("rejects a missing topic, an unknown lens, and an invalid mode", async () => {
    expect((await POST(postRequest({}))).status).toBe(400);
    expect((await POST(postRequest({ topic: "x", lens: "sports" }))).status).toBe(400);
    expect((await POST(postRequest({ topic: "x", mode: "teen" }))).status).toBe(400);
    expect(exploreTopic).not.toHaveBeenCalled();
  });

  it("maps refusal → 422 and upstream → 502", async () => {
    exploreTopic.mockRejectedValueOnce(new IdentifyError("refused", "no"));
    expect((await POST(postRequest({ topic: "x" }))).status).toBe(422);
    exploreTopic.mockRejectedValueOnce(new IdentifyError("upstream", "down"));
    expect((await POST(postRequest({ topic: "x" }))).status).toBe(502);
  });
});
