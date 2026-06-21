"use client";

import type { CSSProperties } from "react";
import { CATEGORIES, type Category } from "@/lib/categories";

const wrap: CSSProperties = { display: "flex", flexDirection: "column", gap: 10 };

const heading: CSSProperties = {
  margin: 0,
  fontSize: "0.78rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-muted)",
};

const row: CSSProperties = {
  display: "flex",
  gap: 9,
  paddingBottom: 4,
};

const chip: CSSProperties = {
  flex: "0 0 auto",
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
  padding: "9px 16px",
  fontSize: "0.95rem",
  fontWeight: 600,
};

// The applied lens — highlighted like a selected filter.
const chipActive: CSSProperties = {
  ...chip,
  background: "var(--accent-gradient)",
  color: "var(--accent-ink)",
  border: "1px solid transparent",
  boxShadow: "var(--shadow-accent)",
};

/**
 * Lens filter bar — view the current subject through a different angle (history,
 * science, people, …). Each lens re-explores the same subject from that
 * viewpoint; the active lens is highlighted like a selected filter.
 */
export default function RabbitHoleCards({
  onSelect,
  active = null,
  disabled = false,
}: {
  onSelect: (category: Category) => void;
  active?: string | null;
  disabled?: boolean;
}) {
  return (
    <section style={wrap} aria-label="View through a lens">
      <h2 style={heading}>🔭 See it through a lens</h2>
      <div style={row} className="hl-scroll-x">
        {CATEGORIES.map((category) => {
          const isActive = active === category.key;
          return (
            <button
              key={category.key}
              type="button"
              className="hl-interactive"
              style={isActive ? chipActive : chip}
              aria-pressed={isActive}
              onClick={() => onSelect(category)}
              disabled={disabled}
            >
              <span aria-hidden>{category.emoji}</span>
              {category.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
