import assert from "node:assert/strict";
import {
  compileRestrictedJavaScript,
  createJavaScriptSandbox,
} from "../src/features/kids-coding/sandbox/index.ts";

const parameter = (id, minimum, maximum, defaultValue) => ({
  id,
  label: id,
  type: "integer",
  minimum,
  maximum,
  defaultValue,
});

const command = (id, kind, parameters = []) => ({
  id,
  kind,
  label: id,
  description: `Sandbox fixture command ${id}`,
  javascriptExample: `hero.${id}();`,
  parameters,
});

const challenge = {
  id: "sandbox-challenge-01",
  levelId: "sandbox-level-01",
  contentVersion: 1,
  title: "Sandbox test",
  description: "Restricted JavaScript security fixture.",
  initialGameState: {
    grid: { columns: 5, rows: 3 },
    character: { id: "robot", position: { x: 0, y: 1 }, direction: "east" },
    obstacles: [{ id: "rock-01", kind: "rock", position: { x: 4, y: 2 } }],
    items: [{ id: "star-01", kind: "star", position: { x: 3, y: 1 } }],
    goal: { x: 3, y: 1 },
  },
  availableCommands: [
    command("move", "move-forward", [parameter("steps", 1, 5, 1)]),
    command("left", "turn-left"),
    command("right", "turn-right"),
    command("jump", "jump", [parameter("distance", 2, 3, 2)]),
    command("pick", "pick-item"),
    command("repeat", "repeat"),
    command("if", "if"),
    command("call", "call-function"),
  ],
  objective: {
    id: "collect-star",
    title: "Collect star",
    description: "Reach and collect the star.",
    expectedConditions: [
      { kind: "no-collision" },
      { kind: "character-at", position: { x: 3, y: 1 } },
      { kind: "item-collected", itemId: "star-01" },
    ],
  },
  maxRecommendedCommands: 5,
  hints: [
    { stage: 1, text: "Move east." },
    { stage: 2, text: "Use a loop or jump." },
    { stage: 3, text: "Reach x=3 and pick." },
  ],
  starCriteria: [
    { stars: 1, label: "Complete", conditions: [{ kind: "item-collected", itemId: "star-01" }] },
    { stars: 2, label: "Safe", conditions: [{ kind: "no-collision" }] },
    { stars: 3, label: "Short", conditions: [{ kind: "command-count-at-most", count: 5 }] },
  ],
  rewards: [{ id: "sandbox-stars", type: "stars", referenceId: "sandbox-challenge-01", quantity: 3 }],
};

const immediateClock = { wait: async () => undefined };

const variableProgram = compileRestrictedJavaScript(`
  const steps = 3;
  hero.move(steps);
  hero.pick();
`, challenge);
assert.equal(variableProgram.success, true);
if (!variableProgram.success) throw new Error("Valid variable program was rejected");
assert.equal(variableProgram.program.instructions[0].type, "command");
assert.deepEqual(variableProgram.program.instructions[0].arguments, { steps: 3 });

const loopProgram = compileRestrictedJavaScript(`
  for (let i = 0; i < 3; i++) {
    hero.move();
  }
  hero.pick();
`, challenge);
assert.equal(loopProgram.success, true);
if (!loopProgram.success) throw new Error("Valid loop program was rejected");
assert.equal(loopProgram.program.instructions[0].type, "repeat");
assert.equal(loopProgram.program.instructions[0].count, 3);

const structuredProgram = compileRestrictedJavaScript(`
  hero.move();
  if (hero.pathAheadClear()) {
    advance();
  } else {
    hero.turnLeft();
  }
  hero.pick();

  function advance() {
    hero.jump();
  }
`, challenge);
assert.equal(structuredProgram.success, true);
if (!structuredProgram.success) throw new Error("Valid if/function program was rejected");
assert.equal(structuredProgram.program.functions[0].id, "advance");

const sandbox = createJavaScriptSandbox({ challenge, clock: immediateClock });
const execution = await sandbox.run(`
  const distance = 3;
  hero.move(distance);
  hero.pick();
`, { stepDelayMs: 0 });
assert.equal(execution.success, true);
if (!execution.success) throw new Error("Valid source was not executed");
assert.equal(execution.result.valid, true);
assert.equal(execution.result.stars, 3);
assert.ok(execution.attempt);
assert.deepEqual(sandbox.read().game.character.position, { x: 3, y: 1 });

