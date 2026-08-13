import assert from "node:assert/strict";
import {
  KIDS_PROGRAM_SCHEMA,
  KIDS_PROGRAM_SCHEMA_VERSION,
  createGameExecutionEngine,
} from "../src/features/kids-coding/engine/index.ts";

const parameter = (id, label, minimum, maximum, defaultValue) => ({
  id,
  label,
  type: "integer",
  minimum,
  maximum,
  defaultValue,
});

const command = (id, kind, parameters = []) => ({
  id,
  kind,
  label: id,
  description: `Test command: ${id}`,
  javascriptExample: `hero.${id}();`,
  parameters,
});

const challenge = {
  id: "engine-challenge-01",
  levelId: "engine-level-01",
  contentVersion: 1,
  title: "Engine test",
  description: "Deterministic execution fixture.",
  initialGameState: {
    grid: { columns: 5, rows: 3 },
    character: { id: "robot", position: { x: 0, y: 1 }, direction: "east" },
    obstacles: [{ id: "rock-01", kind: "rock", position: { x: 4, y: 2 } }],
    items: [{ id: "star-01", kind: "star", position: { x: 3, y: 1 } }],
    goal: { x: 3, y: 1 },
  },
  availableCommands: [
    command("move", "move-forward", [parameter("steps", "Steps", 1, 5, 1)]),
    command("turn-left", "turn-left"),
    command("turn-right", "turn-right"),
    command("jump", "jump", [parameter("distance", "Distance", 2, 3, 2)]),
    command("pick", "pick-item"),
    command("repeat", "repeat"),
    command("if", "if"),
    command("call", "call-function"),
  ],
  objective: {
    id: "collect-star",
    title: "Collect the star",
    description: "Reach the star without a collision and pick it up.",
    expectedConditions: [
      { kind: "no-collision" },
      { kind: "character-at", position: { x: 3, y: 1 } },
      { kind: "item-collected", itemId: "star-01" },
    ],
  },
  maxRecommendedCommands: 6,
  hints: [
    { stage: 1, text: "Move east." },
    { stage: 2, text: "Try a jump." },
    { stage: 3, text: "Move, jump and pick." },
  ],
  starCriteria: [
    { stars: 1, label: "Complete", conditions: [{ kind: "item-collected", itemId: "star-01" }] },
    { stars: 2, label: "Safe", conditions: [{ kind: "no-collision" }] },
    { stars: 3, label: "Use repeat", conditions: [{ kind: "command-used", commandId: "repeat", minimumCount: 1 }] },
  ],
  rewards: [{ id: "engine-stars", type: "stars", referenceId: "engine-challenge-01", quantity: 3 }],
};

const immediateClock = { wait: async () => undefined };
const program = {
  schema: KIDS_PROGRAM_SCHEMA,
  schemaVersion: KIDS_PROGRAM_SCHEMA_VERSION,
  instructions: [
    {
      id: "repeat-once",
      type: "repeat",
      commandId: "repeat",
      count: 1,
      body: [{ id: "move-once", type: "command", commandId: "move", arguments: { steps: 1 } }],
    },
    {
      id: "check-path",
      type: "if",
      commandId: "if",
      predicate: { kind: "path-ahead-clear" },
      then: [{ id: "call-advance", type: "call-function", commandId: "call", functionId: "advance" }],
      else: [],
    },
    { id: "pick-star", type: "command", commandId: "pick", arguments: {} },
  ],
  functions: [{
    id: "advance",
    instructions: [{ id: "jump-two", type: "command", commandId: "jump", arguments: { distance: 2 } }],
  }],
};

const engine = createGameExecutionEngine({ challenge, clock: immediateClock });
assert.equal(engine.read().status, "idle");
assert.equal(engine.load(program).status, "ready");

const firstEvents = [];
const firstResult = await engine.run({ stepDelayMs: 0, onEvent: (event) => firstEvents.push(event) });
assert.equal(firstResult.valid, true);
assert.equal(firstResult.stars, 3);
assert.deepEqual(engine.read().game.character.position, { x: 3, y: 1 });
assert.deepEqual(engine.read().game.collectedItemIds, ["star-01"]);
assert.deepEqual(
  ["repeat-iteration", "move", "condition", "function-call", "jump", "pick-item", "completed"].every((type) => (
    firstEvents.some((event) => event.type === type)
  )),
  true,
);

const attempt = engine.serializeAttempt();
assert.ok(attempt);
assert.equal(attempt.schema, "systema.kids-level-attempt");
assert.deepEqual(JSON.parse(JSON.stringify(attempt)), attempt);

