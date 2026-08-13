import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getKidsChallenge, getKidsCourse, kidsCourses } from "../src/features/kids-coding/content/index.ts";
import {
  KIDS_PROGRAM_SCHEMA,
  KIDS_PROGRAM_SCHEMA_VERSION,
  createGameExecutionEngine,
} from "../src/features/kids-coding/engine/index.ts";
import {
  BrowserKidsProgressStore,
  createEmptyKidsProgress,
  mergeKidsProgressBundles,
  parseKidsProgressBundle,
  recordKidsAttempt,
  recordKidsUnlock,
} from "../src/features/kids-coding/progress/index.ts";

const courseId = "robot-quest-algorithms";
const worldId = "village";
const course = getKidsCourse(courseId);
assert.ok(course);
assert.equal(kidsCourses.length, 2);
assert.equal(course.worlds[0].levels.length, 5);

const catalog = {
  courseId,
  worlds: course.worlds.map((world) => ({
    id: world.id,
    position: world.position,
    levelIds: world.levels.map((level) => level.id),
  })),
};

const command = (id, commandId, args = {}) => ({ id, type: "command", commandId, arguments: args });
const program = (instructions) => ({
  schema: KIDS_PROGRAM_SCHEMA,
  schemaVersion: KIDS_PROGRAM_SCHEMA_VERSION,
  instructions,
  functions: [],
});

const solutions = {
  "robot-village-01": program([command("move-one", "move", { steps: 1 })]),
  "robot-village-02": program([command("move-three", "move", { steps: 3 })]),
  "robot-village-03": program([
    command("turn-south", "turn-right"),
    command("move-south", "move", { steps: 1 }),
  ]),
  "robot-village-04": program([
    command("turn-north", "turn-left"),
    command("move-north", "move", { steps: 1 }),
    command("turn-east", "turn-right"),
    command("move-east", "move", { steps: 2 }),
  ]),
  "robot-village-05": {
    schema: KIDS_PROGRAM_SCHEMA,
    schemaVersion: KIDS_PROGRAM_SCHEMA_VERSION,
    instructions: [{
      id: "repeat-four",
      type: "repeat",
      commandId: "repeat",
      count: 4,
      body: [command("move-in-loop", "move", { steps: 1 })],
    }],
    functions: [],
  },
};

const attemptIds = [
  "10000000-0000-4000-8000-000000000001",
  "10000000-0000-4000-8000-000000000002",
  "10000000-0000-4000-8000-000000000003",
  "10000000-0000-4000-8000-000000000004",
  "10000000-0000-4000-8000-000000000005",
  "10000000-0000-4000-8000-000000000006",
  "10000000-0000-4000-8000-000000000007",
];

async function makeAttempt(levelId, sourceProgram, id, minute) {
  const challenge = getKidsChallenge(courseId, worldId, levelId);
  assert.ok(challenge);
  const engine = createGameExecutionEngine({ challenge });
  assert.equal(engine.load(sourceProgram).status, "ready");
  await engine.run({ stepDelayMs: 0 });
  const serialized = engine.serializeAttempt();
  assert.ok(serialized);
  return {
    id,
    courseId,
    worldId,
    levelId,
    createdAt: `2026-08-11T10:${String(minute).padStart(2, "0")}:00.000Z`,
    attempt: serialized,
  };
}

const compactAttempt = await makeAttempt("robot-village-02", solutions["robot-village-02"], attemptIds[0], 1);
assert.equal(compactAttempt.attempt.result.valid, true);
assert.equal(compactAttempt.attempt.result.stars, 3);

const verboseProgram = program([
  command("step-one", "move", { steps: 1 }),
  command("step-two", "move", { steps: 1 }),
  command("step-three", "move", { steps: 1 }),
]);
const verboseAttempt = await makeAttempt("robot-village-02", verboseProgram, attemptIds[1], 2);

