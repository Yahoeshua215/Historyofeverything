import Anthropic from "@anthropic-ai/sdk";
import {
  IDENTIFY_RESULT_SCHEMA,
  IdentifyError,
  type IdentifyResult,
  parseIdentifyResult,
} from "./types";

// Single config point for the model (KTD3 / OQ1). Default to Opus 4.8 for the best
// vision + story quality; switch via env to trade quality for per-scan cost:
//   claude-sonnet-4-6 (~40% cheaper) or claude-haiku-4-5 (cheapest).
export const MODEL = process.env.HISTORY_LENS_MODEL ?? "claude-opus-4-8";

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
- instantAnswer: ONE plain sentence saying what it is and why it exists.
- storyCards: 3 to 5 short cards. Use headings like "What is it?", "Why does it exist?", "How has it changed?", "Interesting fact", and "Related". Each body is one to three readable sentences. Keep it accurate and concrete; do not invent specifics you are unsure of.`;

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!cachedClient) {
    // Reads ANTHROPIC_API_KEY from the environment. Never reaches the client (R2).
    cachedClient = new Anthropic();
  }
  return cachedClient;
}

/**
 * Send one base64 image to Claude with the IdentifyResult schema and return a
 * validated result in a single call (KTD2). Throws `IdentifyError`:
 *   - "refused" when Claude declines (stop_reason: "refusal")
 *   - "unidentifiable" when Claude can't recognise anything (confidence 0 / "Unknown")
 *   - "upstream" on a malformed response or network/SDK failure
 */
export async function identifyImage(
  base64: string,
  mediaType: AllowedMediaType,
): Promise<IdentifyResult> {
  let response;
  try {
    // Structured outputs (`output_format` JSON Schema) live under the beta surface in
    // this SDK version, so the response is schema-constrained — no brittle text parsing.
    response = await getClient().beta.messages.create({
      betas: ["structured-outputs-2025-09-17"],
      model: MODEL,
      max_tokens: 4096,
      output_format: { type: "json_schema", schema: IDENTIFY_RESULT_SCHEMA },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown upstream error.";
    throw new IdentifyError("upstream", message);
  }

  if (response.stop_reason === "refusal") {
    throw new IdentifyError("refused", "Claude declined to analyse this image.");
  }
  if (response.stop_reason === "max_tokens") {
    // The story JSON was truncated — surface it clearly rather than as a parse error.
    throw new IdentifyError("upstream", "The response was cut off. Please try again.");
  }

  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");

  let json: unknown;
  try {
    json = JSON.parse(text);
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
