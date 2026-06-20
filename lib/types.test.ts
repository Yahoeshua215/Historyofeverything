import { describe, it, expect } from "vitest";
import {
  parseIdentifyResult,
  parseWhyStep,
  IdentifyError,
  IDENTIFY_RESULT_SCHEMA,
} from "./types";

const validRaw = {
  name: "Stop sign",
  confidence: 0.97,
  instantAnswer: "A standardized octagonal traffic sign requiring drivers to halt.",
  storyCards: [
    { heading: "What is it?", body: "An eight-sided red regulatory traffic sign." },
    { heading: "Why does it exist?", body: "To assign right-of-way and prevent collisions at intersections." },
    { heading: "How has it changed?", body: "It was yellow until the 1950s when retroreflective red became standard." },
  ],
};

describe("parseIdentifyResult", () => {
  it("parses a schema-valid object into an IdentifyResult", () => {
    const result = parseIdentifyResult(validRaw);
    expect(result.name).toBe("Stop sign");
    expect(result.confidence).toBeCloseTo(0.97);
    expect(result.instantAnswer.length).toBeGreaterThan(0);
    expect(result.storyCards).toHaveLength(3);
    expect(result.storyCards[0]).toEqual({
      heading: "What is it?",
      body: "An eight-sided red regulatory traffic sign.",
    });
  });

  it("accepts up to 5 cards and trims extras", () => {
    const six = {
      ...validRaw,
      storyCards: Array.from({ length: 6 }, (_, i) => ({
        heading: `H${i}`,
        body: `B${i}`,
      })),
    };
    expect(parseIdentifyResult(six).storyCards).toHaveLength(5);
  });

  it("clamps confidence into [0,1]", () => {
    expect(parseIdentifyResult({ ...validRaw, confidence: 1.4 }).confidence).toBe(1);
    expect(parseIdentifyResult({ ...validRaw, confidence: -0.2 }).confidence).toBe(0);
  });

  it("throws on fewer than 3 cards", () => {
    expect(() =>
      parseIdentifyResult({ ...validRaw, storyCards: [validRaw.storyCards[0]] }),
    ).toThrow();
  });

  it("ignores blank-body cards when counting toward the minimum", () => {
    const withBlanks = {
      ...validRaw,
      storyCards: [
        validRaw.storyCards[0],
        validRaw.storyCards[1],
        { heading: "Blank", body: "   " },
      ],
    };
    // Only 2 usable cards → below the minimum → throws.
    expect(() => parseIdentifyResult(withBlanks)).toThrow();
  });

  it("throws when required fields are missing or wrong type", () => {
    expect(() => parseIdentifyResult({ ...validRaw, name: "" })).toThrow();
    expect(() => parseIdentifyResult({ ...validRaw, instantAnswer: 5 })).toThrow();
    expect(() => parseIdentifyResult(null)).toThrow();
    expect(() =>
      parseIdentifyResult({ ...validRaw, storyCards: [{ heading: "x" }] }),
    ).toThrow();
  });
});

describe("parseWhyStep", () => {
  it("parses and trims a valid why-step", () => {
    const step = parseWhyStep({
      question: "  Why does it exist? ",
      answer: " To keep traffic safe. ",
    });
    expect(step).toEqual({
      question: "Why does it exist?",
      answer: "To keep traffic safe.",
    });
  });

  it("throws on missing or empty fields", () => {
    expect(() => parseWhyStep({ question: "Why?" })).toThrow();
    expect(() => parseWhyStep({ question: "", answer: "x" })).toThrow();
    expect(() => parseWhyStep({ question: "Why?", answer: "   " })).toThrow();
    expect(() => parseWhyStep(null)).toThrow();
  });
});

describe("IdentifyError", () => {
  it("carries a discriminating kind", () => {
    const err = new IdentifyError("refused", "Model declined");
    expect(err).toBeInstanceOf(Error);
    expect(err.kind).toBe("refused");
    expect(err.message).toBe("Model declined");
  });
});

describe("IDENTIFY_RESULT_SCHEMA", () => {
  it("is a closed object schema requiring the four contract fields", () => {
    expect(IDENTIFY_RESULT_SCHEMA.type).toBe("object");
    expect(IDENTIFY_RESULT_SCHEMA.additionalProperties).toBe(false);
    expect(IDENTIFY_RESULT_SCHEMA.required).toEqual([
      "name",
      "confidence",
      "instantAnswer",
      "storyCards",
    ]);
  });
});
