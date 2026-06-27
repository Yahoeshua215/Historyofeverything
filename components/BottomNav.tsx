"use client";

import type { CSSProperties } from "react";
import Capture from "@/components/Capture";
import type { CapturedImage } from "@/lib/image";
import type { Mode } from "@/lib/types";

const bar: CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 40,
  display: "flex",
  alignItems: "stretch",
  gap: 2,
  maxWidth: 660,
  margin: "0 auto",
  padding: "8px 8px calc(8px + env(safe-area-inset-bottom))",
  background: "var(--glass-strong)",
  borderTop: "1px solid var(--glass-border)",
  backdropFilter: "var(--glass-blur)",
  WebkitBackdropFilter: "var(--glass-blur)",
  boxShadow: "0 -10px 30px rgba(30, 41, 80, 0.10)",
};

const item: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "none",
  border: "none",
  padding: "12px 4px",
  color: "var(--text-muted)",
  fontSize: "0.82rem",
  fontWeight: 600,
  letterSpacing: "0.01em",
};

const itemActive: CSSProperties = { ...item, color: "var(--accent-strong)", fontWeight: 700 };
const itemDisabled: CSSProperties = { ...item, opacity: 0.38 };

function NavButton({
  label,
  onClick,
  active = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="hl-interactive"
      style={disabled ? itemDisabled : active ? itemActive : item}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

/**
 * The app's primary navigation — a fixed, mobile-style bottom bar. Every menu
 * action (search, scan, lenses, history, reading level) lives here as a plain
 * text tab so the screen above stays devoted to the answers and the "But why?"
 * CTA.
 */
export default function BottomNav({
  onSearch,
  onLenses,
  onHistory,
  historyCount,
  lensActive,
  lensesEnabled,
  mode,
  onToggleMode,
  onCapture,
  onCaptureError,
  openSheet,
}: {
  onSearch: () => void;
  onLenses: () => void;
  onHistory: () => void;
  historyCount: number;
  lensActive: boolean;
  lensesEnabled: boolean;
  mode: Mode;
  onToggleMode: () => void;
  onCapture: (image: CapturedImage) => void;
  onCaptureError: (message: string) => void;
  openSheet: "search" | "lens" | "history" | null;
}) {
  return (
    <nav style={bar} aria-label="Main menu">
      <NavButton
        label="Search"
        onClick={onSearch}
        active={openSheet === "search"}
      />
      <Capture nav onCapture={onCapture} onError={onCaptureError} />
      <NavButton
        label="Lens"
        onClick={onLenses}
        active={openSheet === "lens" || lensActive}
        disabled={!lensesEnabled}
      />
      <NavButton
        label={historyCount > 0 ? `History (${historyCount})` : "History"}
        onClick={onHistory}
        active={openSheet === "history"}
        disabled={historyCount === 0}
      />
      <NavButton
        label={mode === "kid" ? "Kid" : "Adult"}
        onClick={onToggleMode}
      />
    </nav>
  );
}
