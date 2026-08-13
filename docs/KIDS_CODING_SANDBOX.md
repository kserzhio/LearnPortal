# Kids Coding restricted JavaScript sandbox

## Security decision

Code Mode does not execute learner source as JavaScript. There is no `eval`, `Function`, dynamic `<script>`, injected module, iframe execution or access to application globals. A bounded tokenizer and allow-list parser compile the supported learning syntax directly into the same immutable `ProgramDefinition` used by Block Mode.

```text
untrusted learner text
        ↓
source/token/depth/step limits
        ↓
restricted JavaScript parser
        ↓
validated Program AST
        ↓
deterministic game engine
```

Because learner text never becomes executable host-language code, it has no communication path to DOM, cookies, storage, network, workers, Node APIs or portal state. This design works with a restrictive Content Security Policy and does not require `unsafe-eval`, `blob:` workers or a new runtime dependency.

## Supported learning subset

The initial subset intentionally matches the first Code Adventure levels:

```js
hero.move();
hero.move(3);
hero.turnLeft();
hero.turnRight();
hero.jump();
hero.pick();

const steps = 3;
hero.move(steps);

for (let i = 0; i < 3; i++) {
  hero.move();
}

if (hero.pathAheadClear()) {
  advance();
} else {
  hero.turnLeft();
}

function advance() {
  hero.jump();
}
```

Numbers and variables are resolved while compiling. Loops must use the exact statically bounded `for (let i = 0; i < count; i++)` form. Functions have no parameters in schema version 1. Every command must also be enabled by the current challenge configuration.

This is a learning language with JavaScript-like syntax, not a claim of full ECMAScript support. Unsupported syntax produces a child-friendly structured error with a stable code and source location.

## Explicitly unavailable

- browser and network APIs such as `window`, `document`, `fetch`, WebSocket and storage;
- `eval`, `Function`, constructors, prototypes and dynamic property access;
- imports, classes, `new`, async code and host objects;
- strings, arrays and object literals in the first schema version;
- unbounded `while`/`do` loops and dynamically changing loop bounds;
- arbitrary assignments or expressions.

The deny-list improves the specific error message, but it is not the security boundary. The allow-list grammar is the boundary: input that is not one of the supported productions cannot become a Program AST node.

## Resource and lifecycle limits

Default independent guards cover:

- source length: 12,000 characters;
- token count: 2,000;
- parser operations: 8,000;
- nesting depth: 10;
- loop iterations: 50 per loop;
- engine execution steps: 1,000;
- total run time: 30 seconds, capped at 120 seconds by configuration.

Compilation accepts an `AbortSignal`. Runtime supports signal cancellation plus the engine's pause, resume, cancel and reset lifecycle. A timeout cancels the engine, returns `execution-time-limit-exceeded` and does not create a persistable attempt.

## Public error contract

Compilation returns either a validated program or:

```ts
type SandboxPublicError = {
  valid: false;
  code: string;
  message: string;
  affectedIds: readonly string[];
  location: { line: number; column: number } | null;
};
```

The public message never contains a JavaScript exception name, stack trace or internal AST detail. Server-side persistence must compile the submitted source or validate the submitted Program AST again and recompute the level result; client attempts are not trusted.

## Verification

Run `npm run check:kids-js-sandbox`. The corpus covers valid commands, variables, loops, conditions and functions; deterministic engine execution; forbidden global/API and escape attempts; dynamic access; unbounded loops; unavailable challenge commands; source/token/parser limits; cancellation and wall-clock timeout.

A Worker remains an optional future performance adapter if editor workloads grow. It is not required as a security boundary because arbitrary learner JavaScript is never executed.
