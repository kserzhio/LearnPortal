import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  finalDesignComponentIds,
  finalDesignRequiredConnections,
  finalDesignRuleIds,
  parseFinalDesignState,
  validateFinalDesign,
} from "../src/lib/simulators/final-system-design";

const completeState = parseFinalDesignState({
  components: [...finalDesignComponentIds],
  rules: finalDesignRuleIds.map((id) => ({ id, value: id })),
  scenario: "db-primary",
  connections: [...finalDesignRequiredConnections],
});
assert.ok(completeState);
const valid = validateFinalDesign(completeState);
assert.equal(valid.valid, true);
assert.deepEqual(valid.score, { passed: 15, total: 15, percent: 100 });
assert.deepEqual(valid.scenarios.map(({ id }) => id).sort(), ["api-instance", "db-primary", "redis-outage", "region-outage", "traffic-spike"]);

const databaseFailure = validateFinalDesign({ ...completeState, connections: completeState.connections.filter(({ from, to }) => from !== "postgres" || to !== "read-replicas") });
assert.equal(databaseFailure.valid, false);
assert.equal(databaseFailure.code, "db-primary-scenario-failed");
assert.equal(databaseFailure.scenarios[0].checks.find(({ id }) => id === "db-primary-flow")?.passed, false);
assert.match(databaseFailure.scenarios[0].checks.find(({ id }) => id === "db-primary-flow")?.remediation ?? "", /postgres → read-replicas/);

const overload = validateFinalDesign({
  ...completeState,
  scenario: "traffic-spike",
  components: completeState.components.filter((id) => id !== "job-queue"),
  connections: completeState.connections.filter(({ from, to }) => from !== "job-queue" && to !== "job-queue"),
});
assert.equal(overload.code, "traffic-spike-scenario-failed");
assert.equal(overload.scenarios[0].id, "traffic-spike");
assert.equal(overload.scenarios[0].checks.find(({ id }) => id === "traffic-spike-components")?.affectedIds.includes("job-queue"), true);

assert.deepEqual(validateFinalDesign(completeState), validateFinalDesign(completeState), "Validation is deterministic");

const [workspaceSource, stylesSource] = await Promise.all([
  readFile("src/features/final-projects/ui/final-project-workspace.tsx", "utf8"),
  readFile("src/features/final-projects/ui/final-project-workspace.module.css", "utf8"),
]);
assert.match(workspaceSource, /result\.score\.passed/);
assert.match(workspaceSource, /Результати failure та load scenarios/);
assert.match(workspaceSource, /Наступна дія:/);
assert.match(workspaceSource, /Зачеплені елементи:/);
assert.doesNotMatch(stylesSource, /\dpx\b/);

console.log("Final Project scenario check passed: deterministic DB failure, overload, score, remediation and semantic result list.");
