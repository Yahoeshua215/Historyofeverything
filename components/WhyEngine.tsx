"use client";

import { useState, type CSSProperties } from "react";
import type { IdentifyErrorKind, Mode, WhyStep } from "@/lib/types";

const ERROR_MESSAGES: Record<IdentifyErrorKind | "network", string> = {
  bad_request: "Couldn't go deeper on that. Try again.",
  unidentifiable: "Couldn't go deeper on that. Try again.",
  refused: "Can't follow that thread any further.",
  upstream: "Hit a snag going deeper. Try again.",
  network: "Network problem — check your connection and try again.",
};

const wrap: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  borderTop: "1px solid var(--border)",
  paddingTop: 20,
};

const heading: CSSProperties = {
  margin: 0,
  fontSize: "0.78rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-muted)",
};

const stepStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  borderLeft: "2px solid var(--accent)",
  paddingLeft: 12,
  animation: "hl-fade-up 0.35s ease both",
};

const qStyle: CSSProperties = { margin: 0, fontWeight: 600, color: "var(--text)" };
const aStyle: CSSProperties = { margin: 0, color: "var(--text-muted)", lineHeight: 1.5 };

const button: CSSProperties = {
  alignSelf: "flex-start",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "var(--accent-soft)",
  color: "var(--accent)",
  border: "1px solid var(--accent)",
  borderRadius: 999,
  padding: "10px 18px",
  fontSize: "1rem",
  fontWeight: 600,
};

const depthStyle: CSSProperties = { fontSize: "0.78rem", color: "var(--text-muted)" };
const errorStyle: CSSProperties = { margin: 0, color: "var(--danger)", fontSize: "0.9rem" };

/**
 * The Why Engine (curiosity component). Seeded with the identified object, it lets
 * the user keep asking "Why?" — each tap posts the accumulated chain to /api/why
 * and appends the next causal layer, building a recursive curiosity trail.
 */
export default function WhyEngine({
  topic,
  mode = "adult",
}: {
  topic: string;
  mode?: Mode;
}) {
  const [chain, setChain] = useState<WhyStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function goDeeper() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/why", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, chain, mode }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: { kind?: IdentifyErrorKind } }
          | null;
        setErrorMessage(ERROR_MESSAGES[body?.error?.kind ?? "upstream"]);
        return;
      }
      const step = (await res.json()) as WhyStep;
      setChain((prev) => [...prev, step]);
    } catch {
      setErrorMessage(ERROR_MESSAGES.network);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={wrap} aria-label="Why engine">
      <h2 style={heading}>Keep asking why</h2>

      {chain.map((step, index) => (
        <div key={index} style={stepStyle}>
          <p style={qStyle}>{step.question}</p>
          <p style={aStyle}>{step.answer}</p>
        </div>
      ))}

      <button type="button" style={button} onClick={goDeeper} disabled={loading}>
        {loading ? "Digging deeper…" : chain.length === 0 ? "🤔 Why?" : "Why?"}
      </button>

      {chain.length > 0 && (
        <span style={depthStyle} data-testid="why-depth">
          Why depth: {chain.length}
        </span>
      )}

      {errorMessage && <p style={errorStyle}>{errorMessage}</p>}
    </section>
  );
}
