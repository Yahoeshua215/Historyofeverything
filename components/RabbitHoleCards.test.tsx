import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RabbitHoleCards from "./RabbitHoleCards";
import { CATEGORIES } from "@/lib/categories";

describe("RabbitHoleCards", () => {
  it("renders all categories and fires onSelect with the chosen one", () => {
    const onSelect = vi.fn();
    render(<RabbitHoleCards onSelect={onSelect} />);

    for (const c of CATEGORIES) {
      expect(screen.getByRole("button", { name: new RegExp(c.label, "i") })).toBeTruthy();
    }

    fireEvent.click(screen.getByRole("button", { name: /economics/i }));
    expect(onSelect).toHaveBeenCalledWith(
      CATEGORIES.find((c) => c.key === "economics"),
    );
  });

  it("marks the active lens as pressed", () => {
    render(<RabbitHoleCards onSelect={vi.fn()} active="science" />);
    expect(
      screen.getByRole("button", { name: /science/i }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: /history/i }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("disables the chips when disabled", () => {
    render(<RabbitHoleCards onSelect={vi.fn()} disabled />);
    expect(
      (screen.getByRole("button", { name: /history/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
