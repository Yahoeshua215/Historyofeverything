import { describe, it, expect, beforeEach } from "vitest";
import { getHistory, saveScan, clearHistory } from "./history";
import type { IdentifyResult } from "./types";

const result: IdentifyResult = {
  name: "Stop sign",
  confidence: 0.9,
  instantAnswer: "An octagonal red traffic sign.",
};

beforeEach(() => {
  clearHistory();
});

describe("history store", () => {
  it("starts empty", () => {
    expect(getHistory()).toEqual([]);
  });

  it("saves a scan with an id, timestamp, and mode, newest-first", () => {
    saveScan(result, "adult");
    const saved = saveScan({ ...result, name: "Oak tree" }, "kid");

    const history = getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].name).toBe("Oak tree"); // newest first
    expect(history[1].name).toBe("Stop sign");
    expect(saved.id).toBeTruthy();
    expect(typeof saved.createdAt).toBe("number");
    expect(saved.mode).toBe("kid");
  });

  it("returns the saved record from saveScan", () => {
    const saved = saveScan(result, "adult");
    expect(saved.name).toBe("Stop sign");
    expect(saved.instantAnswer).toBe("An octagonal red traffic sign.");
  });

  it("clears history", () => {
    saveScan(result, "adult");
    clearHistory();
    expect(getHistory()).toEqual([]);
  });

  it("survives corrupt storage by returning empty", () => {
    window.localStorage.setItem("history-lens:scans", "{not json");
    expect(getHistory()).toEqual([]);
  });
});
