// The contract between the /api/identify route and the UI (KTD4).
// `IdentifyResult` is the TypeScript shape the UI consumes; `IDENTIFY_RESULT_SCHEMA`
// is the equivalent JSON Schema sent to Claude so the model returns the same shape.
// Defined once here, imported on both sides.

/** Reading-level / tone for generated content. */
export type Mode = "adult" | "kid";

export function isMode(value: unknown): value is Mode {
  return value === "adult" || value === "kid";
}

export interface IdentifyResult {
  /** The primary object Claude identified, e.g. "Stop sign". */
  name: string;
  /** Model confidence in the identification, 0–1. */
  confidence: number;
  /** One-sentence instant answer — the single, concise explanation shown. */
  instantAnswer: string;
}

/**
 * JSON Schema constraining Claude's structured output. Structured outputs do not
 * support numeric constraints, so the "0–1 confidence" rule is enforced in
 * `parseIdentifyResult` rather than the schema.
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
  },
  required: ["name", "confidence", "instantAnswer"],
  additionalProperties: false,
} as const;

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

// --- Daily discovery cards -------------------------------------------------
// Five "on this date in history" cards, one per rabbit-hole category, refreshed
// each day. Tapping one explores its `subject` in the normal story + why format.

export interface DailyCard {
  /** Rabbit-hole category key (history/science/people/geography/economics). */
  category: string;
  /** Short headline. */
  title: string;
  /** One-line hook. */
  teaser: string;
  /** The phrase to explore when the card is tapped. */
  subject: string;
}

export const DAILY_CARDS_SCHEMA = {
  type: "object",
  properties: {
    cards: {
      type: "array",
      description: "Exactly five cards, one per category, in the given order.",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "One of: history, science, people, geography, economics.",
          },
          title: { type: "string", description: "Short headline (a few words)." },
          teaser: { type: "string", description: "One-sentence hook." },
          subject: {
            type: "string",
            description: "The specific thing to explore (event, discovery, or person).",
          },
        },
        required: ["category", "title", "teaser", "subject"],
        additionalProperties: false,
      },
    },
  },
  required: ["cards"],
  additionalProperties: false,
} as const;

function isDailyCard(value: unknown): value is DailyCard {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.category === "string" &&
    typeof c.title === "string" &&
    c.title.trim() !== "" &&
    typeof c.teaser === "string" &&
    typeof c.subject === "string" &&
    c.subject.trim() !== ""
  );
}

/** Validate untrusted model output as a list of daily cards. */
export function parseDailyCards(value: unknown): DailyCard[] {
  if (typeof value !== "object" || value === null) {
    throw new IdentifyError("upstream", "Model returned a non-object daily response.");
  }
  const raw = (value as Record<string, unknown>).cards;
  if (!Array.isArray(raw) || !raw.every(isDailyCard) || raw.length === 0) {
    throw new IdentifyError("upstream", "Model returned malformed daily cards.");
  }
  return raw.map((c) => ({
    category: c.category.trim(),
    title: c.title.trim(),
    teaser: c.teaser.trim(),
    subject: c.subject.trim(),
  }));
}

// --- The Why Engine (curiosity component) ---------------------------------
// Recursive "why does this exist?" chain. Each step digs one causal layer deeper
// than the previous answer (Why Engine — History_Lens_Curiosity_Engine_Opportunity.md).

export interface WhyStep {
  /** The "Why...?" question at this layer. */
  question: string;
  /** A concise, accurate answer to that question. */
  answer: string;
}

/** JSON Schema for one deeper why-layer (OpenAI Structured Outputs). */
export const WHY_STEP_SCHEMA = {
  type: "object",
  properties: {
    question: {
      type: "string",
      description: "A short 'Why...?' question that digs one causal layer deeper than the previous answer.",
    },
    answer: {
      type: "string",
      description: "A concise, accurate answer to that question — one or two sentences.",
    },
  },
  required: ["question", "answer"],
  additionalProperties: false,
} as const;

/** Validate untrusted model output as a WhyStep; throws on a bad shape. */
export function parseWhyStep(value: unknown): WhyStep {
  if (typeof value !== "object" || value === null) {
    throw new IdentifyError("upstream", "Model returned a non-object why-step.");
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.question !== "string" || raw.question.trim() === "") {
    throw new IdentifyError("upstream", "Why-step is missing a question.");
  }
  if (typeof raw.answer !== "string" || raw.answer.trim() === "") {
    throw new IdentifyError("upstream", "Why-step is missing an answer.");
  }
  return { question: raw.question.trim(), answer: raw.answer.trim() };
}

/**
 * Validate an untrusted value (parsed model JSON) against the IdentifyResult
 * contract. Throws an `IdentifyError("upstream", …)` on any structural violation
 * and clamps confidence into [0,1].
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

  return {
    name: raw.name.trim(),
    confidence: Math.min(1, Math.max(0, raw.confidence)),
    instantAnswer: raw.instantAnswer.trim(),
  };
}
