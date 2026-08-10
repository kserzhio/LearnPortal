export type CourseSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  lessonCount: number;
  duration: string;
  level: string;
  status: "published" | "planned";
  accent: string;
  legacyPath?: string;
};

export const courses: CourseSummary[] = [
  {
    id: "high-load-architecture",
    slug: "high-load-architecture",
    title: "Архітектура високонавантажених систем",
    description: "Від оцінки навантаження до відмовостійкого multi-region System Design.",
    lessonCount: 19,
    duration: "≈24 години",
    level: "Middle → Senior",
    status: "published",
    accent: "HL",
    legacyPath: "/legacy/index.html#lesson-1",
  },
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

export function getCourseLessonPath(course: CourseSummary, lessonPosition: number) {
  if (!course.legacyPath) return `/courses/${course.slug}`;
  const [pathname] = course.legacyPath.split("#");
  const safePosition = Math.min(Math.max(Math.trunc(lessonPosition), 1), course.lessonCount || 1);
  return `${pathname}#lesson-${safePosition}`;
}
