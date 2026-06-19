import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Stub Capture: a button that hands a fixed CapturedImage to the page (the real
// canvas downscale isn't exercisable in happy-dom — that path is tested in U3).
vi.mock("@/components/Capture", () => ({
  default: ({ onCapture }: { onCapture: (img: unknown) => void }) => (
    <button
      onClick={() =>
        onCapture({ base64: "ZmFrZQ==", mediaType: "image/jpeg", dataUrl: "data:," })
      }
    >
      scan-stub
    </button>
  ),
}));

import Home from "./page";

const result = {
  name: "Stop sign",
  confidence: 0.95,
  instantAnswer: "An octagonal red sign requiring drivers to stop.",
  storyCards: [
    { heading: "What is it?", body: "A traffic sign." },
    { heading: "Why?", body: "Right-of-way." },
    { heading: "Fact", body: "Once yellow." },
  ],
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Home flow", () => {
  it("capture → loading → 200 renders the StoryResult (R4)", async () => {
    let resolve!: (r: Response) => void;
    (fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise<Response>((r) => {
        resolve = r;
      }),
    );

    render(<Home />);
    fireEvent.click(screen.getByText("scan-stub"));

    // Loading state is shown while the request is in flight.
    expect(await screen.findByRole("status")).toBeTruthy();

    resolve(jsonResponse(result));

    expect(await screen.findByText("Stop sign")).toBeTruthy();
    expect(screen.getByText("An octagonal red sign requiring drivers to stop.")).toBeTruthy();
    expect(screen.getByText("← Scan again")).toBeTruthy();
  });

  it("shows a friendly message (not a crash) on a refusal (R5)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ error: { kind: "refused" } }, false, 422),
    );

    render(<Home />);
    fireEvent.click(screen.getByText("scan-stub"));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/couldn't analyse that image/i)).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("surfaces a retry-able error on a network failure", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("offline"));

    render(<Home />);
    fireEvent.click(screen.getByText("scan-stub"));

    expect(await screen.findByText(/network problem/i)).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("'Scan again' returns to idle and clears the previous result", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(result));

    render(<Home />);
    fireEvent.click(screen.getByText("scan-stub"));

    await screen.findByText("Stop sign");
    fireEvent.click(screen.getByText("← Scan again"));

    await waitFor(() => expect(screen.getByText("scan-stub")).toBeTruthy());
    expect(screen.queryByText("Stop sign")).toBeNull();
  });
});