engine.reset();
assert.equal(engine.read().status, "ready");
assert.deepEqual(engine.read().game.character.position, { x: 0, y: 1 });
const secondEvents = [];
const secondResult = await engine.run({ stepDelayMs: 0, onEvent: (event) => secondEvents.push(event) });
assert.deepEqual(secondResult, firstResult);
assert.deepEqual(secondEvents, firstEvents);

const multiStepProgram = {
  ...program,
  instructions: [
    { id: "move-three", type: "command", commandId: "move", arguments: { steps: 3 } },
    { id: "pick-after-move", type: "command", commandId: "pick", arguments: {} },
  ],
  functions: [],
};
const multiStepEngine = createGameExecutionEngine({ challenge, clock: immediateClock });
multiStepEngine.load(multiStepProgram);
const multiStepEvents = [];
assert.equal((await multiStepEngine.run({ stepDelayMs: 0, onEvent: (event) => multiStepEvents.push(event) })).valid, true);
assert.equal(multiStepEvents.filter((event) => event.type === "move").length, 3);

const collisionProgram = {
  ...program,
  instructions: [
    { id: "face-north", type: "command", commandId: "turn-left", arguments: {} },
    { id: "leave-board", type: "command", commandId: "move", arguments: { steps: 2 } },
  ],
  functions: [],
};
const collisionEngine = createGameExecutionEngine({ challenge, clock: immediateClock });
collisionEngine.load(collisionProgram);
const collisionResult = await collisionEngine.run({ stepDelayMs: 0 });
assert.equal(collisionResult.valid, false);
assert.equal(collisionResult.code, "collision-detected");
assert.equal(collisionEngine.read().game.collisionCount, 1);

const rightTurnProgram = {
  ...program,
  instructions: [{ id: "face-south", type: "command", commandId: "turn-right", arguments: {} }],
  functions: [],
};
const rightTurnEngine = createGameExecutionEngine({ challenge, clock: immediateClock });
rightTurnEngine.load(rightTurnProgram);
await rightTurnEngine.run({ stepDelayMs: 0 });
assert.equal(rightTurnEngine.read().game.character.direction, "south");

const invalidProgram = structuredClone(program);
invalidProgram.instructions[0].body[0].commandId = "teleport";
const invalidSnapshot = createGameExecutionEngine({ challenge, clock: immediateClock }).load(invalidProgram);
assert.equal(invalidSnapshot.status, "invalid");
assert.equal(invalidSnapshot.programIssues.some((issue) => issue.code === "program-command-unavailable"), true);

const pauseEngine = createGameExecutionEngine({ challenge, clock: immediateClock });
pauseEngine.load(multiStepProgram);
let paused = false;
let confirmPaused;
const pausedReached = new Promise((resolve) => {
  confirmPaused = resolve;
});
const pausedRun = pauseEngine.run({
  stepDelayMs: 0,
  onEvent(event) {
    if (!paused && event.type === "move") {
      paused = true;
      assert.equal(pauseEngine.pause(), true);
      confirmPaused();
    }
  },
});
await pausedReached;
assert.equal(pauseEngine.read().status, "paused");
assert.equal(pauseEngine.resume(), true);
assert.equal((await pausedRun).valid, true);

const cancelEngine = createGameExecutionEngine({ challenge, clock: immediateClock });
cancelEngine.load(multiStepProgram);
let cancelled = false;
const cancelledRun = cancelEngine.run({
  stepDelayMs: 0,
  onEvent(event) {
    if (!cancelled && event.type === "move") {
      cancelled = true;
      assert.equal(cancelEngine.cancel(), true);
    }
  },
});
assert.equal((await cancelledRun).code, "execution-cancelled");
assert.equal(cancelEngine.read().status, "cancelled");

const resetEngine = createGameExecutionEngine({ challenge, clock: immediateClock });
resetEngine.load(multiStepProgram);
let resetTriggered = false;
const interruptedRun = resetEngine.run({
  stepDelayMs: 0,
  onEvent(event) {
    if (!resetTriggered && event.type === "move") {
      resetTriggered = true;
      resetEngine.pause();
      resetEngine.reset();
    }
  },
});
assert.equal((await interruptedRun).code, "execution-cancelled");
assert.equal(resetEngine.read().status, "ready");
assert.deepEqual(resetEngine.read().game.character.position, { x: 0, y: 1 });

const exposedState = engine.read();
exposedState.game.character.position.x = 99;
assert.notEqual(engine.read().game.character.position.x, 99);

console.log("Kids game engine check passed: deterministic success, multi-step events, collision, invalid program, pause/resume, cancel, reset and serialization.");
