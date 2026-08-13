"use server";

import { revalidatePath } from "next/cache";
import { courses } from "@/content/courses";
import { buildRoadmapCourses, isRoadmapCourseSlug, type RoadmapCourse } from "@/features/roadmap/roadmap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RoadmapVoteActionState = Readonly<{
  status: "idle" | "success" | "error";
  message: string;
  selectedSlug: string | null;
  courses: readonly RoadmapCourse[];
}>;

type VoteTotalRow = { course_slug: string; vote_count: number | string };

async function loadUpdatedRoadmap(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, selectedSlug: string | null) {
  const { data, error } = await supabase.rpc("course_roadmap_vote_totals");
  if (error) return null;
  return buildRoadmapCourses(courses, ((data ?? []) as VoteTotalRow[]).map((row) => ({
    courseSlug: row.course_slug,
    voteCount: Number(row.vote_count),
  })), selectedSlug);
}

export async function updateRoadmapVote(
  previousState: RoadmapVoteActionState,
  formData: FormData,
): Promise<RoadmapVoteActionState> {
  const courseSlug = formData.get("courseSlug");
  if (!isRoadmapCourseSlug(courses, courseSlug)) {
    return { ...previousState, status: "error", message: "Цей курс відсутній у поточному roadmap." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ...previousState, status: "error", message: "Supabase ще не налаштовано." };
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { ...previousState, status: "error", message: "Сесія завершилася. Увійди ще раз." };

  const { data: currentVote, error: currentVoteError } = await supabase
    .from("course_roadmap_votes")
    .select("course_slug")
    .eq("user_id", user.id)
    .maybeSingle();
  if (currentVoteError) return { ...previousState, status: "error", message: "Не вдалося перевірити поточний голос." };

  const unvote = currentVote?.course_slug === courseSlug;
  const mutation = unvote
    ? supabase.from("course_roadmap_votes").delete().eq("user_id", user.id)
    : supabase.from("course_roadmap_votes").upsert({
      user_id: user.id,
      course_slug: courseSlug,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  const { error } = await mutation;
  if (error) return { ...previousState, status: "error", message: "Не вдалося зберегти голос. Спробуй ще раз." };

  const selectedSlug = unvote ? null : courseSlug;
  const roadmap = await loadUpdatedRoadmap(supabase, selectedSlug);
  revalidatePath("/courses");
  return {
    status: "success",
    message: unvote ? "Голос скасовано." : currentVote ? "Голос перенесено на інший курс." : "Голос враховано.",
    selectedSlug,
    courses: roadmap ?? previousState.courses.map((course) => ({ ...course, selected: course.slug === selectedSlug })),
  };
}
