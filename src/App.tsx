import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { presets } from "./data/presets";
import { cleanSvgForExport, downloadDataUrl, downloadText, filenameFor, svgToPngDataUrl } from "./lib/export";
import { enableFlowEditor } from "./lib/flowEditor";
import { deleteFromLibrary, getHistory, getLibrary, rememberDiagram, saveToLibrary } from "./lib/storage";
import type { ArtifactRecord, DiagramTheme, SaveArtifactRequest, SavedDiagram } from "./types";

const STARTER = `flowchart LR
  Draft[Mermaid code] --> Preview[Live preview]
  Preview --> Decision{Need layout edits?}
  Decision -->|No| Export[Transparent PNG]
  Decision -->|Yes| Arrange[Optional freeform editor]
  Arrange --> Export`;

const THEMES: DiagramTheme[] = ["default", "dark", "forest", "neutral", "base"];

function readSharedDiagram(): string | undefined {
  try {
    const fragment = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const encoded = new URLSearchParams(fragment).get("diagram") ?? new URLSearchParams(window.location.search).get("diagram");
    return encoded ? decodeURIComponent(escape(atob(encoded))) : undefined;
  } catch {
    return undefined;
  }
}

function encodeDiagram(source: string): string {
  return btoa(unescape(encodeURIComponent(source)));
}

