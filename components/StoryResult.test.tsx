import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StoryResult from "./StoryResult";
import type { IdentifyResult } from "@/lib/types";

function makeResult(overrides: Partial<IdentifyResult> = {}): IdentifyResult {
  return {
    name: "Stop sign",
    confidence: 0.95,
    instantAnswer: "An octagonal red sign requiring drivers to come to a full stop.",
    storyCards: [
      { heading: "What is it?", body: "A regulatory traffic sign." },
      { heading: "Why does it exist?", body: "To assign right-of-way." },
      { heading: "Interesting fact", body: "It was originally yellow." },
    ],
    ...overrides,
  };
}

describe("StoryResult", () => {
  it("renders the name, instant answer, and every story card (R4)", () => {
    render(<StoryResult result={makeResult()} />);
    expect(screen.getByText("Stop sign")).toBeTruthy();
    expect(
      screen.getByText(/octagonal red sign requiring drivers/i),
    ).toBeTruthy();
    expect(screen.getByText("What is it?")).toBeTruthy();
    expect(screen.getByText("Why does it exist?")).toBeTruthy();
    expect(screen.getByText("Interesting fact")).toBeTruthy();
    expect(screen.getByText("It was originally yellow.")).toBeTruthy();
  });

  it("renders both the minimum (3) and maximum (5) card counts", () => {
    const { unmount } = render(<StoryResult result={makeResult()} />);
    expect(document.querySelectorAll("article")).toHaveLength(3);
    unmount();

    const five = makeResult({
      storyCards: Array.from({ length: 5 }, (_, i) => ({
        heading: `H${i}`,
        body: `B${i}`,
      })),
    });
    render(<StoryResult result={five} />);
    expect(document.querySelectorAll("article")).toHaveLength(5);
  });

  it("shows the uncertainty hint only when confidence is low", () => {
    const { unmount } = render(<StoryResult result={makeResult({ confidence: 0.3 })} />);
    expect(screen.getByTestId("confidence-hint")).toBeTruthy();
    unmount();

    render(<StoryResult result={makeResult({ confidence: 0.95 })} />);
    expect(screen.queryByTestId("confidence-hint")).toBeNull();
  });

  it("skips a story card with an empty body", () => {
    const withEmpty = makeResult({
      storyCards: [
        { heading: "What is it?", body: "A regulatory traffic sign." },
        { heading: "Why does it exist?", body: "To assign right-of-way." },
        { heading: "Interesting fact", body: "It was originally yellow." },
        { heading: "Empty", body: "   " },
      ],
    });
    render(<StoryResult result={withEmpty} />);
    expect(document.querySelectorAll("article")).toHaveLength(3);
    expect(screen.queryByText("Empty")).toBeNull();
  });
});
