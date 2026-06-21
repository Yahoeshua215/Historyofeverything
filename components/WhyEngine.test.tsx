import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WhyEngine from "./WhyEngine";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WhyEngine", () => {
  it("appends a why-step and tracks depth on each tap", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ question: "Why does it exist?", answer: "For safety." }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ question: "Why is safety needed?", answer: "Cars are fast." }),
      );

    render(<WhyEngine topic="Stop sign" />);
    fireEvent.click(screen.getByRole("button", { name: /why/i }));

    // Only the answer is shown (the question is redundant and hidden).
    expect(await screen.findByText("For safety.")).toBeTruthy();
    expect(screen.queryByText("Why does it exist?")).toBeNull();
    expect(screen.getByTestId("why-depth").textContent).toContain("1");

    fireEvent.click(screen.getByRole("button", { name: /why/i }));
    expect(await screen.findByText("Cars are fast.")).toBeTruthy();
    expect(screen.getByTestId("why-depth").textContent).toContain("2");
  });

  it("sends the topic and accumulated chain to /api/why", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(
      jsonResponse({ question: "Why does it exist?", answer: "Because." }),
    );

    render(<WhyEngine topic="Stop sign" />);
    fireEvent.click(screen.getByRole("button", { name: /why/i }));
    await screen.findByText("Because.");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ topic: "Stop sign", chain: [], mode: "adult" });
  });

  it("shows a friendly error and no new step on failure", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(jsonResponse({ error: { kind: "refused" } }, false, 422));

    render(<WhyEngine topic="Stop sign" />);
    fireEvent.click(screen.getByRole("button", { name: /why/i }));

    await waitFor(() =>
      expect(screen.getByText(/can't follow that thread/i)).toBeTruthy(),
    );
    expect(screen.queryByTestId("why-depth")).toBeNull();
  });
});
