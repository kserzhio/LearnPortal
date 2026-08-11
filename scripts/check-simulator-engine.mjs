import assert from "node:assert/strict";
import { createSimulatorEngine } from "../public/legacy/runtime/core/simulator-engine.js";
import { validationResult } from "../public/legacy/runtime/validators/validation-result.js";

const renders = [];
const validations = [];
const attempts = [];

const engine = createSimulatorEngine({
  createInitialState: () => ({ components: [] }),
  cloneState: (state) => ({ components: [...state.components] }),
  serialize: (state) => ({ version: 1, components: [...state.components] }),
  validate: (state) => state.components.includes("replica")
    ? validationResult(true, "high-availability-valid", "Replica закриває database failure domain.")
    : validationResult(false, "replica-missing", "Додай replica для автоматичного failover.", ["database"]),
  render: (state) => renders.push(state.components.join(",")),
  renderValidation: (result) => validations.push(result.code),
  resetValidation: () => validations.push("not-validated"),
  recordAttempt: (state, result) => attempts.push({ state, code: result.code }),
});

engine.initialize();
assert.equal(engine.validate().code, "replica-missing");
engine.update((state) => ({ ...state, components: [...state.components, "replica"] }));
assert.equal(engine.validate().code, "high-availability-valid");
assert.equal(engine.validate({ recordAttempt: false }).code, "high-availability-valid");

const externalState = engine.read();
externalState.components.push("mutated-outside-engine");
assert.deepEqual(engine.read().components, ["replica"]);

engine.reset();
assert.deepEqual(engine.serialize(), { version: 1, components: [] });
assert.deepEqual(attempts.map((attempt) => attempt.code), ["replica-missing", "high-availability-valid"]);
assert.deepEqual(renders, ["", "replica", ""]);

console.log("Simulator engine check passed: invalid, valid, repeat, isolation and reset.");
