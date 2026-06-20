import { describe, it, expect, vi, beforeEach } from "vitest";
import { IdentifyError, type IdentifyResult } from "@/lib/types";

// Mock only the live model call; keep the real media-type validators.
const { identifyImage } = vi.hoisted(() => ({ identifyImage: vi.fn() }));
vi.mock("@/lib/openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/openai")>();
  return { ...actual, identifyImage };
});

import { POST } from "./route";

const sampleResult: IdentifyResult = {
  name: "Stop sign",
  confidence: 0.95,
  instantAnswer: "An octagonal red sign requiring drivers to come to a full stop.",
  storyCards: [
    { heading: "What is it?", body: "A regulatory traffic sign." },
    { heading: "Why does it exist?", body: "To assign right-of-way at intersections." },
    { heading: "Interesting fact", body: "It was originally yellow." },
  ],
};

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/identify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validBody = { image: "ZmFrZS1iYXNlNjQ=", mediaType: "image/jpeg" };

beforeEach(() => {
  identifyImage.mockReset();
});

describe("POST /api/identify", () => {
  it("returns 200 with an IdentifyResult on the happy path (R3)", async () => {
    identifyImage.mockResolvedValue(sampleResult);

    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.name).toBe("Stop sign");
    expect(json.storyCards).toHaveLength(3);
    expect(json.instantAnswer.length).toBeGreaterThan(0);

    expect(identifyImage).toHaveBeenCalledWith("ZmFrZS1iYXNlNjQ=", "image/jpeg", "adult");
  });

  it("passes kid mode through to the model", async () => {
    identifyImage.mockResolvedValue(sampleResult);
    await POST(postRequest({ ...validBody, mode: "kid" }));
    expect(identifyImage).toHaveBeenCalledWith("ZmFrZS1iYXNlNjQ=", "image/jpeg", "kid");
  });

  it("returns 400 for an invalid mode, with no model call", async () => {
    const res = await POST(postRequest({ ...validBody, mode: "grownup" }));
    expect(res.status).toBe(400);
    expect(identifyImage).not.toHaveBeenCalled();
  });

  it("returns 400 and makes no Claude call when the image is missing", async () => {
    const res = await POST(postRequest({ mediaType: "image/jpeg" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.kind).toBe("bad_request");
    expect(identifyImage).not.toHaveBeenCalled();
  });

  it("returns 400 when the body is not valid JSON", async () => {
    const res = await POST(postRequest("{not json"));
    expect(res.status).toBe(400);
    expect(identifyImage).not.toHaveBeenCalled();
  });

  it("returns 400 for a missing or unsupported media type", async () => {
    const missing = await POST(postRequest({ image: "abc" }));
    expect(missing.status).toBe(400);

    const bad = await POST(postRequest({ image: "abc", mediaType: "image/tiff" }));
    expect(bad.status).toBe(400);

    expect(identifyImage).not.toHaveBeenCalled();
  });

  it("returns 400 for an oversized image, with no Claude call", async () => {
    const huge = "a".repeat(9_000_000);
    const res = await POST(postRequest({ image: huge, mediaType: "image/jpeg" }));
    expect(res.status).toBe(400);
    expect(identifyImage).not.toHaveBeenCalled();
  });

  it("maps a refusal to a typed 422 error, not a 500", async () => {
    identifyImage.mockRejectedValue(new IdentifyError("refused", "declined"));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(422);
    expect((await res.json()).error.kind).toBe("refused");
  });

  it("maps an unidentifiable image to a typed 422 error", async () => {
    identifyImage.mockRejectedValue(
      new IdentifyError("unidentifiable", "couldn't identify"),
    );
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(422);
    expect((await res.json()).error.kind).toBe("unidentifiable");
  });

  it("maps an upstream/network failure to a 502, not an unhandled crash", async () => {
    identifyImage.mockRejectedValue(new IdentifyError("upstream", "network down"));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(502);
    expect((await res.json()).error.kind).toBe("upstream");
  });

  it("maps an unexpected thrown error to a 502", async () => {
    identifyImage.mockRejectedValue(new Error("boom"));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(502);
  });
});
