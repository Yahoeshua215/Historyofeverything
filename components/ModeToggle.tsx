"use client";

import type { CSSProperties } from "react";
import type { Mode } from "@/lib/types";

const group: CSSProperties = {
  display: "inline-flex",
  border: "1px solid var(--glass-border)",
  borderRadius: 999,
  padding: 4,
  background: "var(--glass)",
  boxShadow: "var(--shadow-soft)",
  backdropFilter: "var(--glass-blur)",
  WebkitBackdropFilter: "var(--glass-blur)",
};

const base: CSSProperties = {
  border: "none",
  borderRadius: 999,
  padding: "7px 16px",
  fontSize: "0.85rem",
  fontWeight: 600,
  background: "transparent",
  color: "var(--text-muted)",
  transition: "color 0.18s ease",
};

const active: CSSProperties = {
  ...base,
  background: "var(--accent-gradient)",
  color: "var(--accent-ink)",
  boxShadow: "var(--shadow-accent)",
};

const OPTIONS: { value: Mode; label: string }[] = [
  { value: "adult", label: "Adult" },
  { value: "kid", label: "Kid" },
];

/** Adult / Kid reading-level toggle. */
export default function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
}) {
  return (
    <div style={group} role="group" aria-label="Reading level">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          style={mode === opt.value ? active : base}
          aria-pressed={mode === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
