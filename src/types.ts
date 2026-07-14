export type DiagramTheme = "default" | "dark" | "forest" | "neutral" | "base";

export interface SavedDiagram {
  id: string;
  title: string;
  source: string;
  theme: DiagramTheme;
  updatedAt: string;
}

export interface ArtifactRecord {
  id: string;
  title: string;
  createdAt: string;
  pngPath: string;
  sourcePath: string;
  svgPath?: string;
  renderer: "browser" | "cli";
}

export interface SaveArtifactRequest {
  title: string;
  source: string;
  theme: DiagramTheme;
  pngDataUrl: string;
  svg?: string;
}
