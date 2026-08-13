import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveFinalProjectValidator } from "../content/final-project-registry";
import type { FinalProject } from "../domain/final-project-model";
import type { FinalProjectPersistenceState } from "./final-project-artifact";

export async function loadFinalProjectArtifact(
  supabase: SupabaseClient,
  userId: string,
  project: FinalProject,
): Promise<FinalProjectPersistenceState> {
  const validator = resolveFinalProjectValidator(project);
  if (!validator) return { status: "unavailable", artifact: null };

  const query = supabase
    .from("saved_architectures")
    .select("id, diagram, schema_version, updated_at")
    .eq("user_id", userId)
    .eq("course_id", project.course.courseId);
  const scopedQuery = validator.persistenceLessonId
    ? query.eq("lesson_id", validator.persistenceLessonId)
    : query.is("lesson_id", null);
  const { data, error } = await scopedQuery
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) return { status: "unavailable", artifact: null };
  const compatible = (data ?? []).find((item) =>
    item.schema_version === project.starterScenario.simulatorSchemaVersion
    && Boolean(validator.parseState(item.diagram)),
  );
  if (!compatible) return { status: "available", artifact: null };

  return {
    status: "available",
    artifact: {
      id: compatible.id,
      state: compatible.diagram,
      updatedAt: compatible.updated_at,
    },
  };
}
