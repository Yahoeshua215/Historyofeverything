import OpenAI from "openai";
import {
  DAILY_CARDS_SCHEMA,
  type DailyCard,
  IDENTIFY_RESULT_SCHEMA,
  IdentifyError,
  type IdentifyResult,
  type Mode,
  parseDailyCards,
  parseIdentifyResult,
  WHY_STEP_SCHEMA,
  type WhyStep,
  parseWhyStep,
} from "./types";

// Tone/reading-level instruction shared by the identify and why prompts (Kid Mode).
const STYLE: Record<Mode, string> = {
  adult: "Audience: a general adult reader. Use clear, informative language.",
  kid: "Audience: a curious child around 6–9 years old. Use short sentences, simple everyday words, a warm and fun tone, and concrete examples a kid would recognise. Avoid jargon. Stay accurate.",
};

// Single config point for the model. Default to gpt-4o-mini (vision + Structured
// Outputs, broadly accessible); override via env for higher quality (e.g. gpt-4o).
export const MODEL = process.env.HISTORY_LENS_MODEL ?? "gpt-4o-mini";

export const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

export function isAllowedMediaType(value: unknown): value is AllowedMediaType {
  return (
    typeof value === "string" &&
    (ALLOWED_MEDIA_TYPES as readonly string[]).includes(value)
  );
}

const PROMPT = `You are History Lens. Identify the single most prominent object in this image — a man-made thing (sign, building, tool, vehicle) or a natural one (plant, rock, animal).

Return:
- name: what the object is, in a few words.
- confidence: 0 to 1, how sure you are. If the image is too blurry, empty, or ambiguous to identify any specific object, set confidence to 0 and name to "Unknown".
- instantAnswer: ONE clear, plain sentence saying what it is and why it exists. Keep it concise and accurate; do not invent specifics you are unsure of.`;

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!cachedClient) {
    // Reads OPENAI_API_KEY from the environment. Never reaches the client (R2).
    cachedClient = new OpenAI();
  }
  return cachedClient;
}

/**
 * Send one base64 image to OpenAI with the IdentifyResult JSON Schema (Structured
 * Outputs) and return a validated result in a single call. Throws `IdentifyError`:
 *   - "refused" when the model declines or a content filter fires
 *   - "unidentifiable" when the model can't recognise anything (confidence 0 / "Unknown")
 *   - "upstream" on a malformed/cut-off response or network/SDK failure
 */
