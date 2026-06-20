import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NarrateButton from "./NarrateButton";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NarrateButton", () => {
  it("renders nothing when speech synthesis is unavailable", () => {
    vi.stubGlobal("speechSynthesis", undefined);
    vi.stubGlobal("SpeechSynthesisUtterance", undefined);
    const { container } = render(<NarrateButton text="hi" />);
    expect(container.querySelector("button")).toBeNull();
  });

  it("speaks the text on click and stops on the next click", async () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    vi.stubGlobal("speechSynthesis", { speak, cancel });
    class FakeUtterance {
      text: string;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);

    render(<NarrateButton text="hello world" />);

    fireEvent.click(await screen.findByRole("button", { name: /read aloud/i }));
    expect(speak).toHaveBeenCalledOnce();
    expect(speak.mock.calls[0][0].text).toBe("hello world");

    fireEvent.click(await screen.findByRole("button", { name: /stop/i }));
    expect(cancel).toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: /read aloud/i })).toBeTruthy();
  });
});
