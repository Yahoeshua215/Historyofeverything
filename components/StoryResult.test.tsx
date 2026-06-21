import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StoryResult from "./StoryResult";
import type { IdentifyResult } from "@/lib/types";

function makeResult(overrides: Partial<IdentifyResult> = {}): IdentifyResult {
  return {
    name: "Stop sign",
    confidence: 0.95,
    instantAnswer: "An octagonal red sign requiring drivers to come to a full stop.",
    ...overrides,
  };
}

describe("StoryResult", () => {
  it("renders the name and the single concise answer (R4)", () => {
    render(<StoryResult result={makeResult()} />);
    expect(screen.getByText("Stop sign")).toBeTruthy();
    expect(
      screen.getByText(/octagonal red sign requiring drivers/i),
    ).toBeTruthy();
  });

  it("does not render any context-card articles (simplified view)", () => {
    render(<StoryResult result={makeResult()} />);
    expect(document.querySelectorAll("article")).toHaveLength(0);
  });

  it("shows the uncertainty hint only when confidence is low", () => {
    const { unmount } = render(<StoryResult result={makeResult({ confidence: 0.3 })} />);
    expect(screen.getByTestId("confidence-hint")).toBeTruthy();
    unmount();

    render(<StoryResult result={makeResult({ confidence: 0.95 })} />);
    expect(screen.queryByTestId("confidence-hint")).toBeNull();
  });
});
