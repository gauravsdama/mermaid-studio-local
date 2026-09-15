# Third-party notices

Mermaid Studio is an original implementation. No application source from the reference repositories listed below is intentionally included.

## Runtime packages

The installed dependency tree is fixed by `package-lock.json`. The direct runtime packages in the current lockfile are:

| Package | Version | License | Project |
|---|---:|---|---|
| `@mermaid-js/mermaid-cli` | 11.16.0 | MIT | https://github.com/mermaid-js/mermaid-cli |
| `@modelcontextprotocol/sdk` | 1.29.0 | MIT | https://github.com/modelcontextprotocol/typescript-sdk |
| `cors` | 2.8.6 | MIT | https://github.com/expressjs/cors |
| `express` | 5.2.1 | MIT | https://github.com/expressjs/express |
| `mermaid` | 11.17.2 | MIT | https://github.com/mermaid-js/mermaid |
| `react` | 19.2.7 | MIT | https://github.com/facebook/react |
| `react-dom` | 19.2.7 | MIT | https://github.com/facebook/react |
| `zod` | 3.25.76 | MIT | https://github.com/colinhacks/zod |

Each package retains its own copyright and license terms. A source checkout does not include `node_modules`; `npm ci` downloads the dependency tree described by the lockfile. Anyone redistributing installed dependencies or built artifacts must retain the notices and license text required by those packages.

## Reference repositories

These repositories were inspected for product behavior and design context. They remain separate checkouts under the ignored `upstream/` directory.

| Repository | Reviewed revision | License |
|---|---|---|
| https://github.com/newmo-oss/mermaid-viewer | `a1e97567a1df663a78af4012dccf5ccb940a8ab7` | MIT; Copyright (c) 2024 newmo, Inc. |
| https://github.com/jamesmontemagno/my-mermaid-visualizer | `f80de0e7e14c079101ae113f12abea7a55d212d4` | MIT; Copyright (c) 2026 James Montemagno |
| https://github.com/mermaid-js/mermaid | `f0ffb41c1ee1ff667b528e86c3b082249726eeef` | MIT; Copyright (c) 2014–2022 Knut Sveidqvist |

The reference revisions are recorded for reproducibility, not to claim that their application code was copied or incorporated.
