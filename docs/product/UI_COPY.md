# Mermaid Studio UI copy

This file is the human-owned source of truth for visible and assistive copy. Keep the text here identical to the implementation. Preset diagram bodies are sample data rather than interface copy; their five names are included below.

| Stable ID | Surface | Approved text | Implementation |
|---|---|---|---|
| `app.brand` | Header | Mermaid Studio / local; Mermaid Studio / demo | `src/App.tsx` |
| `diagram.title.default` | New draft | Untitled diagram | `src/App.tsx` |
| `diagram.title.label` | Header field | Diagram title | `src/App.tsx` |
| `library.save` | Header | Save library | `src/App.tsx` |
| `folder.save` | Header | Save to app folder | `src/App.tsx` |
| `sidebar.label` | Navigation | Diagram tools | `src/App.tsx` |
| `preset.group` | Sidebar | Starting point | `src/App.tsx` |
| `preset.label` | Sidebar control | Preset diagrams | `src/App.tsx` |
| `preset.placeholder` | Sidebar control | Choose a preset… | `src/App.tsx` |
| `preset.names` | Sidebar options | Product flow / API sequence / Release plan / Service map / Decision tree | `src/data/presets.ts` |
| `demo.group` | Static demo sidebar | Simulated prompts | `src/App.tsx` |
| `demo.note` | Static demo sidebar | Each prompt loads a local example. No model or backend is running. | `src/App.tsx` |
| `demo.prompt.checkout` | Static demo action | Map a checkout request | `src/data/demoPrompts.ts` |
| `demo.prompt.incident` | Static demo action | Trace an incident handoff | `src/data/demoPrompts.ts` |
| `demo.prompt.release` | Static demo action | Model release data | `src/data/demoPrompts.ts` |
| `demo.prompt.launch` | Static demo action | Plan a launch timeline | `src/data/demoPrompts.ts` |
| `demo.prompt.order` | Static demo action | Show order states | `src/data/demoPrompts.ts` |
| `demo.loaded` | Static demo status | Loaded demo prompt “{prompt}” | `src/App.tsx` |
| `settings.group` | Sidebar | Render settings | `src/App.tsx` |
| `theme.label` | Sidebar control | Mermaid theme | `src/App.tsx` |
| `export.note` | Sidebar | Exports always use a transparent canvas at 4× resolution. | `src/App.tsx` |
| `library.heading` | Sidebar | Library | `src/App.tsx` |
| `library.empty` | Sidebar | Saved diagrams stay in this browser until you remove them. | `src/App.tsx` |
| `library.delete` | Saved item | Delete {title} | `src/App.tsx` |
| `history.heading` | Sidebar | Recent work | `src/App.tsx` |
| `source.group` | Editor | Source | `src/App.tsx` |
| `source.heading` | Editor | Write the diagram | `src/App.tsx` |
| `source.label` | Editor field | Mermaid code | `src/App.tsx` |
| `source.shortcuts` | Editor footer | ⌘/Ctrl + S library · ⇧⌘/Ctrl + S SVG · ⇧⌘/Ctrl + P PNG | `src/App.tsx` |
| `source.reset` | Editor footer | Reset | `src/App.tsx` |
| `render.live` | Editor status | Live | `src/App.tsx` |
| `render.syntax` | Editor status | Fix syntax | `src/App.tsx` |
| `render.initial` | Canvas status | Live rendering is on | `src/App.tsx` |
| `render.updated` | Canvas status | Preview updated | `src/App.tsx` |
| `render.fallback` | Error fallback | Mermaid could not render this code. | `src/App.tsx` |
| `canvas.group` | Preview | Canvas | `src/App.tsx` |
| `canvas.heading` | Preview | See the structure | `src/App.tsx` |
| `canvas.summary` | Rendered SVG | {title}. Mermaid {type} diagram. | `src/App.tsx` |
| `zoom.out` | Canvas control | Zoom out | `src/App.tsx` |
| `zoom.in` | Canvas control | Zoom in | `src/App.tsx` |
| `zoom.reset` | Canvas control | Reset zoom | `src/App.tsx` |
| `layout.start` | Canvas control | Edit layout | `src/App.tsx` |
| `layout.finish` | Canvas control | Finish layout | `src/App.tsx` |
| `layout.unsupported` | Status | Layout editing supports flowcharts with named nodes and arrows. | `src/App.tsx` |
| `layout.help` | Canvas notice | Drag nodes and amber connectors. Arrow keys move the focused item; hold Shift for larger steps. | `src/App.tsx` |
| `layout.node` | SVG control | Move {node name}. Offset {x}, {y} | `src/lib/flowEditor.ts` |
| `layout.connector` | SVG control | Adjust connector {number}. Offset {x}, {y} | `src/lib/flowEditor.ts` |
| `fullscreen.action` | Canvas control | Fullscreen | `src/App.tsx` |
| `sequence.label` | Canvas control | Sequence walkthrough | `src/App.tsx` |
| `sequence.step` | Canvas control | Sequence step | `src/App.tsx` |
| `export.invalid` | Error | Render a valid diagram before exporting it. | `src/App.tsx` |
| `render.error.heading` | Error | Mermaid could not render this draft. | `src/App.tsx` |
| `svg.download` | Export | Download SVG | `src/App.tsx` |
| `png.download` | Export | Download transparent PNG · 4× | `src/App.tsx` |
| `png.success` | Status | Downloaded a 4× transparent PNG | `src/App.tsx` |
| `png.failure` | Status | PNG export failed. | `src/App.tsx` |
| `folder.gateway.failure` | Error | The local artifact gateway did not accept this diagram. | `src/App.tsx` |
| `folder.save.success` | Status | Saved PNG, Mermaid code, and SVG to {path} | `src/App.tsx` |
| `folder.save.failure` | Status | Could not save the diagram to the app folder. | `src/App.tsx` |
| `library.save.success` | Status | Saved “{title}” in this browser | `src/App.tsx` |
| `diagram.load.success` | Status | Loaded “{title}” | `src/App.tsx` |
| `native.start.failure.heading` | Native host | Mermaid Studio could not start | `native/MermaidStudioViewer/Sources/MermaidStudioViewer/main.swift` |
| `native.start.failure.help` | Native host | Run npm run build in the project folder, then reopen the viewer. | `native/MermaidStudioViewer/Sources/MermaidStudioViewer/main.swift` |
