"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Capture from "@/components/Capture";
import SearchBox from "@/components/SearchBox";
import StoryResult from "@/components/StoryResult";
import WhyEngine from "@/components/WhyEngine";
import HistoryView from "@/components/HistoryView";
import DailyCards from "@/components/DailyCards";
import RabbitHoleCards from "@/components/RabbitHoleCards";
import BottomNav from "@/components/BottomNav";
import Sheet from "@/components/Sheet";
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
type SheetName = "search" | "lens" | "history";

// Map the route's typed error kinds (plus a client-side network failure) to distinct,
// friendly, retry-able messages (R5).
const ERROR_MESSAGES: Record<IdentifyErrorKind | "network", string> = {
  bad_request: "Something was off with that image. Try capturing it again.",
  unidentifiable: "Couldn't quite identify that. Try a clearer, closer photo.",
  refused: "Couldn't analyse that image. Try a different subject.",
  upstream: "Our service had a hiccup. Give it another try.",
  network: "Network problem — check your connection and try again.",
};

// The page is a full-height column: a scrolling stage for the answers, with the
// fixed BottomNav floating over its lower edge (hence the generous bottom pad).
const main: CSSProperties = {
  maxWidth: 660,
  margin: "0 auto",
  padding: "20px 20px 104px",
  display: "flex",
  flexDirection: "column",
  gap: 22,
  minHeight: "100dvh",
};

// Small persistent brand/home link, shown once you've left the landing.
const wordmark: CSSProperties = {
  alignSelf: "flex-start",
  background: "none",
  border: "none",
  padding: 0,
  fontSize: "1.15rem",
  fontWeight: 800,
  letterSpacing: "-0.03em",
};

// Landing hero — the name front and centre with a soft one-liner.
const hero: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: 12,
  padding: "36px 0 8px",
};
const heroTitle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(2.6rem, 12vw, 4rem)",
  fontWeight: 800,
  letterSpacing: "-0.04em",
  lineHeight: 1,
};
const heroDesc: CSSProperties = {
  margin: 0,
  color: "var(--text-muted)",
  fontSize: "clamp(1.05rem, 4.5vw, 1.3rem)",
  lineHeight: 1.5,
  maxWidth: 420,
};
const heroHint: CSSProperties = {
  margin: "4px 0 0",
  color: "var(--text-muted)",
  fontSize: "0.9rem",
};

// The answers are the star — give them room to breathe and fill the stage.
const stage: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const statusBlock: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  padding: "44px 0",
  color: "var(--text-muted)",
};

const retryButton: CSSProperties = {
  background: "var(--glass)",
  color: "var(--text)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--shadow-soft)",
  backdropFilter: "var(--glass-blur)",
  WebkitBackdropFilter: "var(--glass-blur)",
  borderRadius: 999,
  padding: "12px 22px",
  fontSize: "1rem",
  fontWeight: 600,
};

const errorText: CSSProperties = { margin: 0, color: "var(--danger)", textAlign: "center" };

