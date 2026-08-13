import type { ChallengeDefinition, CommandDefinition } from "../domain";
import {
  applyPrimitiveOperation,
  cloneRuntimeState,
  createInitialRuntimeState,
  evaluateLevelResult,
  isProgramPredicateTrue,
  recordCommandUse,
  type GameEvent,
  type GameEventType,
  type LevelResult,
  type RuntimeGameState,
} from "./game-state";
import {
  getProgramSourceCommandCount,
  parseProgram,
  type ProgramDefinition,
  type ProgramInstruction,
  type ProgramIssue,
} from "./program";

export const KIDS_LEVEL_ATTEMPT_SCHEMA = "systema.kids-level-attempt" as const;
export const KIDS_LEVEL_ATTEMPT_SCHEMA_VERSION = 1 as const;

const DEFAULT_STEP_DELAY_MS = 300;
const MAX_STEP_DELAY_MS = 2_000;
const DEFAULT_MAX_EXECUTION_STEPS = 1_000;

export type ExecutionStatus =
  | "idle"
  | "ready"
  | "invalid"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export type ExecutionSnapshot = Readonly<{
  status: ExecutionStatus;
  game: RuntimeGameState;
  program: ProgramDefinition | null;
  programIssues: readonly ProgramIssue[];
  result: LevelResult | null;
  lastEvent: GameEvent | null;
}>;

export type SerializedLevelAttempt = Readonly<{
  schema: typeof KIDS_LEVEL_ATTEMPT_SCHEMA;
  schemaVersion: typeof KIDS_LEVEL_ATTEMPT_SCHEMA_VERSION;
  challengeId: string;
  challengeContentVersion: number;
  program: ProgramDefinition;
  finalGameState: RuntimeGameState;
  result: LevelResult;
}>;

export type ExecutionClock = Readonly<{
  wait(milliseconds: number, signal: AbortSignal): Promise<void>;
}>;

export type RunOptions = Readonly<{
  stepDelayMs?: number;
  onEvent?: (event: GameEvent, snapshot: ExecutionSnapshot) => void;
}>;

export type GameExecutionEngine = Readonly<{
  read(): ExecutionSnapshot;
  subscribe(listener: (snapshot: ExecutionSnapshot) => void): () => void;
  load(program: unknown): ExecutionSnapshot;
  run(options?: RunOptions): Promise<LevelResult>;
  pause(): boolean;
  resume(): boolean;
  cancel(): boolean;
  reset(options?: Readonly<{ keepProgram?: boolean }>): ExecutionSnapshot;
  serializeAttempt(): SerializedLevelAttempt | null;
}>;

class ExecutionCancelledError extends Error {
  constructor() {
    super("Execution cancelled");
    this.name = "ExecutionCancelledError";
  }
}

class ExecutionLimitError extends Error {
  constructor() {
    super("Execution step limit exceeded");
    this.name = "ExecutionLimitError";
  }
}

const defaultClock: ExecutionClock = {
  wait(milliseconds, signal) {
    if (signal.aborted) return Promise.reject(new ExecutionCancelledError());
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      }, milliseconds);
      const abort = () => {
        clearTimeout(timeout);
        reject(new ExecutionCancelledError());
      };
      signal.addEventListener("abort", abort, { once: true });
    });
  },
};

function cloneResult(result: LevelResult | null): LevelResult | null {
  if (!result) return null;
  return {
    ...result,
    affectedIds: [...result.affectedIds],
    metrics: { ...result.metrics, usedConcepts: [...result.metrics.usedConcepts] },
  };
}

function cloneEvent(event: GameEvent | null): GameEvent | null {
  return event
    ? { ...event, affectedIds: [...event.affectedIds], detail: { ...event.detail } }
    : null;
}

function runtimeResult(code: string, message: string, state: RuntimeGameState): LevelResult {
  return {
    valid: false,
    code,
    message,
    affectedIds: [state.character.id],
    stars: 0,
    metrics: {
      commandCount: state.sourceCommandCount,
      operationCount: state.operationCount,
      usedConcepts: [...state.usedConcepts],
    },
  };
}

function clampDelay(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_STEP_DELAY_MS;
  return Math.min(MAX_STEP_DELAY_MS, Math.max(0, value));
}

