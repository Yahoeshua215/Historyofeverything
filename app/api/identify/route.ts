import {
  identifyImage,
  isAllowedMediaType,
} from "@/lib/openai";
import { IdentifyError, type IdentifyErrorKind, isMode } from "@/lib/types";

// Runs server-side on Node.js (Fluid Compute) so the Anthropic key never reaches
// the client (R2). The Claude call can take a few seconds; the default 300s
// function timeout is ample.
export const runtime = "nodejs";

// Base64 is ~1.33× the raw byte size. Anthropic rejects images over ~5MB, so cap
// well under that at the route boundary; client downscaling (U3) keeps real uploads
// far smaller still. The cap is a guardrail against oversized/abusive bodies.
const MAX_IMAGE_BASE64_LENGTH = 5_000_000; // ~3.75MB decoded — safely under the API limit

const STATUS_BY_KIND: Record<IdentifyErrorKind, number> = {
  bad_request: 400,
  unidentifiable: 422,
  refused: 422,
  upstream: 502,
};

function errorResponse(kind: IdentifyErrorKind, message: string): Response {
  return Response.json({ error: { kind, message } }, { status: STATUS_BY_KIND[kind] });
}

export async function POST(request: Request): Promise<Response> {
  // 1. Parse the body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("bad_request", "Request body must be valid JSON.");
  }
  if (typeof body !== "object" || body === null) {
    return errorResponse("bad_request", "Request body must be a JSON object.");
  }

  const { image, mediaType, mode } = body as {
    image?: unknown;
    mediaType?: unknown;
    mode?: unknown;
  };

  // 2. Validate the input — no model call until this passes.
  if (typeof image !== "string" || image.length === 0) {
    return errorResponse("bad_request", "Missing base64 'image'.");
  }
  if (image.length > MAX_IMAGE_BASE64_LENGTH) {
    return errorResponse("bad_request", "Image is too large; capture a smaller image.");
  }
  if (!isAllowedMediaType(mediaType)) {
    return errorResponse(
      "bad_request",
      "Missing or unsupported 'mediaType' (use image/jpeg, png, gif, or webp).",
    );
  }
  // `mode` is optional; default to adult, reject anything other than adult/kid.
  if (mode !== undefined && !isMode(mode)) {
    return errorResponse("bad_request", "'mode' must be 'adult' or 'kid'.");
  }

  // 3. Identify + build the story (single model call).
  try {
    const result = await identifyImage(image, mediaType, mode ?? "adult");
    return Response.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof IdentifyError) {
      // Only the genuinely-unexpected upstream failures are worth logging; refusals
      // and unidentifiable images are normal, expected outcomes.
      if (err.kind === "upstream") console.error("[identify] upstream failure:", err.message);
      return errorResponse(err.kind, err.message);
    }
    console.error("[identify] unexpected error:", err);
    return errorResponse("upstream", "Unexpected error identifying the image.");
  }
}
