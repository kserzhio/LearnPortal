import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { getCourseBySlug } from "../src/content/courses";
import { CourseCompletionView } from "../src/features/completion/course-completion-view";
import type { CourseCompletionSnapshot } from "../src/features/completion/completion";

const course = getCourseBySlug("high-load-architecture");
assert.ok(course);

const completeSnapshot: CourseCompletionSnapshot = {
  courseId: course.id,
  courseSlug: course.slug,
  courseTitle: course.title,
  completedLessons: 19,
  totalLessons: 19,
  isComplete: true,
  completedAt: "2026-08-13T10:00:00.000Z",
  outcomes: ["Переводить вимоги в архітектурні рішення."],
  knowledgeChecks: { available: 3, attempted: 3, passed: 3 },
};

const completeHtml = renderToStaticMarkup(<CourseCompletionView snapshot={completeSnapshot} course={course} learnerName="Test Learner" authenticated />);
assert.match(completeHtml, /Поділися завершеним курсом/);
assert.match(completeHtml, /https:\/\/learn-portal-gamma\.vercel\.app\/courses\/high-load-architecture/);
assert.doesNotMatch(completeHtml, /value="[^"]*\/completion"/);
assert.match(completeHtml, /Поділитися в LinkedIn, відкриється нова вкладка/);

const incompleteHtml = renderToStaticMarkup(<CourseCompletionView snapshot={{ ...completeSnapshot, completedLessons:18, isComplete:false, completedAt:null }} course={course} authenticated />);
assert.doesNotMatch(incompleteHtml, /Поділися завершеним курсом/);
assert.match(incompleteHtml, /До підсумку залишилося 1 заняття/);

console.log("Completion sharing view check passed: only complete courses expose public, non-certificate share destinations.");
