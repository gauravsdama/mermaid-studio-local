# Release readiness

Last reviewed: 2026-09-15

Status: **ready for an owner-reviewed source release; not yet a tagged release**

## Release boundary

Mermaid Studio is a local diagram editor for developers and technical writers. The release is this source repository plus its development launchers. It is not a standalone, signed, or notarized Mac application. The canonical repository is `git@github.com:gauravsdama/mermaid-studio-local.git`; the current committed base is `85be21567438f242916078d895d6c56f5f9185e6`.

The first-party source is owned by Gaurav Dama and licensed under MIT. The ignored `upstream/` checkouts were used only as product references. Their exact URLs, reviewed revisions, and license information are recorded in `NOTICES.md`. No reference application source is intentionally included.

## Local evidence

- `npm ci` installed the locked tree and reported no vulnerabilities.
- `npm run test:release` passed type checking, linting, production build, UI-copy checks, API security and failure cases, artifact schema and pagination checks, three export fixtures, browser interaction and responsive checks, and the MCP create/get/list/update flow.
- `npm audit --omit=dev` reported zero vulnerabilities.
- The final local run used Node 25.2.1, npm 11.6.2, and Apple Swift 6.3.2. The SHA-256 digest of `package-lock.json` was `3353c87d2b5af8007a9afdbb98bc087ddd2375601d85a6379f5f8400d87cfd62`.
- `npm run test:native` built the SwiftUI/WebKit host, launched its local Node server, terminated the host, and confirmed that the child listener closed.
- `docs/screenshots/mermaid-studio-current.png` was captured by the current browser test.

The server, browser, and MCP checks use temporary artifact directories and clean them after the run. The server test covers hostile Host and Origin headers, malformed Mermaid, oversized source, invalid PNG bytes, strict metadata rejection, bounded pagination, alpha-capable PNG output, SVG output, multiline labels, flowcharts, sequence diagrams, and state diagrams. The browser test covers keyboard layout movement, connector persistence after finishing layout, SVG title and description elements, reduced motion, and a narrow viewport.

## Before tagging

1. Review every uncommitted file, then create the release commit. Nothing in this readiness pass was committed or pushed.
2. Run the pinned GitHub Actions workflow on that commit. Local checks cannot prove the hosted runner result.
3. Confirm the copyright name and MIT choice in `LICENSE`, `NOTICE`, `NOTICES.md`, `package.json`, and this file.
4. Check the native viewer once with VoiceOver. Automated tests verify the same production page in Chromium and verify native process lifecycle, but they do not establish WebKit screen-reader quality.
5. Record the release commit and retain the workflow result with the screenshot.

## Known limits

- The loopback API does not authenticate other processes running under the same local account. It rejects non-loopback Host and browser Origin values. A per-launch token is warranted only if untrusted local processes are in scope.
- Headless PNG and SVG rendering still starts two Mermaid CLI processes per request. Admission scales modestly with available CPU and uses a bounded queue; the formats are rendered concurrently to reduce elapsed time.
- Mermaid core and a few uncommon diagram renderers remain large lazy-loaded chunks. The main application bundle is about 213 kB minified, and diagram-specific code loads when requested.
- Source-sharing URLs contain the complete Mermaid text. The source is kept in the URL fragment so it is not sent to the local server, but browsers and sharing tools may retain it.
- The native viewer requires macOS 14 or later, Node 20 or later, this checkout, installed dependencies, and a completed web build.
