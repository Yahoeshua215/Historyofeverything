// The contract between the /api/identify route and the UI (KTD4).
// `IdentifyResult` is the TypeScript shape the UI consumes; `IDENTIFY_RESULT_SCHEMA`
// is the equivalent JSON Schema sent to Claude so the model returns the same shape.
// Defined once here, imported on both sides.

export interface StoryCard {
  /** Short label, e.g. "What is it?" / "Why does it exist?" */
  heading: string;
  /** A couple of sentences of readable story text. */
  body: string;
}

export interface IdentifyResult {
  /** The primary object Claude identified, e.g. "Stop sign". */
  name: string;
  /** Model confidence in the identification, 0–1. */
  confidence: number;
  /** One-sentence Layer 1 instant answer. */
  instantAnswer: string;
  /** 3–5 Layer 2 story cards. */
  storyCards: StoryCard[];
}

/**
 * JSON Schema constraining Claude's structured output. Structured outputs do not
 * support numeric/array-length constraints, so the "0–1 confidence" and "3–5 cards"
 * rules are enforced in `parseIdentifyResult` rather than the schema.
 */
export const IDENTIFY_RESULT_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "The single primary object in the image, e.g. 'Stop sign'.",
    },
    confidence: {
      type: "number",
      description: "Confidence in the identification, 0 (unsure) to 1 (certain).",
    },
    instantAnswer: {
      type: "string",
      description: "One plain sentence answering 'what is this and why does it exist'.",
    },
    storyCards: {
      type: "array",
      description:
        "3 to 5 short story cards covering what it is, why it exists, how it changed, an interesting fact, and what it relates to.",
      items: {
        type: "object",
        properties: {
          heading: {
            type: "string",
            description: "Short card label, e.g. 'Why does it exist?'.",
          },
          body: {
            type: "string",
            description: "One to three sentences of readable story text.",
          },
        },
        required: ["heading", "body"],
        additionalProperties: false,
      },
    },
  },
  required: ["name", "confidence", "instantAnswer", "storyCards"],
  additionalProperties: false,
} as const;

export const MIN_STORY_CARDS = 3;
export const MAX_STORY_CARDS = 5;

/** Discriminates the failure modes the route surfaces to the client. */
export type IdentifyErrorKind =
  | "bad_request" // malformed/oversized/invalid input — no Claude call made
  | "unidentifiable" // Claude couldn't recognise anything in the image
  | "refused" // Claude declined the request (stop_reason: "refusal")
  | "upstream"; // Claude/network failure

export class IdentifyError extends Error {
  readonly kind: IdentifyErrorKind;

  constructor(kind: IdentifyErrorKind, message: string) {
    super(message);
    this.name = "IdentifyError";
    this.kind = kind;
  }
}

function isStoryCard(value: unknown): value is StoryCard {
  if (typeof value !== "object" || value === null) return false;
  const card = value as Record<string, unknown>;
  return typeof card.heading === "string" && typeof card.body === "string";
}

/**
 * Validate an untrusted value (parsed model JSON) against the IdentifyResult
 * contract. Throws an `IdentifyError("upstream", …)` on any structural violation,
 * clamps confidence into [0,1], and trims story cards to at most MAX_STORY_CARDS.
 */
export function parseIdentifyResult(value: unknown): IdentifyResult {
  if (typeof value !== "object" || value === null) {
    throw new IdentifyError("upstream", "Model returned a non-object response.");
  }
  const raw = value as Record<string, unknown>;

  if (typeof raw.name !== "string" || raw.name.trim() === "") {
    throw new IdentifyError("upstream", "Model response is missing a name.");
  }
  if (typeof raw.confidence !== "number" || Number.isNaN(raw.confidence)) {
    throw new IdentifyError("upstream", "Model response has an invalid confidence.");
  }
  if (typeof raw.instantAnswer !== "string" || raw.instantAnswer.trim() === "") {
    throw new IdentifyError("upstream", "Model response is missing an instant answer.");
  }
  if (!Array.isArray(raw.storyCards) || !raw.storyCards.every(isStoryCard)) {
    throw new IdentifyError("upstream", "Model response has malformed story cards.");
  }
  // Only cards with real content count toward the minimum — otherwise an all-blank
  // set passes the length check and renders as an empty story (defeats MIN_STORY_CARDS).
  const usableCards = (raw.storyCards as StoryCard[])
    .filter((card) => card.heading.trim() !== "" && card.body.trim() !== "")
    .map((card) => ({ heading: card.heading.trim(), body: card.body.trim() }));
  if (usableCards.length < MIN_STORY_CARDS) {
    throw new IdentifyError(
      "upstream",
      `Model returned ${usableCards.length} usable story cards; need at least ${MIN_STORY_CARDS}.`,
    );
  }

  return {
    name: raw.name.trim(),
    confidence: Math.min(1, Math.max(0, raw.confidence)),
    instantAnswer: raw.instantAnswer.trim(),
    storyCards: usableCards.slice(0, MAX_STORY_CARDS),
  };
}
