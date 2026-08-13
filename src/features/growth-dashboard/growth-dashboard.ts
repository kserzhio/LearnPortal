export type GrowthDashboardSnapshot = Readonly<{
  period: Readonly<{ start:string; end:string }>;
  learning: Readonly<{
    activeLearners:number;
    adultLessonRecords:number;
    lessonCompletions:number;
    courseCompletions:number;
    kidsAttempts:number;
    kidsCompletions:number;
  }>;
  quality: Readonly<{
    feedbackTotal:number;
    feedbackHelpful:number;
    knowledgeAttempts:number;
    knowledgeCorrect:number;
    questions:number;
    questionsResolved:number;
  }>;
  courses: readonly Readonly<{
    id:string;
    title:string;
    enrollments:number;
    active_learners:number;
    lesson_completions:number;
    course_completions:number;
  }>[];
  roadmapVotes: readonly Readonly<{ course_slug:string; vote_count:number }>[];
}>;

export type GrowthDateRange = Readonly<{ start:Date; end:Date }>;

const DAY_MS = 86_400_000;
const MAX_DAYS = 366;

function startOfUtcDay(value:Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function parseDate(value:string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== value ? null : date;
}

export function resolveGrowthDateRange(startValue:string | undefined, endValue:string | undefined, now = new Date()):GrowthDateRange {
  const today = startOfUtcDay(now);
  const defaultEnd = new Date(today.getTime() + DAY_MS);
  const endDay = parseDate(endValue);
  const end = endDay ? new Date(endDay.getTime() + DAY_MS) : defaultEnd;
  const start = parseDate(startValue) ?? new Date(end.getTime() - 29 * DAY_MS);
  if (start >= end || end.getTime() - start.getTime() > MAX_DAYS * DAY_MS) return { start:new Date(end.getTime() - 29 * DAY_MS), end };
  return { start, end };
}

export function formatDateInput(value:Date) {
  return value.toISOString().slice(0,10);
}

export function formatPercent(numerator:number, denominator:number) {
  return denominator > 0 ? `${Math.round(numerator / denominator * 100)}%` : "—";
}

function nonNegativeNumber(value:unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function record(value:unknown):Record<string,unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string,unknown> : {};
}

export function parseGrowthDashboardSnapshot(value:unknown):GrowthDashboardSnapshot | null {
  const root = record(value);
  const period = record(root.period);
  const learning = record(root.learning);
  const quality = record(root.quality);
  if (typeof period.start !== "string" || typeof period.end !== "string") return null;
  const courses = Array.isArray(root.courses) ? root.courses.map(record).filter((row) => typeof row.id === "string" && typeof row.title === "string").map((row) => ({
    id:row.id as string, title:row.title as string, enrollments:nonNegativeNumber(row.enrollments), active_learners:nonNegativeNumber(row.active_learners), lesson_completions:nonNegativeNumber(row.lesson_completions), course_completions:nonNegativeNumber(row.course_completions),
  })) : [];
  const roadmapVotes = Array.isArray(root.roadmapVotes) ? root.roadmapVotes.map(record).filter((row) => typeof row.course_slug === "string").map((row) => ({ course_slug:row.course_slug as string, vote_count:nonNegativeNumber(row.vote_count) })) : [];
  return {
    period:{ start:period.start, end:period.end },
    learning:{ activeLearners:nonNegativeNumber(learning.activeLearners), adultLessonRecords:nonNegativeNumber(learning.adultLessonRecords), lessonCompletions:nonNegativeNumber(learning.lessonCompletions), courseCompletions:nonNegativeNumber(learning.courseCompletions), kidsAttempts:nonNegativeNumber(learning.kidsAttempts), kidsCompletions:nonNegativeNumber(learning.kidsCompletions) },
    quality:{ feedbackTotal:nonNegativeNumber(quality.feedbackTotal), feedbackHelpful:nonNegativeNumber(quality.feedbackHelpful), knowledgeAttempts:nonNegativeNumber(quality.knowledgeAttempts), knowledgeCorrect:nonNegativeNumber(quality.knowledgeCorrect), questions:nonNegativeNumber(quality.questions), questionsResolved:nonNegativeNumber(quality.questionsResolved) },
    courses, roadmapVotes,
  };
}
