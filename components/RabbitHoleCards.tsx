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

const grid: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 9,
};

const chip: CSSProperties = {
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

/**
 * Rabbit-hole lenses — explore the current subject through a different angle.
 * Shown alongside a result; the main story stays front and center.
 */
export default function RabbitHoleCards({
  onSelect,
  disabled = false,
}: {
  onSelect: (category: Category) => void;
  disabled?: boolean;
}) {
  return (
    <section style={wrap} aria-label="Explore other angles">
      <h2 style={heading}>Go down a rabbit hole</h2>
      <div style={grid}>
        {CATEGORIES.map((category, index) => (
          <button
            key={category.key}
            type="button"
            className="hl-fade-up hl-interactive"
            style={{ ...chip, animationDelay: `${index * 60}ms` }}
            onClick={() => onSelect(category)}
            disabled={disabled}
          >
            <span aria-hidden>{category.emoji}</span>
            {category.label}
          </button>
        ))}
      </div>
    </section>
  );
}
