import { getLessons, toCourseSummary, type CourseDefinition, type CourseSummary, type LessonDefinition } from "@/content/course-contract";
import { highLoadArchitectureCourse } from "@/content/courses/high-load-architecture";

export type { CourseDefinition, CourseSummary, LessonDefinition } from "@/content/course-contract";

export const courseDefinitions: readonly CourseDefinition[] = [highLoadArchitectureCourse];

export const courses: readonly CourseSummary[] = [
  toCourseSummary(highLoadArchitectureCourse),
  {
    id: "frontend-architecture",
    slug: "frontend-architecture",
    title: "Архітектура сучасного Frontend",
    description: "Rendering, state, performance, accessibility та масштабування frontend-команд.",
    lessonCount: 0,
    duration: "У розробці",
    level: "Заплановано",
    status: "planned",
    accent: "FE",
  },
  {
    id: "platform-engineering",
    slug: "platform-engineering",
    title: "Platform Engineering та DevOps",
    description: "CI/CD, containers, observability, Kubernetes і внутрішні developer platforms.",
    lessonCount: 0,
    duration: "У розробці",
    level: "Заплановано",
    status: "planned",
    accent: "PE",
  },
];

export function getCourseBySlug(slug: string) {
  return courses.find((course) => course.slug === slug);
}

export function getCourseDefinition(courseId: string) {
  return courseDefinitions.find((course) => course.id === courseId);
}

export function getCourseLessons(courseId: string) {
  const course = getCourseDefinition(courseId);
  return course ? getLessons(course) : [];
}

export function getPublicCourseLessons(courseId: string) {
  return getCourseLessons(courseId).filter((lesson) => Boolean(lesson.seo));
}

export function getPublicLessonPath(courseSlug: string, lesson: LessonDefinition) {
  return lesson.seo ? `/courses/${courseSlug}/lessons/${lesson.seo.slug}` : null;
}

export function getCoursePublicStartPath(course: CourseSummary) {
  const lesson = getPublicCourseLessons(course.id)[0];
  return lesson ? getPublicLessonPath(course.slug, lesson) : null;
}

export function getLessonById(courseId: string, lessonId: string) {
  return getCourseLessons(courseId).find((lesson) => lesson.id === lessonId);
}

export function getCourseLessonPath(course: CourseSummary, lessonPosition: number) {
  if (!course.legacyPath) return `/courses/${course.slug}`;
  const [pathname] = course.legacyPath.split("#");
  const safePosition = Math.min(Math.max(Math.trunc(lessonPosition), 1), course.lessonCount || 1);
  return `${pathname}#lesson-${safePosition}`;
}
