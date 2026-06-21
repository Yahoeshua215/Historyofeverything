import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HistoryView from "./HistoryView";
import type { ScanRecord } from "@/lib/history";

const records: ScanRecord[] = [
  {
    id: "1",
    createdAt: 1_700_000_000_000,
    mode: "adult",
    name: "Stop sign",
    confidence: 0.9,
    instantAnswer: "An octagonal red traffic sign.",
  },
  {
    id: "2",
    createdAt: 1_700_000_100_000,
    mode: "kid",
    name: "Oak tree",
    confidence: 0.8,
    instantAnswer: "A big leafy tree.",
  },
];

describe("HistoryView", () => {
  it("shows an empty state with no clear button", () => {
    render(
      <HistoryView records={[]} onSelect={vi.fn()} onClear={vi.fn()} onBack={vi.fn()} />,
    );
    expect(screen.getByText(/no scans yet/i)).toBeTruthy();
    expect(screen.queryByText("Clear")).toBeNull();
  });

  it("lists records and fires onSelect when one is tapped", () => {
    const onSelect = vi.fn();
    render(
      <HistoryView records={records} onSelect={onSelect} onClear={vi.fn()} onBack={vi.fn()} />,
    );
    expect(screen.getByText("Stop sign")).toBeTruthy();
    expect(screen.getByText("Oak tree")).toBeTruthy();

    fireEvent.click(screen.getByText("Oak tree"));
    expect(onSelect).toHaveBeenCalledWith(records[1]);
  });

  it("fires onClear and onBack", () => {
    const onClear = vi.fn();
    const onBack = vi.fn();
    render(
      <HistoryView records={records} onSelect={vi.fn()} onClear={onClear} onBack={onBack} />,
    );
    fireEvent.click(screen.getByText("Clear"));
    expect(onClear).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText("← Back"));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
