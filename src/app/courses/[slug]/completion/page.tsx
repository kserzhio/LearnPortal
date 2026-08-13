import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCourseBySlug, getCourseDefinition } from "@/content/courses";
import { buildCourseCompletionSnapshot } from "@/features/completion/completion";
import { CourseCompletionView } from "@/features/completion/course-completion-view";
import { GuestCourseCompletion } from "@/features/completion/guest-course-completion";
import { getCourseKnowledgeCheckIds } from "@/features/learning-support/content";
import { getPublishedLearningPaths } from "@/features/learning-paths/content";
import { isPublishedLearningPathCourse } from "@/features/learning-paths/presentation";
import { createEmptyLearningPathCourseProgress, loadLearningPathCourseProgress } from "@/features/learning-paths/progress";
import { buildCourseCompletionGuidance } from "@/features/learning-paths/recommendation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CompletionPageProps = { params: Promise<{ slug: string }> };

export const metadata: Metadata = {
  title: "Завершення курсу",
  description: "Підсумок завершеного курсу та Certificate of Completion у SYSTEMA.",
  robots: { index: false, follow: false },
};

export default async function CompletionPage({ params }: CompletionPageProps) {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  const definition = course ? getCourseDefinition(course.id) : null;
  if (!course || !definition || course.status !== "published") notFound();

  const knowledgeCheckIds = getCourseKnowledgeCheckIds(course.id);
  const publishedPaths = getPublishedLearningPaths();
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || !supabase) return <GuestCourseCompletion course={course} definition={definition} knowledgeCheckIds={knowledgeCheckIds} />;

  const [profileResult, progressResult, attemptsResult, pathProgressResult] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("lesson_progress").select("lesson_id, completed, completed_at, updated_at").eq("user_id", user.id).eq("course_id", course.id),
    supabase.from("knowledge_check_attempts").select("check_id, correct").eq("user_id", user.id).eq("course_id", course.id),
    loadLearningPathCourseProgress(supabase, user.id, publishedPaths),
  ]);

  const snapshot = buildCourseCompletionSnapshot(
    definition,
    (progressResult.data ?? []).map((record) => ({ lessonId: record.lesson_id, completed: record.completed, completedAt: record.completed_at, updatedAt: record.updated_at })),
    knowledgeCheckIds,
    attemptsResult.error ? null : (attemptsResult.data ?? []).map((attempt) => ({ checkId: attempt.check_id, correct: attempt.correct })),
  );
  const learnerName = profileResult.data?.display_name
    ?? user.user_metadata?.full_name
    ?? user.user_metadata?.name
    ?? "Користувач SYSTEMA";
  const pathProgress = pathProgressResult.available
    ? pathProgressResult.courses
    : createEmptyLearningPathCourseProgress(publishedPaths);
  const pathGuidance = snapshot.isComplete && pathProgressResult.available
    ? buildCourseCompletionGuidance({ catalog: "adult", courseId: course.id }, publishedPaths, pathProgress, isPublishedLearningPathCourse)
    : undefined;

  return <CourseCompletionView snapshot={snapshot} course={course} learnerName={learnerName} authenticated pathGuidance={pathGuidance} />;
}
