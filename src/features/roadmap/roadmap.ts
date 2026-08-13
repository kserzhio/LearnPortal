import type { CourseSummary } from "@/content/courses";

export type RoadmapCourse = Readonly<{
  slug: string;
  title: string;
  description: string;
  accent: string;
  voteCount: number;
  selected: boolean;
}>;

export type RoadmapVoteTotal = Readonly<{ courseSlug: string; voteCount: number }>;

export function getRoadmapCandidates(courses: readonly CourseSummary[]) {
  return courses.filter((course) => course.status === "planned");
}

export function isRoadmapCourseSlug(courses: readonly CourseSummary[], value: unknown): value is string {
  return typeof value === "string" && getRoadmapCandidates(courses).some((course) => course.slug === value);
}

export function buildRoadmapCourses(
  courses: readonly CourseSummary[],
  totals: readonly RoadmapVoteTotal[],
  selectedSlug: string | null,
): readonly RoadmapCourse[] {
  const countBySlug = new Map(totals.map((total) => [total.courseSlug, Math.max(0, Math.trunc(total.voteCount))]));
  return getRoadmapCandidates(courses).map((course) => ({
    slug: course.slug,
    title: course.title,
    description: course.description,
    accent: course.accent,
    voteCount: countBySlug.get(course.slug) ?? 0,
    selected: course.slug === selectedSlug,
  }));
}

export function rankRoadmapCourses(courses: readonly RoadmapCourse[]) {
  return courses.toSorted((first, second) => second.voteCount - first.voteCount || first.title.localeCompare(second.title, "uk"));
}
