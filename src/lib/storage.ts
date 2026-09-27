import type { DiagramTheme, SavedDiagram } from "../types";
import { DIAGRAM_THEMES, MAX_ARTIFACT_ID_LENGTH, MAX_DIAGRAM_TITLE_LENGTH, MAX_MERMAID_SOURCE_LENGTH } from "../../shared/contractValues";

const HISTORY_KEY = "mermaid-studio:history";
const LIBRARY_KEY = "mermaid-studio:library";
const STORAGE_VERSION = 1;
const THEMES = new Set<DiagramTheme>(DIAGRAM_THEMES);

interface StoredCollection {
  version: typeof STORAGE_VERSION;
  items: SavedDiagram[];
}

function isSavedDiagram(value: unknown): value is SavedDiagram {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && item.id.length > 0 && item.id.length <= MAX_ARTIFACT_ID_LENGTH
    && typeof item.title === "string" && item.title.length <= MAX_DIAGRAM_TITLE_LENGTH
    && typeof item.source === "string" && item.source.length <= MAX_MERMAID_SOURCE_LENGTH
    && typeof item.theme === "string" && THEMES.has(item.theme as DiagramTheme)
    && typeof item.updatedAt === "string" && Number.isFinite(Date.parse(item.updatedAt));
}

function write(key: string, items: SavedDiagram[]): void {
  const value: StoredCollection = { version: STORAGE_VERSION, items };
  localStorage.setItem(key, JSON.stringify(value));
}

function read(key: string, limit: number): SavedDiagram[] {
  try {
    const value = localStorage.getItem(key);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    const items = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && (parsed as Record<string, unknown>).version === STORAGE_VERSION
        ? (parsed as Record<string, unknown>).items
        : undefined;
    if (!Array.isArray(items)) return [];
    const valid = items.filter(isSavedDiagram).slice(0, limit);
    if (Array.isArray(parsed) || valid.length !== items.length) {
      try { write(key, valid); } catch { /* Valid state remains usable when migration cannot be persisted. */ }
    }
    return valid;
  } catch {
    return [];
  }
}

export function getHistory(): SavedDiagram[] {
  return read(HISTORY_KEY, 10);
}

export function rememberDiagram(title: string, source: string, theme: DiagramTheme): SavedDiagram[] {
  const next: SavedDiagram = {
    id: crypto.randomUUID(),
    title,
    source,
    theme,
    updatedAt: new Date().toISOString()
  };
  const recent = getHistory().filter((item) => item.source !== source).slice(0, 9);
  const history = [next, ...recent];
  write(HISTORY_KEY, history);
  return history;
}

export function getLibrary(): SavedDiagram[] {
  return read(LIBRARY_KEY, 25);
}

export function saveToLibrary(title: string, source: string, theme: DiagramTheme): SavedDiagram[] {
  const library = getLibrary();
  const existing = library.findIndex((item) => item.title.toLowerCase() === title.toLowerCase());
  const entry: SavedDiagram = {
    id: existing >= 0 ? library[existing].id : crypto.randomUUID(),
    title,
    source,
    theme,
    updatedAt: new Date().toISOString()
  };
  const next = existing >= 0 ? library.map((item, index) => (index === existing ? entry : item)) : [entry, ...library].slice(0, 25);
  write(LIBRARY_KEY, next);
  return next;
}

export function deleteFromLibrary(id: string): SavedDiagram[] {
  const next = getLibrary().filter((item) => item.id !== id);
  write(LIBRARY_KEY, next);
  return next;
}
