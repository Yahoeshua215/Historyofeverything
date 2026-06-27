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

// The focused answer sits in front — biggest, boldest, fully opaque. Every other
// answer shrinks and fades with its distance from the focus, giving the trail a
// sense of depth. Tapping any answer makes it the focus, carouseling it forward.
const answerButton: CSSProperties = {
  ...stepStyle,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "none",
  border: "none",
  borderLeft: "3px solid var(--accent)",
  color: "var(--text)",
  cursor: "pointer",
  transition: "opacity 0.35s ease",
};

function answerContainerStyle(distanceFromFocus: number): CSSProperties {
  return {
    ...answerButton,
    opacity: Math.max(0.4, 1 - distanceFromFocus * 0.16),
  };
}

function answerTextStyle(distanceFromFocus: number, focused: boolean): CSSProperties {
  const scale = Math.max(0.6, 1 - distanceFromFocus * 0.14);
  return {
    margin: 0,
    fontSize: `calc(clamp(1.2rem, 4.8vw, 1.55rem) * ${scale})`,
    lineHeight: 1.4,
    fontWeight: focused ? 600 : 400,
    transition: "font-size 0.35s ease",
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
  // Which answer is carouseled to the front. `null` follows the latest answer;
  // tapping an earlier answer pins the focus there until a new step is added.
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focused = focusedIndex === null ? chain.length - 1 : focusedIndex;

  // Bring the focused answer to the top of the viewport — whether the focus moved
  // because a new step arrived or because the user tapped an earlier answer.
  useEffect(() => {
    if (chain.length === 0) return;
    const el = itemRefs.current[focused];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focused, chain.length]);

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
      // A fresh answer always takes the front, even if an earlier one was pinned.
      setFocusedIndex(null);
    } catch {
      setErrorMessage(ERROR_MESSAGES.network);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={wrap} aria-label="Why engine">
      {chain.map((step, index) => {
        const distance = Math.abs(index - focused);
        const isFocused = index === focused;
        return (
          <button
            key={index}
            type="button"
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            className={index === chain.length - 1 ? "hl-fade-up" : undefined}
            style={answerContainerStyle(distance)}
            onClick={() => setFocusedIndex(index)}
            aria-pressed={isFocused}
            title={isFocused ? undefined : "Bring this answer to the front"}
          >
            <p style={answerTextStyle(distance, isFocused)}>{step.answer}</p>
          </button>
        );
      })}

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
