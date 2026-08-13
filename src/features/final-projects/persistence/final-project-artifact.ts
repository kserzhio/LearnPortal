import type { JsonValue } from "../domain/final-project-model";

export type FinalProjectArtifact = Readonly<{
  id: string;
  state: JsonValue;
  updatedAt: string;
}>;

export type FinalProjectPersistenceState =
  | Readonly<{ status: "guest"; artifact: null }>
  | Readonly<{ status: "available"; artifact: FinalProjectArtifact | null }>
  | Readonly<{ status: "unavailable"; artifact: null }>;
