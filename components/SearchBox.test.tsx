import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SearchBox from "./SearchBox";

describe("SearchBox", () => {
  it("submits the trimmed term", () => {
    const onSearch = vi.fn();
    render(<SearchBox onSearch={onSearch} />);

    fireEvent.change(screen.getByLabelText(/search any topic/i), {
      target: { value: "  the printing press  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /explore/i }));

    expect(onSearch).toHaveBeenCalledWith("the printing press");
  });

  it("does not submit an empty/whitespace term", () => {
    const onSearch = vi.fn();
    render(<SearchBox onSearch={onSearch} />);

    // Button is disabled while empty; submitting the form is also a no-op.
    fireEvent.submit(screen.getByRole("search"));
    expect(onSearch).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/search any topic/i), {
      target: { value: "   " },
    });
    fireEvent.submit(screen.getByRole("search"));
    expect(onSearch).not.toHaveBeenCalled();
  });
});
