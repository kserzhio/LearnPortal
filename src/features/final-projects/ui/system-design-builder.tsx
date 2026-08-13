"use client";

import { useState } from "react";
import { SystemIcon } from "@/components/ui/system-icon";
import { trackEvent } from "@/lib/analytics/client";
import {
  addComponent,
  addConnection,
  createFinalProjectArtifact,
  parseFinalProjectArtifact,
  removeComponent,
  removeConnection,
  setPolicy,
  setScenario,
  type SystemDesignBuilderState,
} from "../builder/system-design-builder";
import type { FinalProject } from "../domain/final-project-model";
import styles from "./system-design-builder.module.css";

type SystemDesignBuilderProps = Readonly<{
  project: FinalProject;
  state: SystemDesignBuilderState;
  onChange: (state: SystemDesignBuilderState) => void;
}>;

const categoryLabels = { edge: "Edge та client", compute: "Compute", data: "Data", processing: "Processing", integration: "Integration" } as const;

export function SystemDesignBuilder({ project, state, onChange }: SystemDesignBuilderProps) {
  const [connectionFrom, setConnectionFrom] = useState("");
  const [connectionTo, setConnectionTo] = useState("");
  const [artifactText, setArtifactText] = useState("");
  const [artifactMessage, setArtifactMessage] = useState("");
  const [artifactStatus, setArtifactStatus] = useState<"idle" | "success" | "error">("idle");
  const selectedComponents = new Set(state.components);
  const selectedPolicies = new Set(state.rules.filter(({ id, value }) => id === value).map(({ id }) => id));

  function update(nextState: SystemDesignBuilderState) {
    if (nextState === state) return;
    onChange(nextState);
  }

  function toggleComponent(componentId: string) {
    const removing = selectedComponents.has(componentId);
    update(removing ? removeComponent(state, componentId) : addComponent(state, componentId, project));
    if (!removing) trackEvent("final_project_component_added", { project_id: project.id, component_type: componentId });
    if (connectionFrom === componentId) setConnectionFrom("");
    if (connectionTo === componentId) setConnectionTo("");
  }

  function togglePolicy(policyId: string, enabled: boolean) {
    update(setPolicy(state, policyId, enabled, project));
    trackEvent("final_project_configuration_changed", { project_id: project.id, configuration_type: "policy" });
  }

  function changeScenario(scenarioId: string) {
    update(setScenario(state, scenarioId, project));
    trackEvent("final_project_configuration_changed", { project_id: project.id, configuration_type: "scenario" });
  }

  function connect() {
    const nextState = addConnection(state, { from: connectionFrom, to: connectionTo }, project);
    if (nextState === state) return;
    update(nextState);
    setConnectionFrom(connectionTo);
    setConnectionTo("");
    trackEvent("final_project_configuration_changed", { project_id: project.id, configuration_type: "connection" });
  }

  function exportArtifact() {
    setArtifactText(JSON.stringify(createFinalProjectArtifact(project, state), null, 2));
    setArtifactStatus("success");
    setArtifactMessage("Versioned JSON сформовано. Скопіюй його для резервної копії або перенесення.");
  }

  function importArtifact() {
    const parsed = parseFinalProjectArtifact(artifactText, project);
    if (!parsed.success) {
      setArtifactStatus("error");
      setArtifactMessage(parsed.message);
      return;
    }
    update(parsed.document.state);
    setArtifactStatus("success");
    setArtifactMessage("Artifact імпортовано. Перевір архітектуру перед збереженням.");
  }

  return (
    <div className={styles.builder}>
      <section aria-labelledby="componentPaletteHeading">
        <div className={styles.sectionHeading}>
          <div><span>01 · COMPONENTS</span><h3 id="componentPaletteHeading">Додай компоненти системи</h3></div>
          <strong>{state.components.length}/{project.builder.components.length}</strong>
        </div>
        <p className={styles.guidance}>Натисни компонент, щоб додати або прибрати його. Видалення компонента також видаляє пов’язані connections.</p>
        <div className={styles.palette}>
          {Object.entries(categoryLabels).map(([category, label]) => {
            const components = project.builder.components.filter((component) => component.category === category);
            return components.length ? <fieldset key={category}><legend>{label}</legend><div>{components.map((component) => {
              const selected = selectedComponents.has(component.id);
              return <button key={component.id} type="button" aria-pressed={selected} onClick={() => toggleComponent(component.id)} title={component.description}>
                <span>{selected ? <SystemIcon name="check" /> : <SystemIcon name="plus" />}{component.label}</span><small>{component.description}</small>
              </button>;
            })}</div></fieldset> : null;
          })}
        </div>
      </section>

      <section aria-labelledby="connectionHeading">
        <div className={styles.sectionHeading}><div><span>02 · CONNECTIONS</span><h3 id="connectionHeading">Опиши data flow</h3></div><strong>{state.connections.length}/{project.builder.maxConnections}</strong></div>
        <p className={styles.guidance}>Connections напрямлені: source передає request, event або data у target. Drag-and-drop не потрібен.</p>
        {state.components.length >= 2 ? (
          <div className={styles.connectionForm}>
            <label>Від<select value={connectionFrom} onChange={(event) => setConnectionFrom(event.target.value)}><option value="">Обери source</option>{project.builder.components.filter(({ id }) => selectedComponents.has(id)).map(({ id, label }) => <option key={id} value={id}>{label}</option>)}</select></label>
            <SystemIcon name="arrow-right" />
            <label>До<select value={connectionTo} onChange={(event) => setConnectionTo(event.target.value)}><option value="">Обери target</option>{project.builder.components.filter(({ id }) => selectedComponents.has(id) && id !== connectionFrom).map(({ id, label }) => <option key={id} value={id}>{label}</option>)}</select></label>
            <button type="button" onClick={connect} disabled={!connectionFrom || !connectionTo}>З’єднати</button>
          </div>
        ) : <p className={styles.empty}>Додай щонайменше два компоненти, щоб створити connection.</p>}
        <ol className={styles.connectionList}>{state.connections.map((connection, index) => {
          const from = project.builder.components.find(({ id }) => id === connection.from)?.label ?? connection.from;
          const to = project.builder.components.find(({ id }) => id === connection.to)?.label ?? connection.to;
          return <li key={`${connection.from}:${connection.to}`}><span><strong>{from}</strong><SystemIcon name="arrow-right" /><strong>{to}</strong></span><button type="button" onClick={() => update(removeConnection(state, index))} aria-label={`Видалити connection ${from} до ${to}`}><SystemIcon name="trash" /> Видалити</button></li>;
        })}</ol>
      </section>

      <section aria-labelledby="configurationHeading">
        <div className={styles.sectionHeading}><div><span>03 · CONFIGURATION</span><h3 id="configurationHeading">Налаштуй policies і failure</h3></div></div>
        <label className={styles.scenarioLabel}>Failure scenario<select value={state.scenario} onChange={(event) => changeScenario(event.target.value)}>{project.builder.scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.label}</option>)}</select></label>
        <fieldset className={styles.policyList}><legend>Architecture policies</legend>{project.builder.policies.map((policy) => <label key={policy.id}><input type="checkbox" checked={selectedPolicies.has(policy.id)} onChange={(event) => togglePolicy(policy.id, event.target.checked)} /><span><strong>{policy.label}</strong><small>{policy.description}</small></span></label>)}</fieldset>
      </section>

      <details className={styles.artifact}>
        <summary>Versioned JSON · import / export</summary>
        <p>JSON містить project і schema versions. Import не виконує код і приймає лише компоненти та settings із цього project.</p>
        <label htmlFor="finalProjectArtifact">Artifact JSON</label>
        <textarea id="finalProjectArtifact" value={artifactText} onChange={(event) => setArtifactText(event.target.value)} spellCheck="false" rows={12} maxLength={100_000} />
        <div><button type="button" onClick={exportArtifact}><SystemIcon name="copy" /> Сформувати export</button><button type="button" onClick={importArtifact} disabled={!artifactText.trim()}><SystemIcon name="arrow-down" /> Імпортувати</button></div>
        <p role="status" aria-live="polite" data-status={artifactStatus}>{artifactMessage}</p>
      </details>
    </div>
  );
}
