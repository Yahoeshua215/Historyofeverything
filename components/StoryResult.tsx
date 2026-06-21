import type { CSSProperties } from "react";
import type { IdentifyResult } from "@/lib/types";

// Below this confidence we surface an honest "might not be exact" hint (vision: be
// honest about uncertainty rather than hiding it).
export const LOW_CONFIDENCE_THRESHOLD = 0.6;

const wrap: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const nameStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(1.8rem, 7vw, 2.6rem)",
  lineHeight: 1.05,
  letterSpacing: "-0.025em",
  fontWeight: 700,
};

// The single, simplified explanation — big and clear is the whole point.
const answerStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(1.25rem, 5vw, 1.7rem)",
  color: "var(--text)",
  lineHeight: 1.4,
  fontWeight: 500,
};

const hintStyle: CSSProperties = {
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "var(--accent-strong)",
  background: "var(--accent-soft)",
  borderRadius: 999,
  padding: "5px 14px",
  alignSelf: "flex-start",
};

/**
 * The result view: a single, concise answer presented large and clear (name +
 * one-sentence explanation). Deliberately minimal — the focus is a quick answer
 * and the big "Why?" CTA that follows. Pure presentational (U4 / R3, R4).
 */
export default function StoryResult({ result }: { result: IdentifyResult }) {
  const { name, instantAnswer, confidence } = result;
  const lowConfidence = confidence < LOW_CONFIDENCE_THRESHOLD;

  return (
    <section style={wrap} aria-label="Identification result" className="hl-pop">
      <h1 style={nameStyle}>{name}</h1>
      <p style={answerStyle}>{instantAnswer}</p>
      {lowConfidence && (
        <span style={hintStyle} data-testid="confidence-hint">
          Not fully sure — this might not be exact
        </span>
      )}
    </section>
  );
}
