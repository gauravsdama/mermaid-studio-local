import type { DiagramTheme, SavedDiagram } from "../types";

const HISTORY_KEY = "mermaid-studio:history";
const LIBRARY_KEY = "mermaid-studio:library";

function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getHistory(): SavedDiagram[] {
  return read<SavedDiagram[]>(HISTORY_KEY, []);
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
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

export function getLibrary(): SavedDiagram[] {
  return read<SavedDiagram[]>(LIBRARY_KEY, []);
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
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
  return next;
}

export function deleteFromLibrary(id: string): SavedDiagram[] {
  const next = getLibrary().filter((item) => item.id !== id);
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
  return next;
}
