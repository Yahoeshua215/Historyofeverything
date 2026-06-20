import { describe, it, expect, vi, beforeEach } from "vitest";
import { IdentifyError, type DailyCard } from "@/lib/types";

const { exploreDaily } = vi.hoisted(() => ({ exploreDaily: vi.fn() }));
vi.mock("@/lib/openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/openai")>();
  return { ...actual, exploreDaily };
});

import { POST } from "./route";

const cards: DailyCard[] = [
  { category: "history", title: "Event", teaser: "A thing happened.", subject: "A thing" },
];

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/daily", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => exploreDaily.mockReset());

describe("POST /api/daily", () => {
  it("returns 200 with cards for a date", async () => {
    exploreDaily.mockResolvedValue(cards);
    const res = await POST(postRequest({ date: "June 20" }));
    expect(res.status).toBe(200);
    expect((await res.json()).cards).toHaveLength(1);
    expect(exploreDaily).toHaveBeenCalledWith("June 20", "adult");
  });

  it("passes mode through", async () => {
    exploreDaily.mockResolvedValue(cards);
    await POST(postRequest({ date: "June 20", mode: "kid" }));
    expect(exploreDaily).toHaveBeenCalledWith("June 20", "kid");
  });

  it("rejects a missing/invalid date with no model call", async () => {
    expect((await POST(postRequest({}))).status).toBe(400);
    expect((await POST(postRequest({ date: "" }))).status).toBe(400);
    expect(exploreDaily).not.toHaveBeenCalled();
  });

  it("maps upstream → 502", async () => {
    exploreDaily.mockRejectedValueOnce(new IdentifyError("upstream", "down"));
    expect((await POST(postRequest({ date: "June 20" }))).status).toBe(502);
  });
});
