import type { ChallengeDefinition } from "../domain";
import {
  createGameExecutionEngine,
  type ExecutionClock,
  type ExecutionSnapshot,
  type GameEvent,
  type GameExecutionEngine,
  type LevelResult,
  type SerializedLevelAttempt,
} from "../engine";
import {
  compileRestrictedJavaScript,
  type SandboxCompileResult,
  type SandboxLimits,
  type SandboxPublicError,
} from "./restricted-javascript";

const DEFAULT_MAX_RUN_TIME_MS = 30_000;
const MIN_MAX_RUN_TIME_MS = 10;
const MAX_MAX_RUN_TIME_MS = 120_000;

function resolveMaxRunTime(value: number | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_MAX_RUN_TIME_MS;
  return Math.min(MAX_MAX_RUN_TIME_MS, Math.max(MIN_MAX_RUN_TIME_MS, value as number));
}

export type SandboxRunResult =
  | Readonly<{ success: false; phase: "compile"; error: SandboxPublicError }>
  | Readonly<{
    success: true;
    phase: "execution";
    result: LevelResult;
    attempt: SerializedLevelAttempt | null;
  }>;

export type JavaScriptSandbox = Readonly<{
  compile(source: string, options?: Readonly<{ signal?: AbortSignal }>): SandboxCompileResult;
  run(source: string, options?: Readonly<{
    signal?: AbortSignal;
    stepDelayMs?: number;
    onEvent?: (event: GameEvent, snapshot: ExecutionSnapshot) => void;
  }>): Promise<SandboxRunResult>;
  read(): ExecutionSnapshot;
  pause(): boolean;
  resume(): boolean;
  cancel(): boolean;
  reset(): ExecutionSnapshot;
}>;

export function createJavaScriptSandbox(options: Readonly<{
  challenge: ChallengeDefinition;
  limits?: SandboxLimits;
  clock?: ExecutionClock;
  maxExecutionSteps?: number;
  maxRunTimeMs?: number;
}>): JavaScriptSandbox {
  const engine: GameExecutionEngine = createGameExecutionEngine({
    challenge: options.challenge,
    clock: options.clock,
    maxExecutionSteps: options.maxExecutionSteps,
  });
  const maxRunTimeMs = resolveMaxRunTime(options.maxRunTimeMs);

  function compile(source: string, compileOptions: Readonly<{ signal?: AbortSignal }> = {}) {
    return compileRestrictedJavaScript(source, options.challenge, {
      limits: options.limits,
      signal: compileOptions.signal,
    });
  }

  return {
    compile,
    async run(source, runOptions = {}) {
      const compiled = compile(source, { signal: runOptions.signal });
      if (!compiled.success) return { success: false, phase: "compile", error: compiled.error };
      engine.load(compiled.program);
      if (runOptions.signal?.aborted) engine.cancel();
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        engine.cancel();
      }, maxRunTimeMs);
      const abort = () => engine.cancel();
      runOptions.signal?.addEventListener("abort", abort, { once: true });
      try {
        const result = await engine.run({ stepDelayMs: runOptions.stepDelayMs, onEvent: runOptions.onEvent });
        if (timedOut) {
          return {
            success: true,
            phase: "execution",
            result: {
              ...result,
              valid: false,
              code: "execution-time-limit-exceeded",
              message: "Час виконання завершився. Скороти програму або цикл і спробуй ще раз.",
              stars: 0,
            },
            attempt: null,
          };
        }
        return { success: true, phase: "execution", result, attempt: engine.serializeAttempt() };
      } finally {
        clearTimeout(timeout);
        runOptions.signal?.removeEventListener("abort", abort);
      }
    },
    read: engine.read,
    pause: engine.pause,
    resume: engine.resume,
    cancel: engine.cancel,
    reset: () => engine.reset(),
  };
}
