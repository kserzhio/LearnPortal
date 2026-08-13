import type { CourseDefinition } from "@/content/course-contract";

export type CompletionProgressRecord = Readonly<{
  lessonId: string;
  completed: boolean;
  completedAt?: string | null;
  updatedAt: string;
}>;

export type CompletionKnowledgeAttempt = Readonly<{
  checkId: string;
  correct: boolean;
}>;

export type KnowledgeCheckSummary = Readonly<{
  available: number;
  attempted: number;
  passed: number;
}>;

export type CourseCompletionSnapshot = Readonly<{
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  completedLessons: number;
  totalLessons: number;
  isComplete: boolean;
  completedAt: string | null;
  outcomes: readonly string[];
  knowledgeChecks: KnowledgeCheckSummary | null;
}>;

function latestDate(records: readonly CompletionProgressRecord[]) {
  const timestamps = records
    .map((record) => Date.parse(record.completedAt ?? record.updatedAt))
    .filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;
}

export function buildCourseCompletionSnapshot(
  course: CourseDefinition,
  progress: readonly CompletionProgressRecord[],
  availableCheckIds: readonly string[],
  attempts: readonly CompletionKnowledgeAttempt[] | null,
): CourseCompletionSnapshot {
  const lessons = course.modules.flatMap((courseModule) => courseModule.lessons);
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const completedRecords = progress.filter((record) => record.completed && lessonIds.has(record.lessonId));
  const completedLessonIds = new Set(completedRecords.map((record) => record.lessonId));
  const validCheckIds = new Set(availableCheckIds);
  const validAttempts = attempts?.filter((attempt) => validCheckIds.has(attempt.checkId)) ?? null;
  const passedChecks = new Set(validAttempts?.filter((attempt) => attempt.correct).map((attempt) => attempt.checkId) ?? []);
  const attemptedChecks = new Set(validAttempts?.map((attempt) => attempt.checkId) ?? []);
  const isComplete = completedLessonIds.size === lessons.length && lessons.length > 0;

  return {
    courseId: course.id,
    courseSlug: course.slug,
    courseTitle: course.title,
    completedLessons: completedLessonIds.size,
    totalLessons: lessons.length,
    isComplete,
    completedAt: isComplete ? latestDate(completedRecords) : null,
    outcomes: course.modules.map((courseModule) => courseModule.lessons.at(-1)?.outcome).filter((outcome): outcome is string => Boolean(outcome)),
    knowledgeChecks: validAttempts === null ? null : {
      available: validCheckIds.size,
      attempted: attemptedChecks.size,
      passed: passedChecks.size,
    },
  };
}

export function formatCompletionDate(value: string | null) {
  if (!value) return "Дата недоступна";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата недоступна";
  return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric" }).format(date);
}
