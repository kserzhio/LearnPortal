"use server";

import { revalidatePath } from "next/cache";
import { getFinalProjectBySlug, resolveFinalProjectValidator } from "@/features/final-projects/content/final-project-registry";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SaveFinalProjectResult = Readonly<{
  success: boolean;
  id?: string;
  updatedAt?: string;
  message: string;
}>;

export async function saveFinalProjectState(slug: string, artifactId: string | null, state: unknown): Promise<SaveFinalProjectResult> {
  const project = getFinalProjectBySlug(slug);
  if (!project || project.status !== "published") return { success: false, message: "Проєкт недоступний." };

  const validator = resolveFinalProjectValidator(project);
  const parsedState = validator?.parseState(state);
  if (!validator || !parsedState) return { success: false, message: "Архітектура має некоректний формат." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, message: "Синхронізація зараз недоступна." };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, message: "Увійди, щоб зберегти проєкт." };

  const requestedId = artifactId && UUID.test(artifactId) ? artifactId : crypto.randomUUID();
  const updatedAt = new Date().toISOString();
  const validation = validator.validateState(parsedState);
  const { data: existing } = await supabase
    .from("saved_architectures")
    .select("completed_at")
    .eq("id", requestedId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  const preserveCompletedRevision = Boolean(existing?.completed_at && !validation?.valid);
  const id = preserveCompletedRevision ? crypto.randomUUID() : requestedId;
  const completedAt = preserveCompletedRevision ? null : existing?.completed_at ?? (validation?.valid ? updatedAt : null);
  const { data, error } = await supabase.from("saved_architectures").upsert({
    id,
    user_id: userData.user.id,
    course_id: project.course.courseId,
    lesson_id: validator.persistenceLessonId,
    title: `Фінальний проєкт · ${project.title}`.slice(0, 120),
    project_id: project.id,
    project_version: project.contentVersion,
    schema_version: project.starterScenario.simulatorSchemaVersion,
    diagram: parsedState,
    completed_at: completedAt,
    updated_at: updatedAt,
  }, { onConflict: "id" }).select("id, updated_at").single();

  if (error || !data) return { success: false, message: "Не вдалося зберегти. Робота залишилася у workspace — спробуй ще раз." };
  revalidatePath(`/projects/${project.slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath("/profile");
  return { success: true, id: data.id, updatedAt: data.updated_at, message: validation?.valid ? "Проєкт завершено й збережено у приватній бібліотеці." : "Проєкт збережено у твоєму профілі." };
}