const lensHint: CSSProperties = {
  margin: 0,
  color: "var(--text-muted)",
  fontSize: "0.95rem",
  lineHeight: 1.5,
  padding: "8px 0 4px",
};

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("adult");
  const [history, setHistory] = useState<ScanRecord[]>([]);
  // Which bottom-sheet (if any) is open over the page.
  const [sheet, setSheet] = useState<SheetName | null>(null);
  // The stable thing being explored, plus which lens (if any) is currently
  // applied to it — so the lens bar acts like a filter on one subject.
  const [subject, setSubject] = useState<string | null>(null);
  const [activeLens, setActiveLens] = useState<string | null>(null);

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
    setSubject(null);
    setActiveLens(null);
    setSheet(null);
  }

  function fail(kind: IdentifyErrorKind | "network") {
    setErrorMessage(ERROR_MESSAGES[kind]);
    setStatus("error");
  }

  // A capture-local problem (bad file / decode failure) reuses the error view.
  function captureError(message: string) {
    setErrorMessage(message);
    setStatus("error");
  }

  function openRecord(record: ScanRecord) {
    setResult(record);
    setSubject(record.name);
    setActiveLens(null);
    setStatus("result");
    setSheet(null);
  }

  function handleClearHistory() {
    clearHistory();
    setHistory([]);
  }

  async function identify(image: CapturedImage) {
    setSheet(null);
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
      // A fresh scan is the new subject, viewed through no lens yet.
      setSubject(data.name);
      setActiveLens(null);
      setStatus("result");
    } catch {
      fail("network");
    }
  }

  // Build a story from a text topic — powers daily cards and rabbit-hole lenses.
  async function explore(topic: string, lens?: string) {
    setSheet(null);
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

  // Free-text search — explore any topic by name (no lens applied yet).
  function onSearch(term: string) {
    setSubject(term);
    setActiveLens(null);
    explore(term);
  }

  function onDailySelect(daily: DailyCard) {
    setSubject(daily.subject);
    setActiveLens(daily.category);
    explore(daily.subject, daily.category);
  }

  // Apply a lens to the current subject — re-views the same thing from that angle.
  function onRabbitHole(category: Category) {
    if (!subject) return;
    setActiveLens(category.key);
    explore(subject, category.key);
  }

  return (
    <>
      <main style={main}>
        {status !== "idle" && (
          <button
            type="button"
            style={wordmark}
            className="hl-gradient-text"
            onClick={reset}
          >
            Everywhy
          </button>
        )}

        {status === "idle" && (
          <div style={stage}>
            <section style={hero}>
              <h1 style={heroTitle} className="hl-gradient-text">Everywhy</h1>
              <p style={heroDesc}>Capture the Why behind everything.</p>
              <p style={heroHint}>Search or scan below to begin — or tap a card.</p>
            </section>
            <DailyCards mode={mode} onSelect={onDailySelect} />
          </div>
        )}

        {status === "loading" && (
          <div style={statusBlock} role="status" aria-live="polite">
            <span style={{ fontSize: "2rem" }}>🔍</span>
            <span>Looking it up…</span>
          </div>
        )}

        {status === "result" && result && (
          <div style={stage}>
            <StoryResult result={result} />
            <WhyEngine
              key={`${result.name}:${activeLens ?? ""}`}
              topic={result.name}
              mode={mode}
            />
          </div>
        )}

        {status === "error" && (
          <div style={statusBlock} role="alert">
            <span style={{ fontSize: "2rem" }}>😕</span>
            <p style={errorText}>{errorMessage}</p>
            <button
              type="button"
              style={retryButton}
              className="hl-interactive"
              onClick={reset}
            >
              Try again
            </button>
          </div>
        )}
      </main>

      <BottomNav
        onSearch={() => setSheet("search")}
        onLenses={() => setSheet("lens")}
        onHistory={() => setSheet("history")}
        historyCount={history.length}
        lensActive={activeLens !== null}
        lensesEnabled={Boolean(subject)}
        mode={mode}
        onToggleMode={() => changeMode(mode === "adult" ? "kid" : "adult")}
        onCapture={identify}
        onCaptureError={captureError}
        openSheet={sheet}
      />

      {sheet === "search" && (
        <Sheet title="Search anything" onClose={() => setSheet(null)}>
          <SearchBox
            onSearch={onSearch}
            trailing={
              <Capture compact onCapture={identify} onError={captureError} />
            }
          />
        </Sheet>
      )}

      {sheet === "lens" && (
        <Sheet title="See it through a lens" onClose={() => setSheet(null)}>
          {subject ? (
            <RabbitHoleCards active={activeLens} onSelect={onRabbitHole} />
          ) : (
            <p style={lensHint}>
              Scan or search something first, then revisit it through a lens —
              history, science, people, and more.
            </p>
          )}
        </Sheet>
      )}

      {sheet === "history" && (
        <Sheet title="History" onClose={() => setSheet(null)}>
          <HistoryView
            embedded
            records={history}
            onSelect={openRecord}
            onClear={handleClearHistory}
            onBack={() => setSheet(null)}
          />
        </Sheet>
      )}
    </>
  );
}
