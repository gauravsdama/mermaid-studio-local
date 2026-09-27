export const DIAGRAM_THEMES = ["default", "dark", "forest", "neutral", "base"] as const;

export const ARTIFACT_ID_PATTERN = /^[a-zA-Z0-9-]+$/;
export const MAX_ARTIFACT_ID_LENGTH = 220;
export const MAX_DIAGRAM_TITLE_LENGTH = 120;
export const MAX_MERMAID_SOURCE_LENGTH = 200_000;
export const MIN_RENDER_SCALE = 1;
export const MAX_RENDER_SCALE = 4;
export const DEFAULT_RENDER_SCALE = 4;
export const MAX_PNG_DATA_URL_LENGTH = 30_000_000;
export const MAX_PNG_BYTES = 22_500_000;
export const MAX_PNG_DIMENSION = 8_192;
export const MAX_PNG_PIXELS = 16_777_216;
export const MAX_SVG_LENGTH = 5_000_000;

export const GATEWAY_IDENTITY = "mermaid-studio-local-gateway";
export const GATEWAY_API_VERSION = 1;
