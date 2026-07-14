# Mermaid Studio Local

Local Mermaid renderer with live editing, zoom/fullscreen viewing, presets, browser history and library, transparent high-resolution PNG export, optional flowchart layout editing, a local artifact API, and an MCP server.

## Start the app

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. This starts Vite and the artifact gateway together. Every **Save to app folder** produces a transparent PNG, Mermaid source, SVG, and metadata in `artifacts/diagrams/`.

For a production-like local run:

```bash
npm run build
npm run start
```

Then open `http://127.0.0.1:8787`.

## Optional layout editor

The canvas is a normal live Mermaid preview by default. Choose **Edit layout** only for a flowchart when a manual adjustment is needed:

- Drag a box to reposition it; connected arrows redraw from the new position.
- Drag an amber midpoint to bend an arrow.
- Export while edit mode is open to retain the changed layout in the saved SVG/PNG.

The limitation is intentional: arbitrary Mermaid diagram types have renderer-owned layouts, so the app does not pretend they can be manually rearranged safely.

## MCP gateway

Keep the local API running (`npm run dev:api` or `npm run start`), build once, and point an MCP client at [mcp.config.example.json](./mcp.config.example.json). The server exposes:

- `mermaid_studio_create_diagram` — renders Mermaid code with Mermaid CLI, writes a transparent PNG and `.mmd` source.
- `mermaid_studio_list_diagrams` — paginated saved-artifact discovery.
- `mermaid_studio_get_diagram` — returns paths for one artifact.

For development without compiling, run `npm run mcp` in a second terminal while the API is running.

## Verification

```bash
npm run typecheck
npm run build
npm run lint
```

The two full-flow smoke scripts require the local server to be running:

```bash
npm run start
npm run test:browser
npm run test:mcp
```

`test:browser` uses Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` by default; set `CHROME_PATH` for another local Chrome executable.

## Upstream references

The requested repositories were cloned locally into `upstream/` as read-only references. They are intentionally excluded from this app repository so their nested Git histories are not accidentally published as embedded repositories:

- `newmo-oss/mermaid-viewer`: viewer interactions, zoom, and sequence walkthrough direction.
- `jamesmontemagno/my-mermaid-visualizer`: live editor, presets, local library/history, theme, export, and fullscreen direction.
- `mermaid-js/mermaid`: the rendering engine used through its npm package.

This app is a fresh implementation and does not copy their application source. Each upstream repository is MIT licensed; see `upstream/*/LICENSE`.
