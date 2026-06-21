"use client";

import { useRef, useState, type CSSProperties } from "react";
import { downscaleToJpeg, type CapturedImage } from "@/lib/image";

interface CaptureProps {
  onCapture: (image: CapturedImage) => void;
  /** Surface a capture-local problem (bad file / decode failure) to the page. */
  onError?: (message: string) => void;
  /** Icon-only variant for inline "next question" controls. */
  compact?: boolean;
  /**
   * Image processor seam — defaults to the real canvas downscale. Tests inject a
   * fake so they don't depend on a real canvas/decoder.
   */
  processImage?: (file: File) => Promise<CapturedImage>;
}

// Glass pill matching the other controls.
const button: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "var(--glass)",
  color: "var(--text)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--shadow-soft)",
  backdropFilter: "var(--glass-blur)",
  WebkitBackdropFilter: "var(--glass-blur)",
  borderRadius: 999,
  padding: "8px 16px",
  fontSize: "0.85rem",
  fontWeight: 600,
};

// Icon-only square for inline next-question use.
const compactButton: CSSProperties = {
  ...button,
  padding: "12px 14px",
  fontSize: "1.1rem",
};

/**
 * Camera / file capture (U3 / R1), as a compact header trigger. On mobile the
 * input offers camera + library; on desktop a file picker. The chosen image is
 * downscaled to JPEG base64 and handed to `onCapture`, which kicks off
 * identification immediately (no preview — the result view takes over).
 */
export default function Capture({
  onCapture,
  onError,
  compact = false,
  processImage = downscaleToJpeg,
}: CaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  function openPicker() {
    inputRef.current?.click();
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset the input so picking the same file again still fires a change.
    event.target.value = "";

    if (!file) return; // user cancelled — leave state unchanged
    if (!file.type.startsWith("image/")) {
      onError?.("That doesn't look like an image. Try a photo instead.");
      return;
    }

    setProcessing(true);
    try {
      const captured = await processImage(file);
      onCapture(captured);
    } catch {
      onError?.("Couldn't read that image. Try another one.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        hidden
        data-testid="capture-input"
      />
      <button
        type="button"
        style={compact ? compactButton : button}
        className="hl-interactive"
        onClick={openPicker}
        disabled={processing}
        aria-label={compact ? "Scan an image" : undefined}
      >
        {compact ? (processing ? "…" : "📷") : processing ? "Reading…" : "📷 Image"}
      </button>
    </>
  );
}
