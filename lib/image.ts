// Client-side image downscaling (KTD5): bound the longest edge before upload to
// control vision-token cost and latency, and re-encode to JPEG.

export const MAX_EDGE = 1280; // OQ3 — tune by eyeballing quality vs. token cost
export const JPEG_QUALITY = 0.82;

export interface CapturedImage {
  /** Base64 JPEG payload (no data-URL prefix) — what gets POSTed to /api/identify. */
  base64: string;
  mediaType: "image/jpeg";
  /** Full data URL — used for the on-screen thumbnail preview. */
  dataUrl: string;
}

/**
 * Scale (width × height) down so the longest edge is at most `maxEdge`, preserving
 * aspect ratio. Never upscales. Pure function — the testable core of the downscale.
 */
export function fitWithinMaxEdge(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image."));
    img.src = src;
  });
}

/** Read a File, downscale it via a canvas, and return base64 JPEG + preview data URL. */
export async function downscaleToJpeg(file: File): Promise<CapturedImage> {
  const sourceUrl = await readAsDataURL(file);
  const img = await loadImage(sourceUrl);
  const { width, height } = fitWithinMaxEdge(img.naturalWidth, img.naturalHeight);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context is not available.");
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const base64 = dataUrl.split(",")[1];
  if (!base64) {
    // Tainted/zero-size canvas or a browser quirk — treat as a decode failure so the
    // caller shows a retryable "couldn't read that image" rather than posting empty data.
    throw new Error("Canvas produced no image data.");
  }
  return { base64, mediaType: "image/jpeg", dataUrl };
}
