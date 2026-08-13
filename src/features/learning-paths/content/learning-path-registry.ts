import { courses } from "@/content/courses";
import { kidsCourses } from "@/features/kids-coding/content/course-registry";
import { defineLearningPath, type LearningPath, type LearningPathCourseCatalog } from "../domain";

export const learningPathCourseCatalog: LearningPathCourseCatalog = Object.freeze({
  adult: Object.freeze(courses.map((course) => course.id)),
  kids: Object.freeze(kidsCourses.map((course) => course.id)),
});

const authoredLearningPaths = [
  {
    schema: "systema.learning-path",
    schemaVersion: 1,
    contentVersion: 1,
    id: "high-load-system-designer",
    slug: "high-load-system-designer",
    title: "Архітектор високонавантажених систем",
    shortDescription: "Від оцінки навантаження до відмовостійкого фінального System Design.",
    outcome: "Спроєктувати аргументовану архітектуру платформи під реальні обмеження навантаження й доступності.",
    audience: "adult",
    status: "published",
    duration: { estimatedHours: 18, recommendedWeeks: 8 },
    steps: [{
      id: "high-load-foundation",
      position: 1,
      title: "Опанувати High Load Architecture",
      outcome: "Перевести вимоги в метрики, компоненти, bottlenecks і reliability trade-offs.",
      requirement: "required",
      course: { catalog: "adult", courseId: "high-load-architecture" },
    }],
  },
  {
    schema: "systema.learning-path",
    schemaVersion: 1,
    contentVersion: 1,
    id: "architecture-platform-track",
    slug: "architecture-platform-track",
    title: "Архітектура продукту та платформи",
    shortDescription: "Керований майбутній шлях від системного дизайну до frontend і platform engineering.",
    outcome: "Пов’язати backend, frontend та platform trade-offs в одну архітектурну картину.",
    audience: "adult",
    status: "draft",
    duration: { estimatedHours: 42, recommendedWeeks: 18 },
    steps: [
      {
        id: "distributed-systems-base",
        position: 1,
        title: "Побудувати основу системного дизайну",
        outcome: "Аргументувати масштабування, data flow і reliability рішення.",
        requirement: "required",
        course: { catalog: "adult", courseId: "high-load-architecture" },
      },
      {
        id: "frontend-architecture-option",
        position: 2,
        title: "Додати Frontend Architecture",
        outcome: "Узгодити rendering, state, performance та accessibility із системною архітектурою.",
        requirement: "optional",
        course: { catalog: "adult", courseId: "frontend-architecture" },
      },
      {
        id: "platform-engineering-core",
        position: 3,
        title: "Опанувати Platform Engineering",
        outcome: "Проєктувати delivery, observability і developer platform як частину системи.",
        requirement: "required",
        course: { catalog: "adult", courseId: "platform-engineering" },
      },
    ],
  },
  {
    schema: "systema.learning-path",
    schemaVersion: 1,
    contentVersion: 1,
    id: "kids-coding-foundations",
    slug: "kids-coding-foundations",
    title: "Від алгоритмів до JavaScript",
    shortDescription: "Ігровий шлях від послідовностей і повторень до перших JavaScript-команд.",
    outcome: "Самостійно скласти алгоритм і перенести знайому логіку в безпечний JavaScript sandbox.",
    audience: "kids",
    status: "published",
    duration: { estimatedHours: 8, recommendedWeeks: 6 },
    steps: [
      {
        id: "algorithmic-thinking",
        position: 1,
        title: "Навчитися мислити алгоритмами",
        outcome: "Будувати послідовності, повороти та повторення через blocks.",
        requirement: "required",
        course: { catalog: "kids", courseId: "robot-quest-algorithms" },
      },
      {
        id: "javascript-first-steps",
        position: 2,
        title: "Перейти до JavaScript",
        outcome: "Керувати героєм командами, змінними й bounded loops.",
        requirement: "required",
        course: { catalog: "kids", courseId: "code-adventure-javascript" },
      },
    ],
  },
] as const;

export const learningPaths: readonly LearningPath[] = Object.freeze(
  authoredLearningPaths.map((path) => defineLearningPath(path, learningPathCourseCatalog)),
);

export function getLearningPathBySlug(slug: string) {
  return learningPaths.find((path) => path.slug === slug) ?? null;
}

export function getPublishedLearningPaths() {
  return learningPaths.filter((path) => path.status === "published");
}

export function getCourseLearningPaths(catalog: "adult" | "kids", courseId: string) {
  return learningPaths.filter((path) => path.steps.some((step) => step.course.catalog === catalog && step.course.courseId === courseId));
}
