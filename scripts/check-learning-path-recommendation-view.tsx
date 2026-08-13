import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { getCourseBySlug } from "../src/content/courses";
import { CourseCompletionView } from "../src/features/completion/course-completion-view";
import type { CourseCompletionSnapshot } from "../src/features/completion/completion";
import type { CourseCompletionGuidance } from "../src/features/learning-paths/recommendation";

const course = getCourseBySlug("high-load-architecture");
assert.ok(course);
const snapshot: CourseCompletionSnapshot = {
  courseId: course.id, courseSlug: course.slug, courseTitle: course.title,
  completedLessons: 19, totalLessons: 19, isComplete: true, completedAt: "2026-08-13T10:00:00.000Z",
  outcomes: ["Аргументувати архітектурні рішення."], knowledgeChecks: null,
};
const guidance: CourseCompletionGuidance = {
  recommendations: [{
    pathId: "architecture-path", pathSlug: "architecture-path", pathTitle: "Архітектурний шлях",
    nextStepTitle: "Опанувати Platform Engineering", nextCourse: { catalog: "adult", courseId: "platform-engineering" },
    reason: "Ти завершив основу. Наступний required крок — Platform Engineering.",
  }],
  completedPaths: [{ pathId: "complete-path", pathSlug: "complete-path", pathTitle: "Завершений шлях" }],
};

const html = renderToStaticMarkup(<CourseCompletionView snapshot={snapshot} course={course} authenticated pathGuidance={guidance} />);
assert.match(html, /id="completionPathsHeading"/);
assert.match(html, /Наступний required крок/);
assert.match(html, /href="\/paths\/architecture-path"[^>]*>Продовжити шлях/);
assert.match(html, /Цей курс завершує шлях/);
const incomplete = renderToStaticMarkup(<CourseCompletionView snapshot={{ ...snapshot, completedLessons: 18, isComplete: false }} course={course} authenticated pathGuidance={guidance} />);
assert.doesNotMatch(incomplete, /completionPathsHeading/);

console.log("Learning Path recommendation view check passed: semantic panel, reason, CTA, completed membership and incomplete guard.");
