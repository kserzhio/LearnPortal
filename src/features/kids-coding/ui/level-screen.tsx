"use client";

import Link from "next/link";
import { SystemIcon } from "@/components/ui/system-icon";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { CommandDefinition, LevelDefinition } from "../domain/course-model";
import { createGameExecutionEngine, type ExecutionSnapshot, type SerializedLevelAttempt } from "../engine/execution-engine";
import { type LevelResult, type RuntimeGameState } from "../engine/game-state";
import {
  KIDS_PROGRAM_SCHEMA,
  KIDS_PROGRAM_SCHEMA_VERSION,
  type ProgramDefinition,
  type ProgramInstruction,
} from "../engine/program";
import { createJavaScriptSandbox } from "../sandbox/javascript-sandbox";
import type { SandboxPublicError } from "../sandbox/restricted-javascript";
import { ApiKidsProgressStore } from "../progress/api-progress-store";
import { BrowserKidsProgressStore } from "../progress/browser-progress-store";
import { createFriendlyFeedback, type FriendlyFeedback } from "../support/feedback";
import { createHintProgress, revealNextHint, type HintProgress, type RevealedHint } from "../support/hints";
import { getStarSummary } from "../support/stars-and-rewards";
import styles from "./level-screen.module.css";
import { LessonDiscussion, LessonFeedback } from "@/features/learning-support/learning-support";
import { ProductEventBeacon } from "@/components/analytics/product-event-beacon";
import { trackEvent, trackEventOnce } from "@/lib/analytics/client";
import { SharePanel } from "@/features/sharing/share-panel";
import type { SharePayload } from "@/features/sharing/share-links";

type LevelScreenProps = Readonly<{
  authenticated: boolean;
  courseId: string;
  courseTitle: string;
  mapHref: string;
  nextLevelHref: string | null;
  worldTitle: string;
  worldLevelCount: number;
  level: LevelDefinition;
  sharePayload?: SharePayload;
}>;

const emptyProgram = (): ProgramDefinition => ({
  schema: KIDS_PROGRAM_SCHEMA,
  schemaVersion: KIDS_PROGRAM_SCHEMA_VERSION,
  instructions: [],
  functions: [],
});

const directionLabels = { north: "північ", east: "схід", south: "південь", west: "захід" } as const;
const directionArrows = { north: "↑", east: "→", south: "↓", west: "←" } as const;
const eventLabels: Readonly<Record<string, string>> = {
  "robot-moved": "герой зробив крок",
  "robot-turned-left": "герой повернув ліворуч",
  "robot-turned-right": "герой повернув праворуч",
  "robot-jumped": "герой перестрибнув перешкоду",
  "item-picked": "герой підібрав предмет",
  "robot-hit-obstacle": "на шляху трапилася перешкода",
  "robot-left-board": "герой вийшов за межі поля",
  "repeat-iteration-started": "виконується наступне повторення",
  "level-completed": "мету досягнуто",
  "level-completed-perfectly": "мету досягнуто бездоганно",
  "goal-not-reached": "герой ще не дістався фінішу",
};
const publicProgressErrors = new Set([
  "Не вдалося зберегти Kids attempts.",
  "Не вдалося прочитати оновлений progress.",
  "Kids course не знайдено або progress недоступний.",
  "Сервер повернув некоректний Kids progress.",
  "Спроба не відповідає поточній версії рівня.",
  "Потрібно увійти для синхронізації.",
]);

function progressErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return publicProgressErrors.has(message) ? message : "Не вдалося зберегти спробу. Перевір з’єднання та спробуй ще раз.";
}

function commandArguments(command: CommandDefinition) {
  return Object.fromEntries(command.parameters.map((parameter) => [parameter.id, parameter.defaultValue]));
}

function instructionFor(command: CommandDefinition, id: string, commands: readonly CommandDefinition[]): ProgramInstruction | null {
  if (["move-forward", "turn-left", "turn-right", "jump", "pick-item"].includes(command.kind)) {
    return { id, type: "command", commandId: command.id, arguments: commandArguments(command) };
  }
  if (command.kind === "repeat") {
    const nested = commands.find((entry) => ["move-forward", "turn-left", "turn-right", "jump", "pick-item"].includes(entry.kind));
    return nested ? {
      id,
      type: "repeat",
      commandId: command.id,
      count: 2,
      body: [{ id: `${id}-body`, type: "command", commandId: nested.id, arguments: commandArguments(nested) }],
    } : null;
  }
  return null;
}

