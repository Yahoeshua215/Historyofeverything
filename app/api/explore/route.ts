import { exploreTopic } from "@/lib/openai";
import { IdentifyError, type IdentifyErrorKind, isMode } from "@/lib/types";
import { isCategoryKey } from "@/lib/categories";

export const runtime = "nodejs";

const MAX_TOPIC_LENGTH = 500;

const STATUS_BY_KIND: Record<IdentifyErrorKind, number> = {
  bad_request: 400,
  unidentifiable: 422,
  refused: 422,
  upstream: 502,
};

function errorResponse(kind: IdentifyErrorKind, message: string): Response {
  return Response.json({ error: { kind, message } }, { status: STATUS_BY_KIND[kind] });
}

// Build a layered story for a text topic (daily-card / rabbit-hole exploration).
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

  const { topic, lens, mode } = body as {
    topic?: unknown;
    lens?: unknown;
    mode?: unknown;
  };

  if (typeof topic !== "string" || topic.trim() === "") {
    return errorResponse("bad_request", "Missing 'topic'.");
  }
  if (topic.length > MAX_TOPIC_LENGTH) {
    return errorResponse("bad_request", "Topic is too long.");
  }
  // `lens` is optional; when present it must be a known rabbit-hole category.
  if (lens !== undefined && !isCategoryKey(lens)) {
    return errorResponse("bad_request", "'lens' must be a known category.");
  }
  if (mode !== undefined && !isMode(mode)) {
    return errorResponse("bad_request", "'mode' must be 'adult' or 'kid'.");
  }

  try {
    const result = await exploreTopic(
      topic.trim(),
      lens as string | undefined,
      mode ?? "adult",
    );
    return Response.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof IdentifyError) {
      if (err.kind === "upstream") console.error("[explore] upstream failure:", err.message);
      return errorResponse(err.kind, err.message);
    }
    console.error("[explore] unexpected error:", err);
    return errorResponse("upstream", "Unexpected error exploring that topic.");
  }
}
