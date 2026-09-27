import { readFile } from "node:fs/promises";

const [inventory, app, editor, styles, demoPrompts] = await Promise.all([
  readFile("docs/product/UI_COPY.md", "utf8"),
  readFile("src/App.tsx", "utf8"),
  readFile("src/lib/flowEditor.ts", "utf8"),
  readFile("src/styles.css", "utf8"),
  readFile("src/data/demoPrompts.ts", "utf8")
]);

const approved = [
  ["diagram.title.default", "Untitled diagram"], ["diagram.title.label", "Diagram title"],
  ["library.save", "Save library"], ["folder.save", "Save to app folder"],
  ["preset.group", "Style"], ["preset.placeholder", "Choose a preset…"],
  ["settings.group", "Render settings"], ["theme.label", "Mermaid theme"],
  ["library.heading", "Library"], ["history.heading", "Recent work"],
  ["source.heading", "Write the diagram"], ["source.label", "Mermaid code"],
  ["canvas.heading", "See the structure"], ["layout.start", "Edit layout"],
  ["layout.finish", "Finish layout"], ["fullscreen.action", "Fullscreen"],
  ["layout.help", "Drag nodes and amber connectors. Arrow keys move the focused item; hold Shift for larger steps."],
  ["sequence.label", "Sequence walkthrough"], ["sequence.step", "Sequence step"],
  ["svg.download", "Download SVG"], ["png.download", "Download transparent PNG · 4×"]
];
for (const [id, text] of approved) {
  if (!inventory.includes(`| \`${id}\``) || !inventory.includes(text)) throw new Error(`UI copy inventory is missing ${id}: ${text}`);
  if (!app.includes(text)) throw new Error(`Implemented UI is missing approved text: ${text}`);
}
for (const [id, pattern] of [["layout.node", "Move ${nodeName}"], ["layout.connector", "Adjust connector ${edgeIndex + 1}"]]) {
  if (!inventory.includes(`| \`${id}\``) || !editor.includes(pattern)) throw new Error(`Flow editor is missing ${id}: ${pattern}`);
}
for (const [id, text] of [
  ["demo.prompt.checkout", "Create a flowchart for checkout from cart review through payment confirmation."],
  ["demo.prompt.incident", "Create a sequence diagram for an incident alert, escalation, mitigation, and recovery."],
  ["demo.prompt.release", "Create an entity relationship diagram for releases, artifacts, checks, and checksums."],
  ["demo.prompt.launch", "Create a timeline for source freeze, release candidate testing, publishing, and follow-up."],
  ["demo.prompt.order", "Create a state diagram for an order from draft through fulfillment or cancellation."]
]) {
  if (!inventory.includes(`| \`${id}\``) || !demoPrompts.includes(text)) throw new Error(`Static demo copy is missing ${id}: ${text}`);
}
if (/fonts\.googleapis\.com|@import\s+url/i.test(styles)) throw new Error("UI stylesheet still loads an external font.");
console.log(`UI copy check passed; ${approved.length + 2} stable IDs and offline fonts verified`);
