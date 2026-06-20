import type { CSSProperties } from "react";
import type { IdentifyResult } from "@/lib/types";
import NarrateButton from "./NarrateButton";

// Below this confidence we surface an honest "might not be exact" hint (vision: be
// honest about uncertainty rather than hiding it).
export const LOW_CONFIDENCE_THRESHOLD = 0.6;

const wrap: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const layer1: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  animation: "hl-pop 0.35s ease both",
};

const nameStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(1.6rem, 6vw, 2.4rem)",
  lineHeight: 1.1,
  letterSpacing: "-0.01em",
};

const instantStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(1rem, 4vw, 1.2rem)",
  color: "var(--text-muted)",
  lineHeight: 1.4,
};

const hintStyle: CSSProperties = {
  fontSize: "0.85rem",
  color: "var(--accent)",
  background: "var(--accent-soft)",
  borderRadius: 999,
  padding: "4px 12px",
  alignSelf: "flex-start",
};

const cardsStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const cardStyle: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: 16,
  animation: "hl-fade-up 0.4s ease both",
};

const cardHeading: CSSProperties = {
  margin: "0 0 6px",
  fontSize: "0.78rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-muted)",
};

const cardBody: CSSProperties = {
  margin: 0,
  fontSize: "1rem",
  lineHeight: 1.5,
};

/**
 * Layer 1 (instant answer) + Layer 2 (story cards) rendering of an IdentifyResult.
 * Pure presentational — props in, markup out; no data fetching (U4 / R3, R4).
 */
export default function StoryResult({ result }: { result: IdentifyResult }) {
  const { name, instantAnswer, confidence, storyCards } = result;
  const cards = storyCards.filter((card) => card.body.trim() !== "");
  const lowConfidence = confidence < LOW_CONFIDENCE_THRESHOLD;

  // Plain-text version of the story for read-aloud narration.
  const narration = [name, instantAnswer, ...cards.map((c) => `${c.heading} ${c.body}`)].join(". ");

  return (
    <section style={wrap} aria-label="Identification result">
      <div style={layer1}>
        <h1 style={nameStyle}>{name}</h1>
        <p style={instantStyle}>{instantAnswer}</p>
        {lowConfidence && (
          <span style={hintStyle} data-testid="confidence-hint">
            Not fully sure — this might not be exact
          </span>
        )}
        <NarrateButton text={narration} />
      </div>

      <div style={cardsStyle}>
        {cards.map((card, index) => (
          <article
            key={`${card.heading}-${index}`}
            style={{ ...cardStyle, animationDelay: `${index * 60}ms` }}
          >
            <h2 style={cardHeading}>{card.heading}</h2>
            <p style={cardBody}>{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
