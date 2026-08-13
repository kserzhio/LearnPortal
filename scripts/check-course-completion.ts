import assert from "node:assert/strict";
import { highLoadArchitectureCourse } from "../src/content/courses/high-load-architecture";
import { buildCourseCompletionSnapshot } from "../src/features/completion/completion";
import { getCourseKnowledgeCheckIds } from "../src/features/learning-support/content";

const lessonIds = highLoadArchitectureCourse.modules.flatMap((courseModule) => courseModule.lessons.map((lesson) => lesson.id));
const progress = lessonIds.map((lessonId, index) => ({
  lessonId,
  completed: true,
  completedAt: new Date(Date.UTC(2026, 7, index + 1)).toISOString(),
  updatedAt: new Date(Date.UTC(2026, 7, index + 1)).toISOString(),
}));
const knowledgeCheckIds = getCourseKnowledgeCheckIds(highLoadArchitectureCourse.id);

const incomplete = buildCourseCompletionSnapshot(highLoadArchitectureCourse, progress.slice(0, -1), knowledgeCheckIds, []);
assert.equal(incomplete.completedLessons, 18);
assert.equal(incomplete.isComplete, false, "18/19 must never create a certificate");
assert.equal(incomplete.completedAt, null);

const completed = buildCourseCompletionSnapshot(highLoadArchitectureCourse, [...progress, progress[0]], knowledgeCheckIds, [
  { checkId: knowledgeCheckIds[0], correct: false },
  { checkId: knowledgeCheckIds[0], correct: true },
  { checkId: knowledgeCheckIds[1], correct: true },
  { checkId: "unknown-check", correct: true },
]);
assert.equal(completed.completedLessons, 19, "duplicate progress must not inflate completion");
assert.equal(completed.isComplete, true);
assert.equal(completed.completedAt, progress.at(-1)?.completedAt);
assert.deepEqual(completed.knowledgeChecks, { available: 5, attempted: 2, passed: 2 });
assert.equal(completed.outcomes.length, highLoadArchitectureCourse.modules.length);

console.log("Course completion check passed: 18/19 stays incomplete, 19/19 receives a stable evidence-based completion snapshot.");
