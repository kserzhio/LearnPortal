import assert from "node:assert/strict";
import { getPublishedLearningPaths, learningPaths } from "../src/features/learning-paths/content/learning-path-registry";
import { buildLearningPathProgress } from "../src/features/learning-paths/progress/learning-path-progress";
import { filterPublishedLearningPaths, getAvailableLearningPathFilters, getLearningPathCourseHref, resolveLearningPathFilter } from "../src/features/learning-paths/presentation/learning-path-listing";

assert.equal(resolveLearningPathFilter("adult"), "adult");
assert.equal(resolveLearningPathFilter(["kids", "adult"]), "kids");
assert.equal(resolveLearningPathFilter("invalid"), "all");
assert.deepEqual(getAvailableLearningPathFilters(getPublishedLearningPaths()), ["adult", "kids"]);
assert.equal(filterPublishedLearningPaths("all").every((path) => path.status === "published"), true);
assert.equal(filterPublishedLearningPaths("adult").every((path) => path.audience === "adult" || path.audience === "mixed"), true);
assert.equal(filterPublishedLearningPaths("kids").every((path) => path.audience === "kids" || path.audience === "mixed"), true);

const adultPath = learningPaths.find((path) => path.id === "architecture-platform-track");
assert.ok(adultPath);
const partial = buildLearningPathProgress(adultPath, [
  { catalog: "adult", courseId: "high-load-architecture", completedUnits: 19, totalUnits: 19 },
  { catalog: "adult", courseId: "frontend-architecture", completedUnits: 0, totalUnits: 10 },
  { catalog: "adult", courseId: "platform-engineering", completedUnits: 6, totalUnits: 12 },
]);
assert.equal(partial.percent, 81, "Optional units must not affect required progress");
assert.equal(partial.completed, false);
assert.deepEqual(partial.nextCourse, { catalog: "adult", courseId: "platform-engineering" });

const requiredComplete = buildLearningPathProgress(adultPath, [
  { catalog: "adult", courseId: "high-load-architecture", completedUnits: 19, totalUnits: 19 },
  { catalog: "adult", courseId: "frontend-architecture", completedUnits: 0, totalUnits: 10 },
  { catalog: "adult", courseId: "platform-engineering", completedUnits: 12, totalUnits: 12 },
]);
assert.equal(requiredComplete.percent, 100);
assert.equal(requiredComplete.completed, true);
assert.deepEqual(requiredComplete.nextCourse, { catalog: "adult", courseId: "frontend-architecture" });

const guest = buildLearningPathProgress(getPublishedLearningPaths()[0], []);
assert.equal(guest.percent, 0);
assert.equal(guest.started, false);
assert.equal(getLearningPathCourseHref({ catalog: "adult", courseId: "high-load-architecture" }), "/courses/high-load-architecture");
assert.equal(getLearningPathCourseHref({ catalog: "kids", courseId: "robot-quest-algorithms" }), "/kids-coding/robot-quest-algorithms");

console.log("Learning Path listing check passed: published filters, required-only progress, optional next course, guest zero state and hrefs.");