export async function identifyImage(
  base64: string,
  mediaType: AllowedMediaType,
  mode: Mode = "adult",
): Promise<IdentifyResult> {
  let completion;
  try {
    completion = await getClient().chat.completions.create({
      model: MODEL,
      max_completion_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `${PROMPT}\n\n${STYLE[mode]}` },
            {
              type: "image_url",
              image_url: { url: `data:${mediaType};base64,${base64}` },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "identify_result",
          strict: true,
          schema: IDENTIFY_RESULT_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown upstream error.";
    throw new IdentifyError("upstream", message);
  }

  const choice = completion.choices[0];
  if (!choice) {
    throw new IdentifyError("upstream", "Model returned no choices.");
  }
  if (choice.message.refusal) {
    throw new IdentifyError("refused", "The model declined to analyse this image.");
  }
  if (choice.finish_reason === "content_filter") {
    throw new IdentifyError("refused", "The image was blocked by a content filter.");
  }
  if (choice.finish_reason === "length") {
    // The story JSON was truncated — surface it clearly rather than as a parse error.
    throw new IdentifyError("upstream", "The response was cut off. Please try again.");
  }

  const content = choice.message.content;
  if (!content) {
    throw new IdentifyError("upstream", "Model returned an empty response.");
  }

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new IdentifyError("upstream", "Model returned non-JSON output.");
  }

  const result = parseIdentifyResult(json);

  if (result.confidence === 0 || result.name.toLowerCase().startsWith("unknown")) {
    throw new IdentifyError(
      "unidentifiable",
      "Couldn't confidently identify anything in that image.",
    );
  }

  return result;
}

const WHY_SYSTEM = `You are the Why Engine inside History Lens — a curiosity tool that explores why things exist through recursive questioning. Given a topic and the chain of why-questions and answers so far, produce the SINGLE next "why" question that digs one causal layer deeper than the most recent answer, plus a concise, accurate answer to it.

Rules:
- If the chain is empty, start with "Why does this exist?" about the topic.
- Each step must follow causally from the previous answer — keep moving toward ever more fundamental causes (mechanism → economics → society → science → physics), the way a curious child keeps asking "but why?".
- Keep the answer to one or two plain sentences. Be accurate; do not invent specifics you are unsure of.
- Answer directly and stand-alone: do NOT restate or echo the question inside the answer — the reader only sees the answer.
- Do not repeat a question already in the chain.`;

/**
 * Given an object/topic and the why-chain so far, return the next deeper
 * why-question + answer (the recursive Why Engine). Throws `IdentifyError`:
 *   - "refused" on a model refusal / content filter
 *   - "upstream" on a malformed/cut-off response or network/SDK failure
 */
export async function deeperWhy(
  topic: string,
  chain: WhyStep[],
  mode: Mode = "adult",
): Promise<WhyStep> {
  const chainText =
    chain.length === 0
      ? "(no questions yet)"
      : chain.map((s, i) => `${i + 1}. ${s.question}\n   ${s.answer}`).join("\n");

  let completion;
  try {
    completion = await getClient().chat.completions.create({
      model: MODEL,
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: `${WHY_SYSTEM}\n\n${STYLE[mode]}` },
        {
          role: "user",
          content: `Topic: ${topic}\n\nChain so far:\n${chainText}\n\nGive the next deeper why-step.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "why_step",
          strict: true,
          schema: WHY_STEP_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown upstream error.";
    throw new IdentifyError("upstream", message);
  }

  const choice = completion.choices[0];
  if (!choice) {
    throw new IdentifyError("upstream", "Model returned no choices.");
  }
  if (choice.message.refusal) {
    throw new IdentifyError("refused", "The model declined to go deeper.");
  }
  if (choice.finish_reason === "content_filter") {
    throw new IdentifyError("refused", "That line of questioning was blocked.");
  }
  if (choice.finish_reason === "length") {
    throw new IdentifyError("upstream", "The response was cut off. Please try again.");
  }

  const content = choice.message.content;
  if (!content) {
    throw new IdentifyError("upstream", "Model returned an empty response.");
  }

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new IdentifyError("upstream", "Model returned non-JSON output.");
  }

  return parseWhyStep(json);
}

// Shared structured text-completion helper (no image): runs the call, maps the
// failure modes to IdentifyError, and returns the parsed JSON for a caller to
// validate against its own schema.
async function structuredText(
  messages: Array<{ role: "system" | "user"; content: string }>,
  schemaName: string,
  schema: Record<string, unknown>,
  maxTokens: number,
): Promise<unknown> {
  let completion;
  try {
    completion = await getClient().chat.completions.create({
      model: MODEL,
      max_completion_tokens: maxTokens,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: { name: schemaName, strict: true, schema },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown upstream error.";
    throw new IdentifyError("upstream", message);
  }

  const choice = completion.choices[0];
  if (!choice) throw new IdentifyError("upstream", "Model returned no choices.");
  if (choice.message.refusal) {
    throw new IdentifyError("refused", "The model declined this request.");
  }
  if (choice.finish_reason === "content_filter") {
    throw new IdentifyError("refused", "That request was blocked by a content filter.");
  }
  if (choice.finish_reason === "length") {
    throw new IdentifyError("upstream", "The response was cut off. Please try again.");
  }

  const content = choice.message.content;
  if (!content) throw new IdentifyError("upstream", "Model returned an empty response.");

  try {
    return JSON.parse(content);
  } catch {
    throw new IdentifyError("upstream", "Model returned non-JSON output.");
  }
}

/**
 * Build a layered story for a text topic (no image) — powers daily-card and
 * rabbit-hole exploration. `lens` (a category) tilts the story toward that angle.
 */
export async function exploreTopic(
  topic: string,
  lens?: string,
  mode: Mode = "adult",
): Promise<IdentifyResult> {
  const lensLine = lens ? ` Focus on the ${lens} angle.` : "";
  const json = await structuredText(
    [
      {
        role: "system",
        content:
          "You are History Lens. Explain what something is and why it exists, in the same concise format used for scanned objects.",
      },
      {
        role: "user",
        content: `Explain: "${topic}".${lensLine}\n\nReturn: name (the subject, concise), confidence (use 1 unless the subject is genuinely unclear), and instantAnswer (ONE clear, plain sentence on what it is and why it exists). Be accurate and concise; do not invent specifics.\n\n${STYLE[mode]}`,
      },
    ],
    "identify_result",
    IDENTIFY_RESULT_SCHEMA as unknown as Record<string, unknown>,
    4096,
  );
  return parseIdentifyResult(json);
}

/**
 * Generate five "on this date in history" discovery cards — one per rabbit-hole
 * category — for the given calendar date (e.g. "June 20").
 */
export async function exploreDaily(
  monthDay: string,
  mode: Mode = "adult",
): Promise<DailyCard[]> {
  const json = await structuredText(
    [
      {
        role: "system",
        content:
          "You are History Lens' daily discovery. For a calendar date, surface genuinely notable things tied to that date in history.",
      },
      {
        role: "user",
        content: `Date: ${monthDay}. For each of these five categories in order — history, science, people, geography, economics — give ONE notable thing connected to this date in history (an event, discovery, or person associated with ${monthDay}). Only include things you are reasonably confident are tied to this date. For each card: category (the key), a short title, a one-sentence teaser, and a "subject" phrase to explore. Return exactly five cards, one per category, in that order.\n\n${STYLE[mode]}`,
      },
    ],
    "daily_cards",
    DAILY_CARDS_SCHEMA as unknown as Record<string, unknown>,
    2000,
  );
  return parseDailyCards(json);
}
