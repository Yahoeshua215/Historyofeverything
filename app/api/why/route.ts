import { deeperWhy } from "@/lib/openai";
import { IdentifyError, type IdentifyErrorKind, type WhyStep } from "@/lib/types";

// Server-side (Node.js) so the OpenAI key never reaches the client.
export const runtime = "nodejs";

// Guardrail: a why-chain shouldn't grow unbounded in one session.
const MAX_CHAIN_LENGTH = 30;

const STATUS_BY_KIND: Record<IdentifyErrorKind, number> = {
  bad_request: 400,
  unidentifiable: 422,
  refused: 422,
  upstream: 502,
};

function errorResponse(kind: IdentifyErrorKind, message: string): Response {
  return Response.json({ error: { kind, message } }, { status: STATUS_BY_KIND[kind] });
}

function isWhyStep(value: unknown): value is WhyStep {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  return typeof s.question === "string" && typeof s.answer === "string";
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("bad_request", "Request body must be valid JSON.");
  }
  if (typeof body !== "object" || body === null) {
    return errorResponse("bad_request", "Request body must be a JSON object.");
  }

  const { topic, chain } = body as { topic?: unknown; chain?: unknown };

  if (typeof topic !== "string" || topic.trim() === "") {
    return errorResponse("bad_request", "Missing 'topic'.");
  }
  // `chain` is optional; when present it must be an array of {question, answer}.
  const chainValue = chain ?? [];
  if (!Array.isArray(chainValue) || !chainValue.every(isWhyStep)) {
    return errorResponse("bad_request", "'chain' must be an array of {question, answer}.");
  }
  if (chainValue.length > MAX_CHAIN_LENGTH) {
    return errorResponse("bad_request", "This curiosity chain has gone deep enough.");
  }

  try {
    const step = await deeperWhy(topic.trim(), chainValue);
    return Response.json(step, { status: 200 });
  } catch (err) {
    if (err instanceof IdentifyError) {
      if (err.kind === "upstream") console.error("[why] upstream failure:", err.message);
      return errorResponse(err.kind, err.message);
    }
    console.error("[why] unexpected error:", err);
    return errorResponse("upstream", "Unexpected error going deeper.");
  }
}
