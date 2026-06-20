import { isMode, type Mode } from "./types";

// Persisted UI preferences (client-side localStorage).

const MODE_KEY = "history-lens:mode";

export function getMode(): Mode {
  if (typeof window === "undefined") return "adult";
  try {
    const value = window.localStorage.getItem(MODE_KEY);
    return isMode(value) ? value : "adult";
  } catch {
    return "adult";
  }
}

export function setMode(mode: Mode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}
