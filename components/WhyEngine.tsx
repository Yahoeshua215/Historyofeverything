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
  gap: 16,
};

// Each answer in the trail — presented large and clear. The question itself is
// not shown (it's redundant with the answer); it's still tracked for the API so
// the next step can dig one layer deeper.
const stepStyle: CSSProperties = {
  borderLeft: "3px solid var(--accent)",
  paddingLeft: 16,
};

const aStyle: CSSProperties = {
  margin: 0,
  color: "var(--text)",
  fontSize: "clamp(1.15rem, 4.5vw, 1.45rem)",
  lineHeight: 1.45,
};

// The big, can't-miss CTA — the heart of the experience.
const button: CSSProperties = {
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  background: "var(--accent-gradient)",
  color: "var(--accent-ink)",
  border: "none",
  borderRadius: "var(--radius)",
  padding: "20px 28px",
  fontSize: "1.3rem",
  fontWeight: 700,
  letterSpacing: "-0.01em",
  boxShadow: "var(--shadow-accent)",
};

const depthStyle: CSSProperties = {
  fontSize: "0.78rem",
  color: "var(--text-muted)",
  alignSelf: "center",
};
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
      {chain.map((step, index) => (
        <div key={index} className="hl-fade-up" style={stepStyle}>
          <p style={aStyle}>{step.answer}</p>
        </div>
      ))}

      <button
        type="button"
        style={button}
        className="hl-interactive"
        onClick={goDeeper}
        disabled={loading}
      >
        {loading ? "Digging deeper…" : "WHY"}
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
