"use client";

import { useRef, useState, type CSSProperties } from "react";
import { downscaleToJpeg, type CapturedImage } from "@/lib/image";

interface CaptureProps {
  onCapture: (image: CapturedImage) => void;
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
  background: "var(--accent-gradient)",
  color: "var(--accent-ink)",
  border: "none",
  borderRadius: 999,
  padding: "15px 24px",
  fontSize: "1.05rem",
  fontWeight: 600,
  boxShadow: "var(--shadow-accent)",
};

const secondaryButton: CSSProperties = {
  ...button,
  background: "var(--glass)",
  color: "var(--text)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--shadow-soft)",
  backdropFilter: "var(--glass-blur)",
  WebkitBackdropFilter: "var(--glass-blur)",
};

const previewStyle: CSSProperties = {
  width: "100%",
  maxHeight: 280,
  objectFit: "cover",
  borderRadius: "var(--radius)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--shadow)",
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
        className="hl-interactive"
        onClick={openPicker}
        disabled={processing}
      >
        {processing ? "Reading…" : preview ? "Retake" : "📷 Scan something"}
      </button>

      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}
