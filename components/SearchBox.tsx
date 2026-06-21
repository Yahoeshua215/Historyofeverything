"use client";

import { useState, type CSSProperties, type FormEvent } from "react";

const form: CSSProperties = {
  display: "flex",
  gap: 10,
};

const input: CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "var(--glass-strong)",
  color: "var(--text)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--shadow-soft)",
  backdropFilter: "var(--glass-blur)",
  WebkitBackdropFilter: "var(--glass-blur)",
  borderRadius: 999,
  padding: "14px 20px",
  fontSize: "1rem",
  outline: "none",
};

const submit: CSSProperties = {
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  background: "var(--accent-gradient)",
  color: "var(--accent-ink)",
  border: "none",
  borderRadius: 999,
  padding: "14px 22px",
  fontSize: "1rem",
  fontWeight: 700,
  boxShadow: "var(--shadow-accent)",
};

/**
 * Free-text entry — explore any topic by name, not just by photo. Submitting a
 * non-empty term hands it to `onSearch`, which runs the same explore flow used by
 * daily cards and lenses.
 */
export default function SearchBox({
  onSearch,
  disabled = false,
}: {
  onSearch: (term: string) => void;
  disabled?: boolean;
}) {
  const [term, setTerm] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const query = term.trim();
    if (!query) return;
    onSearch(query);
  }

  return (
    <form style={form} onSubmit={handleSubmit} role="search">
      <input
        style={input}
        type="text"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search anything — a place, idea, object, person…"
        aria-label="Search any topic"
        enterKeyHint="search"
        disabled={disabled}
      />
      <button
        type="submit"
        style={submit}
        className="hl-interactive"
        disabled={disabled || term.trim() === ""}
      >
        Explore
      </button>
    </form>
  );
}
