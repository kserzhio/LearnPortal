import type { CourseSummary } from "@/content/courses";
import { getCourseLessonPath } from "@/content/courses";
import { getCourseResume, type ResumeLesson, type ResumeProgress } from "@/lib/progress/resume";

export type ContinueLearningState = Readonly<{
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  completedLessons: number;
  totalLessons: number;
  status: "start" | "continue" | "completed";
  nextLesson: Readonly<{ id: string; position: number; title: string }> | null;
  lastActivityAt: string | null;
  href: string;
  actionLabel: "Почати курс" | "Продовжити" | "Відкрити підсумок";
}>;

export function buildContinueLearningState(
  course: CourseSummary,
  lessons: readonly ResumeLesson[],
  progress: readonly ResumeProgress[],
): ContinueLearningState {
  const validLessonIds = new Set(lessons.map((lesson) => lesson.id));
  const validProgress = progress.filter((record) => validLessonIds.has(record.lessonId));
  const completedLessons = new Set(validProgress.filter((record) => record.completed).map((record) => record.lessonId)).size;
  const resume = getCourseResume(lessons, validProgress);
  const completed = lessons.length > 0 && completedLessons === lessons.length;

  if (completed) {
    return {
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      completedLessons,
      totalLessons: lessons.length,
      status: "completed",
      nextLesson: null,
      lastActivityAt: resume?.lastActivityAt ?? null,
      href: `/courses/${course.slug}/completion`,
      actionLabel: "Відкрити підсумок",
    };
  }

  const nextLesson = resume?.lesson ?? lessons.toSorted((first, second) => first.position - second.position)[0] ?? null;
  const started = validProgress.length > 0;
  return {
    courseId: course.id,
    courseSlug: course.slug,
    courseTitle: course.title,
    completedLessons,
    totalLessons: lessons.length,
    status: started ? "continue" : "start",
    nextLesson,
    lastActivityAt: resume?.lastActivityAt ?? null,
    href: nextLesson ? getCourseLessonPath(course, nextLesson.position) : `/courses/${course.slug}`,
    actionLabel: started ? "Продовжити" : "Почати курс",
  };
}
