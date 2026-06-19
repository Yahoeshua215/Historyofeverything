import {
  identifyImage,
  isAllowedMediaType,
} from "@/lib/claude";
import { IdentifyError, type IdentifyErrorKind } from "@/lib/types";

// Runs server-side on Node.js (Fluid Compute) so the Anthropic key never reaches
// the client (R2). The Claude call can take a few seconds; the default 300s
// function timeout is ample.
export const runtime = "nodejs";

// Base64 is ~1.33× the raw byte size. Client downscaling (U3) keeps real uploads
// well under this; the cap is a guardrail against oversized/abusive bodies.
const MAX_IMAGE_BASE64_LENGTH = 8_000_000; // ~6MB decoded

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

  const { image, mediaType } = body as { image?: unknown; mediaType?: unknown };

  // 2. Validate the input — no Claude call until this passes.
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

  // 3. Identify + build the story (single Claude call).
  try {
    const result = await identifyImage(image, mediaType);
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
