"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Capture from "@/components/Capture";
import StoryResult from "@/components/StoryResult";
import WhyEngine from "@/components/WhyEngine";
import ModeToggle from "@/components/ModeToggle";
import HistoryView from "@/components/HistoryView";
import DailyCards from "@/components/DailyCards";
import RabbitHoleCards from "@/components/RabbitHoleCards";
import type { CapturedImage } from "@/lib/image";
import type { Category } from "@/lib/categories";
import {
  clearHistory,
  getHistory,
  saveScan,
  type ScanRecord,
} from "@/lib/history";
import { getMode, setMode as persistMode } from "@/lib/prefs";
import type {
  DailyCard,
  IdentifyErrorKind,
  IdentifyResult,
  Mode,
} from "@/lib/types";

type Status = "idle" | "loading" | "result" | "error";
type View = "scan" | "history";

// Map the route's typed error kinds (plus a client-side network failure) to distinct,
// friendly, retry-able messages (R5).
const ERROR_MESSAGES: Record<IdentifyErrorKind | "network", string> = {
  bad_request: "Something was off with that image. Try capturing it again.",
  unidentifiable: "Couldn't quite identify that. Try a clearer, closer photo.",
  refused: "Couldn't analyse that image. Try a different subject.",
  upstream: "Our service had a hiccup. Give it another try.",
  network: "Network problem — check your connection and try again.",
};

const main: CSSProperties = {
  maxWidth: 640,
  margin: "0 auto",
  padding: "32px 20px 64px",
  display: "flex",
  flexDirection: "column",
  gap: 24,
  minHeight: "100dvh",
};

const header: CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const title: CSSProperties = { margin: 0, fontSize: "1.5rem", letterSpacing: "-0.01em" };
const tagline: CSSProperties = { margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" };

const controls: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const historyButton: CSSProperties = {
  background: "var(--surface-2)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "6px 14px",
  fontSize: "0.85rem",
  fontWeight: 600,
};

const statusBlock: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
  padding: "40px 0",
  color: "var(--text-muted)",
};

const resetButton: CSSProperties = {
  alignSelf: "flex-start",
  background: "var(--surface-2)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "12px 20px",
  fontSize: "1rem",
  fontWeight: 600,
};

const errorText: CSSProperties = { margin: 0, color: "var(--danger)", textAlign: "center" };

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [view, setView] = useState<View>("scan");
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("adult");
  const [history, setHistory] = useState<ScanRecord[]>([]);

  // Hydrate persisted state after mount (avoids SSR/localStorage mismatch).
  useEffect(() => {
    setMode(getMode());
    setHistory(getHistory());
  }, []);

  function changeMode(next: Mode) {
    setMode(next);
    persistMode(next);
  }

  function reset() {
    setStatus("idle");
    setResult(null);
    setErrorMessage(null);
  }

  function fail(kind: IdentifyErrorKind | "network") {
    setErrorMessage(ERROR_MESSAGES[kind]);
    setStatus("error");
  }

  function openRecord(record: ScanRecord) {
    setResult(record);
    setStatus("result");
    setView("scan");
  }

  function handleClearHistory() {
    clearHistory();
    setHistory([]);
  }

  async function identify(image: CapturedImage) {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: image.base64, mediaType: image.mediaType, mode }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: { kind?: IdentifyErrorKind } }
          | null;
        fail(body?.error?.kind ?? "upstream");
        return;
      }

      const data = (await res.json()) as IdentifyResult;
      saveScan(data, mode);
      setHistory(getHistory());
      setResult(data);
      setStatus("result");
    } catch {
      fail("network");
    }
  }

  // Build a story from a text topic — powers daily cards and rabbit-hole lenses.
  async function explore(topic: string, lens?: string) {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/explore", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, lens, mode }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: { kind?: IdentifyErrorKind } }
          | null;
        fail(body?.error?.kind ?? "upstream");
        return;
      }

      const data = (await res.json()) as IdentifyResult;
      saveScan(data, mode);
      setHistory(getHistory());
      setResult(data);
      setStatus("result");
    } catch {
      fail("network");
    }
  }

  function onDailySelect(daily: DailyCard) {
    explore(daily.subject, daily.category);
  }

  function onRabbitHole(category: Category) {
    if (result) explore(result.name, category.key);
  }

  if (view === "history") {
    return (
      <main style={main}>
        <HistoryView
          records={history}
          onSelect={openRecord}
          onClear={handleClearHistory}
          onBack={() => setView("scan")}
        />
      </main>
    );
  }

  return (
    <main style={main}>
      <header style={header}>
        <h1 style={title}>History Lens</h1>
        <p style={tagline}>Point your camera at anything. Understand why it exists.</p>
      </header>

      <div style={controls}>
        <ModeToggle mode={mode} onChange={changeMode} />
        <button type="button" style={historyButton} onClick={() => setView("history")}>
          🕘 History{history.length > 0 ? ` (${history.length})` : ""}
        </button>
      </div>

      {status === "idle" && (
        <>
          <DailyCards mode={mode} onSelect={onDailySelect} />
          <Capture onCapture={identify} />
        </>
      )}

      {status === "loading" && (
        <div style={statusBlock} role="status" aria-live="polite">
          <span style={{ fontSize: "2rem" }}>🔍</span>
          <span>Looking it up…</span>
        </div>
      )}

      {status === "result" && result && (
        <>
          <StoryResult result={result} />
          <RabbitHoleCards onSelect={onRabbitHole} />
          <WhyEngine topic={result.name} mode={mode} />
          <button type="button" style={resetButton} onClick={reset}>
            ← Scan again
          </button>
        </>
      )}

      {status === "error" && (
        <div style={statusBlock} role="alert">
          <span style={{ fontSize: "2rem" }}>😕</span>
          <p style={errorText}>{errorMessage}</p>
          <button type="button" style={resetButton} onClick={reset}>
            Try again
          </button>
        </div>
      )}
    </main>
  );
}