let partial = createEmptyKidsProgress(courseId);
partial = recordKidsAttempt(partial, verboseAttempt, catalog);
partial = recordKidsAttempt(partial, compactAttempt, catalog);
partial = recordKidsUnlock(partial, { kind: "world", referenceId: worldId, unlockedAt: "2026-08-11T10:00:00.000Z" }, catalog);
assert.equal(partial.levels[0].completed, true);
assert.equal(partial.levels[0].attemptCount, 2);
assert.equal(partial.levels[0].stars, 3);
assert.equal(partial.levels[0].bestSolution.commandCount, 1);
assert.equal(partial.levels[0].bestSolution.attemptId, compactAttempt.id);

const duplicateMerge = mergeKidsProgressBundles(partial, partial, catalog);
assert.equal(duplicateMerge.levels[0].attemptCount, 2);
assert.equal(duplicateMerge.attempts.length, 2);
assert.deepEqual(duplicateMerge.unlocks, partial.unlocks);

let complete = createEmptyKidsProgress(courseId);
for (const [index, level] of course.worlds[0].levels.entries()) {
  const levelAttempt = level.id === "robot-village-02"
    ? compactAttempt
    : await makeAttempt(level.id, solutions[level.id], attemptIds[index + 2], index + 3);
  assert.equal(levelAttempt.attempt.result.valid, true, `${level.id} fixture must complete`);
  complete = recordKidsAttempt(complete, levelAttempt, catalog);
}
assert.equal(complete.levels.filter((level) => level.completed).length, 5);
assert.deepEqual(complete.completedWorldIds, [worldId]);

const merged = mergeKidsProgressBundles(partial, complete, catalog);
assert.equal(merged.levels.length, 5);
assert.deepEqual(merged.completedWorldIds, [worldId]);
assert.equal(merged.levels.find((level) => level.levelId === "robot-village-02").attemptCount, 2);
assert.equal(merged.levels.find((level) => level.levelId === "robot-village-02").bestSolution.attemptId, compactAttempt.id);

const parsed = parseKidsProgressBundle(JSON.parse(JSON.stringify(merged)), catalog);
assert.equal(parsed.success, true);
const tampered = structuredClone(merged);
tampered.attempts[0].attempt.program.instructions[0].type = "execute-host-code";
const rejected = parseKidsProgressBundle(tampered, catalog);
assert.equal(rejected.success, false);
assert.equal(rejected.success ? false : rejected.issues.some((issue) => issue.code === "kids-attempt-invalid"), true);

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

const memory = new MemoryStorage();
const store = new BrowserKidsProgressStore(memory, new Map([[courseId, catalog]]));
await store.recordAttempt(compactAttempt);
await store.recordUnlock(courseId, { kind: "world", referenceId: worldId, unlockedAt: "2026-08-11T10:00:00.000Z" });
assert.equal((await store.loadCourse(courseId)).levels[0].stars, 3);
const synchronized = await store.mergeCourse(complete);
assert.deepEqual(synchronized.completedWorldIds, [worldId]);
assert.equal((await store.mergeCourse(complete)).attempts.length, synchronized.attempts.length);

memory.setItem("systema-kids-progress-v1", "not-json");
assert.equal((await store.loadCourse(courseId)).attempts.length, 0);

const migration = await readFile(new URL("../supabase/migrations/202608110001_kids_coding_progress.sql", import.meta.url), "utf8");
for (const requiredFragment of [
  "alter table public.kids_level_progress enable row level security",
  "Users read own Kids level progress",
  "Users insert own Kids attempts",
  "after insert on public.kids_level_attempts",
  "greatest(kids_level_progress.stars, excluded.stars)",
  "claim_kids_world_unlock",
  "revoke all on function public.claim_kids_world_unlock(text, text) from anon",
]) assert.equal(migration.includes(requiredFragment), true, `Migration must include: ${requiredFragment}`);

console.log("Kids progress check passed: course registry, validated attempts, best solution, idempotent monotonic merge, world completion, guest storage and RLS migration guards.");
