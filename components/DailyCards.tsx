"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { CATEGORIES } from "@/lib/categories";
import type { DailyCard, IdentifyErrorKind, Mode } from "@/lib/types";

const EMOJI = new Map(CATEGORIES.map((c) => [c.key, c.emoji]));
const LABEL = new Map(CATEGORIES.map((c) => [c.key, c.label]));

const wrap: CSSProperties = { display: "flex", flexDirection: "column", gap: 10 };
const heading: CSSProperties = {
  margin: 0,
  fontSize: "0.78rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-muted)",
};
const card: CSSProperties = {
  textAlign: "left",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  width: "100%",
};
const cardCat: CSSProperties = {
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--accent)",
};
const cardTitle: CSSProperties = { margin: 0, fontWeight: 600, fontSize: "1.02rem" };
const cardTeaser: CSSProperties = {
  margin: 0,
  color: "var(--text-muted)",
  fontSize: "0.9rem",
  lineHeight: 1.4,
};
const muted: CSSProperties = { color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 };

function todayParts(): { monthDay: string; isoDay: string } {
  const now = new Date();
  const monthDay = now.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const isoDay = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  return { monthDay, isoDay };
}

function readCache(key: string): DailyCard[] | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DailyCard[]) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, cards: DailyCard[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(cards));
  } catch {
    /* ignore */
  }
}

/**
 * "On this day in history" — five date-based discovery cards (one per category),
 * regenerated daily and cached so it's one model call per day per mode. Tapping a
 * card explores its subject (does not replace the camera).
 */
export default function DailyCards({
  mode,
  onSelect,
}: {
  mode: Mode;
  onSelect: (card: DailyCard) => void;
}) {
  const [monthDay, setMonthDay] = useState("");
  const [cards, setCards] = useState<DailyCard[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const { monthDay, isoDay } = todayParts();
    setMonthDay(monthDay);

    const cacheKey = `history-lens:daily:${isoDay}:${mode}`;
    const cached = readCache(cacheKey);
    if (cached && cached.length > 0) {
      setCards(cached);
      setStatus("ready");
      return;
    }

    setStatus("loading");
    fetch("/api/daily", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: monthDay, mode }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { error?: { kind?: IdentifyErrorKind } }
            | null;
          throw new Error(body?.error?.kind ?? "upstream");
        }
        return res.json() as Promise<{ cards: DailyCard[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        if (!data || !Array.isArray(data.cards) || data.cards.length === 0) {
          setStatus("error");
          return;
        }
        setCards(data.cards);
        setStatus("ready");
        writeCache(cacheKey, data.cards);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [mode]);

  return (
    <section style={wrap} aria-label="On this day">
      <h2 style={heading}>🗓️ On this day{monthDay ? ` — ${monthDay}` : ""}</h2>

      {status === "loading" && <p style={muted}>Gathering today’s discoveries…</p>}
      {status === "error" && (
        <p style={muted}>Couldn’t load today’s discoveries. Scanning still works.</p>
      )}

      {status === "ready" &&
        cards.map((c, index) => (
          <button
            key={`${c.category}-${index}`}
            type="button"
            className="hl-fade-up"
            style={{ ...card, animationDelay: `${index * 70}ms` }}
            onClick={() => onSelect(c)}
          >
            <span style={cardCat}>
              {EMOJI.get(c.category) ?? "✨"} {LABEL.get(c.category) ?? c.category}
            </span>
            <p style={cardTitle}>{c.title}</p>
            <p style={cardTeaser}>{c.teaser}</p>
          </button>
        ))}
    </section>
  );
}