const securityCorpus = [
  "fetch();",
  "window.location();",
  "document.cookie();",
  "globalThis.fetch();",
  "eval();",
  "Function();",
  "new Worker();",
  "importScripts();",
  "hero['move']();",
  "hero.constructor();",
  "while (true) { hero.move(); }",
  "do { hero.move(); } while (true);",
  "for (let i = 0; i < 999; i++) { hero.move(); }",
];
for (const source of securityCorpus) {
  const compiled = compileRestrictedJavaScript(source, challenge);
  assert.equal(compiled.success, false, `Security corpus source was accepted: ${source}`);
  if (compiled.success) continue;
  assert.equal(compiled.error.valid, false);
  assert.equal(typeof compiled.error.code, "string");
  assert.equal(compiled.error.message.includes("Error"), false);
  assert.equal(compiled.error.message.includes("AST"), false);
}

const unavailableChallenge = structuredClone(challenge);
unavailableChallenge.availableCommands = unavailableChallenge.availableCommands.filter((entry) => entry.kind !== "jump");
const unavailable = compileRestrictedJavaScript("hero.jump();", unavailableChallenge);
assert.equal(unavailable.success, false);
assert.equal(unavailable.success ? "" : unavailable.error.code, "sandbox-command-unavailable");

const tooLarge = compileRestrictedJavaScript("hero.move();".repeat(20), challenge, { limits: { maxSourceLength: 40 } });
assert.equal(tooLarge.success, false);
assert.equal(tooLarge.success ? "" : tooLarge.error.code, "sandbox-source-too-large");

const tooManyTokens = compileRestrictedJavaScript("hero.move(); hero.move();", challenge, { limits: { maxTokens: 5 } });
assert.equal(tooManyTokens.success, false);
assert.equal(tooManyTokens.success ? "" : tooManyTokens.error.code, "sandbox-too-many-tokens");

const parseLimited = compileRestrictedJavaScript("hero.move();", challenge, { limits: { maxParseSteps: 2 } });
assert.equal(parseLimited.success, false);
assert.equal(parseLimited.success ? "" : parseLimited.error.code, "sandbox-parse-limit-exceeded");

const cancelledController = new AbortController();
cancelledController.abort();
const cancelledCompile = compileRestrictedJavaScript("hero.move();", challenge, { signal: cancelledController.signal });
assert.equal(cancelledCompile.success, false);
assert.equal(cancelledCompile.success ? "" : cancelledCompile.error.code, "sandbox-cancelled");

const runningSandbox = createJavaScriptSandbox({ challenge, clock: immediateClock });
let cancellationTriggered = false;
const cancelledExecution = await runningSandbox.run("hero.move(3); hero.pick();", {
  stepDelayMs: 0,
  onEvent(event) {
    if (!cancellationTriggered && event.type === "move") {
      cancellationTriggered = true;
      runningSandbox.cancel();
    }
  },
});
assert.equal(cancelledExecution.success, true);
assert.equal(cancelledExecution.success ? cancelledExecution.result.code : "", "execution-cancelled");
assert.equal(runningSandbox.read().status, "cancelled");

const timeoutClock = {
  wait(_milliseconds, signal) {
    return new Promise((resolve) => {
      signal.addEventListener("abort", resolve, { once: true });
    });
  },
};
const timeoutSandbox = createJavaScriptSandbox({ challenge, clock: timeoutClock, maxRunTimeMs: 10 });
const timedOutExecution = await timeoutSandbox.run("hero.move(3); hero.pick();");
assert.equal(timedOutExecution.success, true);
assert.equal(timedOutExecution.success ? timedOutExecution.result.code : "", "execution-time-limit-exceeded");
assert.equal(timedOutExecution.success ? timedOutExecution.attempt : "unexpected", null);

console.log("Restricted JavaScript sandbox check passed: allowed subset, execution, friendly errors, escape corpus, resource limits, cancellation and timeout.");