function programToJavaScript(program: ProgramDefinition, commands: readonly CommandDefinition[]) {
  const render = (instruction: ProgramInstruction, depth = 0): string => {
    const indent = "  ".repeat(depth);
    if (instruction.type === "repeat") {
      const body = instruction.body.map((entry) => render(entry, depth + 1)).join("\n");
      return `${indent}for (let i = 0; i < ${instruction.count}; i++) {\n${body}\n${indent}}`;
    }
    if (instruction.type !== "command") return `${indent}// Цей блок буде доступний у наступних світах.`;
    const command = commands.find((entry) => entry.id === instruction.commandId);
    if (!command) return `${indent}// Невідома команда`;
    const values = command.parameters.map((parameter) => instruction.arguments[parameter.id]);
    const example = command.javascriptExample;
    if (values.length === 0) return `${indent}${example}`;
    return `${indent}${example.replace(/\([^)]*\)/, `(${values.join(", ")})`)}`;
  };
  return program.instructions.map((instruction) => render(instruction)).join("\n");
}

function Character({ state }: { state: RuntimeGameState }) {
  return <span className={styles.character} aria-hidden="true">{directionArrows[state.character.direction]}</span>;
}

function GameBoard({ challenge, state }: { challenge: LevelDefinition["challenge"]; state: RuntimeGameState }) {
  const { columns, rows } = challenge.initialGameState.grid;
  const cells = Array.from({ length: columns * rows }, (_, index) => ({ x: index % columns, y: Math.floor(index / columns) }));
  const position = state.character.position;
  const collected = new Set(state.collectedItemIds);
  return (
    <section className={styles.boardPanel} aria-labelledby="game-board-title">
      <div className={styles.panelHeading}>
        <div><span>ІГРОВЕ ПОЛЕ</span><h2 id="game-board-title">Шлях героя</h2></div>
        <p aria-live="polite">Герой: рядок {position.y + 1}, клітинка {position.x + 1}, напрямок {directionLabels[state.character.direction]}.</p>
      </div>
      <div
        className={styles.gameBoard}
        style={{ "--board-columns": columns } as CSSProperties}
        role="img"
        aria-label={`Поле ${columns} на ${rows}. Фініш у рядку ${challenge.initialGameState.goal.y + 1}, клітинці ${challenge.initialGameState.goal.x + 1}. Перешкод: ${challenge.initialGameState.obstacles.length}.`}
      >
        {cells.map((cell) => {
          const obstacle = challenge.initialGameState.obstacles.find((entry) => entry.position.x === cell.x && entry.position.y === cell.y);
          const item = challenge.initialGameState.items.find((entry) => entry.position.x === cell.x && entry.position.y === cell.y && !collected.has(entry.id));
          const isGoal = challenge.initialGameState.goal.x === cell.x && challenge.initialGameState.goal.y === cell.y;
          const isCharacter = position.x === cell.x && position.y === cell.y;
          return (
            <span className={`${styles.cell} ${isGoal ? styles.goal : ""}`} key={`${cell.x}-${cell.y}`} aria-hidden="true">
              {obstacle ? <span className={styles.obstacle}><SystemIcon name="diamond" /></span> : null}
              {item ? <span className={styles.item}><SystemIcon name="star" /></span> : null}
              {isGoal ? <span className={styles.flag}><SystemIcon name="flag" /></span> : null}
              {isCharacter ? <Character state={state} /> : null}
            </span>
          );
        })}
      </div>
      <ul className={styles.boardLegend} aria-label="Позначення поля">
        <li><SystemIcon name="circle" /> герой</li><li><SystemIcon name="flag" /> фініш</li><li><SystemIcon name="diamond" /> перешкода</li>
      </ul>
    </section>
  );
}

