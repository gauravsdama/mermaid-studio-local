import type { DiagramTheme } from "../types";

export interface Preset { name: string; source: string; theme: DiagramTheme }

export const presets: Preset[] = [
  { name: "Product flow", theme: "default", source: "flowchart LR\n  A[Idea] --> B{Ready?}\n  B -->|Yes| C[Build]\n  B -->|No| D[Research]\n  D --> A\n  C --> E[Ship]" },
  { name: "API sequence", theme: "default", source: "sequenceDiagram\n  autonumber\n  participant App\n  participant API\n  participant Store\n  App->>API: Create diagram\n  API->>Store: Save source + PNG\n  Store-->>API: Artifact paths\n  API-->>App: Saved" },
  { name: "Release plan", theme: "forest", source: "gantt\n  title Release plan\n  dateFormat  YYYY-MM-DD\n  section Build\n  Editor :done, a1, 2026-07-01, 3d\n  Gateway :active, a2, after a1, 4d\n  section Validate\n  Browser tests :a3, after a2, 2d" },
  { name: "Service map", theme: "neutral", source: "C4Context\n  title Mermaid Studio context\n  Person(user, User, Writes diagram code)\n  System(app, Studio, Renders and optionally edits SVG)\n  System(api, Local API, Saves artifacts)\n  System(mcp, MCP server, Lets agents create diagrams)\n  Rel(user, app, uses)\n  Rel(app, api, saves through)\n  Rel(mcp, api, calls)" },
  { name: "Decision tree", theme: "dark", source: "stateDiagram-v2\n  [*] --> Draft\n  Draft --> Preview\n  Preview --> FreeformEditor: needs manual layout\n  Preview --> Export: ready\n  FreeformEditor --> Export\n  Export --> [*]" }
];
