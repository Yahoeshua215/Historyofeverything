import type { IdentifyResult, Mode } from "./types";

// Client-side scan history (no accounts/DB — prototype scope). Stored in
// localStorage, newest-first, capped to avoid blowing the storage quota.

export interface ScanRecord extends IdentifyResult {
  id: string;
  /** Epoch ms when the scan was saved. */
  createdAt: number;
  /** The mode the story was generated in. */
  mode: Mode;
}

const KEY = "history-lens:scans";
const MAX_RECORDS = 50;

function storageAvailable(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getHistory(): ScanRecord[] {
  if (!storageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScanRecord[]) : [];
  } catch {
    return [];
  }
}

/** Prepend a scan to history (newest-first, capped) and return the saved record. */
export function saveScan(result: IdentifyResult, mode: Mode): ScanRecord {
  const record: ScanRecord = { ...result, mode, id: newId(), createdAt: Date.now() };
  if (!storageAvailable()) return record;
  const next = [record, ...getHistory()].slice(0, MAX_RECORDS);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded or storage disabled — history is best-effort, ignore.
  }
  return record;
}

export function clearHistory(): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
