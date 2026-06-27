"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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
  // Leave breathing room when this answer is scrolled to the top of the viewport.
  scrollMarginTop: 20,
};

// The answer in front of you (the latest) is the biggest and boldest; each
// earlier answer behind it shrinks and fades, giving the trail a sense of
// depth so the current step is always the clear focus.
function answerStyle(distanceFromLatest: number): CSSProperties {
  const scale = Math.max(0.6, 1 - distanceFromLatest * 0.14);
  const opacity = Math.max(0.4, 1 - distanceFromLatest * 0.16);
  return {
    margin: 0,
    color: "var(--text)",
    fontSize: `calc(clamp(1.2rem, 4.8vw, 1.55rem) * ${scale})`,
    lineHeight: 1.4,
    opacity,
    transition: "font-size 0.35s ease, opacity 0.35s ease",
  };
}

// The big, can't-miss CTA — the heart of the experience. Pink, on purpose.
const button: CSSProperties = {
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  background: "linear-gradient(135deg, #ec4899 0%, #f472b6 55%, #f9a8d4 130%)",
  color: "#ffffff",
  border: "none",
  borderRadius: "var(--radius)",
  padding: "20px 28px",
  fontSize: "1.3rem",
  fontWeight: 700,
  letterSpacing: "-0.01em",
  boxShadow: "0 12px 28px rgba(236, 72, 153, 0.32)",
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
  const latestRef = useRef<HTMLDivElement | null>(null);

  // As each new answer arrives, pull it to the top of the viewport so it's the
  // focus — everything above scrolls out of view if needed.
  useEffect(() => {
    if (chain.length === 0) return;
    const el = latestRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [chain.length]);

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
        <div
          key={index}
          ref={index === chain.length - 1 ? latestRef : undefined}
          className="hl-fade-up"
          style={stepStyle}
        >
          <p style={answerStyle(chain.length - 1 - index)}>{step.answer}</p>
        </div>
      ))}

      <button
        type="button"
        style={button}
        className="hl-interactive"
        onClick={goDeeper}
        disabled={loading}
      >
        {loading ? "Digging deeper…" : "But why?"}
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
