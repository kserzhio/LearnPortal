import type { SupabaseClient } from "@supabase/supabase-js";
import { createEmptyKidsProgress, type KidsLevelProgress, type KidsProgressBundle, type KidsUnlockRecord } from "./progress-model";

export async function loadKidsProgressForUser(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
): Promise<KidsProgressBundle> {
  const empty = createEmptyKidsProgress(courseId);
  const [levelResult, unlockResult] = await Promise.all([
    supabase.from("kids_level_progress").select("world_id, level_id, completed, stars, attempt_count, updated_at")
      .eq("user_id", userId).eq("course_id", courseId),
    supabase.from("kids_unlocks").select("unlock_kind, reference_id, unlocked_at")
      .eq("user_id", userId).eq("course_id", courseId),
  ]);
  if (levelResult.error || unlockResult.error) return empty;

  const levels: KidsLevelProgress[] = (levelResult.data ?? []).map((row) => ({
    worldId: row.world_id,
    levelId: row.level_id,
    completed: Boolean(row.completed),
    stars: Number(row.stars) as 0 | 1 | 2 | 3,
    attemptCount: Number(row.attempt_count),
    bestSolution: null,
    updatedAt: row.updated_at,
  }));
  const unlocks: KidsUnlockRecord[] = (unlockResult.data ?? []).map((row) => ({
    kind: row.unlock_kind as KidsUnlockRecord["kind"],
    referenceId: row.reference_id,
    unlockedAt: row.unlocked_at,
  }));
  return { ...empty, levels, unlocks };
}
