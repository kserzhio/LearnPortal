import { courses } from "@/content/courses";
import { kidsCourses } from "@/features/kids-coding/content/course-registry";
import { getPublishedLearningPaths } from "../content";
import type { LearningPath, LearningPathAudience, LearningPathCourseReference } from "../domain";

export type LearningPathFilter = "all" | Exclude<LearningPathAudience, "mixed">;

export function resolveLearningPathFilter(value: string | string[] | undefined): LearningPathFilter {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "adult" || candidate === "kids" ? candidate : "all";
}

export function filterPublishedLearningPaths(filter: LearningPathFilter) {
  const published = getPublishedLearningPaths();
  return filter === "all" ? published : published.filter((path) => path.audience === filter || path.audience === "mixed");
}

export function getAvailableLearningPathFilters(paths: readonly LearningPath[]) {
  return (["adult", "kids"] as const).filter((filter) => paths.some((path) => path.audience === filter || path.audience === "mixed"));
}

export function getLearningPathCourseHref(reference: LearningPathCourseReference) {
  if (reference.catalog === "kids") return `/kids-coding/${reference.courseId}`;
  const course = courses.find((entry) => entry.id === reference.courseId);
  return course ? `/courses/${course.slug}` : "/courses";
}

export function getLearningPathCoursePresentation(reference: LearningPathCourseReference) {
  if (reference.catalog === "kids") {
    const course = kidsCourses.find((entry) => entry.id === reference.courseId);
    return course ? { title: course.title, description: course.shortDescription } : null;
  }
  const course = courses.find((entry) => entry.id === reference.courseId);
  return course ? { title: course.title, description: course.description } : null;
}

export function isPublishedLearningPathCourse(reference: LearningPathCourseReference) {
  if (reference.catalog === "kids") return kidsCourses.some((entry) => entry.id === reference.courseId && entry.status === "published");
  return courses.some((entry) => entry.id === reference.courseId && entry.status === "published");
}
