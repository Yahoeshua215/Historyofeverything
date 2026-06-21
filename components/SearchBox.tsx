"use client";

import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react";

const form: CSSProperties = {
  display: "flex",
  gap: 10,
};

const inputBase: CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "var(--glass-strong)",
  color: "var(--text)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--shadow-soft)",
  backdropFilter: "var(--glass-blur)",
  WebkitBackdropFilter: "var(--glass-blur)",
  borderRadius: 999,
  outline: "none",
};

const submitBase: CSSProperties = {
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  background: "var(--accent-gradient)",
  color: "var(--accent-ink)",
  border: "none",
  borderRadius: 999,
  fontWeight: 700,
  boxShadow: "var(--shadow-accent)",
};

const sizes = {
  full: {
    input: { padding: "14px 20px", fontSize: "1rem" },
    submit: { padding: "14px 22px", fontSize: "1rem" },
    label: "Explore",
  },
  compact: {
    input: { padding: "10px 16px", fontSize: "0.9rem" },
    submit: { padding: "10px 16px", fontSize: "0.9rem" },
    label: "Go",
  },
} as const;

/**
 * Free-text entry — explore any topic by name, not just by photo. Submitting a
 * non-empty term hands it to `onSearch` (the same explore flow used by daily
 * cards and lenses). `trailing` slots an extra control (e.g. an image button)
 * beside the field so the user can pose the next question by text or photo.
 */
export default function SearchBox({
  onSearch,
  disabled = false,
  compact = false,
  placeholder = "Search anything — a place, idea, object, person…",
  trailing,
}: {
  onSearch: (term: string) => void;
  disabled?: boolean;
  compact?: boolean;
  placeholder?: string;
  trailing?: ReactNode;
}) {
  const [term, setTerm] = useState("");
  const size = compact ? sizes.compact : sizes.full;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const query = term.trim();
    if (!query) return;
    onSearch(query);
  }

  return (
    <form style={form} onSubmit={handleSubmit} role="search">
      <input
        style={{ ...inputBase, ...size.input }}
        type="text"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder={placeholder}
        aria-label="Search any topic"
        enterKeyHint="search"
        disabled={disabled}
      />
      <button
        type="submit"
        style={{ ...submitBase, ...size.submit }}
        className="hl-interactive"
        disabled={disabled || term.trim() === ""}
      >
        {size.label}
      </button>
      {trailing}
    </form>
  );
}