function CommandPalette({ commands, onAdd }: { commands: readonly CommandDefinition[]; onAdd: (command: CommandDefinition) => void }) {
  return (
    <section className={styles.palette} aria-labelledby="command-palette-title">
      <div className={styles.panelHeading}><div><span>КОМАНДИ</span><h2 id="command-palette-title">Додай дію</h2></div></div>
      <div className={styles.commandList}>
        {commands.map((command) => (
          <button key={command.id} type="button" onClick={() => onAdd(command)}>
            <strong>{command.label}</strong><span>{command.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function BlockEditor({
  program,
  commands,
  onChange,
}: {
  program: ProgramDefinition;
  commands: readonly CommandDefinition[];
  onChange: (program: ProgramDefinition) => void;
}) {
  const remove = (id: string) => onChange({ ...program, instructions: program.instructions.filter((entry) => entry.id !== id) });
  const updateRepeat = (id: string, count: number) => onChange({
    ...program,
    instructions: program.instructions.map((entry) => entry.id === id && entry.type === "repeat" ? { ...entry, count } : entry),
  });
  const updateArgument = (instructionId: string, parameterId: string, value: number) => onChange({
    ...program,
    instructions: program.instructions.map((entry) => entry.id === instructionId && entry.type === "command"
      ? { ...entry, arguments: { ...entry.arguments, [parameterId]: value } }
      : entry),
  });
  return (
    <section className={styles.editor} aria-labelledby="block-editor-title">
      <div className={styles.panelHeading}>
        <div><span>BLOCK MODE</span><h2 id="block-editor-title">Твій алгоритм</h2></div>
        <button type="button" className={styles.textButton} onClick={() => onChange(emptyProgram())} disabled={program.instructions.length === 0}>Очистити</button>
      </div>
      {program.instructions.length === 0 ? <p className={styles.emptyEditor}>Додай команду з панелі. Кожен блок можна активувати клавіатурою.</p> : (
        <ol className={styles.blockList}>
          {program.instructions.map((instruction, index) => {
            const command = commands.find((entry) => entry.id === instruction.commandId);
            return (
              <li key={instruction.id}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <div><strong>{command?.label ?? "Команда"}</strong>
                  {instruction.type === "repeat" ? (
                    <label>Повторень
                      <input type="number" min="1" max="50" value={instruction.count} onChange={(event) => updateRepeat(instruction.id, Number(event.target.value))} />
                    </label>
                  ) : instruction.type === "command" ? command?.parameters.map((parameter) => (
                    <label key={parameter.id}>{parameter.label}
                      <input type="number" min={parameter.minimum} max={parameter.maximum} value={Number(instruction.arguments[parameter.id])} onChange={(event) => updateArgument(instruction.id, parameter.id, Number(event.target.value))} />
                    </label>
                  )) : null}
                  {instruction.type === "repeat" ? <small>Усередині: {commands.find((entry) => entry.id === instruction.body[0]?.commandId)?.label ?? "дія"}</small> : null}
                </div>
                <button type="button" onClick={() => remove(instruction.id)} aria-label={`Видалити команду ${index + 1}`}><SystemIcon name="close" /></button>
              </li>
            );
          })}
        </ol>
      )}
      <details className={styles.codeEquivalent}>
        <summary>Показати JavaScript equivalent</summary>
        <pre tabIndex={0}><code>{programToJavaScript(program, commands) || "// Додай перший блок"}</code></pre>
      </details>
    </section>
  );
}

function CodeEditor({ value, starterCode, issue, onChange }: { value: string; starterCode: string; issue: SandboxPublicError["location"]; onChange: (value: string) => void }) {
  return (
    <section className={styles.editor} aria-labelledby="code-editor-title">
      <div className={styles.panelHeading}>
        <div><span>CODE MODE</span><h2 id="code-editor-title">JavaScript</h2></div>
        <button type="button" className={styles.textButton} onClick={() => onChange(starterCode)} disabled={value === starterCode}>Повернути стартовий код</button>
      </div>
      <label className={styles.codeLabel} htmlFor="kids-code-editor">Код алгоритму</label>
      <textarea id="kids-code-editor" aria-describedby="kids-code-help" aria-errormessage={issue ? "kids-code-error" : undefined} aria-invalid={issue ? true : undefined} value={value} onChange={(event) => onChange(event.target.value)} spellCheck="false" autoCapitalize="off" />
      <p className={styles.editorHelp} id="kids-code-help">Зміни стартовий приклад і запусти його. Доступні лише безпечні команди цього рівня; код не має доступу до сторінки, мережі чи даних браузера.</p>
    </section>
  );
}

function RunControls({ status, saving, onRun, onReset, onPause, onResume, onStop }: {
  status: ExecutionSnapshot["status"];
  saving: boolean;
  onRun: () => void;
  onReset: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  const running = status === "running";
  const paused = status === "paused";
  return (
    <div className={styles.runControls} role="group" aria-label="Керування запуском" aria-busy={running || saving}>
      <button type="button" className={styles.runButton} onClick={onRun} disabled={running || paused || saving}>{saving ? "Зберігаємо…" : status === "completed" ? "Запустити ще раз" : "Запустити"}<SystemIcon name="play" /></button>
      {running ? <button type="button" onClick={onPause}>Пауза</button> : null}
      {paused ? <button type="button" onClick={onResume}>Продовжити</button> : null}
      {running || paused ? <button type="button" onClick={onStop}>Зупинити</button> : null}
      <button type="button" onClick={onReset}>Скинути поле</button>
    </div>
  );
}

function HintPanel({ hints, onReveal, complete }: { hints: readonly RevealedHint[]; onReveal: () => void; complete: boolean }) {
  return (
    <aside className={styles.hints} aria-labelledby="hint-title">
      <div className={styles.panelHeading}><div><span>ПІДКАЗКИ</span><h2 id="hint-title">Не залишайся наодинці</h2></div></div>
      {hints.length === 0 ? <p>Спершу спробуй сам. Якщо застрягнеш, відкривай підказки по одній.</p> : (
        <ol>{hints.map((hint) => <li key={hint.stage}><strong>{hint.label}</strong><p>{hint.text}</p></li>)}</ol>
      )}
      <button type="button" onClick={onReveal} disabled={complete}>{complete ? "Усі підказки відкрито" : `Відкрити підказку ${hints.length + 1}`}</button>
    </aside>
  );
}

function Stars({ challenge, result }: { challenge: LevelDefinition["challenge"]; result: LevelResult }) {
  return <ul className={styles.stars} aria-label={`Отримано ${result.stars} з 3 зірок`}>{getStarSummary(challenge, result).map((item) => (
    <li key={item.stars} className={item.earned ? styles.starEarned : ""}><SystemIcon name="star" /><div><strong>{item.stars === 1 ? "1 зірка" : `${item.stars} зірки`}</strong><small>{item.label} — {item.earned ? "виконано" : "ще не виконано"}</small></div></li>
  ))}</ul>;
}

function LevelResultPanel({ feedback, challenge, result }: { feedback: FriendlyFeedback; challenge: LevelDefinition["challenge"]; result: LevelResult }) {
  return (
    <section className={`${styles.result} ${feedback.tone === "success" ? styles.resultSuccess : styles.resultRetry}`} aria-labelledby="level-result-title" aria-live={feedback.announce}>
      <div><span>{feedback.tone === "success" ? "РЕЗУЛЬТАТ" : "СПРОБУЙ ІЩЕ"}</span><h2 id="level-result-title">{feedback.title}</h2><p>{feedback.message}</p><strong>{feedback.nextStep}</strong></div>
      <Stars challenge={challenge} result={result} />
    </section>
  );
}

function ProgressBar({ position, total }: { position: number; total: number }) {
  const percentage = Math.round((position / total) * 100);
  return <div className={styles.progress}><div><span>Рівень {position} із {total}</span><strong>{percentage}% світу</strong></div><progress max={total} value={position} aria-label={`Позиція у світі: рівень ${position} із ${total}`}>{percentage}%</progress></div>;
}

export function KidsLevelScreen({ authenticated, courseId, courseTitle, mapHref, nextLevelHref, worldTitle, worldLevelCount, level, sharePayload }: LevelScreenProps) {
  const challenge = level.challenge;
  const blockMode = level.learningModes.includes("blocks");
  const starterCode = level.starterCode ?? challenge.availableCommands[0]?.javascriptExample ?? "hero.move();";
  const engine = useMemo(() => createGameExecutionEngine({ challenge }), [challenge]);
  const sandbox = useMemo(() => createJavaScriptSandbox({ challenge }), [challenge]);
  const [program, setProgram] = useState<ProgramDefinition>(emptyProgram);
  const [code, setCode] = useState(starterCode);
  const [snapshot, setSnapshot] = useState<ExecutionSnapshot>(() => engine.read());
  const [result, setResult] = useState<LevelResult | null>(null);
  const [feedback, setFeedback] = useState<FriendlyFeedback | null>(null);
  const [hintProgress, setHintProgress] = useState<HintProgress>(() => createHintProgress(challenge));
  const [revealedHints, setRevealedHints] = useState<RevealedHint[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [codeIssue, setCodeIssue] = useState<SandboxPublicError["location"]>(null);
  const instructionSequence = useRef(0);
  const lastAttempt = useRef<SerializedLevelAttempt | null>(null);

  useEffect(() => engine.subscribe(setSnapshot), [engine]);

  const addCommand = (command: CommandDefinition) => {
    instructionSequence.current += 1;
    const instruction = instructionFor(command, `step-${instructionSequence.current}`, challenge.availableCommands);
    if (instruction) setProgram((current) => ({ ...current, instructions: [...current.instructions, instruction] }));
  };

  const publishResult = (nextResult: LevelResult) => {
    setResult(nextResult);
    setFeedback(createFriendlyFeedback(nextResult));
    trackEvent("simulator_run", { content_id: level.id, result: nextResult.valid ? "valid" : "invalid" });
    trackEventOnce(`lesson-started:${courseId}:${level.id}`, "lesson_started", { course_id: courseId, content_id: level.id });
    if (nextResult.valid) trackEventOnce(`lesson-completed:${courseId}:${level.id}`, "lesson_completed", { course_id: courseId, content_id: level.id });
  };

  const persistAttempt = async (attempt: SerializedLevelAttempt) => {
    lastAttempt.current = attempt;
    setSaveState("saving");
    setSaveError(null);
    setCodeIssue(null);
    try {
      const store = authenticated
        ? new ApiKidsProgressStore()
        : new BrowserKidsProgressStore(window.localStorage);
      await store.recordAttempt({
        id: crypto.randomUUID(),
        courseId,
        worldId: level.worldId,
        levelId: level.id,
        createdAt: new Date().toISOString(),
        attempt,
      });
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      setSaveError(progressErrorMessage(error));
    }
  };

  const run = async () => {
    setFeedback(null);
    setResult(null);
    setSaveState("idle");
    setSaveError(null);
    if (blockMode) {
      const loaded = engine.load(program);
      if (loaded.programIssues.length > 0) {
        setSnapshot(loaded);
        setFeedback(createFriendlyFeedback({ valid: false, code: loaded.programIssues[0].code }));
        return;
      }
      const nextResult = await engine.run({ stepDelayMs: 450, onEvent: (_event, nextSnapshot) => setSnapshot(nextSnapshot) });
      publishResult(nextResult);
      const attempt = engine.serializeAttempt();
      if (attempt) await persistAttempt(attempt);
      return;
    }
    const sandboxResult = await sandbox.run(code, { stepDelayMs: 450, onEvent: (_event, nextSnapshot) => setSnapshot(nextSnapshot) });
    if (!sandboxResult.success) {
      setSnapshot(sandbox.read());
      setCodeIssue(sandboxResult.error.location);
      setFeedback(createFriendlyFeedback(sandboxResult.error));
      return;
    }
    setSnapshot(sandbox.read());
    publishResult(sandboxResult.result);
    if (sandboxResult.attempt) await persistAttempt(sandboxResult.attempt);
  };

  const reset = () => {
    const next = blockMode ? engine.reset({ keepProgram: true }) : sandbox.reset();
    setSnapshot(next);
    setResult(null);
    setFeedback(null);
    setSaveState("idle");
    setSaveError(null);
    lastAttempt.current = null;
    setCodeIssue(null);
  };

  const revealHint = () => {
    const next = revealNextHint(challenge, hintProgress);
    setHintProgress(next.progress);
    if (next.hint) {
      setRevealedHints((current) => [...current, next.hint as RevealedHint]);
      trackEvent("hint_opened", { content_id: level.id, stage: next.hint.stage });
    }
  };

  const status = snapshot.status;
  const syncExecutionAction = (action: "pause" | "resume" | "cancel") => {
    const runner = blockMode ? engine : sandbox;
    runner[action]();
    setSnapshot(runner.read());
  };
  const retrySave = () => {
    if (lastAttempt.current) void persistAttempt(lastAttempt.current);
  };
  return (
    <main className={styles.levelPage}>
      <ProductEventBeacon name="lesson_viewed" properties={{ course_id: courseId, content_id: level.id }} />
      <header className={styles.levelHeader}>
        <div className={styles.breadcrumbs}><Link href="/courses">Курси</Link><span aria-hidden="true">/</span><Link href={mapHref}>{courseTitle}</Link><span aria-hidden="true">/</span><strong>{level.title}</strong></div>
        <div className={styles.levelIntro}>
          <div><span>{worldTitle} · рівень {level.position}</span><h1>{level.title}</h1><p>{level.description}</p></div>
          <div className={styles.objective}><span>ТВОЯ МЕТА</span><strong>{challenge.objective.title}</strong><p>{challenge.objective.description}</p></div>
        </div>
        <ProgressBar position={level.position} total={worldLevelCount} />
      </header>

      <div className={styles.workspace}>
        <GameBoard challenge={challenge} state={snapshot.game} />
        <div className={styles.creationArea}>
          {blockMode ? <CommandPalette commands={challenge.availableCommands} onAdd={addCommand} /> : null}
          {blockMode
            ? <BlockEditor program={program} commands={challenge.availableCommands} onChange={setProgram} />
            : <CodeEditor value={code} starterCode={starterCode} issue={codeIssue} onChange={(value) => { setCode(value); setCodeIssue(null); }} />}
          <RunControls status={status} saving={saveState === "saving"} onRun={() => void run()} onReset={reset} onPause={() => syncExecutionAction("pause")} onResume={() => syncExecutionAction("resume")} onStop={() => syncExecutionAction("cancel")} />
          <p className={styles.executionStatus} role="status">{status === "running" ? "Алгоритм виконується крок за кроком…" : snapshot.lastEvent ? `Остання дія: ${eventLabels[snapshot.lastEvent.code] ?? "поле оновлено"}.` : "Готово до запуску."}</p>
        </div>
      </div>

      {feedback ? (result ? <LevelResultPanel feedback={feedback} challenge={challenge} result={result} /> : <section className={`${styles.result} ${styles.resultRetry}`} aria-labelledby="code-feedback-title" aria-live={feedback.announce}><div><span>ПЕРЕВІР КОД</span><h2 id="code-feedback-title">{feedback.title}</h2><p>{feedback.message}</p>{codeIssue ? <p className={styles.codeLocation} id="kids-code-error">Перевір рядок {codeIssue.line}, позицію {codeIssue.column}.</p> : null}<strong>{feedback.nextStep}</strong></div></section>) : null}
      {result ? (
        <section className={styles.progressSave} aria-label="Збереження прогресу" aria-live="polite">
          <p>{saveState === "saving" ? "Зберігаємо спробу…" : saveState === "saved" ? authenticated ? "Прогрес синхронізовано з профілем." : "Прогрес збережено на цьому пристрої." : saveState === "error" ? saveError : "Спроба готова до збереження."}</p>
          {saveState === "error" ? <button className={styles.retrySaveButton} type="button" onClick={retrySave}>Повторити збереження</button> : null}
          {result.valid && saveState === "saved" ? (
            <div>
              {nextLevelHref ? <Link className={styles.nextLevelLink} href={nextLevelHref}>Наступний рівень <SystemIcon name="arrow-right" /></Link> : <Link className={styles.nextLevelLink} href={mapHref}>Повернутися на карту <SystemIcon name="arrow-right" /></Link>}
              <Link className={styles.mapLink} href={mapHref}>Карта курсу</Link>
            </div>
          ) : null}
        </section>
      ) : null}
      <HintPanel hints={revealedHints} onReveal={revealHint} complete={hintProgress.revealedStages.length === 3} />
      <LessonFeedback courseId={courseId} contentId={level.id} />
      <LessonDiscussion courseId={courseId} contentId={level.id} />
      {sharePayload ? <SharePanel compact heading="Поділися цією вправою" description="Публічне посилання відкриває перший рівень без авторизації та не містить результату дитини." payload={sharePayload} /> : null}
    </main>
  );
}
