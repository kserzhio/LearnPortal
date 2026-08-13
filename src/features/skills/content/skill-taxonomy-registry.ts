import { courses, getCourseLessons } from "@/content/courses";
import { kidsCourses } from "@/features/kids-coding/content/course-registry";
import { defineSkillTaxonomy, type SkillContentCatalog, type SkillContentReference } from "../domain";

export const skillContentCatalog: SkillContentCatalog = Object.freeze({
  adult: Object.freeze(courses.map((course) => Object.freeze({ courseId: course.id, unitIds: Object.freeze(getCourseLessons(course.id).map((lesson) => lesson.id)) }))),
  kids: Object.freeze(kidsCourses.map((course) => Object.freeze({ courseId: course.id, unitIds: Object.freeze(course.worlds.flatMap((world) => world.levels.map((level) => level.id))) }))),
});

const authoredSkillTaxonomy = {
  schema: "systema.skill-taxonomy",
  schemaVersion: 1,
  contentVersion: 1,
  skills: [
    { id: "systems-thinking", slug: "systems-thinking", title: "Системне мислення", description: "Бачити компоненти, зв’язки, обмеження та наслідки рішень як одну систему.", category: "foundation", parentId: null },
    { id: "requirements-engineering", slug: "requirements-engineering", title: "Робота з вимогами", description: "Перетворювати потреби користувачів і бізнесу на перевірні системні вимоги.", category: "foundation", parentId: "systems-thinking" },
    { id: "capacity-planning", slug: "capacity-planning", title: "Оцінка потужності", description: "Оцінювати traffic, concurrency, storage і compute до вибору компонентів.", category: "architecture", parentId: "requirements-engineering" },
    { id: "architecture-design", slug: "architecture-design", title: "Архітектурний дизайн", description: "Будувати high-level architecture та аргументувати межі й trade-offs.", category: "architecture", parentId: "systems-thinking" },
    { id: "service-integration", slug: "service-integration", title: "Взаємодія сервісів", description: "Проєктувати API та asynchronous flows із надійними контрактами.", category: "architecture", parentId: "architecture-design" },
    { id: "data-strategy", slug: "data-strategy", title: "Стратегія даних", description: "Обирати storage, consistency і distribution відповідно до access patterns.", category: "data", parentId: "architecture-design" },
    { id: "scalability-engineering", slug: "scalability-engineering", title: "Інженерія масштабування", description: "Масштабувати compute, delivery та caching після вимірювання bottlenecks.", category: "performance", parentId: "architecture-design" },
    { id: "reliability-engineering", slug: "reliability-engineering", title: "Інженерія надійності", description: "Проєктувати redundancy, recovery і failure handling під задані цілі.", category: "reliability", parentId: "architecture-design" },
    { id: "observability", slug: "observability", title: "Спостережуваність", description: "Пояснювати стан системи через metrics, logs, traces і дієві alerts.", category: "reliability", parentId: "reliability-engineering" },
    { id: "accessible-requirements", slug: "accessible-requirements", title: "Доступні системні вимоги", description: "Включати accessibility у вимоги, acceptance criteria та системні обмеження.", category: "quality", parentId: "requirements-engineering" },
  ],
  mappings: [
    { id: "systems-thinking-high-load-course", skillId: "systems-thinking", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "course", contentId: null } },
    { id: "systems-thinking-robot-course", skillId: "systems-thinking", content: { catalog: "kids", courseId: "robot-quest-algorithms", contentType: "course", contentId: null } },
    { id: "requirements-high-load-02", skillId: "requirements-engineering", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-02" } },
    { id: "capacity-high-load-01", skillId: "capacity-planning", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-01" } },
    { id: "capacity-high-load-03", skillId: "capacity-planning", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-03" } },
    { id: "architecture-high-load-04", skillId: "architecture-design", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-04" } },
    { id: "architecture-high-load-05", skillId: "architecture-design", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-05" } },
    { id: "architecture-high-load-06", skillId: "architecture-design", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-06" } },
    { id: "architecture-high-load-07", skillId: "architecture-design", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-07" } },
    { id: "integration-high-load-08", skillId: "service-integration", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-08" } },
    { id: "integration-high-load-09", skillId: "service-integration", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-09" } },
    { id: "data-high-load-10", skillId: "data-strategy", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-10" } },
    { id: "data-high-load-11", skillId: "data-strategy", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-11" } },
    { id: "data-high-load-12", skillId: "data-strategy", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-12" } },
    { id: "data-high-load-13", skillId: "data-strategy", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-13" } },
    { id: "scaling-high-load-14", skillId: "scalability-engineering", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-14" } },
    { id: "scaling-high-load-15", skillId: "scalability-engineering", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-15" } },
    { id: "scaling-high-load-16", skillId: "scalability-engineering", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-16" } },
    { id: "scaling-high-load-17", skillId: "scalability-engineering", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-17" } },
    { id: "reliability-high-load-01", skillId: "reliability-engineering", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-01" } },
    { id: "reliability-high-load-13", skillId: "reliability-engineering", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-13" } },
    { id: "reliability-high-load-19", skillId: "reliability-engineering", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-19" } },
    { id: "observability-high-load-18", skillId: "observability", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-18" } },
    { id: "observability-high-load-19", skillId: "observability", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-19" } },
    { id: "accessibility-high-load-02", skillId: "accessible-requirements", content: { catalog: "adult", courseId: "high-load-architecture", contentType: "unit", contentId: "high-load-02" } },
  ],
} as const;

export const skillTaxonomy = defineSkillTaxonomy(authoredSkillTaxonomy, skillContentCatalog);
export function getSkillById(skillId: string) { return skillTaxonomy.skills.find((skill) => skill.id === skillId) ?? null; }
export function getSkillMappings(skillId: string) { return skillTaxonomy.mappings.filter((mapping) => mapping.skillId === skillId); }
export function getContentSkills(reference: SkillContentReference) { return skillTaxonomy.mappings.filter((mapping) => mapping.content.catalog === reference.catalog && mapping.content.courseId === reference.courseId && mapping.content.contentType === reference.contentType && mapping.content.contentId === reference.contentId).map((mapping) => getSkillById(mapping.skillId)).filter((skill): skill is NonNullable<typeof skill> => Boolean(skill)); }
