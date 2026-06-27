"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  background: "rgba(17, 24, 39, 0.34)",
  backdropFilter: "blur(3px)",
  WebkitBackdropFilter: "blur(3px)",
};

const panel: CSSProperties = {
  background: "var(--glass-strong)",
  borderTop: "1px solid var(--glass-border)",
  backdropFilter: "var(--glass-blur)",
  WebkitBackdropFilter: "var(--glass-blur)",
  borderTopLeftRadius: "var(--radius-lg)",
  borderTopRightRadius: "var(--radius-lg)",
  boxShadow: "0 -22px 60px rgba(30, 41, 80, 0.28)",
  padding: "10px 20px calc(26px + env(safe-area-inset-bottom))",
  maxHeight: "82vh",
  overflowY: "auto",
};

const grabber: CSSProperties = {
  width: 40,
  height: 5,
  borderRadius: 999,
  background: "var(--border)",
  margin: "0 auto 14px",
};

const titleRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 14,
};

const title: CSSProperties = {
  margin: 0,
  fontSize: "1.05rem",
  fontWeight: 700,
  letterSpacing: "-0.02em",
};

const closeButton: CSSProperties = {
  background: "var(--glass)",
  border: "1px solid var(--glass-border)",
  borderRadius: 999,
  width: 32,
  height: 32,
  fontSize: "1rem",
  color: "var(--text-muted)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

/**
 * A mobile-style bottom sheet. Slides up over the page to host a single control
 * (search, lenses, history) so the main screen stays focused on the answers.
 * Tapping the backdrop or the close button dismisses it.
 */
export default function Sheet({
  title: heading,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  // Close on Escape for keyboard/desktop users.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      style={overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={heading}
    >
      <div
        style={panel}
        className="hl-sheet-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={grabber} aria-hidden />
        <div style={titleRow}>
          <h2 style={title}>{heading}</h2>
          <button
            type="button"
            style={closeButton}
            className="hl-interactive"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
