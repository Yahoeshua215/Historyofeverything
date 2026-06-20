"use client";

import { useState, type CSSProperties } from "react";
import Capture from "@/components/Capture";
import StoryResult from "@/components/StoryResult";
import WhyEngine from "@/components/WhyEngine";
import type { CapturedImage } from "@/lib/image";
import type { IdentifyErrorKind, IdentifyResult } from "@/lib/types";

type Status = "idle" | "loading" | "result" | "error";

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
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function reset() {
    setStatus("idle");
    setResult(null);
    setErrorMessage(null);
  }

  function fail(kind: IdentifyErrorKind | "network") {
    setErrorMessage(ERROR_MESSAGES[kind]);
    setStatus("error");
  }

  async function identify(image: CapturedImage) {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: image.base64, mediaType: image.mediaType }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: { kind?: IdentifyErrorKind } }
          | null;
        fail(body?.error?.kind ?? "upstream");
        return;
      }

      const data = (await res.json()) as IdentifyResult;
      setResult(data);
      setStatus("result");
    } catch {
      fail("network");
    }
  }

  return (
    <main style={main}>
      <header style={header}>
        <h1 style={title}>History Lens</h1>
        <p style={tagline}>Point your camera at anything. Understand why it exists.</p>
      </header>

      {status === "idle" && <Capture onCapture={identify} />}

      {status === "loading" && (
        <div style={statusBlock} role="status" aria-live="polite">
          <span style={{ fontSize: "2rem" }}>🔍</span>
          <span>Looking it up…</span>
        </div>
      )}

      {status === "result" && result && (
        <>
          <StoryResult result={result} />
          <WhyEngine topic={result.name} />
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
