import assert from "node:assert/strict";
import { learningPaths } from "../src/features/learning-paths/content/learning-path-registry";
import { buildLearningPathStepViews, getCurrentLearningPathStep, getLearningPathCoursePresentation } from "../src/features/learning-paths/presentation";

const path = learningPaths.find((entry) => entry.id === "architecture-platform-track");
assert.ok(path);
const partial = buildLearningPathStepViews(path, [
  { catalog: "adult", courseId: "high-load-architecture", completedUnits: 19, totalUnits: 19 },
  { catalog: "adult", courseId: "frontend-architecture", completedUnits: 0, totalUnits: 10 },
  { catalog: "adult", courseId: "platform-engineering", completedUnits: 4, totalUnits: 12 },
]);
assert.deepEqual(partial.map((entry) => entry.status), ["completed", "upcoming", "current"]);
assert.equal(getCurrentLearningPathStep(partial)?.step.id, "platform-engineering-core", "Optional course must not block the next required step");
assert.equal(partial[1].step.requirement, "optional");
const requiredComplete = buildLearningPathStepViews(path, [
  { catalog: "adult", courseId: "high-load-architecture", completedUnits: 19, totalUnits: 19 },
  { catalog: "adult", courseId: "frontend-architecture", completedUnits: 0, totalUnits: 10 },
  { catalog: "adult", courseId: "platform-engineering", completedUnits: 12, totalUnits: 12 },
]);
assert.equal(getCurrentLearningPathStep(requiredComplete)?.step.id, "frontend-architecture-option");
assert.ok(getLearningPathCoursePresentation({ catalog: "adult", courseId: "high-load-architecture" }));
assert.ok(getLearningPathCoursePresentation({ catalog: "kids", courseId: "robot-quest-algorithms" }));
console.log("Learning Path detail check passed: ordered states, non-blocking optional step, optional follow-up and catalog presentation.");
