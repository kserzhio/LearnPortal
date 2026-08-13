import type { SupabaseClient } from "@supabase/supabase-js";
import { getCourseLessons } from "@/content/courses";
import { kidsCourses } from "@/features/kids-coding/content/course-registry";
import type { LearningPath } from "../domain";
import type { LearningPathCourseProgress } from "./learning-path-progress";

type AdultProgressRow = { course_id: string; lesson_id: string; completed: boolean };
type KidsProgressRow = { course_id: string; level_id: string; completed: boolean };

function uniqueCourseIds(paths: readonly LearningPath[], catalog: "adult" | "kids") {
  return [...new Set(paths.flatMap((path) => path.steps)
    .filter((step) => step.course.catalog === catalog)
    .map((step) => step.course.courseId))];
}

export function createEmptyLearningPathCourseProgress(paths: readonly LearningPath[]): readonly LearningPathCourseProgress[] {
  const adultIds = uniqueCourseIds(paths, "adult");
  const kidsIds = uniqueCourseIds(paths, "kids");
  return [
    ...adultIds.map((courseId) => ({
      catalog: "adult" as const,
      courseId,
      completedUnits: 0,
      totalUnits: getCourseLessons(courseId).length,
    })),
    ...kidsIds.map((courseId) => {
      const course = kidsCourses.find((entry) => entry.id === courseId);
      return {
        catalog: "kids" as const,
        courseId,
        completedUnits: 0,
        totalUnits: course?.worlds.reduce((total, world) => total + world.levels.length, 0) ?? 0,
      };
    }),
  ];
}

export async function loadLearningPathCourseProgress(
  supabase: SupabaseClient,
  userId: string,
  paths: readonly LearningPath[],
): Promise<Readonly<{ available: boolean; courses: readonly LearningPathCourseProgress[] }>> {
  const empty = createEmptyLearningPathCourseProgress(paths);
  const adultIds = uniqueCourseIds(paths, "adult");
  const kidsIds = uniqueCourseIds(paths, "kids");
  const adultRequest = adultIds.length > 0
    ? supabase.from("lesson_progress").select("course_id, lesson_id, completed").eq("user_id", userId).in("course_id", adultIds)
    : Promise.resolve({ data: [] as AdultProgressRow[], error: null });
  const kidsRequest = kidsIds.length > 0
    ? supabase.from("kids_level_progress").select("course_id, level_id, completed").eq("user_id", userId).in("course_id", kidsIds)
    : Promise.resolve({ data: [] as KidsProgressRow[], error: null });
  const [adultResult, kidsResult] = await Promise.all([adultRequest, kidsRequest]);

  if (adultResult.error || kidsResult.error) return { available: false, courses: empty };

  const adultRows = (adultResult.data ?? []) as AdultProgressRow[];
  const kidsRows = (kidsResult.data ?? []) as KidsProgressRow[];
  return {
    available: true,
    courses: empty.map((course) => ({
      ...course,
      completedUnits: course.catalog === "adult"
        ? adultRows.filter((row) => row.course_id === course.courseId && row.completed).length
        : kidsRows.filter((row) => row.course_id === course.courseId && row.completed).length,
    })),
  };
}
