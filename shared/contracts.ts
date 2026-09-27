import { z } from "zod";
import {
  ARTIFACT_ID_PATTERN,
  DEFAULT_RENDER_SCALE,
  DIAGRAM_THEMES,
  GATEWAY_API_VERSION,
  GATEWAY_IDENTITY,
  MAX_ARTIFACT_ID_LENGTH,
  MAX_DIAGRAM_TITLE_LENGTH,
  MAX_MERMAID_SOURCE_LENGTH,
  MAX_PNG_DATA_URL_LENGTH,
  MAX_RENDER_SCALE,
  MAX_SVG_LENGTH,
  MIN_RENDER_SCALE
} from "./contractValues.js";

export const diagramThemeSchema = z.enum(DIAGRAM_THEMES);
export const artifactIdSchema = z.string().regex(ARTIFACT_ID_PATTERN).max(MAX_ARTIFACT_ID_LENGTH);
export const diagramTitleSchema = z.string().trim().min(1, "A diagram title is required.").max(MAX_DIAGRAM_TITLE_LENGTH);
export const mermaidSourceSchema = z.string().trim().min(1, "Mermaid code is required.").max(MAX_MERMAID_SOURCE_LENGTH);
export const renderScaleSchema = z.number().int().min(MIN_RENDER_SCALE).max(MAX_RENDER_SCALE).default(DEFAULT_RENDER_SCALE);

export const artifactRecordSchema = z.object({
  id: artifactIdSchema,
  title: diagramTitleSchema,
  createdAt: z.string().datetime(),
  pngPath: z.string().min(1),
  sourcePath: z.string().min(1),
  svgPath: z.string().min(1).optional(),
  renderer: z.enum(["browser", "cli"]),
  theme: diagramThemeSchema,
  revisionOf: artifactIdSchema.optional()
}).strict();

export const saveArtifactRequestSchema = z.object({
  title: diagramTitleSchema,
  source: mermaidSourceSchema,
  theme: diagramThemeSchema,
  pngDataUrl: z.string().startsWith("data:image/png;base64,").max(MAX_PNG_DATA_URL_LENGTH),
  svg: z.string().max(MAX_SVG_LENGTH).optional()
}).strict();

export const renderDiagramRequestSchema = z.object({
  title: diagramTitleSchema,
  source: mermaidSourceSchema,
  theme: diagramThemeSchema.default("default"),
  scale: renderScaleSchema
}).strict();

export const revisionDiagramRequestSchema = renderDiagramRequestSchema.omit({ title: true });

export const artifactListResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(artifactRecordSchema),
  hasMore: z.boolean(),
  nextOffset: z.number().int().nonnegative().optional()
}).strict();

export const artifactResponseSchema = z.object({ artifact: artifactRecordSchema }).strict();

export const gatewayHealthSchema = z.object({
  ok: z.literal(true),
  service: z.literal("mermaid-studio-api"),
  gatewayIdentity: z.literal(GATEWAY_IDENTITY),
  apiVersion: z.literal(GATEWAY_API_VERSION),
  renderCapacity: z.object({
    concurrent: z.number().int().positive(),
    queued: z.number().int().nonnegative()
  }).strict()
}).strict();

export type DiagramTheme = z.infer<typeof diagramThemeSchema>;
export type ArtifactRecord = z.infer<typeof artifactRecordSchema>;
export type SaveArtifactRequest = z.infer<typeof saveArtifactRequestSchema>;
export type RenderDiagramRequest = z.infer<typeof renderDiagramRequestSchema>;
export type RevisionDiagramRequest = z.infer<typeof revisionDiagramRequestSchema>;
export type ArtifactListResponse = z.infer<typeof artifactListResponseSchema>;
export type ArtifactResponse = z.infer<typeof artifactResponseSchema>;
export type GatewayHealth = z.infer<typeof gatewayHealthSchema>;
