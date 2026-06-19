"use client";

import { useRef, useState, type CSSProperties } from "react";
import { downscaleToJpeg, type CapturedImage } from "@/lib/image";

interface CaptureProps {
  onCapture: (image: CapturedImage) => void;
  /** When true (e.g. mid-request), disable the controls. */
  busy?: boolean;
  /**
   * Image processor seam — defaults to the real canvas downscale. Tests inject a
   * fake so they don't depend on a real canvas/decoder.
   */
  processImage?: (file: File) => Promise<CapturedImage>;
}

const button: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: "var(--accent)",
  color: "#1a1206",
  border: "none",
  borderRadius: 999,
  padding: "14px 22px",
  fontSize: "1.05rem",
  fontWeight: 600,
};

const secondaryButton: CSSProperties = {
  ...button,
  background: "var(--surface-2)",
  color: "var(--text)",
  border: "1px solid var(--border)",
};

const previewStyle: CSSProperties = {
  width: "100%",
  maxHeight: 280,
  objectFit: "cover",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  display: "block",
};

const errorStyle: CSSProperties = {
  color: "var(--danger)",
  fontSize: "0.9rem",
  margin: 0,
};

/**
 * Camera / file capture (U3 / R1). On mobile the input offers camera + library;
 * on desktop a file picker. The chosen image is downscaled to JPEG base64 and
 * handed to `onCapture`. Shows a thumbnail preview with a re-take affordance.
 */
export default function Capture({
  onCapture,
  busy = false,
  processImage = downscaleToJpeg,
}: CaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openPicker() {
    setError(null);
    inputRef.current?.click();
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset the input so picking the same file again still fires a change.
    event.target.value = "";

    if (!file) return; // user cancelled — leave state unchanged
    if (!file.type.startsWith("image/")) {
      setError("That doesn't look like an image. Try a photo instead.");
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const captured = await processImage(file);
      setPreview(captured.dataUrl);
      onCapture(captured);
    } catch {
      setError("Couldn't read that image. Try another one.");
    } finally {
      setProcessing(false);
    }
  }

  const disabled = busy || processing;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        hidden
        data-testid="capture-input"
      />

      {preview && (
        <img src={preview} alt="Captured preview" style={previewStyle} />
      )}

      <button
        type="button"
        style={preview ? secondaryButton : button}
        onClick={openPicker}
        disabled={disabled}
      >
        {processing ? "Reading…" : preview ? "Retake" : "📷 Scan something"}
      </button>

      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}
