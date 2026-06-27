"use client";

import type { CSSProperties } from "react";
import type { ScanRecord } from "@/lib/history";

const wrap: CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };

const topRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const pillButton: CSSProperties = {
  background: "var(--glass)",
  color: "var(--text)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--shadow-soft)",
  backdropFilter: "var(--glass-blur)",
  WebkitBackdropFilter: "var(--glass-blur)",
  borderRadius: 999,
  padding: "9px 18px",
  fontSize: "0.9rem",
  fontWeight: 600,
};

const clearButton: CSSProperties = {
  ...pillButton,
  color: "var(--danger)",
  borderColor: "rgba(224, 80, 106, 0.4)",
  background: "var(--glass-2)",
};

const card: CSSProperties = {
  textAlign: "left",
  background: "var(--glass)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--shadow-soft)",
  backdropFilter: "var(--glass-blur)",
  WebkitBackdropFilter: "var(--glass-blur)",
  borderRadius: "var(--radius)",
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 5,
  width: "100%",
  color: "var(--text)",
};

const cardName: CSSProperties = { margin: 0, fontWeight: 600, fontSize: "1.05rem" };
const cardAnswer: CSSProperties = {
  margin: 0,
  color: "var(--text-muted)",
  fontSize: "0.9rem",
  lineHeight: 1.4,
};
const cardMeta: CSSProperties = { fontSize: "0.75rem", color: "var(--text-muted)" };
const empty: CSSProperties = { color: "var(--text-muted)", textAlign: "center", padding: "32px 0" };

function formatWhen(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Browse past scans; tap one to re-open it. When `embedded` (e.g. inside a
 * bottom sheet that already supplies a title and close affordance) the internal
 * back button and heading are dropped, leaving just the Clear action.
 */
export default function HistoryView({
  records,
  onSelect,
  onClear,
  onBack,
  embedded = false,
}: {
  records: ScanRecord[];
  onSelect: (record: ScanRecord) => void;
  onClear: () => void;
  onBack: () => void;
  embedded?: boolean;
}) {
  return (
    <section style={wrap} aria-label="Scan history">
      {embedded ? (
        records.length > 0 && (
          <div style={{ ...topRow, justifyContent: "flex-end" }}>
            <button type="button" style={clearButton} className="hl-interactive" onClick={onClear}>
              Clear
            </button>
          </div>
        )
      ) : (
        <div style={topRow}>
          <button type="button" style={pillButton} className="hl-interactive" onClick={onBack}>
            ← Back
          </button>
          <strong>History</strong>
          {records.length > 0 ? (
            <button type="button" style={clearButton} className="hl-interactive" onClick={onClear}>
              Clear
            </button>
          ) : (
            <span style={{ width: 64 }} aria-hidden />
          )}
        </div>
      )}

      {records.length === 0 ? (
        <p style={empty}>No scans yet. Scan something to start your history.</p>
      ) : (
        records.map((record) => (
          <button
            key={record.id}
            type="button"
            style={card}
            className="hl-interactive"
            onClick={() => onSelect(record)}
          >
            <p style={cardName}>{record.name}</p>
            <p style={cardAnswer}>{record.instantAnswer}</p>
            <span style={cardMeta}>
              {formatWhen(record.createdAt)}
              {record.mode === "kid" ? " · Kid" : ""}
            </span>
          </button>
        ))
      )}
    </section>
  );
}
