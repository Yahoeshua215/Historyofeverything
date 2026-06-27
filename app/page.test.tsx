import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Stub Capture: a button that hands a fixed CapturedImage to the page (the real
// canvas downscale isn't exercisable in happy-dom — that path is tested in U3).
// Renders regardless of variant, so it stands in for the bottom-nav scan tab and
// the search sheet's image button alike.
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

// Stub DailyCards so it doesn't fetch /api/daily on mount (would collide with the
// shared fetch mock). Exposes a button that selects a fixed daily card.
vi.mock("@/components/DailyCards", () => ({
  default: ({ onSelect }: { onSelect: (c: unknown) => void }) => (
    <button
      onClick={() =>
        onSelect({ category: "history", title: "T", teaser: "x", subject: "Apollo 11" })
      }
    >
      daily-stub
    </button>
  ),
}));

import Home from "./page";

const result = {
  name: "Stop sign",
  confidence: 0.95,
  instantAnswer: "An octagonal red sign requiring drivers to stop.",
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

// The scan tab lives in the bottom nav; grab the first stubbed capture button.
function scanTab(): HTMLElement {
  return screen.getAllByText("scan-stub")[0];
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  window.localStorage.clear();
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
    fireEvent.click(scanTab());

    // Loading state is shown while the request is in flight.
    expect(await screen.findByRole("status")).toBeTruthy();

    resolve(jsonResponse(result));

    expect(await screen.findByText("Stop sign")).toBeTruthy();
    expect(screen.getByText("An octagonal red sign requiring drivers to stop.")).toBeTruthy();
    // Reset is now the persistent wordmark.
    expect(screen.getByRole("button", { name: "EverWhy" })).toBeTruthy();
  });

  it("shows a friendly message (not a crash) on a refusal (R5)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ error: { kind: "refused" } }, false, 422),
    );

    render(<Home />);
    fireEvent.click(scanTab());

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/couldn't analyse that image/i)).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("surfaces a retry-able error on a network failure", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("offline"));

    render(<Home />);
    fireEvent.click(scanTab());

    expect(await screen.findByText(/network problem/i)).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("the top back button returns to the landing page", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(result));

    render(<Home />);
    fireEvent.click(scanTab());

    await screen.findByText("Stop sign");
    fireEvent.click(screen.getByRole("button", { name: /back to start/i }));

    await waitFor(() => expect(screen.getByText("daily-stub")).toBeTruthy());
    expect(screen.queryByText("Stop sign")).toBeNull();
  });

  it("the wordmark returns to idle and clears the previous result", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(result));

    render(<Home />);
    fireEvent.click(scanTab());

    await screen.findByText("Stop sign");
    fireEvent.click(screen.getByRole("button", { name: "EverWhy" }));

    // Back on the landing: the daily suggestions are shown and the result is gone.
    await waitFor(() => expect(screen.getByText("daily-stub")).toBeTruthy());
    expect(screen.queryByText("Stop sign")).toBeNull();
  });

  it("sends the selected mode to /api/identify (Kid Mode)", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(jsonResponse(result));

    render(<Home />);
    // The mode tab toggles adult ⇄ kid; one tap switches to Kid.
    fireEvent.click(screen.getByRole("button", { name: /adult/i }));
    fireEvent.click(scanTab());

    await screen.findByText("Stop sign");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.mode).toBe("kid");
  });

  it("saves a scan to history and can re-open it from the history sheet", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(result));

    render(<Home />);
    fireEvent.click(scanTab());
    await screen.findByText("Stop sign");

    // The history tab shows the count; reset away from the result, then open it.
    expect(await screen.findByRole("button", { name: /history \(1\)/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "EverWhy" }));
    fireEvent.click(await screen.findByRole("button", { name: /history \(1\)/i }));

    // The saved record is listed in the sheet; selecting it re-opens the story.
    expect(await screen.findByText("Stop sign")).toBeTruthy();
    fireEvent.click(screen.getByText("Stop sign"));
    expect(
      await screen.findByText("An octagonal red sign requiring drivers to stop."),
    ).toBeTruthy();
  });

  it("a text search explores the typed term via /api/explore", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(jsonResponse({ ...result, name: "Printing press" }));

    render(<Home />);
    // Open the search sheet from the bottom nav, then type a query.
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    fireEvent.change(screen.getByLabelText(/search any topic/i), {
      target: { value: "printing press" },
    });
    fireEvent.click(screen.getByRole("button", { name: /explore/i }));

    expect(await screen.findByText("Printing press")).toBeTruthy();
    const call = fetchMock.mock.calls.find((c) => c[0] === "/api/explore");
    expect(call).toBeTruthy();
    expect(JSON.parse(call![1].body)).toMatchObject({ topic: "printing press" });
  });

  it("tapping a daily card explores its subject via /api/explore", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(jsonResponse({ ...result, name: "Apollo 11" }));

    render(<Home />);
    fireEvent.click(screen.getByText("daily-stub"));

    expect(await screen.findByText("Apollo 11")).toBeTruthy();
    const call = fetchMock.mock.calls.find((c) => c[0] === "/api/explore");
    expect(call).toBeTruthy();
    expect(JSON.parse(call![1].body)).toMatchObject({ topic: "Apollo 11", lens: "history" });
  });

  it("the search sheet offers both a text field and an image control", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(result));

    render(<Home />);
    fireEvent.click(scanTab());
    await screen.findByText("Stop sign");

    // Open the search sheet — it pairs a search field with an image button.
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    expect(screen.getByRole("dialog", { name: /search anything/i })).toBeTruthy();
    expect(screen.getByLabelText(/search any topic/i)).toBeTruthy();
    expect(screen.getAllByText("scan-stub").length).toBeGreaterThanOrEqual(2);
  });

  it("the search sheet explores a new topic from the result page", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(jsonResponse(result));

    render(<Home />);
    fireEvent.click(scanTab());
    await screen.findByText("Stop sign");

    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    fireEvent.change(screen.getByLabelText(/search any topic/i), {
      target: { value: "jet engine" },
    });
    fireEvent.click(screen.getByRole("button", { name: /explore/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find((c) => c[0] === "/api/explore");
      expect(call).toBeTruthy();
      expect(JSON.parse(call![1].body)).toMatchObject({ topic: "jet engine" });
    });
  });

  it("a lens from the lens sheet explores the current subject through that lens", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(jsonResponse(result));

    render(<Home />);
    fireEvent.click(scanTab());
    await screen.findByText("Stop sign");

    // Open the lens sheet, then pick a lens.
    fireEvent.click(screen.getByRole("button", { name: /^lens$/i }));
    fireEvent.click(screen.getByRole("button", { name: /economics/i }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.some((c) => c[0] === "/api/explore")).toBe(true),
    );
    const call = fetchMock.mock.calls.find((c) => c[0] === "/api/explore");
    expect(JSON.parse(call![1].body)).toMatchObject({ topic: "Stop sign", lens: "economics" });
  });
});
