import assert from "node:assert/strict";
import { courses, getCourseLessons } from "../src/content/courses";
import { buildContinueLearningState } from "../src/lib/progress/continue-learning";

const course = courses.find((item) => item.id === "high-load-architecture");
assert(course, "High Load course must exist");
const lessons = getCourseLessons(course.id);
const date = (day: number) => new Date(Date.UTC(2026, 7, day)).toISOString();

const empty = buildContinueLearningState(course, lessons, []);
assert.equal(empty.status, "start");
assert.equal(empty.nextLesson?.position, 1);
assert.equal(empty.actionLabel, "Почати курс");

const visited = buildContinueLearningState(course, lessons, [{ lessonId: lessons[2].id, completed: false, updatedAt: date(3) }]);
assert.equal(visited.status, "continue");
assert.equal(visited.nextLesson?.position, 3);
assert.equal(visited.actionLabel, "Продовжити");

const afterCompletion = buildContinueLearningState(course, lessons, [{ lessonId: lessons[0].id, completed: true, updatedAt: date(1) }]);
assert.equal(afterCompletion.nextLesson?.position, 2);

const completed = buildContinueLearningState(course, lessons, lessons.flatMap((lesson, index) => [
  { lessonId: lesson.id, completed: true, updatedAt: date(index + 1) },
  { lessonId: lesson.id, completed: true, updatedAt: date(index + 1) },
]));
assert.equal(completed.status, "completed");
assert.equal(completed.completedLessons, 19);
assert.equal(completed.nextLesson, null);
assert.equal(completed.href, "/courses/high-load-architecture/completion");

const unknown = buildContinueLearningState(course, lessons, [{ lessonId: "unknown-lesson", completed: true, updatedAt: date(1) }]);
assert.equal(unknown.completedLessons, 0);
assert.equal(unknown.status, "start");

console.log("Continue Learning check passed: start, resume, next lesson, deduplication and completed destination are consistent.");
