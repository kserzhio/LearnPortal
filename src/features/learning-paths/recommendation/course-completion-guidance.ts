import type { LearningPath, LearningPathCourseReference } from "../domain";
import { buildLearningPathProgress, type LearningPathCourseProgress } from "../progress";

export type NextCourseRecommendation = Readonly<{
  pathId: string;
  pathSlug: string;
  pathTitle: string;
  nextStepTitle: string;
  nextCourse: LearningPathCourseReference;
  reason: string;
}>;

export type CompletedPathMembership = Readonly<{
  pathId: string;
  pathSlug: string;
  pathTitle: string;
}>;

export type CourseCompletionGuidance = Readonly<{
  recommendations: readonly NextCourseRecommendation[];
  completedPaths: readonly CompletedPathMembership[];
}>;

function sameCourse(left: LearningPathCourseReference, right: LearningPathCourseReference) {
  return left.catalog === right.catalog && left.courseId === right.courseId;
}

function completedCurrentCourse(reference: LearningPathCourseReference, progress: readonly LearningPathCourseProgress[]) {
  const current = progress.find((entry) => entry.catalog === reference.catalog && entry.courseId === reference.courseId);
  return Boolean(current && current.totalUnits > 0 && current.completedUnits >= current.totalUnits);
}

export function buildCourseCompletionGuidance(
  currentCourse: LearningPathCourseReference,
  paths: readonly LearningPath[],
  courseProgress: readonly LearningPathCourseProgress[],
  isCoursePublished: (reference: LearningPathCourseReference) => boolean,
): CourseCompletionGuidance {
  if (!completedCurrentCourse(currentCourse, courseProgress)) return { recommendations: [], completedPaths: [] };

  const recommendations: NextCourseRecommendation[] = [];
  const completedPaths: CompletedPathMembership[] = [];
  for (const path of paths) {
    if (path.status !== "published" || !path.steps.some((step) => sameCourse(step.course, currentCourse))) continue;
    const pathProgress = buildLearningPathProgress(path, courseProgress);
    if (pathProgress.completed) {
      completedPaths.push({ pathId: path.id, pathSlug: path.slug, pathTitle: path.title });
      continue;
    }
    const nextCourse = pathProgress.nextCourse;
    if (!nextCourse || sameCourse(nextCourse, currentCourse) || !isCoursePublished(nextCourse)) continue;
    const currentStep = path.steps.find((step) => sameCourse(step.course, currentCourse));
    const nextStep = path.steps.find((step) => sameCourse(step.course, nextCourse));
    if (!currentStep || !nextStep || nextStep.requirement !== "required") continue;
    recommendations.push({
      pathId: path.id,
      pathSlug: path.slug,
      pathTitle: path.title,
      nextStepTitle: nextStep.title,
      nextCourse,
      reason: `Ти завершив «${currentStep.title}». Наступний required крок — «${nextStep.title}».`,
    });
  }
  return { recommendations, completedPaths };
}
