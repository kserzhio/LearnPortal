import type { LearningPath, LearningPathStep } from "../domain";
import type { LearningPathCourseProgress } from "../progress";

export type LearningPathStepStatus = "completed" | "current" | "upcoming";

export type LearningPathStepView = Readonly<{
  step: LearningPathStep;
  status: LearningPathStepStatus;
  completedUnits: number;
  totalUnits: number;
}>;

function key(catalog: string, courseId: string) {
  return `${catalog}:${courseId}`;
}

function normalized(progress: LearningPathCourseProgress | undefined) {
  const totalUnits = Math.max(0, Math.trunc(progress?.totalUnits ?? 0));
  const completedUnits = Math.min(totalUnits, Math.max(0, Math.trunc(progress?.completedUnits ?? 0)));
  return { completedUnits, totalUnits, completed: totalUnits > 0 && completedUnits === totalUnits };
}

export function buildLearningPathStepViews(
  path: LearningPath,
  courseProgress: readonly LearningPathCourseProgress[],
): readonly LearningPathStepView[] {
  const progressByCourse = new Map(courseProgress.map((entry) => [key(entry.catalog, entry.courseId), entry]));
  const progress = path.steps.map((step) => normalized(progressByCourse.get(key(step.course.catalog, step.course.courseId))));
  const currentIndex = path.steps.findIndex((step, index) => step.requirement === "required" && !progress[index].completed);
  const optionalIndex = currentIndex < 0
    ? path.steps.findIndex((step, index) => step.requirement === "optional" && !progress[index].completed)
    : -1;
  const activeIndex = currentIndex >= 0 ? currentIndex : optionalIndex;

  return path.steps.map((step, index) => ({
    step,
    status: progress[index].completed ? "completed" : index === activeIndex ? "current" : "upcoming",
    completedUnits: progress[index].completedUnits,
    totalUnits: progress[index].totalUnits,
  }));
}

export function getCurrentLearningPathStep(steps: readonly LearningPathStepView[]) {
  return steps.find((entry) => entry.status === "current") ?? null;
}
