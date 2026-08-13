import type { SupabaseClient } from "@supabase/supabase-js";
import { createFinalProjectArtifact, parseSystemDesignBuilderState } from "../builder/system-design-builder";
import { finalProjects, resolveFinalProjectValidator } from "../content/final-project-registry";

export type CompletedProjectSummary = Readonly<{
  id: string;
  projectId: string;
  projectSlug: string;
  title: string;
  projectVersion: number;
  completedAt: string;
  updatedAt: string;
}>;

export async function loadCompletedProjects(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("saved_architectures")
    .select("id, project_id, project_version, diagram, schema_version, completed_at, updated_at")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(50);
  if (error) return { projects: [] as CompletedProjectSummary[], error: true };

  const projects = (data ?? []).flatMap((row) => {
    const project = finalProjects.find((entry) => entry.id === row.project_id && entry.contentVersion === row.project_version);
    const validator = project ? resolveFinalProjectValidator(project) : null;
    const state = validator?.parseState(row.diagram);
    if (!project || !validator || row.schema_version !== project.starterScenario.simulatorSchemaVersion || !state || !validator.validateState(state)?.valid || typeof row.completed_at !== "string") return [];
    return [{ id: row.id, projectId: project.id, projectSlug: project.slug, title: project.title, projectVersion: project.contentVersion, completedAt: row.completed_at, updatedAt: row.updated_at }];
  });
  return { projects, error: false };
}

export async function loadCompletedProjectExport(supabase: SupabaseClient, userId: string, artifactId: string) {
  const { data, error } = await supabase
    .from("saved_architectures")
    .select("project_id, project_version, diagram, schema_version, completed_at")
    .eq("id", artifactId)
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .maybeSingle();
  if (error || !data) return null;
  const project = finalProjects.find((entry) => entry.id === data.project_id && entry.contentVersion === data.project_version);
  const validator = project ? resolveFinalProjectValidator(project) : null;
  const state = project ? parseSystemDesignBuilderState(data.diagram, project) : null;
  if (!project || !validator || !state || !validator.validateState(state)?.valid || data.schema_version !== project.starterScenario.simulatorSchemaVersion) return null;
  return { project, document: createFinalProjectArtifact(project, state) };
}
