import { NextResponse } from "next/server";
import { getCourseLessons } from "@/content/courses";
import { highLoadArchitectureCourse } from "@/content/courses/high-load-architecture";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PREVIEW_LESSON_COUNT = 1;
const FULL_LESSON_COUNT = getCourseLessons(highLoadArchitectureCourse.id).length;

function elapsedLearningDay(startedAt: string | null) {
  if (!startedAt) return 1;
  const start = new Date(startedAt);
  if (Number.isNaN(start.getTime())) return 1;
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(1, Math.floor((todayUtc - startUtc) / 86_400_000) + 1);
}

function userInitials(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  const displayName = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim();
  const source = displayName || user.email || "U";
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function getAccessibleModules(lessonLimit: number) {
  return highLoadArchitectureCourse.modules
    .map((courseModule) => ({
      id: courseModule.id,
      position: courseModule.position,
      title: courseModule.title,
      lessons: courseModule.lessons
        .filter((lesson) => lesson.position <= lessonLimit)
        .map((lesson) => ({
          id: lesson.id,
          position: lesson.position,
          title: lesson.title,
          legacyAnchor: lesson.legacyAnchor,
        })),
    }))
    .filter((courseModule) => courseModule.lessons.length > 0);
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const authenticated = Boolean(user);
  const accessibleLessonCount = authenticated ? FULL_LESSON_COUNT : PREVIEW_LESSON_COUNT;
  const [enrollmentResult, progressResult] = user && supabase
    ? await Promise.all([
      supabase.from("course_enrollments").select("enrolled_at").eq("user_id", user.id).eq("course_id", highLoadArchitectureCourse.id).maybeSingle(),
      supabase.from("lesson_progress").select("updated_at").eq("user_id", user.id).eq("course_id", highLoadArchitectureCourse.id).order("updated_at", { ascending: true }).limit(1).maybeSingle(),
    ])
    : [{ data: null }, { data: null }];
  const learningStartedAt = enrollmentResult.data?.enrolled_at
    ?? progressResult.data?.updated_at
    ?? user?.created_at
    ?? null;

  return NextResponse.json({
    authenticated,
    access: authenticated ? "full" : "preview",
    accessibleLessonCount,
    totalLessonCount: FULL_LESSON_COUNT,
    modules: getAccessibleModules(accessibleLessonCount),
    profile: user ? { initials: userInitials(user) } : null,
    learningStartedAt,
    learningDay: elapsedLearningDay(learningStartedAt),
  }, { headers: { "Cache-Control": "no-store" } });
}