function App() {
  const [title, setTitle] = useState("Untitled diagram");
  const [source, setSource] = useState(() => readSharedDiagram() ?? STARTER);
  const [theme, setTheme] = useState<DiagramTheme>("default");
  const [svgMarkup, setSvgMarkup] = useState("");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState<SavedDiagram[]>(() => getHistory());
  const [library, setLibrary] = useState<SavedDiagram[]>(() => getLibrary());
  const [notice, setNotice] = useState("Live rendering is on");
  const [sequenceStep, setSequenceStep] = useState(0);
  const [sequenceTotal, setSequenceTotal] = useState(0);
  const renderHost = useRef<HTMLDivElement>(null);
  const previewPanel = useRef<HTMLElement>(null);
  const renderVersion = useRef(0);

  const isFlowchart = useMemo(() => /^\s*(flowchart|graph)\b/i.test(source), [source]);
  const isSequence = useMemo(() => /^\s*sequenceDiagram\b/i.test(source), [source]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const version = ++renderVersion.current;
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme });
        const result = await mermaid.render(`mermaid-studio-${version}`, source);
        if (version !== renderVersion.current) return;
        setSvgMarkup(result.svg);
        setError("");
        setEditing(false);
        setNotice("Preview updated");
      } catch (cause) {
        if (version !== renderVersion.current) return;
        setError(cause instanceof Error ? cause.message.replace(/^Error:\s*/, "") : "Mermaid could not render this code.");
        setSvgMarkup("");
      }
    }, 260);
    return () => window.clearTimeout(timer);
  }, [source, theme]);

  useEffect(() => {
    const svg = renderHost.current?.querySelector<SVGSVGElement>("svg");
    if (!svg) return;
    const type = source.trim().split(/\s|\n/, 1)[0]?.replace(/-v\d+$/i, "") || "diagram";
    const titleId = "mermaid-studio-svg-title";
    const descriptionId = "mermaid-studio-svg-description";
    svg.querySelector(`#${titleId}`)?.remove();
    svg.querySelector(`#${descriptionId}`)?.remove();
    const svgTitle = document.createElementNS("http://www.w3.org/2000/svg", "title");
    svgTitle.id = titleId;
    svgTitle.textContent = title;
    const description = document.createElementNS("http://www.w3.org/2000/svg", "desc");
    description.id = descriptionId;
    description.textContent = `${title}. Mermaid ${type} diagram.`;
    svg.prepend(description);
    svg.prepend(svgTitle);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-labelledby", `${titleId} ${descriptionId}`);
    svg.setAttribute("focusable", "false");
  }, [source, svgMarkup, title]);

  useEffect(() => {
    if (!editing || !renderHost.current) return;
    const svg = renderHost.current.querySelector<SVGSVGElement>("svg");
    if (!svg) return;
    const dispose = enableFlowEditor(svg);
    if (!dispose) {
      setNotice("Layout editing supports flowcharts with named nodes and arrows.");
      setEditing(false);
      return;
    }
    return dispose;
  }, [editing, svgMarkup]);

  useEffect(() => {
    if (!isSequence || !renderHost.current) return;
    const items = [...renderHost.current.querySelectorAll<SVGElement>(".messageLine0, .messageLine1, .messageText")];
    setSequenceTotal(Math.ceil(items.length / 3));
    items.forEach((item, index) => {
      item.style.opacity = sequenceStep === 0 || index < sequenceStep * 3 ? "1" : "0.12";
    });
  }, [isSequence, sequenceStep, svgMarkup]);

  const getSvg = useCallback((): SVGSVGElement => {
    const svg = renderHost.current?.querySelector<SVGSVGElement>("svg");
    if (!svg) throw new Error("Render a valid diagram before exporting it.");
    return svg;
  }, []);

  const exportSvg = useCallback(() => cleanSvgForExport(getSvg()), [getSvg]);

  const toggleLayoutEditing = useCallback(() => {
    if (editing) {
      setSvgMarkup(exportSvg());
      setEditing(false);
      setNotice("Preview updated");
      return;
    }
    setEditing(true);
  }, [editing, exportSvg]);

  const buildPng = useCallback(async () => svgToPngDataUrl(exportSvg(), 4), [exportSvg]);

  const remember = useCallback(() => {
    const next = rememberDiagram(title, source, theme);
    setHistory(next);
  }, [source, theme, title]);

  const saveLocal = useCallback(() => {
    setLibrary(saveToLibrary(title, source, theme));
    remember();
    setNotice(`Saved “${title}” in this browser`);
  }, [remember, source, theme, title]);

  const saveToFolder = useCallback(async () => {
    try {
      const request: SaveArtifactRequest = {
        title,
        source,
        theme,
        pngDataUrl: await buildPng(),
        svg: exportSvg()
      };
      const response = await fetch("/api/diagrams", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request)
      });
      const body = await response.json() as { artifact?: ArtifactRecord; error?: string };
      if (!response.ok || !body.artifact) throw new Error(body.error ?? "The local artifact gateway did not accept this diagram.");
      remember();
      setNotice(`Saved PNG, Mermaid code, and SVG to ${body.artifact.pngPath}`);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Could not save the diagram to the app folder.");
    }
  }, [buildPng, exportSvg, remember, source, theme, title]);

  const downloadPng = useCallback(async () => {
    try {
      downloadDataUrl(filenameFor(title, "png"), await buildPng());
      remember();
      setNotice("Downloaded a 4× transparent PNG");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "PNG export failed.");
    }
  }, [buildPng, remember, title]);

  const share = useCallback(async () => {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = `diagram=${encodeURIComponent(encodeDiagram(source))}`;
    try {
      await navigator.clipboard.writeText(url.toString());
      setNotice("Copied source link. Anyone with it can read the diagram text.");
    } catch {
      setNotice("Clipboard access was blocked. Copy the address bar URL instead.");
    }
  }, [source]);

  const loadDiagram = (item: SavedDiagram): void => {
    setTitle(item.title);
    setSource(item.source);
    setTheme(item.theme);
    setNotice(`Loaded “${item.title}”`);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === "s" && event.shiftKey) {
        event.preventDefault();
        downloadText(filenameFor(title, "svg"), exportSvg(), "image/svg+xml");
      } else if (event.key.toLowerCase() === "p" && event.shiftKey) {
        event.preventDefault();
        void downloadPng();
      } else if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveLocal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [downloadPng, exportSvg, saveLocal, title]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">↗</span><span>Mermaid <b>Studio</b></span><em>local</em></div>
        <div className="title-input"><label htmlFor="diagram-title">Diagram title</label><input id="diagram-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} /></div>
        <div className="header-actions">
          <div className="share-action"><button className="ghost" onClick={share} aria-describedby="share-privacy">Share source</button><span id="share-privacy">Source links include the full diagram text.</span></div>
          <button className="ghost" onClick={saveLocal}>Save library</button>
          <button className="primary" onClick={() => void saveToFolder()}>Save to app folder</button>
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar" aria-label="Diagram tools">
          <section>
            <p className="eyebrow">Starting point</p>
            <select aria-label="Preset diagrams" defaultValue="" onChange={(event) => {
              const preset = presets.find((item) => item.name === event.target.value);
              if (preset) { setTitle(preset.name); setSource(preset.source); setTheme(preset.theme); }
            }}>
              <option value="" disabled>Choose a preset…</option>
              {presets.map((preset) => <option key={preset.name}>{preset.name}</option>)}
            </select>
          </section>
          <section>
            <p className="eyebrow">Render settings</p>
            <label className="field-label" htmlFor="theme">Mermaid theme</label>
            <select id="theme" value={theme} onChange={(event) => setTheme(event.target.value as DiagramTheme)}>
              {THEMES.map((item) => <option key={item}>{item}</option>)}
            </select>
            <p className="tiny-note">Exports always use a transparent canvas at 4× resolution.</p>
          </section>
          <section className="saved-section">
            <div className="section-heading"><p className="eyebrow">Library</p><span>{library.length}/25</span></div>
            {library.length ? <ul className="saved-list">{library.map((item) => <li key={item.id}><button onClick={() => loadDiagram(item)}>{item.title}</button><button className="icon-button" onClick={() => setLibrary(deleteFromLibrary(item.id))} aria-label={`Delete ${item.title}`}>×</button></li>)}</ul> : <p className="empty-copy">Saved diagrams stay in this browser until you remove them.</p>}
          </section>
          <section className="saved-section history">
            <div className="section-heading"><p className="eyebrow">Recent work</p><span>{history.length}/10</span></div>
            {history.slice(0, 5).map((item) => <button className="history-item" key={item.id} onClick={() => loadDiagram(item)}>{item.title}<small>{new Date(item.updatedAt).toLocaleString()}</small></button>)}
          </section>
        </aside>

        <section className="editor-pane">
          <div className="pane-heading"><div><p className="eyebrow">Source</p><h1>Write the diagram</h1></div><span className={error ? "status error" : "status"} aria-live="polite">{error ? "Fix syntax" : "Live"}</span></div>
          <textarea aria-label="Mermaid code" spellCheck="false" value={source} onChange={(event) => setSource(event.target.value)} />
          <div className="editor-footer"><span>⌘/Ctrl + S library · ⇧⌘/Ctrl + S SVG · ⇧⌘/Ctrl + P PNG</span><button className="text-button" onClick={() => { setSource(STARTER); setTitle("Untitled diagram"); }}>Reset</button></div>
        </section>

        <section className="preview-pane" ref={previewPanel}>
          <div className="pane-heading"><div><p className="eyebrow">Canvas</p><h1>See the structure</h1></div><span className="status" aria-live="polite" aria-atomic="true">{notice}</span></div>
          <div className="preview-controls">
            <div className="zoom-controls"><button onClick={() => setZoom((value) => Math.max(0.35, value - 0.15))} aria-label="Zoom out">−</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((value) => Math.min(2.5, value + 0.15))} aria-label="Zoom in">+</button><button onClick={() => setZoom(1)}>Reset zoom</button></div>
            <div className="canvas-actions"><button className={editing ? "active" : ""} disabled={!isFlowchart || !!error} onClick={toggleLayoutEditing}>{editing ? "Finish layout" : "Edit layout"}</button><button onClick={() => void previewPanel.current?.requestFullscreen?.()}>Fullscreen</button></div>
          </div>
          {editing && <p className="editor-banner">Drag nodes and amber connectors. Arrow keys move the focused item; hold Shift for larger steps.</p>}
          {isSequence && sequenceTotal > 0 && <div className="sequence-controls"><span>Sequence walkthrough</span><input aria-label="Sequence step" type="range" min="0" max={sequenceTotal} value={sequenceStep} onChange={(event) => setSequenceStep(Number(event.target.value))} /><span>{sequenceStep || "all"}/{sequenceTotal}</span></div>}
          <div className="canvas-scroll"><div className="diagram-stage" style={{ transform: `scale(${zoom})` }} ref={renderHost} dangerouslySetInnerHTML={{ __html: svgMarkup }} /></div>
          {error && <div className="render-error" role="alert"><b>Mermaid could not render this draft.</b><span>{error}</span></div>}
          <div className="export-bar"><button onClick={() => downloadText(filenameFor(title, "svg"), exportSvg(), "image/svg+xml")}>Download SVG</button><button className="primary" onClick={() => void downloadPng()}>Download transparent PNG · 4×</button></div>
        </section>
      </section>
    </main>
  );
}

export default App;
