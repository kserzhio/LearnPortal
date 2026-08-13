import type { CourseCatalogKind, LearningPath, LearningPathCourseReference } from "../domain";

export type LearningPathCourseProgress = Readonly<{
  catalog: CourseCatalogKind;
  courseId: string;
  completedUnits: number;
  totalUnits: number;
}>;

export type LearningPathProgress = Readonly<{
  completedUnits: number;
  totalUnits: number;
  percent: number;
  completedRequiredCourses: number;
  requiredCourses: number;
  completed: boolean;
  started: boolean;
  nextCourse: LearningPathCourseReference | null;
}>;

function courseKey(reference: LearningPathCourseReference) {
  return `${reference.catalog}:${reference.courseId}`;
}

function normalizeProgress(progress: LearningPathCourseProgress | undefined) {
  const totalUnits = Math.max(0, Math.trunc(progress?.totalUnits ?? 0));
  const completedUnits = Math.min(totalUnits, Math.max(0, Math.trunc(progress?.completedUnits ?? 0)));
  return { completedUnits, totalUnits, completed: totalUnits > 0 && completedUnits === totalUnits };
}

export function buildLearningPathProgress(
  path: LearningPath,
  courseProgress: readonly LearningPathCourseProgress[],
): LearningPathProgress {
  const byCourse = new Map(courseProgress.map((progress) => [courseKey(progress), progress]));
  const requiredSteps = path.steps.filter((step) => step.requirement === "required");
  const requiredProgress = requiredSteps.map((step) => normalizeProgress(byCourse.get(courseKey(step.course))));
  const completedUnits = requiredProgress.reduce((total, progress) => total + progress.completedUnits, 0);
  const totalUnits = requiredProgress.reduce((total, progress) => total + progress.totalUnits, 0);
  const completedRequiredCourses = requiredProgress.filter((progress) => progress.completed).length;
  const requiredCourses = requiredSteps.length;
  const completed = requiredCourses > 0 && completedRequiredCourses === requiredCourses;

  const nextRequired = requiredSteps.find((step) => !normalizeProgress(byCourse.get(courseKey(step.course))).completed);
  const nextOptional = path.steps.find((step) => (
    step.requirement === "optional" && !normalizeProgress(byCourse.get(courseKey(step.course))).completed
  ));

  return {
    completedUnits,
    totalUnits,
    percent: totalUnits > 0 ? Math.round(completedUnits / totalUnits * 100) : 0,
    completedRequiredCourses,
    requiredCourses,
    completed,
    started: courseProgress.some((progress) => progress.completedUnits > 0),
    nextCourse: nextRequired?.course ?? nextOptional?.course ?? null,
  };
}