export function createGameExecutionEngine(options: Readonly<{
  challenge: ChallengeDefinition;
  clock?: ExecutionClock;
  maxExecutionSteps?: number;
}>): GameExecutionEngine {
  const { challenge } = options;
  const clock = options.clock ?? defaultClock;
  const maxExecutionSteps = Number.isInteger(options.maxExecutionSteps) && (options.maxExecutionSteps ?? 0) > 0
    ? options.maxExecutionSteps as number
    : DEFAULT_MAX_EXECUTION_STEPS;
  const listeners = new Set<(snapshot: ExecutionSnapshot) => void>();

  let status: ExecutionStatus = "idle";
  let game = createInitialRuntimeState(challenge, 0);
  let program: ProgramDefinition | null = null;
  let programIssues: readonly ProgramIssue[] = [];
  let result: LevelResult | null = null;
  let lastEvent: GameEvent | null = null;
  let sequence = 0;
  let executionSteps = 0;
  let generation = 0;
  let controller: AbortController | null = null;
  let activeRun: Promise<LevelResult> | null = null;
  let releasePause: (() => void) | null = null;

  function snapshot(): ExecutionSnapshot {
    return {
      status,
      game: cloneRuntimeState(game),
      program,
      programIssues: programIssues.map((entry) => ({ ...entry, affectedIds: [...entry.affectedIds] })),
      result: cloneResult(result),
      lastEvent: cloneEvent(lastEvent),
    };
  }

  function notify() {
    const current = snapshot();
    listeners.forEach((listener) => listener(current));
  }

  function assertActive(runGeneration: number, signal: AbortSignal) {
    if (signal.aborted || generation !== runGeneration) throw new ExecutionCancelledError();
  }

  async function waitUntilRunnable(runGeneration: number, signal: AbortSignal) {
    assertActive(runGeneration, signal);
    while (status === "paused") {
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          releasePause = null;
          reject(new ExecutionCancelledError());
        };
        releasePause = () => {
          signal.removeEventListener("abort", abort);
          releasePause = null;
          resolve();
        };
        signal.addEventListener("abort", abort, { once: true });
      });
      assertActive(runGeneration, signal);
    }
  }

  function countExecutionStep() {
    executionSteps += 1;
    if (executionSteps > maxExecutionSteps) throw new ExecutionLimitError();
  }

  async function publishEvent(
    event: GameEvent,
    runGeneration: number,
    signal: AbortSignal,
    delay: number,
    onEvent?: RunOptions["onEvent"],
  ) {
    assertActive(runGeneration, signal);
    lastEvent = event;
    notify();
    onEvent?.(cloneEvent(event) as GameEvent, snapshot());
    assertActive(runGeneration, signal);
    if (delay > 0) await clock.wait(delay, signal);
  }

  function controlEvent(
    type: GameEventType,
    code: string,
    instruction: ProgramInstruction | null,
    detail: Readonly<Record<string, string | number | boolean>> = {},
    affectedIds: readonly string[] = [],
  ): GameEvent {
    sequence += 1;
    return {
      sequence,
      type,
      code,
      instructionId: instruction?.id ?? null,
      commandId: instruction?.commandId ?? null,
      affectedIds: [...affectedIds],
      detail,
    };
  }

  function commandById(commandId: string): CommandDefinition {
    const command = challenge.availableCommands.find((entry) => entry.id === commandId);
    if (!command) throw new ExecutionLimitError();
    return command;
  }

  async function executeInstructions(
    instructions: readonly ProgramInstruction[],
    functions: ReadonlyMap<string, readonly ProgramInstruction[]>,
    runGeneration: number,
    signal: AbortSignal,
    delay: number,
    onEvent?: RunOptions["onEvent"],
  ): Promise<void> {
    for (const instruction of instructions) {
      await waitUntilRunnable(runGeneration, signal);
      countExecutionStep();
      const command = commandById(instruction.commandId);
      game = recordCommandUse(game, command);

      if (instruction.type === "repeat") {
        for (let iteration = 1; iteration <= instruction.count; iteration += 1) {
          await waitUntilRunnable(runGeneration, signal);
          countExecutionStep();
          await publishEvent(
            controlEvent("repeat-iteration", "repeat-iteration-started", instruction, { iteration, count: instruction.count }),
            runGeneration,
            signal,
            delay,
            onEvent,
          );
          await executeInstructions(instruction.body, functions, runGeneration, signal, delay, onEvent);
        }
        continue;
      }

      if (instruction.type === "if") {
        const conditionPassed = isProgramPredicateTrue(instruction.predicate, challenge, game);
        await publishEvent(
          controlEvent("condition", conditionPassed ? "condition-true" : "condition-false", instruction, { passed: conditionPassed }),
          runGeneration,
          signal,
          delay,
          onEvent,
        );
        await executeInstructions(conditionPassed ? instruction.then : instruction.else, functions, runGeneration, signal, delay, onEvent);
        continue;
      }

      if (instruction.type === "call-function") {
        const functionInstructions = functions.get(instruction.functionId);
        if (!functionInstructions) throw new ExecutionLimitError();
        await publishEvent(
          controlEvent("function-call", "function-called", instruction, { functionId: instruction.functionId }, [instruction.functionId]),
          runGeneration,
          signal,
          delay,
          onEvent,
        );
        await executeInstructions(functionInstructions, functions, runGeneration, signal, delay, onEvent);
        continue;
      }

      const operationCount = command.kind === "move-forward"
        ? (typeof instruction.arguments.steps === "number" ? instruction.arguments.steps : 1)
        : 1;
      for (let operationIndex = 0; operationIndex < operationCount; operationIndex += 1) {
        await waitUntilRunnable(runGeneration, signal);
        countExecutionStep();
        sequence += 1;
        const transition = applyPrimitiveOperation(challenge, game, {
          instructionId: instruction.id,
          commandId: instruction.commandId,
          kind: command.kind as "move-forward" | "turn-left" | "turn-right" | "jump" | "pick-item",
          arguments: instruction.arguments,
        }, sequence);
        game = transition.state;
        await publishEvent(transition.event, runGeneration, signal, delay, onEvent);
      }
    }
  }

  async function execute(runOptions: RunOptions): Promise<LevelResult> {
    if (!program) {
      const notReady = runtimeResult("program-not-ready", "Спочатку додай команди до програми.", game);
      result = notReady;
      status = "invalid";
      notify();
      return cloneResult(notReady) as LevelResult;
    }

    generation += 1;
    const runGeneration = generation;
    const runController = new AbortController();
    controller = runController;
    status = "running";
    result = null;
    lastEvent = null;
    sequence = 0;
    executionSteps = 0;
    game = createInitialRuntimeState(challenge, getProgramSourceCommandCount(program));
    notify();

    try {
      const functions = new Map(program.functions.map((entry) => [entry.id, entry.instructions]));
      await executeInstructions(
        program.instructions,
        functions,
        runGeneration,
        runController.signal,
        clampDelay(runOptions.stepDelayMs),
        runOptions.onEvent,
      );
      assertActive(runGeneration, runController.signal);
      result = evaluateLevelResult(challenge, game);
      status = result.valid ? "completed" : "failed";
      await publishEvent(
        controlEvent(result.valid ? "completed" : "objective-incomplete", result.code, null, {}, result.affectedIds),
        runGeneration,
        runController.signal,
        0,
        runOptions.onEvent,
      );
      return cloneResult(result) as LevelResult;
    } catch (error) {
      const cancelled = error instanceof ExecutionCancelledError || runController.signal.aborted || generation !== runGeneration;
      const stoppedResult = runtimeResult(
        cancelled ? "execution-cancelled" : "execution-limit-exceeded",
        cancelled ? "Виконання зупинено. Можна змінити програму й запустити її знову." : "Програма виконує забагато кроків. Скороти цикл або кількість команд.",
        game,
      );
      if (generation === runGeneration) {
        result = stoppedResult;
        status = cancelled ? "cancelled" : "failed";
        sequence += 1;
        lastEvent = {
          sequence,
          type: cancelled ? "cancelled" : "objective-incomplete",
          code: stoppedResult.code,
          instructionId: null,
          commandId: null,
          affectedIds: [...stoppedResult.affectedIds],
          detail: {},
        };
        notify();
      }
      return cloneResult(stoppedResult) as LevelResult;
    } finally {
      if (controller === runController) controller = null;
      releasePause = null;
    }
  }

  return {
    read: snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load(value) {
      if (controller) controller.abort();
      generation += 1;
      activeRun = null;
      releasePause?.();
      const parsed = parseProgram(value, challenge);
      result = null;
      lastEvent = null;
      sequence = 0;
      if (parsed.success) {
        program = parsed.data;
        programIssues = [];
        game = createInitialRuntimeState(challenge, getProgramSourceCommandCount(program));
        status = "ready";
      } else {
        program = null;
        programIssues = parsed.issues;
        game = createInitialRuntimeState(challenge, 0);
        status = "invalid";
      }
      notify();
      return snapshot();
    },
    run(runOptions = {}) {
      if (activeRun) return activeRun;
      const running = execute(runOptions);
      activeRun = running;
      void running.finally(() => {
        if (activeRun === running) activeRun = null;
      });
      return running;
    },
    pause() {
      if (status !== "running") return false;
      status = "paused";
      notify();
      return true;
    },
    resume() {
      if (status !== "paused") return false;
      status = "running";
      releasePause?.();
      notify();
      return true;
    },
    cancel() {
      if (status !== "running" && status !== "paused") return false;
      controller?.abort();
      releasePause?.();
      return true;
    },
    reset(resetOptions = {}) {
      const keepProgram = resetOptions.keepProgram ?? true;
      generation += 1;
      controller?.abort();
      controller = null;
      activeRun = null;
      releasePause?.();
      result = null;
      lastEvent = null;
      sequence = 0;
      executionSteps = 0;
      if (!keepProgram) {
        program = null;
        programIssues = [];
      }
      game = createInitialRuntimeState(challenge, program ? getProgramSourceCommandCount(program) : 0);
      status = program ? "ready" : "idle";
      notify();
      return snapshot();
    },
    serializeAttempt() {
      if (!program || !result) return null;
      return {
        schema: KIDS_LEVEL_ATTEMPT_SCHEMA,
        schemaVersion: KIDS_LEVEL_ATTEMPT_SCHEMA_VERSION,
        challengeId: challenge.id,
        challengeContentVersion: challenge.contentVersion,
        program,
        finalGameState: cloneRuntimeState(game),
        result: cloneResult(result) as LevelResult,
      };
    },
  };
}
