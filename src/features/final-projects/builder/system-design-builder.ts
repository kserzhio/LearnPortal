import type { FinalProject, JsonValue } from "../domain/final-project-model";

export const FINAL_PROJECT_ARTIFACT_FORMAT = "systema.final-project-artifact" as const;
export const FINAL_PROJECT_ARTIFACT_VERSION = 1 as const;

export type SystemDesignConnection = Readonly<{ from: string; to: string }>;
export type SystemDesignBuilderState = Readonly<{
  components: readonly string[];
  rules: readonly Readonly<{ id: string; value: string }>[];
  scenario: string;
  connections: readonly SystemDesignConnection[];
}>;

export type FinalProjectArtifactDocument = Readonly<{
  format: typeof FINAL_PROJECT_ARTIFACT_FORMAT;
  version: typeof FINAL_PROJECT_ARTIFACT_VERSION;
  projectId: string;
  projectVersion: number;
  simulatorId: string;
  simulatorSchemaVersion: number;
  state: SystemDesignBuilderState;
}>;

export type FinalProjectArtifactParseResult =
  | Readonly<{ success: true; document: FinalProjectArtifactDocument }>
  | Readonly<{ success: false; code: string; message: string }>;

function unique(items: readonly string[]) { return [...new Set(items)]; }

export function parseSystemDesignBuilderState(value: unknown, project: FinalProject): SystemDesignBuilderState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (!Array.isArray(source.components) || !Array.isArray(source.rules) || !Array.isArray(source.connections) || typeof source.scenario !== "string") return null;

  const allowedComponents = new Set(project.builder.components.map(({ id }) => id));
  const components = source.components.filter((item): item is string => typeof item === "string" && allowedComponents.has(item));
  if (components.length !== source.components.length || unique(components).length !== components.length) return null;

  const allowedPolicies = new Set(project.builder.policies.map(({ id }) => id));
  const rules = source.rules.filter((item): item is { id: string; value: string } => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const rule = item as Record<string, unknown>;
    return typeof rule.id === "string" && allowedPolicies.has(rule.id) && (rule.value === "" || rule.value === rule.id);
  });
  if (rules.length !== source.rules.length || unique(rules.map(({ id }) => id)).length !== rules.length) return null;

  if (!project.builder.scenarios.some(({ id }) => id === source.scenario)) return null;
  if (source.connections.length > project.builder.maxConnections) return null;
  const componentSet = new Set(components);
  const connections = source.connections.filter((item): item is SystemDesignConnection => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const connection = item as Record<string, unknown>;
    return typeof connection.from === "string" && componentSet.has(connection.from)
      && typeof connection.to === "string" && componentSet.has(connection.to)
      && connection.from !== connection.to;
  });
  if (connections.length !== source.connections.length || unique(connections.map(({ from, to }) => `${from}:${to}`)).length !== connections.length) return null;
  return { components, rules, scenario: source.scenario, connections };
}

export function addComponent(state: SystemDesignBuilderState, componentId: string, project: FinalProject): SystemDesignBuilderState {
  if (!project.builder.components.some(({ id }) => id === componentId) || state.components.includes(componentId)) return state;
  return { ...state, components: [...state.components, componentId] };
}

export function removeComponent(state: SystemDesignBuilderState, componentId: string): SystemDesignBuilderState {
  if (!state.components.includes(componentId)) return state;
  return {
    ...state,
    components: state.components.filter((id) => id !== componentId),
    connections: state.connections.filter(({ from, to }) => from !== componentId && to !== componentId),
  };
}

export function setPolicy(state: SystemDesignBuilderState, policyId: string, enabled: boolean, project: FinalProject): SystemDesignBuilderState {
  if (!project.builder.policies.some(({ id }) => id === policyId)) return state;
  const rules = state.rules.filter(({ id }) => id !== policyId);
  return { ...state, rules: enabled ? [...rules, { id: policyId, value: policyId }] : rules };
}

export function setScenario(state: SystemDesignBuilderState, scenarioId: string, project: FinalProject): SystemDesignBuilderState {
  return project.builder.scenarios.some(({ id }) => id === scenarioId) ? { ...state, scenario: scenarioId } : state;
}

export function addConnection(state: SystemDesignBuilderState, connection: SystemDesignConnection, project: FinalProject): SystemDesignBuilderState {
  if (connection.from === connection.to || !state.components.includes(connection.from) || !state.components.includes(connection.to)) return state;
  if (state.connections.length >= project.builder.maxConnections || state.connections.some(({ from, to }) => from === connection.from && to === connection.to)) return state;
  return { ...state, connections: [...state.connections, connection] };
}

export function removeConnection(state: SystemDesignBuilderState, index: number): SystemDesignBuilderState {
  return index >= 0 && index < state.connections.length
    ? { ...state, connections: state.connections.filter((_, connectionIndex) => connectionIndex !== index) }
    : state;
}

export function createFinalProjectArtifact(project: FinalProject, state: SystemDesignBuilderState): FinalProjectArtifactDocument {
  const normalized = parseSystemDesignBuilderState(state, project);
  if (!normalized) throw new Error("invalid-final-project-artifact-state");
  return {
    format: FINAL_PROJECT_ARTIFACT_FORMAT,
    version: FINAL_PROJECT_ARTIFACT_VERSION,
    projectId: project.id,
    projectVersion: project.contentVersion,
    simulatorId: project.starterScenario.simulatorId,
    simulatorSchemaVersion: project.starterScenario.simulatorSchemaVersion,
    state: normalized,
  };
}

export function parseFinalProjectArtifact(value: string | JsonValue, project: FinalProject): FinalProjectArtifactParseResult {
  let input: unknown;
  try { input = typeof value === "string" ? JSON.parse(value) : value; }
  catch { return { success: false, code: "invalid-json", message: "Файл не є коректним JSON." }; }
  if (!input || typeof input !== "object" || Array.isArray(input)) return { success: false, code: "unsupported-format", message: "Формат файлу не підтримується." };
  const document = input as Record<string, unknown>;
  if (document.format !== FINAL_PROJECT_ARTIFACT_FORMAT || document.version !== FINAL_PROJECT_ARTIFACT_VERSION) return { success: false, code: "unsupported-format", message: "Формат або версія artifact не підтримується." };
  if (document.projectId !== project.id || document.projectVersion !== project.contentVersion || document.simulatorId !== project.starterScenario.simulatorId || document.simulatorSchemaVersion !== project.starterScenario.simulatorSchemaVersion) {
    return { success: false, code: "project-mismatch", message: "Artifact створено для іншого проєкту або несумісної версії." };
  }
  const state = parseSystemDesignBuilderState(document.state, project);
  if (!state) return { success: false, code: "invalid-artifact-state", message: "Architecture state не пройшов перевірку." };
  return { success: true, document: createFinalProjectArtifact(project, state) };
}
