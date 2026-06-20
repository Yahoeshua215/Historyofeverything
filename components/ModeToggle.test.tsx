import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ModeToggle from "./ModeToggle";

describe("ModeToggle", () => {
  it("marks the active mode as pressed", () => {
    render(<ModeToggle mode="kid" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Kid" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Adult" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("fires onChange with the chosen mode", () => {
    const onChange = vi.fn();
    render(<ModeToggle mode="adult" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Kid" }));
    expect(onChange).toHaveBeenCalledWith("kid");
  });
});
