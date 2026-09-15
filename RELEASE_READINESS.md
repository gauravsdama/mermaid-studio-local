# Release readiness

Last reviewed: 2026-09-15

Status: **ready for an owner-reviewed source/dev release; not yet a tagged release**

## Release boundary

Mermaid Studio is a local diagram editor for developers and technical writers. The release is this source repository plus its development launchers. It is not a standalone, signed, or notarized Mac application. The canonical repository is `git@github.com:gauravsdama/mermaid-studio-local.git`.

The first-party source is owned by Gaurav Dama and licensed under Apache-2.0. The ignored `upstream/` checkouts were used only as product references. Their exact URLs, reviewed revisions, copyright notices, and license information are recorded in `NOTICES.md`. No reference application source is intentionally included.

## Local evidence

- `npm ci` installed the locked tree and reported no vulnerabilities.
- `npm run test:release` passed type checking, linting, production build, UI-copy checks, API security and failure cases, artifact schema and pagination checks, three export fixtures, browser interaction and responsive checks, and the MCP create/get/list/update flow.
- `npm audit --omit=dev` reported zero vulnerabilities.
- `npm run test:demo` built the client-only GitHub Pages variant and rendered five clearly labeled simulated prompts without contacting an API backend.
- GitHub Actions verification run `35034515337` passed on the pushed commit. Pages run `35034514980` built, browser-tested, and deployed the public demo; a separate hosted-browser pass then exercised all five prompts without an API request.
- The final local run used Node 25.2.1, npm 11.6.2, and Apple Swift 6.3.2. The SHA-256 digest of `package-lock.json` was `3353c87d2b5af8007a9afdbb98bc087ddd2375601d85a6379f5f8400d87cfd62`.
- `npm run test:native` built the SwiftUI/WebKit host, launched its local Node server, terminated the host, and confirmed that the child listener closed.
- `docs/screenshots/mermaid-studio-current.png` was captured by the current browser test.

The server, browser, and MCP checks use temporary artifact directories and clean them after the run. The server test covers hostile Host and Origin headers, malformed Mermaid, oversized source, invalid PNG bytes, strict metadata rejection, bounded pagination, alpha-capable PNG output, SVG output, multiline labels, flowcharts, sequence diagrams, and state diagrams. The browser test covers keyboard layout movement, connector persistence after finishing layout, SVG title and description elements, reduced motion, and a narrow viewport.

## Before tagging

1. Run the pinned GitHub Actions workflow on the pushed commit. Local checks cannot prove the hosted runner result.
2. Confirm the copyright name and Apache-2.0 choice in `LICENSE`, `NOTICE`, `NOTICES.md`, `package.json`, and this file.
3. Check the native viewer once with VoiceOver. Automated tests verify the same production page in Chromium and verify native process lifecycle, but they do not establish WebKit screen-reader quality.
4. Record the release commit and retain the workflow result with the screenshot.

## Known limits

- The loopback API intentionally does not authenticate other processes running under the same local account. Per-launch authentication is declined for `v0.1.0` to preserve a no-friction trusted-local workflow. It rejects non-loopback Host and browser Origin values; revisit this decision if untrusted same-account processes enter scope.
- Headless PNG and SVG rendering still starts two Mermaid CLI processes per request. Because Chromium-backed rendering is memory- and CPU-heavy, admission scales modestly with available CPU and uses a bounded in-process queue; the formats are rendered concurrently to reduce elapsed time.
- Mermaid core and a few uncommon diagram renderers remain large lazy-loaded chunks. The main application bundle is about 213 kB minified, and diagram-specific code loads when requested.
- The native viewer requires macOS 14 or later, Node 20 or later, this checkout, installed dependencies, and a completed web build.
