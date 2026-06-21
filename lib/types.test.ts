import { describe, it, expect } from "vitest";
import {
  parseIdentifyResult,
  parseWhyStep,
  parseDailyCards,
  IdentifyError,
  IDENTIFY_RESULT_SCHEMA,
} from "./types";

const validRaw = {
  name: "Stop sign",
  confidence: 0.97,
  instantAnswer: "A standardized octagonal traffic sign requiring drivers to halt.",
};

describe("parseIdentifyResult", () => {
  it("parses a schema-valid object into an IdentifyResult", () => {
    const result = parseIdentifyResult(validRaw);
    expect(result.name).toBe("Stop sign");
    expect(result.confidence).toBeCloseTo(0.97);
    expect(result.instantAnswer.length).toBeGreaterThan(0);
  });

  it("trims surrounding whitespace on the text fields", () => {
    const result = parseIdentifyResult({
      ...validRaw,
      name: "  Stop sign  ",
      instantAnswer: "  A sign.  ",
    });
    expect(result.name).toBe("Stop sign");
    expect(result.instantAnswer).toBe("A sign.");
  });

  it("clamps confidence into [0,1]", () => {
    expect(parseIdentifyResult({ ...validRaw, confidence: 1.4 }).confidence).toBe(1);
    expect(parseIdentifyResult({ ...validRaw, confidence: -0.2 }).confidence).toBe(0);
  });

  it("throws when required fields are missing or wrong type", () => {
    expect(() => parseIdentifyResult({ ...validRaw, name: "" })).toThrow();
    expect(() => parseIdentifyResult({ ...validRaw, instantAnswer: 5 })).toThrow();
    expect(() => parseIdentifyResult({ ...validRaw, confidence: "high" })).toThrow();
    expect(() => parseIdentifyResult(null)).toThrow();
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

describe("parseDailyCards", () => {
  const card = {
    category: "history",
    title: " Event ",
    teaser: " A thing happened. ",
    subject: " A thing ",
  };

  it("parses and trims a cards array", () => {
    const cards = parseDailyCards({ cards: [card] });
    expect(cards).toHaveLength(1);
    expect(cards[0]).toEqual({
      category: "history",
      title: "Event",
      teaser: "A thing happened.",
      subject: "A thing",
    });
  });

  it("throws on missing/empty cards or bad shape", () => {
    expect(() => parseDailyCards({ cards: [] })).toThrow();
    expect(() => parseDailyCards({})).toThrow();
    expect(() => parseDailyCards({ cards: [{ category: "history" }] })).toThrow();
    expect(() => parseDailyCards(null)).toThrow();
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
  it("is a closed object schema requiring the three contract fields", () => {
    expect(IDENTIFY_RESULT_SCHEMA.type).toBe("object");
    expect(IDENTIFY_RESULT_SCHEMA.additionalProperties).toBe(false);
    expect(IDENTIFY_RESULT_SCHEMA.required).toEqual([
      "name",
      "confidence",
      "instantAnswer",
    ]);
  });
});
