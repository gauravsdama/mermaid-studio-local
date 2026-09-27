export type { ArtifactRecord, DiagramTheme, SaveArtifactRequest } from "../shared/contracts";

import type { DiagramTheme } from "../shared/contracts";

export interface SavedDiagram {
  id: string;
  title: string;
  source: string;
  theme: DiagramTheme;
  updatedAt: string;
}
