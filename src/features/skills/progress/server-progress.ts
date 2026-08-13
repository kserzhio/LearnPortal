import type { SupabaseClient } from "@supabase/supabase-js";
import type { SkillTaxonomy } from "../domain";
import { mergeSkillUnitCompletions, type SkillUnitCompletion } from "./skill-progress";

type AdultRow = { course_id: string; lesson_id: string; completed: boolean };
type KidsRow = { course_id: string; level_id: string; completed: boolean };

function courseIds(taxonomy: SkillTaxonomy, catalog: "adult" | "kids") {
  return [...new Set(taxonomy.mappings.filter((mapping) => mapping.content.catalog === catalog).map((mapping) => mapping.content.courseId))];
}

export async function loadSkillUnitCompletions(
  supabase: SupabaseClient,
  userId: string,
  taxonomy: SkillTaxonomy,
): Promise<Readonly<{ available: boolean; records: readonly SkillUnitCompletion[] }>> {
  const adultIds = courseIds(taxonomy, "adult");
  const kidsIds = courseIds(taxonomy, "kids");
  const adultRequest = adultIds.length
    ? supabase.from("lesson_progress").select("course_id, lesson_id, completed").eq("user_id", userId).in("course_id", adultIds)
    : Promise.resolve({ data: [] as AdultRow[], error: null });
  const kidsRequest = kidsIds.length
    ? supabase.from("kids_level_progress").select("course_id, level_id, completed").eq("user_id", userId).in("course_id", kidsIds)
    : Promise.resolve({ data: [] as KidsRow[], error: null });
  const [adultResult, kidsResult] = await Promise.all([adultRequest, kidsRequest]);
  if (adultResult.error || kidsResult.error) return { available: false, records: [] };
  return {
    available: true,
    records: mergeSkillUnitCompletions([
      ...((adultResult.data ?? []) as AdultRow[]).map((row) => ({ catalog: "adult" as const, courseId: row.course_id, unitId: row.lesson_id, completed: row.completed })),
      ...((kidsResult.data ?? []) as KidsRow[]).map((row) => ({ catalog: "kids" as const, courseId: row.course_id, unitId: row.level_id, completed: row.completed })),
    ]),
  };
}
