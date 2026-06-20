"use client";

import { useEffect, useState, type CSSProperties } from "react";

const button: CSSProperties = {
  alignSelf: "flex-start",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "var(--surface-2)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "8px 14px",
  fontSize: "0.9rem",
  fontWeight: 600,
};

function speechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

/**
 * Read-aloud toggle using the browser's Web Speech API (narration — Kid Mode).
 * Client-only and free; renders nothing where speech synthesis is unavailable.
 */
export default function NarrateButton({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(speechSupported());
    return () => {
      if (speechSupported()) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  function toggle() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.cancel(); // clear anything mid-flight before starting
    synth.speak(utterance);
    setSpeaking(true);
  }

  if (!supported) return null;

  return (
    <button type="button" style={button} onClick={toggle} aria-pressed={speaking}>
      {speaking ? "⏹ Stop" : "🔊 Read aloud"}
    </button>
  );
}
