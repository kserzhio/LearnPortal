import assert from "node:assert/strict";
import { kidsCourses } from "../src/features/kids-coding/content/course-registry.ts";
import { createGameExecutionEngine, KIDS_PROGRAM_SCHEMA, KIDS_PROGRAM_SCHEMA_VERSION } from "../src/features/kids-coding/engine/index.ts";
import { BrowserKidsProgressStore } from "../src/features/kids-coding/progress/browser-progress-store.ts";
import { createFriendlyFeedback } from "../src/features/kids-coding/support/feedback.ts";

const course = kidsCourses.find((entry) => entry.id === "robot-quest-algorithms");
assert.ok(course, "Algorithms course must exist.");
const world = course.worlds.find((entry) => entry.id === "village");
assert.ok(world, "Algorithms Village must exist.");
assert.equal(world.levels.length, 5);

const command = (id, commandId, args = {}) => ({ id, type: "command", commandId, arguments: args });
const repeat = (id, count) => ({
  id,
  type: "repeat",
  commandId: "repeat",
  count,
  body: [command(`${id}-move`, "move", { steps: 1 })],
});
const program = (instructions) => ({
  schema: KIDS_PROGRAM_SCHEMA,
  schemaVersion: KIDS_PROGRAM_SCHEMA_VERSION,
  instructions,
  functions: [],
});

const solutions = new Map([
  ["robot-village-01", {
    valid: program([command("move-one", "move", { steps: 1 })]),
    invalid: program([]),
  }],
  ["robot-village-02", {
    valid: program([command("move-three", "move", { steps: 3 })]),
    invalid: program([command("move-two", "move", { steps: 2 })]),
  }],
  ["robot-village-03", {
    valid: program([command("turn-south", "turn-right"), command("move-south", "move", { steps: 1 })]),
    invalid: program([command("turn-north", "turn-left"), command("leave-board", "move", { steps: 1 })]),
  }],
  ["robot-village-04", {
    valid: program([
      command("turn-north", "turn-left"),
      command("move-north", "move", { steps: 1 }),
      command("turn-east", "turn-right"),
      command("move-east", "move", { steps: 2 }),
    ]),
    invalid: program([command("hit-rock", "move", { steps: 1 })]),
  }],
  ["robot-village-05", {
    valid: program([repeat("repeat-four", 4)]),
    invalid: program([repeat("repeat-three", 3)]),
  }],
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
const now = "2026-08-11T12:00:00.000Z";

for (const [index, level] of world.levels.entries()) {
  const fixture = solutions.get(level.id);
  assert.ok(fixture, `Missing fixture for ${level.id}.`);
  assert.deepEqual(level.challenge.hints.map((hint) => hint.stage), [1, 2, 3]);

  const invalidEngine = createGameExecutionEngine({ challenge: level.challenge, clock: { wait: async () => undefined } });
  invalidEngine.load(fixture.invalid);
  const invalidResult = await invalidEngine.run({ stepDelayMs: 0 });
  assert.equal(invalidResult.valid, false, `${level.id} must have a meaningful invalid path.`);
  const friendly = createFriendlyFeedback(invalidResult);
  assert.equal(friendly.tone, "try-again");
  assert.equal(/SyntaxError|TypeError|AST/i.test(`${friendly.title} ${friendly.message} ${friendly.nextStep}`), false);

  const engine = createGameExecutionEngine({ challenge: level.challenge, clock: { wait: async () => undefined } });
  assert.equal(engine.load(fixture.valid).status, "ready");
  const result = await engine.run({ stepDelayMs: 0 });
  assert.equal(result.valid, true, `${level.id} valid fixture must reach the goal.`);
  assert.equal(result.stars, 3, `${level.id} intended solution must earn three stars.`);
  const serialized = engine.serializeAttempt();
  assert.ok(serialized);
  await store.recordAttempt({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    courseId: course.id,
    worldId: world.id,
    levelId: level.id,
    createdAt: now,
    attempt: serialized,
  });
}

const persisted = await store.loadCourse(course.id);
assert.equal(persisted.levels.filter((level) => level.completed).length, 5);
assert.equal(persisted.levels.reduce((total, level) => total + level.stars, 0), 15);
assert.deepEqual(persisted.completedWorldIds, [world.id]);
assert.equal(persisted.attempts.length, 5);
assert.deepEqual(await store.loadCourse(course.id), persisted);

console.log("Algorithms vertical slice checks passed: five valid paths, five invalid paths, progressive hints, friendly feedback, 15 stars and persistent world completion.");
