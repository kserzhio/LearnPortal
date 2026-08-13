import assert from "node:assert/strict";
import { learningPathCourseCatalog, learningPaths, getCourseLearningPaths, getPublishedLearningPaths } from "../src/features/learning-paths/content/learning-path-registry";
import { defineLearningPath, parseLearningPath, parseLearningPathJson, serializeLearningPath } from "../src/features/learning-paths/domain/learning-path-model";

type MutablePathFixture = {
  schemaVersion: number;
  steps: Array<{
    position: number;
    course: { catalog: string; courseId: string };
  }>;
  [key: string]: unknown;
};

function mutableFixture(path: Parameters<typeof serializeLearningPath>[0]) {
  return JSON.parse(serializeLearningPath(path)) as MutablePathFixture;
}

assert.equal(learningPaths.length, 3);
assert.equal(getPublishedLearningPaths().length, 2);
assert.equal(learningPaths.some((path) => path.audience === "adult"), true);
assert.equal(learningPaths.some((path) => path.audience === "kids"), true);
assert.equal(getCourseLearningPaths("adult", "high-load-architecture").length, 2, "One course may belong to multiple paths");

const optionalPath = learningPaths.find((path) => path.id === "architecture-platform-track");
assert.ok(optionalPath);
assert.deepEqual(optionalPath.steps.map((step) => step.position), [1, 2, 3]);
assert.equal(optionalPath.steps[1].requirement, "optional");
assert.equal(Object.isFrozen(optionalPath), true);
assert.equal(Object.isFrozen(optionalPath.steps), true);

const serialized = serializeLearningPath(optionalPath);
const reparsed = parseLearningPathJson(serialized, learningPathCourseCatalog);
assert.equal(reparsed.success, true);
assert.deepEqual(reparsed.success ? reparsed.data : null, optionalPath);
assert.equal(parseLearningPathJson("not-json", learningPathCourseCatalog).success, false);

const unknownCourse = mutableFixture(optionalPath);
unknownCourse.steps[0].course.courseId = "missing-course";
const unknownCourseResult = parseLearningPath(unknownCourse, learningPathCourseCatalog);
assert.equal(unknownCourseResult.success, false);
assert.equal(unknownCourseResult.success ? false : unknownCourseResult.issues.some((issue) => issue.code === "unknown-course"), true);

const invalidOrder = mutableFixture(optionalPath);
invalidOrder.steps[1].position = 3;
assert.equal(parseLearningPath(invalidOrder, learningPathCourseCatalog).success, false);

const wrongAudience = mutableFixture(optionalPath);
wrongAudience.steps[0].course = { catalog: "kids", courseId: "robot-quest-algorithms" };
const wrongAudienceResult = parseLearningPath(wrongAudience, learningPathCourseCatalog);
assert.equal(wrongAudienceResult.success, false);
assert.equal(wrongAudienceResult.success ? false : wrongAudienceResult.issues.some((issue) => issue.code === "audience-course-mismatch"), true);

const duplicateReference = mutableFixture(optionalPath);
duplicateReference.steps[1].course = structuredClone(duplicateReference.steps[0].course);
const duplicateResult = parseLearningPath(duplicateReference, learningPathCourseCatalog);
assert.equal(duplicateResult.success, false);
assert.equal(duplicateResult.success ? false : duplicateResult.issues.some((issue) => issue.code === "duplicate-course-reference"), true);

const unsupported = { ...mutableFixture(optionalPath), schemaVersion: 2, hiddenRanking: 100 };
const unsupportedResult = parseLearningPath(unsupported, learningPathCourseCatalog);
assert.equal(unsupportedResult.success, false);
assert.deepEqual(
  unsupportedResult.success ? [] : ["unsupported-schema-version", "unknown-field"].map((code) => unsupportedResult.issues.some((issue) => issue.code === code)),
  [true, true],
);
assert.throws(() => defineLearningPath(unsupported, learningPathCourseCatalog), /schema version 1/);

console.log("Learning Path model check passed: adult/kids fixtures, shared courses, optional order, JSON round-trip and invalid references.");
