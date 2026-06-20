import { exploreDaily } from "@/lib/openai";
import { IdentifyError, type IdentifyErrorKind, isMode } from "@/lib/types";

export const runtime = "nodejs";

const MAX_DATE_LENGTH = 40;

const STATUS_BY_KIND: Record<IdentifyErrorKind, number> = {
  bad_request: 400,
  unidentifiable: 422,
  refused: 422,
  upstream: 502,
};

function errorResponse(kind: IdentifyErrorKind, message: string): Response {
  return Response.json({ error: { kind, message } }, { status: STATUS_BY_KIND[kind] });
}

// Five "on this date in history" discovery cards for the given calendar date.
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

  const { date, mode } = body as { date?: unknown; mode?: unknown };

  if (typeof date !== "string" || date.trim() === "" || date.length > MAX_DATE_LENGTH) {
    return errorResponse("bad_request", "Missing or invalid 'date' (e.g. 'June 20').");
  }
  if (mode !== undefined && !isMode(mode)) {
    return errorResponse("bad_request", "'mode' must be 'adult' or 'kid'.");
  }

  try {
    const cards = await exploreDaily(date.trim(), mode ?? "adult");
    return Response.json({ cards }, { status: 200 });
  } catch (err) {
    if (err instanceof IdentifyError) {
      if (err.kind === "upstream") console.error("[daily] upstream failure:", err.message);
      return errorResponse(err.kind, err.message);
    }
    console.error("[daily] unexpected error:", err);
    return errorResponse("upstream", "Unexpected error building today's cards.");
  }
}
