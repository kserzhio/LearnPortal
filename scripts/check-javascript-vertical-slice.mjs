import assert from "node:assert/strict";
import { kidsCourses } from "../src/features/kids-coding/content/course-registry.ts";
import { BrowserKidsProgressStore } from "../src/features/kids-coding/progress/browser-progress-store.ts";
import { compileRestrictedJavaScript, createJavaScriptSandbox } from "../src/features/kids-coding/sandbox/index.ts";
import { createFriendlyFeedback } from "../src/features/kids-coding/support/feedback.ts";

const course = kidsCourses.find((entry) => entry.id === "code-adventure-javascript");
assert.ok(course, "JavaScript course must exist.");
const world = course.worlds.find((entry) => entry.id === "village");
assert.ok(world, "JavaScript Village must exist.");
assert.equal(world.levels.length, 5);

const fixtures = new Map([
  ["code-village-01", { valid: "hero.move();", invalid: "hero.move(2);" }],
  ["code-village-02", { valid: "hero.move(3);", invalid: "hero.move(2);" }],
  ["code-village-03", { valid: "hero.jump();", invalid: "hero.move();" }],
  ["code-village-04", { valid: "const steps = 3;\nhero.move(steps);", invalid: "const steps = 2;\nhero.move(steps);" }],
  ["code-village-05", { valid: "for (let i = 0; i < 4; i++) {\n  hero.move();\n}", invalid: "for (let i = 0; i < 3; i++) {\n  hero.move();\n}" }],
]);

const storageValues = new Map();
const storage = {
  getItem: (key) => storageValues.get(key) ?? null,
  setItem: (key, value) => storageValues.set(key, value),
};
const catalog = {
  courseId: course.id,
  worlds: course.worlds.map((entry) => ({ id: entry.id, position: entry.position, levelIds: entry.levels.map((level) => level.id) })),
};
const store = new BrowserKidsProgressStore(storage, new Map([[course.id, catalog]]));

const malformed = compileRestrictedJavaScript("hero.move(", world.levels[0].challenge);
assert.equal(malformed.success, false);
assert.ok(!malformed.success && malformed.error.location);
assert.equal(!malformed.success ? createFriendlyFeedback(malformed.error).tone : "unexpected", "try-again");
assert.equal(!malformed.success ? createFriendlyFeedback(malformed.error).title : "", "Додай число");

for (const [index, level] of world.levels.entries()) {
  const fixture = fixtures.get(level.id);
  assert.ok(fixture, `Missing fixture for ${level.id}.`);
  assert.equal(typeof level.starterCode, "string", `${level.id} needs data-driven starter code.`);
  assert.equal(compileRestrictedJavaScript(level.starterCode, level.challenge).success, true, `${level.id} starter code must compile.`);
  assert.deepEqual(level.challenge.hints.map((hint) => hint.stage), [1, 2, 3]);

  const invalidSandbox = createJavaScriptSandbox({ challenge: level.challenge, clock: { wait: async () => undefined } });
  const invalidExecution = await invalidSandbox.run(fixture.invalid, { stepDelayMs: 0 });
  assert.equal(invalidExecution.success, true, `${level.id} learning error must compile.`);
  assert.equal(invalidExecution.success ? invalidExecution.result.valid : true, false, `${level.id} needs a meaningful invalid result.`);
  if (invalidExecution.success) {
    const friendly = createFriendlyFeedback(invalidExecution.result);
    assert.equal(friendly.tone, "try-again");
    assert.equal(/SyntaxError|TypeError|AST/i.test(`${friendly.title} ${friendly.message} ${friendly.nextStep}`), false);
  }

  const blocked = compileRestrictedJavaScript("window.location();", level.challenge);
  assert.equal(blocked.success, false, `${level.id} must reject browser globals.`);
  assert.equal(blocked.success ? "" : blocked.error.code, "sandbox-api-forbidden");

  const sandbox = createJavaScriptSandbox({ challenge: level.challenge, clock: { wait: async () => undefined } });
  const execution = await sandbox.run(fixture.valid, { stepDelayMs: 0 });
  assert.equal(execution.success, true, `${level.id} valid source must compile and run.`);
  assert.equal(execution.success ? execution.result.valid : false, true, `${level.id} must reach the goal.`);
  assert.equal(execution.success ? execution.result.stars : 0, 3, `${level.id} intended source must earn three stars.`);
  assert.ok(execution.success && execution.attempt);
  if (!execution.success || !execution.attempt) continue;
  await store.recordAttempt({
    id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    courseId: course.id,
    worldId: world.id,
    levelId: level.id,
    createdAt: "2026-08-11T13:00:00.000Z",
    attempt: execution.attempt,
  });
}

const persisted = await store.loadCourse(course.id);
assert.equal(persisted.levels.filter((level) => level.completed).length, 5);
assert.equal(persisted.levels.reduce((total, level) => total + level.stars, 0), 15);
assert.deepEqual(persisted.completedWorldIds, [world.id]);
assert.equal(persisted.attempts.length, 5);

console.log("JavaScript vertical slice checks passed: five safe programs, five learning errors, browser-global rejection, data-driven starter code, 15 stars and persistent completion.");
