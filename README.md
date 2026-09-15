# Mermaid Studio Local

Local Mermaid renderer with live editing, zoom/fullscreen viewing, presets, browser history and library, transparent high-resolution PNG export, optional flowchart layout editing, a local artifact API, and an MCP server.

It is intended for developers and technical writers who want to draft and export Mermaid diagrams without sending diagram source to a hosted rendering service. The repository demonstrates a React editor, a constrained flowchart layout tool, a loopback-only artifact API, and an MCP integration built around the same local artifact format.

## Start the app

```bash
npm ci
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
- Use arrow keys on a focused node or connector for precise movement; hold Shift for larger steps.
- Choose **Finish layout** to keep the adjusted SVG for export.

The limitation is intentional: arbitrary Mermaid diagram types have renderer-owned layouts, so the app does not pretend they can be manually rearranged safely.

## MCP gateway

Build once and point an MCP client at [mcp.config.example.json](./mcp.config.example.json). The MCP server starts the local API automatically when it is not already running. The server exposes:

- `mermaid_studio_create_diagram` — renders Mermaid code with Mermaid CLI, writes a transparent PNG, SVG, and `.mmd` source, then returns an inline preview.
- `mermaid_studio_list_diagrams` — paginated saved-artifact discovery.
- `mermaid_studio_get_diagram` — returns paths and an inline preview for one artifact.
- `mermaid_studio_update_diagram` — creates a non-destructive, high-resolution revision from replacement Mermaid code.

For development without compiling, run `npm run mcp` in a second terminal while the API is running.

## Native macOS viewer

`npm run native:viewer` builds the web client and opens it in the included SwiftUI/WebKit development host. The host currently runs from this checkout and requires the installed Node dependencies and a system Node runtime. It is not a standalone, signed, or notarized macOS application package.

## Verification

```bash
npm run test:release
npm run test:native
```

The server, browser, and MCP tests create private temporary artifact directories and remove them after each run. `test:browser` uses Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` by default; set `CHROME_PATH` for another local Chrome executable. `test:native` requires macOS 14 or later and verifies that the viewer terminates the Node process it starts.

## Upstream references

The following repositories were consulted as local design and behavior references. They are excluded from this app repository so their nested Git histories are not published as embedded repositories:

- `newmo-oss/mermaid-viewer`: viewer interactions, zoom, and sequence walkthrough direction.
- `jamesmontemagno/my-mermaid-visualizer`: live editor, presets, local library/history, theme, export, and fullscreen direction.
- `mermaid-js/mermaid`: the rendering engine used through its npm package.

No upstream application source is intentionally included in this repository. See [NOTICES.md](./NOTICES.md) for third-party attribution and [RELEASE_READINESS.md](./RELEASE_READINESS.md) for the remaining release work.

## License

Copyright 2026 Gaurav Dama. Licensed under the [MIT License](./LICENSE).
