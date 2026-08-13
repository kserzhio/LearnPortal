import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  addComponent,
  addConnection,
  createFinalProjectArtifact,
  parseFinalProjectArtifact,
  parseSystemDesignBuilderState,
  removeComponent,
  removeConnection,
  setPolicy,
  setScenario,
} from "../src/features/final-projects/builder/system-design-builder";
import { finalProjects } from "../src/features/final-projects/content/final-project-registry";
import { finalDesignComponentIds, finalDesignRequiredConnections, finalDesignRuleIds, parseFinalDesignState, validateFinalDesign } from "../src/lib/simulators/final-system-design";

const project = finalProjects[0];
assert.ok(project);
let state = parseSystemDesignBuilderState(project.starterScenario.state, project);
assert.ok(state);
assert.deepEqual(state.connections, []);

state = addComponent(state, "cdn", project);
state = addComponent(state, "frontend", project);
state = addComponent(state, "load-balancer", project);
assert.deepEqual(state.components, ["cdn", "frontend", "load-balancer"]);
assert.equal(addComponent(state, "cdn", project), state, "Duplicate component is ignored");
assert.equal(addComponent(state, "unknown", project), state, "Out-of-palette component is ignored");

state = addConnection(state, { from: "cdn", to: "frontend" }, project);
state = addConnection(state, { from: "frontend", to: "load-balancer" }, project);
assert.equal(state.connections.length, 2);
assert.equal(addConnection(state, { from: "cdn", to: "frontend" }, project), state, "Duplicate connection is ignored");
assert.equal(addConnection(state, { from: "cdn", to: "cdn" }, project), state, "Self connection is ignored");
state = removeConnection(state, 0);
assert.deepEqual(state.connections, [{ from: "frontend", to: "load-balancer" }]);
state = removeComponent(state, "frontend");
assert.deepEqual(state.components, ["cdn", "load-balancer"]);
assert.deepEqual(state.connections, [], "Removing node removes affected edges");

state = setPolicy(state, "api-independent", true, project);
assert.deepEqual(state.rules, [{ id: "api-independent", value: "api-independent" }]);
state = setPolicy(state, "api-independent", false, project);
assert.deepEqual(state.rules, []);
state = setScenario(state, "region-outage", project);
assert.equal(state.scenario, "region-outage");
assert.equal(setScenario(state, "unknown", project), state);

let validState = parseSystemDesignBuilderState(project.starterScenario.state, project)!;
for (const componentId of finalDesignComponentIds) validState = addComponent(validState, componentId, project);
for (const policyId of finalDesignRuleIds) validState = setPolicy(validState, policyId, true, project);
for (let index = 0; index < finalDesignComponentIds.length - 1; index += 1) {
  validState = addConnection(validState, { from: finalDesignComponentIds[index], to: finalDesignComponentIds[index + 1] }, project);
}
for (const connection of finalDesignRequiredConnections) validState = addConnection(validState, connection, project);
const parsedBySimulator = parseFinalDesignState(validState);
assert.ok(parsedBySimulator);
assert.equal(validateFinalDesign(parsedBySimulator).valid, true, "Full valid state is constructible through builder functions");

const exported = createFinalProjectArtifact(project, validState);
assert.equal(exported.version, 1);
assert.equal(exported.projectVersion, project.contentVersion);
assert.equal(exported.simulatorSchemaVersion, project.starterScenario.simulatorSchemaVersion);
const imported = parseFinalProjectArtifact(JSON.stringify(exported), project);
assert.equal(imported.success, true);
assert.deepEqual(imported.success ? imported.document : null, exported);
assert.equal(parseFinalProjectArtifact("not-json", project).success, false);
assert.equal(parseFinalProjectArtifact(JSON.stringify({ ...exported, projectVersion: project.contentVersion + 1 }), project).success, false);
assert.equal(parseFinalProjectArtifact(JSON.stringify({ ...exported, state: { ...validState, components: [...validState.components, "unknown"] } }), project).success, false);

const [componentSource, stylesSource] = await Promise.all([
  readFile("src/features/final-projects/ui/system-design-builder.tsx", "utf8"),
  readFile("src/features/final-projects/ui/system-design-builder.module.css", "utf8"),
]);
assert.match(componentSource, /aria-pressed=\{selected\}/);
assert.match(componentSource, /<select/);
assert.match(componentSource, /Versioned JSON/);
assert.doesNotMatch(componentSource, /draggable|onDrag|canvas/i);
assert.doesNotMatch(stylesSource, /\dpx\b/);

console.log("System Design builder check passed: constrained add/remove/configure/connect, valid keyboard-equivalent solution, versioned import/export and strict invalid cases.");
