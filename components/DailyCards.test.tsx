import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DailyCards from "./DailyCards";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

const cards = [
  { category: "history", title: "Big Event", teaser: "Something happened.", subject: "Big Event subject" },
  { category: "science", title: "Discovery", teaser: "A science thing.", subject: "Discovery subject" },
];

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  window.localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("DailyCards", () => {
  it("loads and renders daily cards, firing onSelect", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({ cards }));
    const onSelect = vi.fn();
    render(<DailyCards mode="adult" onSelect={onSelect} />);

    expect(await screen.findByText("Big Event")).toBeTruthy();
    expect(screen.getByText("Discovery")).toBeTruthy();

    fireEvent.click(screen.getByText("Big Event"));
    expect(onSelect).toHaveBeenCalledWith(cards[0]);
  });

  it("shows an error state when the request fails", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ error: { kind: "upstream" } }, false, 502),
    );
    render(<DailyCards mode="adult" onSelect={vi.fn()} />);
    expect(await screen.findByText(/couldn.t load/i)).toBeTruthy();
  });

  it("serves a subsequent mount from cache (one fetch)", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(jsonResponse({ cards }));

    const { unmount } = render(<DailyCards mode="adult" onSelect={vi.fn()} />);
    await screen.findByText("Big Event");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    unmount();

    render(<DailyCards mode="adult" onSelect={vi.fn()} />);
    await screen.findByText("Big Event");
    expect(fetchMock).toHaveBeenCalledTimes(1); // cache hit, no new request
  });
});
