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
  background: "var(--surface-2)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "8px 16px",
  fontSize: "0.9rem",
  fontWeight: 600,
};

const clearButton: CSSProperties = {
  ...pillButton,
  color: "var(--danger)",
  borderColor: "var(--danger)",
  background: "transparent",
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

/** Browse past scans; tap one to re-open it. */
export default function HistoryView({
  records,
  onSelect,
  onClear,
  onBack,
}: {
  records: ScanRecord[];
  onSelect: (record: ScanRecord) => void;
  onClear: () => void;
  onBack: () => void;
}) {
  return (
    <section style={wrap} aria-label="Scan history">
      <div style={topRow}>
        <button type="button" style={pillButton} onClick={onBack}>
          ← Back
        </button>
        <strong>History</strong>
        {records.length > 0 ? (
          <button type="button" style={clearButton} onClick={onClear}>
            Clear
          </button>
        ) : (
          <span style={{ width: 64 }} aria-hidden />
        )}
      </div>

      {records.length === 0 ? (
        <p style={empty}>No scans yet. Scan something to start your history.</p>
      ) : (
        records.map((record) => (
          <button
            key={record.id}
            type="button"
            style={card}
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
