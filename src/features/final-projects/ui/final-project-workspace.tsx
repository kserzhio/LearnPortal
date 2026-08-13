"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { saveFinalProjectState } from "@/app/projects/[slug]/actions";
import { SystemIcon } from "@/components/ui/system-icon";
import { trackEvent, trackEventOnce } from "@/lib/analytics/client";
import { resolveFinalProjectValidator } from "../content/final-project-registry";
import type { FinalProject, FinalProjectValidationResult } from "../domain/final-project-model";
import type { FinalProjectPersistenceState } from "../persistence/final-project-artifact";
import { describeAffectedIds, describeFinalProjectState } from "../presentation/final-project-state";
import { parseSystemDesignBuilderState, type SystemDesignBuilderState } from "../builder/system-design-builder";
import { SystemDesignBuilder } from "./system-design-builder";
import styles from "./final-project-workspace.module.css";

type FinalProjectWorkspaceProps = Readonly<{
  project: FinalProject;
  persistence: FinalProjectPersistenceState;
}>;

function formatSavedAt(value: string) {
  return new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function FinalProjectWorkspace({ project, persistence }: FinalProjectWorkspaceProps) {
  const initialArtifact = persistence.artifact;
  const [state, setState] = useState<SystemDesignBuilderState>(() => {
    const source = initialArtifact?.state ?? project.starterScenario.state;
    return parseSystemDesignBuilderState(source, project) ?? { components: [], rules: [], scenario: project.builder.scenarios[0].id, connections: [] };
  });
  const [artifactId, setArtifactId] = useState<string | null>(initialArtifact?.id ?? null);
  const [savedAt, setSavedAt] = useState<string | null>(initialArtifact?.updatedAt ?? null);
  const [result, setResult] = useState<FinalProjectValidationResult | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [isSaving, startSaving] = useTransition();
  const resultRef = useRef<HTMLDivElement>(null);
  const validator = resolveFinalProjectValidator(project);
  const summary = describeFinalProjectState(state);

  function updateState(nextState: SystemDesignBuilderState) {
    setState(nextState);
    setResult(null);
    setSaveStatus("idle");
    setSaveMessage(savedAt ? "Є незбережені зміни." : "");
  }

  function runProject() {
    trackEventOnce(`final-project-started:${project.id}`, "final_project_started", { project_id: project.id, course_id: project.course.courseId });
    const nextResult = validator?.validateState(state) ?? {
      valid: false,
      code: "validator-unavailable",
      message: "Перевірка тимчасово недоступна.",
      affectedIds: [],
      score: { passed: 0, total: 0, percent: 0 },
      scenarios: [],
    };
    setResult(nextResult);
    trackEvent("final_project_run", { project_id: project.id, result: nextResult.valid ? "valid" : "invalid" });
    if (nextResult.valid) {
      trackEventOnce(`final-project-completed:${project.id}:${project.contentVersion}`, "final_project_completed", { project_id: project.id, scenario_count: nextResult.scenarios.length });
    } else {
      const failedScenario = nextResult.scenarios.find((scenario) => !scenario.passed);
      if (failedScenario) trackEvent("final_project_scenario_failed", { project_id: project.id, scenario_id: failedScenario.id });
    }
    requestAnimationFrame(() => resultRef.current?.focus());
  }

  function saveProject() {
    setSaveMessage("");
    setSaveStatus("idle");
    startSaving(async () => {
      try {
        const response = await saveFinalProjectState(project.slug, artifactId, state);
        setSaveMessage(response.message);
        setSaveStatus(response.success ? "success" : "error");
        if (response.success) {
          setArtifactId(response.id ?? artifactId);
          setSavedAt(response.updatedAt ?? new Date().toISOString());
        } else {
          trackEvent("final_project_save_failed", {});
        }
      } catch {
        setSaveMessage("Мережеве з’єднання перервано. Робота не втрачена — повтори збереження.");
        setSaveStatus("error");
        trackEvent("final_project_save_failed", {});
      }
    });
  }

  const affected = result ? describeAffectedIds(result) : [];
  const canSave = persistence.status === "available";

  return (
    <section className={styles.workspace} aria-labelledby="workspaceHeading">
      <header className={styles.heading}>
        <div>
          <p>WORKSPACE</p>
          <h2 id="workspaceHeading">Перевір архітектуру проти вимог</h2>
          <p className={styles.intro}>Побудуй versioned architecture із контрольованих компонентів, connections і policies. Кожна дія доступна без drag-and-drop.</p>
        </div>
        <div className={styles.version} aria-label={`Версія проєкту ${project.contentVersion}`}>
          <span>PROJECT</span><strong>V{project.contentVersion}</strong>
        </div>
      </header>

      <SystemDesignBuilder project={project} state={state} onChange={updateState} />

      <div className={styles.stateGrid}>
        <article aria-labelledby="architectureStateHeading">
          <span>ARCHITECTURE STATE</span>
          <h3 id="architectureStateHeading">{initialArtifact ? "Відновлена збережена схема" : "Стартова схема"}</h3>
          <p>{initialArtifact ? `Останнє збереження: ${formatSavedAt(initialArtifact.updatedAt)}.` : project.starterScenario.textDescription}</p>
          <dl>
            <div><dt>Компоненти</dt><dd>{summary.componentIds.length}</dd></div>
            <div><dt>Connections</dt><dd>{summary.connections.length}</dd></div>
            <div><dt>Failure scenario</dt><dd>{summary.scenarioLabel}</dd></div>
          </dl>
        </article>
        <article aria-labelledby="textArchitectureHeading">
          <span>TEXT VIEW</span>
          <h3 id="textArchitectureHeading">Архітектура як список</h3>
          {summary.componentLabels.length > 0 ? (
            <ol className={styles.architectureList}>{summary.componentLabels.map((label) => <li key={label}>{label}</li>)}</ol>
          ) : <p className={styles.emptyState}>Компонентів ще немає. Запусти перевірку, щоб побачити перший конкретний крок.</p>}
          {summary.connections.length > 0 ? <ol className={styles.flowList}>{summary.connections.map((connection) => <li key={`${connection.from}:${connection.to}`}><strong>{connection.fromLabel}</strong> передає дані до <strong>{connection.toLabel}</strong></li>)}</ol> : null}
          {summary.ruleLabels.length > 0 ? <p><strong>Policies:</strong> {summary.ruleLabels.join(", ")}.</p> : null}
        </article>
      </div>

      <div className={styles.actions}>
        <button className={styles.runButton} type="button" onClick={runProject} disabled={!validator}>
          <SystemIcon name="play" /> Запустити перевірку
        </button>
        {canSave ? (
          <button className={styles.saveButton} type="button" onClick={saveProject} disabled={isSaving}>
            <SystemIcon name="database" /> {isSaving ? "Збереження…" : "Зберегти проєкт"}
          </button>
        ) : persistence.status === "guest" ? (
          <Link className={styles.saveLink} href={`/auth/sign-in?next=${encodeURIComponent(`/projects/${project.slug}`)}`}>
            <SystemIcon name="lock" /> Увійти для збереження
          </Link>
        ) : <span className={styles.persistenceUnavailable}>Збереження тимчасово недоступне. Перевірку можна продовжити.</span>}
      </div>

      <p className={styles.saveStatus} data-status={saveStatus} role="status" aria-live="polite">
        {saveMessage || (savedAt ? `Збережено ${formatSavedAt(savedAt)}.` : "Зміни зберігаються лише після натискання «Зберегти проєкт».")}
      </p>

      <div
        className={styles.result}
        data-valid={result?.valid ?? undefined}
        ref={resultRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span>RESULT</span>
        {result ? (
          <>
            <h3>{result.valid ? "Архітектура пройшла перевірку" : "Архітектура потребує змін"}</h3>
            <p>{result.message}</p>
            <div className={styles.score} aria-label={`Пройдено ${result.score.passed} із ${result.score.total} перевірок`}>
              <strong>{result.score.passed}/{result.score.total}</strong><span>{result.score.percent}% перевірок пройдено</span>
            </div>
            <ol className={styles.scenarioResults} aria-label="Результати failure та load scenarios">
              {result.scenarios.map((scenario) => <li key={scenario.id} data-passed={scenario.passed}>
                <h4>{scenario.passed ? "Пройдено" : "Потребує змін"}: {scenario.label}</h4>
                <p>{scenario.explanation}</p>
                <ul>{scenario.checks.map((check) => <li key={check.id} data-passed={check.passed}>
                  <strong>{check.passed ? "Пройдено" : "Не пройдено"} — {check.label}</strong>
                  <p>{check.explanation}</p>
                  {check.remediation ? <p><strong>Наступна дія:</strong> {check.remediation}</p> : null}
                  {!check.passed && check.affectedIds.length > 0 ? <p><strong>Зачеплені елементи:</strong> {describeAffectedIds({ ...result, affectedIds: check.affectedIds }).join(", ")}.</p> : null}
                </li>)}</ul>
              </li>)}
            </ol>
            {!result.valid && affected.length > 0 ? <p className={styles.affectedSummary}><strong>Усі елементи для перевірки:</strong> {affected.join(", ")}.</p> : null}
            <code>{result.code}</code>
          </>
        ) : (
          <><h3>Результат ще не сформовано</h3><p>Запусти перевірку. Вона не змінить і не видалить поточну роботу.</p></>
        )}
      </div>
    </section>
  );
}
