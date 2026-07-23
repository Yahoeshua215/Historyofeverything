"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
  gap: 20,
};

// The card stack is its own 3D scene and the drag surface: dragging vertically
// over it spins the rolodex (changes which card is in front).
const stack: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  // No flex gap — cards overlap via negative margins (see answerCardStyle) so
  // the front one sits on top of the receding stack.
  gap: 0,
  perspective: "1100px",
  perspectiveOrigin: "50% 35%",
  // Own vertical gestures so a drag spins the cards instead of scrolling the page.
  touchAction: "pan-y",
};

// How much each card tucks under the one in front of it.
const CARD_OVERLAP = 26;

// Pixels of vertical drag that advance the rolodex by one card.
const DRAG_STEP = 46;

// Each answer sits on its own frosted-glass card that stands upright in a 3D
// scene. The focused card faces you flat and in front; every card behind it
// tilts back on its bottom edge and pushes away in Z — a row of standing
// dominoes receding into the distance — also shrinking and fading by depth. A
// per-card transition delay keyed to that depth makes the whole row re-settle in
// a cascading domino ripple when the focus moves (a new answer arrives, or you
// tap an earlier one).
const cardBase: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  borderRadius: "var(--radius-lg)",
  backdropFilter: "var(--glass-blur)",
  WebkitBackdropFilter: "var(--glass-blur)",
  color: "var(--text)",
  cursor: "pointer",
  // Stand the card on its bottom edge so it tilts back like a domino.
  transformOrigin: "center bottom",
  willChange: "transform",
  // Leave breathing room when this card is scrolled to the top of the viewport.
  scrollMarginTop: 20,
};

// Clamp depth so a long trail doesn't fade or tilt into nothing.
const MAX_DEPTH = 4;

function answerCardStyle(
  distanceFromFocus: number,
  focused: boolean,
  isLast: boolean,
): CSSProperties {
  const t = Math.min(distanceFromFocus, MAX_DEPTH);
  // Stand the focused card flat in front; lean each one behind it further back.
  const transform = focused
    ? "rotateX(0deg) translateZ(0px)"
    : `rotateX(${t * 9}deg) translateZ(${-t * 26}px)`;
  return {
    ...cardBase,
    transform,
    // Positioned + layered so the focused card always sits on top of the stack.
    position: "relative",
    zIndex: 50 - t,
    // Overlap the next card down (the last card keeps its base so the CTA below
    // it stays clear).
    marginBottom: isLast ? 0 : -CARD_OVERLAP,
    background: focused ? "var(--glass-strong)" : "var(--glass)",
    // Focused card gets the accent edge; receding cards get a defined outline so
    // each one reads as a distinct card in the stack.
    border: focused
      ? "1px solid var(--accent)"
      : "1px solid rgba(70, 80, 112, 0.22)",
    // Deep, layered drop shadows so each standing card casts onto the one behind
    // it — the focused card lifts hardest off the stack.
    boxShadow: focused
      ? "0 28px 50px rgba(18, 26, 58, 0.32), 0 8px 18px rgba(18, 26, 58, 0.20)"
      : "0 20px 38px rgba(18, 26, 58, 0.26)",
    // Front card stays crisp; the ones behind fade back a little more with depth.
    opacity: focused ? 1 : Math.max(0.38, 1 - t * 0.18),
    padding: `${Math.max(14, 22 - t * 1.5)}px ${Math.max(16, 24 - t * 1.5)}px`,
    transition:
      "transform 0.45s cubic-bezier(0.22,1,0.36,1), opacity 0.45s cubic-bezier(0.22,1,0.36,1), margin 0.45s ease, padding 0.45s ease, box-shadow 0.45s ease, background 0.45s ease, border-color 0.45s ease",
    transitionDelay: `${t * 60}ms`,
  };
}

function answerTextStyle(distanceFromFocus: number, focused: boolean): CSSProperties {
  const t = Math.min(distanceFromFocus, MAX_DEPTH);
  // Gentle text shrink — the 3D recession does most of the size work now.
  const scale = Math.max(0.78, 1 - t * 0.06);
  return {
    margin: 0,
    fontSize: `calc(clamp(1.15rem, 4.6vw, 1.5rem) * ${scale})`,
    lineHeight: 1.4,
    fontWeight: focused ? 600 : 500,
    transition: "font-size 0.45s cubic-bezier(0.22,1,0.36,1)",
    transitionDelay: `${t * 60}ms`,
  };
}

// The big, can't-miss CTA — the heart of the experience. Pink, on purpose.
// (The trail uses gap:0 for overlap, so the CTA carries its own top margin.)
const button: CSSProperties = {
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  marginTop: 20,
  background: "#ec4899",
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
  marginTop: 12,
};
const errorStyle: CSSProperties = {
  margin: "12px 0 0",
  color: "var(--danger)",
  fontSize: "0.9rem",
};

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
  const [grabbing, setGrabbing] = useState(false);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Rolodex drag bookkeeping.
  const dragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartFocus = useRef(0);
  const dragMoved = useRef(false);

  const focused = focusedIndex === null ? chain.length - 1 : focusedIndex;

  // Bring the focused answer to the top of the viewport when the focus moves on
  // its own (a new step arrives or an answer is tapped). Skipped mid-drag so the
  // rolodex spins smoothly without the page fighting the gesture.
  useEffect(() => {
    if (chain.length === 0 || dragging.current) return;
    const el = itemRefs.current[focused];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focused, chain.length]);

  // ── Rolodex: drag vertically over the stack to spin through the cards ──
  function clampFocus(n: number) {
    return Math.max(0, Math.min(chain.length - 1, n));
  }

  function onStackPointerDown(e: ReactPointerEvent) {
    if (chain.length < 2) return; // nothing to spin through
    dragging.current = true;
    dragMoved.current = false;
    dragStartY.current = e.clientY;
    dragStartFocus.current = focused;
    setGrabbing(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onStackPointerMove(e: ReactPointerEvent) {
    if (!dragging.current) return;
    const delta = e.clientY - dragStartY.current;
    if (Math.abs(delta) > 5) dragMoved.current = true;
    // Drag down → pull the older cards (above) forward; drag up → toward newest.
    const steps = Math.round(delta / DRAG_STEP);
    const next = clampFocus(dragStartFocus.current - steps);
    if (next !== focused) setFocusedIndex(next);
  }

  function endStackDrag() {
    if (!dragging.current) return;
    dragging.current = false;
    setGrabbing(false);
  }

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
      {chain.length > 0 && (
        <div
          style={{ ...stack, cursor: grabbing ? "grabbing" : "grab" }}
          onPointerDown={onStackPointerDown}
          onPointerMove={onStackPointerMove}
          onPointerUp={endStackDrag}
          onPointerCancel={endStackDrag}
        >
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
                style={answerCardStyle(distance, isFocused, index === chain.length - 1)}
                onClick={() => {
                  // Ignore the click that ends a drag — only treat a real tap as
                  // a "bring to front".
                  if (dragMoved.current) {
                    dragMoved.current = false;
                    return;
                  }
                  setFocusedIndex(index);
                }}
                aria-pressed={isFocused}
                title={isFocused ? undefined : "Bring this answer to the front"}
              >
                <p style={answerTextStyle(distance, isFocused)}>{step.answer}</p>
              </button>
            );
          })}
        </div>
      )}

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
