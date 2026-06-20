"use client";

import type { CSSProperties } from "react";
import type { Mode } from "@/lib/types";

const group: CSSProperties = {
  display: "inline-flex",
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: 3,
  background: "var(--surface)",
};

const base: CSSProperties = {
  border: "none",
  borderRadius: 999,
  padding: "6px 14px",
  fontSize: "0.85rem",
  fontWeight: 600,
  background: "transparent",
  color: "var(--text-muted)",
};

const active: CSSProperties = {
  ...base,
  background: "var(--accent)",
  color: "#1a1206",
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
