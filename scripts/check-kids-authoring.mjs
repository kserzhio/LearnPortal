import assert from "node:assert/strict";
import { authorKidsCourse, KidsAuthoringError, spaceLogicLabDraft, spaceLogicLabPreview } from "../src/features/kids-coding/authoring/index.ts";
import { createGameExecutionEngine } from "../src/features/kids-coding/engine/index.ts";

const { course, previews } = spaceLogicLabPreview;
assert.equal(course.id, "space-logic-lab");
assert.equal(course.status, "draft");
assert.equal(course.worlds.length, 1);
assert.equal(course.worlds[0].levels.length, 1);

for (const world of course.worlds) {
  for (const level of world.levels) {
    const fixture = previews.get(level.id);
    assert.ok(fixture, `Missing preview fixture for ${level.id}`);
    const successEngine = createGameExecutionEngine({ challenge: level.challenge, clock: { wait: async () => undefined } });
    assert.equal(successEngine.load(fixture.expectedSuccess).status, "ready");
    assert.equal((await successEngine.run({ stepDelayMs: 0 })).valid, true, `${level.id} success fixture must pass.`);
    const failureEngine = createGameExecutionEngine({ challenge: level.challenge, clock: { wait: async () => undefined } });
    assert.equal(failureEngine.load(fixture.expectedFailure).status, "ready");
    assert.equal((await failureEngine.run({ stepDelayMs: 0 })).valid, false, `${level.id} failure fixture must fail meaningfully.`);
  }
}

const broken = structuredClone(spaceLogicLabDraft);
broken.worlds[0].levels[0].hints.strongerClue = broken.worlds[0].levels[0].hints.conceptual;
broken.worlds[0].levels[0].commandIds = ["unknown-command"];
broken.worlds[0].levels[0].intendedCommandId = "repeat";
broken.worlds[0].levels[0].rewards = [];
assert.throws(
  () => authorKidsCourse(broken),
  (error) => error instanceof KidsAuthoringError
    && ["duplicate-progressive-hint", "unknown-command", "missing-intended-command", "missing-reward"].every((code) => error.issues.some((issue) => issue.code === code)),
);

const scalable = structuredClone(spaceLogicLabDraft);
scalable.id = "authoring-scale-check";
const baseLevel = scalable.worlds[0].levels[0];
scalable.worlds[0].levels = Array.from({ length: 55 }, (_, index) => ({
  ...structuredClone(baseLevel),
  id: `scale-orbit-${String(index + 1).padStart(2, "0")}`,
  position: index + 1,
  title: `Орбітальний сигнал ${index + 1}`,
  rewards: [{ id: `scale-orbit-${String(index + 1).padStart(2, "0")}-badge`, type: "badge", referenceId: "signal-pilot", quantity: 1 }],
}));
const scalableCourse = authorKidsCourse(scalable);
assert.equal(scalableCourse.course.worlds[0].levels.length, 55, "Authoring compiler must support a 50+ level course without application branches.");
assert.equal(scalableCourse.previews.size, 55);

console.log("Kids authoring check passed: configuration-only demo course, 55-level scale fixture, domain compilation, success/failure previews and content guardrails.");
