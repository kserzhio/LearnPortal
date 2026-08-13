import assert from "node:assert/strict";
import {
  finalDesignComponentIds,
  finalDesignRequiredConnections,
  finalDesignRuleIds,
} from "../src/lib/simulators/final-system-design";
import {
  finalProjectCatalog,
  finalProjects,
  getCourseFinalProject,
  getFinalProjectBySlug,
  getPublishedFinalProjects,
  resolveFinalProjectValidator,
} from "../src/features/final-projects/content/final-project-registry";
import {
  defineFinalProject,
  parseFinalProject,
  parseFinalProjectJson,
  serializeFinalProject,
  type FinalProject,
} from "../src/features/final-projects/domain/final-project-model";

type MutableProjectFixture = Record<string, unknown> & {
  contentVersion: number;
  course: { courseId: string };
  builder: { version: number };
  starterScenario: {
    version: number;
    textDescription: string;
    state: Record<string, unknown>;
  };
  validator: { version: number; resultVersion: number };
};

function mutableFixture(project: FinalProject): MutableProjectFixture {
  return JSON.parse(serializeFinalProject(project)) as MutableProjectFixture;
}

assert.equal(finalProjects.length, 1);
assert.equal(getPublishedFinalProjects().length, 1);

const project = getCourseFinalProject("adult", "high-load-architecture");
assert.ok(project);
assert.equal(getFinalProjectBySlug(project.slug)?.id, project.id);
assert.equal(project.requirements.length >= 8, true);
assert.equal(project.constraints.length >= 5, true);
assert.equal(project.successCriteria.length >= 5, true);
assert.equal(project.starterScenario.textDescription.length > 0, true);
assert.equal(Object.isFrozen(project), true);
assert.equal(Object.isFrozen(project.requirements), true);
assert.equal(Object.isFrozen(project.starterScenario.state), true);

const validator = resolveFinalProjectValidator(project);
assert.ok(validator);
const starterResult = validator.validateState(project.starterScenario.state);
assert.equal(starterResult?.valid, false);
assert.equal(starterResult?.code, "db-primary-scenario-failed");
assert.deepEqual(starterResult?.score, { passed: 0, total: 15, percent: 0 });
assert.equal((starterResult?.affectedIds.length ?? 0) > 0, true);

const validState = {
  components: [...finalDesignComponentIds],
  rules: finalDesignRuleIds.map((id) => ({ id, value: id })),
  scenario: "db-primary",
  connections: [...finalDesignRequiredConnections],
};
const validResult = validator.validateState(validState);
assert.equal(validResult?.valid, true);
assert.equal(validResult?.code, "final-system-design-valid");
assert.deepEqual(validResult?.score, { passed: 15, total: 15, percent: 100 });
assert.equal(validResult?.scenarios.length, 5);
assert.equal(validResult?.scenarios.every((scenario) => scenario.passed), true);

const serialized = serializeFinalProject(project);
const reparsed = parseFinalProjectJson(serialized, finalProjectCatalog);
assert.equal(reparsed.success, true);
assert.deepEqual(reparsed.success ? reparsed.data : null, project);
assert.equal(parseFinalProjectJson("not-json", finalProjectCatalog).success, false);

const incompatible = mutableFixture(project);
incompatible.validator.version = project.contentVersion + 1;
const incompatibleResult = parseFinalProject(incompatible, finalProjectCatalog);
assert.equal(incompatibleResult.success, false);
assert.equal(incompatibleResult.success ? false : incompatibleResult.issues.some((issue) => issue.code === "incompatible-project-version"), true);
assert.equal(incompatibleResult.success ? false : incompatibleResult.issues.some((issue) => issue.code === "unknown-validator-version"), true);

const wrongResultVersion = mutableFixture(project);
wrongResultVersion.contentVersion = project.contentVersion + 1;
wrongResultVersion.starterScenario.version = project.contentVersion + 1;
wrongResultVersion.validator.version = project.contentVersion + 1;
wrongResultVersion.validator.resultVersion = 1;
const wrongResult = parseFinalProject(wrongResultVersion, finalProjectCatalog);
assert.equal(wrongResult.success, false);
assert.equal(wrongResult.success ? false : wrongResult.issues.some((issue) => issue.code === "incompatible-project-version"), true);

const wrongBuilderVersion = mutableFixture(project);
wrongBuilderVersion.builder.version = project.contentVersion + 1;
const wrongBuilderResult = parseFinalProject(wrongBuilderVersion, finalProjectCatalog);
assert.equal(wrongBuilderResult.success, false);
assert.equal(wrongBuilderResult.success ? false : wrongBuilderResult.issues.some((issue) => issue.code === "incompatible-project-version"), true);

const invalidStarter = mutableFixture(project);
invalidStarter.starterScenario.state.scenario = "unknown-failure";
const invalidStarterResult = parseFinalProject(invalidStarter, finalProjectCatalog);
assert.equal(invalidStarterResult.success, false);
assert.equal(invalidStarterResult.success ? false : invalidStarterResult.issues.some((issue) => issue.code === "invalid-starter-state"), true);

const unknownCourse = mutableFixture(project);
unknownCourse.course.courseId = "missing-course";
const unknownCourseResult = parseFinalProject(unknownCourse, finalProjectCatalog);
assert.equal(unknownCourseResult.success, false);
assert.equal(unknownCourseResult.success ? false : unknownCourseResult.issues.some((issue) => issue.code === "unknown-course"), true);

const executableState = mutableFixture(project);
executableState.starterScenario.state = { callback: () => true };
const executableResult = parseFinalProject(executableState, finalProjectCatalog);
assert.equal(executableResult.success, false);
assert.equal(executableResult.success ? false : executableResult.issues.some((issue) => issue.code === "non-json-state"), true);

const inaccessibleVisual = mutableFixture(project);
inaccessibleVisual.starterScenario.textDescription = "";
const inaccessibleResult = parseFinalProject(inaccessibleVisual, finalProjectCatalog);
assert.equal(inaccessibleResult.success, false);
assert.equal(inaccessibleResult.success ? false : inaccessibleResult.issues.some((issue) => issue.path === "$.starterScenario.textDescription"), true);

assert.throws(() => defineFinalProject(incompatible, finalProjectCatalog), /Project, builder, starter scenario, validator/);

console.log("Final Project model check passed: High Load fixture, safe state, version binding, structured results and JSON round-trip.");
