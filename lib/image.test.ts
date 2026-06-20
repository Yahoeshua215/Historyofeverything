import { describe, it, expect } from "vitest";
import { fitWithinMaxEdge, MAX_EDGE } from "./image";

describe("fitWithinMaxEdge", () => {
  it("caps the longest edge at the target and preserves aspect ratio", () => {
    expect(fitWithinMaxEdge(4000, 3000)).toEqual({ width: 1280, height: 960 });
    expect(fitWithinMaxEdge(1000, 2000)).toEqual({ width: 640, height: 1280 });
  });

  it("never upscales an image smaller than the target", () => {
    expect(fitWithinMaxEdge(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithinMaxEdge(MAX_EDGE, 400)).toEqual({ width: MAX_EDGE, height: 400 });
  });

  it("honours a custom max edge", () => {
    expect(fitWithinMaxEdge(2000, 1000, 500)).toEqual({ width: 500, height: 250 });
  });
});
