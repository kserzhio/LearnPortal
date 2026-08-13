# Kids Coding deterministic execution engine

## Purpose

`src/features/kids-coding/engine` is the pure TypeScript boundary between authored programs and the future game UI. It has no React, DOM, browser storage, network or Supabase dependency. The same challenge and validated program always produce the same ordered events, final state and result.

## Data flow

```text
untrusted program JSON
        ↓
strict Program AST parser
        ↓
execution engine → ordered GameEvent stream → future renderer/animation
        ↓
runtime game state
        ↓
objective + star validation
        ↓
versioned serializable attempt
```

The renderer consumes events such as `move`, `turn`, `jump`, `pick-item`, `collision`, `repeat-iteration`, `condition` and `function-call`. It does not traverse the Program AST. This keeps `repeat`, `if` and functions out of UI-specific logic.

## Program contract

Programs use schema `systema.kids-program`, version `1`. Supported nodes are:

- primitive `command` for move, left/right turn, jump and item pickup;
- `repeat` with a bounded count and nested body;
- `if` with `path-ahead-clear`, `item-here` or `facing-direction` predicates;
- `call-function` referencing a separately declared, non-recursive function.

The parser rejects unknown fields, unavailable commands, mismatched block kinds, invalid arguments, duplicate IDs, missing or recursive functions, excessive nesting and oversized programs. It returns public structured issues instead of executable code or technical stack traces.

## Lifecycle

Create an isolated engine per active level with `createGameExecutionEngine({ challenge })`:

1. `load(program)` validates and freezes the program.
2. `run({ stepDelayMs, onEvent })` starts from the challenge's initial state every time.
3. `pause()`, `resume()` and `cancel()` control an active run.
4. `reset()` cancels stale work and restores the initial state while retaining the program by default.
5. `serializeAttempt()` returns schema `systema.kids-level-attempt`, version `1`, only after a run produced a result.

Animation timing is injected through `ExecutionClock`. Tests use an immediate clock; the UI can use the default cancellable timer. A command such as `hero.move(3)` counts as one authored source command but emits three `move` events, so its visual effect remains step-by-step.

## Determinism and limits

- Events use an increasing sequence number and contain no timestamps or random values.
- Every run reconstructs runtime state from the immutable challenge configuration.
- A generation token prevents an old cancelled run from mutating state after reset or program replacement.
- Programs are bounded during parsing, and execution has an independent operation/control-step budget.
- Returned snapshots are cloned so consumer mutation cannot change internal engine state.

Run `npm run check:kids-game-engine` to verify deterministic replay, multi-step movement, repeat/if/function events, success, collision, invalid commands, pause/resume, cancellation, reset, state isolation and JSON attempt serialization.
