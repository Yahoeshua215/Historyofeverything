import OpenAI from "openai";
import {
  IDENTIFY_RESULT_SCHEMA,
  IdentifyError,
  type IdentifyResult,
  parseIdentifyResult,
} from "./types";

// Single config point for the model. Default to gpt-4o (vision + Structured Outputs);
// override via env to trade quality for per-scan cost (e.g. gpt-4o-mini).
export const MODEL = process.env.HISTORY_LENS_MODEL ?? "gpt-4o";

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
            { type: "text", text: PROMPT },
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
