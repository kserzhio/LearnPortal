import type { ChallengeDefinition, CommandDefinition, CommandKind } from "../domain";
import {
  KIDS_PROGRAM_SCHEMA,
  KIDS_PROGRAM_SCHEMA_VERSION,
  parseProgram,
  type ProgramDefinition,
  type ProgramFunction,
  type ProgramInstruction,
} from "../engine";

const DEFAULT_MAX_SOURCE_LENGTH = 12_000;
const DEFAULT_MAX_TOKENS = 2_000;
const DEFAULT_MAX_PARSE_STEPS = 8_000;
const DEFAULT_MAX_NESTING = 10;
const DEFAULT_MAX_LOOP_ITERATIONS = 50;

const forbiddenIdentifiers = new Set([
  "window", "document", "globalThis", "self", "fetch", "XMLHttpRequest", "WebSocket",
  "localStorage", "sessionStorage", "indexedDB", "caches", "cookieStore", "navigator",
  "location", "history", "postMessage", "importScripts", "Worker", "SharedWorker", "eval",
  "Function", "constructor", "prototype", "__proto__", "require", "process", "Deno", "Bun",
  "import", "export", "class", "new", "this", "try", "catch", "throw", "async", "await",
]);

export type SandboxLimits = Readonly<{
  maxSourceLength?: number;
  maxTokens?: number;
  maxParseSteps?: number;
  maxNesting?: number;
  maxLoopIterations?: number;
}>;

export type SandboxPublicError = Readonly<{
  valid: false;
  code: string;
  message: string;
  affectedIds: readonly string[];
  location: Readonly<{ line: number; column: number }> | null;
}>;

export type SandboxCompileResult =
  | Readonly<{ success: true; program: ProgramDefinition }>
  | Readonly<{ success: false; error: SandboxPublicError }>;

type TokenKind = "identifier" | "number" | "symbol" | "eof";
type Token = Readonly<{
  kind: TokenKind;
  value: string;
  line: number;
  column: number;
}>;

type ResolvedLimits = Readonly<{
  maxSourceLength: number;
  maxTokens: number;
  maxParseSteps: number;
  maxNesting: number;
  maxLoopIterations: number;
}>;

class SandboxFailure extends Error {
  readonly publicError: SandboxPublicError;

  constructor(publicError: SandboxPublicError) {
    super(publicError.code);
    this.name = "SandboxFailure";
    this.publicError = publicError;
  }
}

function resolvePositiveInteger(value: number | undefined, fallback: number) {
  return Number.isInteger(value) && (value as number) > 0 ? value as number : fallback;
}

function resolveLimits(limits: SandboxLimits | undefined): ResolvedLimits {
  return {
    maxSourceLength: resolvePositiveInteger(limits?.maxSourceLength, DEFAULT_MAX_SOURCE_LENGTH),
    maxTokens: resolvePositiveInteger(limits?.maxTokens, DEFAULT_MAX_TOKENS),
    maxParseSteps: resolvePositiveInteger(limits?.maxParseSteps, DEFAULT_MAX_PARSE_STEPS),
    maxNesting: resolvePositiveInteger(limits?.maxNesting, DEFAULT_MAX_NESTING),
    maxLoopIterations: resolvePositiveInteger(limits?.maxLoopIterations, DEFAULT_MAX_LOOP_ITERATIONS),
  };
}

function publicError(
  code: string,
  message: string,
  token: Pick<Token, "line" | "column"> | null = null,
  affectedIds: readonly string[] = [],
): SandboxPublicError {
  return {
    valid: false,
    code,
    message,
    affectedIds: [...affectedIds],
    location: token ? { line: token.line, column: token.column } : null,
  };
}

function fail(
  code: string,
  message: string,
  token: Pick<Token, "line" | "column"> | null = null,
  affectedIds: readonly string[] = [],
): never {
  throw new SandboxFailure(publicError(code, message, token, affectedIds));
}

function checkCancelled(signal: AbortSignal | undefined, token: Pick<Token, "line" | "column"> | null = null) {
  if (signal?.aborted) fail("sandbox-cancelled", "Перевірку коду зупинено.", token);
}

function tokenize(source: string, limits: ResolvedLimits, signal?: AbortSignal): Token[] {
  if (source.length > limits.maxSourceLength) {
    fail("sandbox-source-too-large", "Код задовгий для одного рівня. Залиши лише потрібні команди.");
  }
  const tokens: Token[] = [];
  let offset = 0;
  let line = 1;
  let column = 1;

  function advance() {
    const character = source[offset];
    offset += 1;
    if (character === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    return character;
  }

  function add(kind: TokenKind, value: string, tokenLine: number, tokenColumn: number) {
    tokens.push({ kind, value, line: tokenLine, column: tokenColumn });
    if (tokens.length > limits.maxTokens) {
      fail("sandbox-too-many-tokens", "У програмі забагато частин. Скороти її або розбий задум на простіші кроки.", tokens.at(-1) ?? null);
    }
  }

  while (offset < source.length) {
    if (offset % 64 === 0) checkCancelled(signal, { line, column });
    const character = source[offset];
    if (/\s/u.test(character)) {
      advance();
      continue;
    }
    if (character === "/" && source[offset + 1] === "/") {
      while (offset < source.length && source[offset] !== "\n") advance();
      continue;
    }
    if (character === "/" && source[offset + 1] === "*") {
      const commentLine = line;
      const commentColumn = column;
      advance();
      advance();
      while (offset < source.length && !(source[offset] === "*" && source[offset + 1] === "/")) advance();
      if (offset >= source.length) fail("sandbox-unclosed-comment", "Коментар не закрито.", { line: commentLine, column: commentColumn });
      advance();
      advance();
      continue;
    }

    const tokenLine = line;
    const tokenColumn = column;
    if (/[A-Za-z_$]/u.test(character)) {
      let value = "";
      while (offset < source.length && /[A-Za-z0-9_$]/u.test(source[offset])) value += advance();
      add("identifier", value, tokenLine, tokenColumn);
      continue;
    }
    if (/[0-9]/u.test(character)) {
      let value = "";
      while (offset < source.length && /[0-9]/u.test(source[offset])) value += advance();
      add("number", value, tokenLine, tokenColumn);
      continue;
    }
    const pair = source.slice(offset, offset + 2);
    if (pair === "++") {
      advance();
      advance();
      add("symbol", pair, tokenLine, tokenColumn);
      continue;
    }
    if (".(),;={}<>".includes(character)) {
      add("symbol", advance(), tokenLine, tokenColumn);
      continue;
    }
    if (["'", "\"", "`"].includes(character)) {
      fail("sandbox-strings-not-supported", "У цьому рівні текстові значення ще не підтримуються.", { line: tokenLine, column: tokenColumn });
    }
    if (character === "[") {
      fail("sandbox-dynamic-access-forbidden", "Доступ через квадратні дужки тут заборонений.", { line: tokenLine, column: tokenColumn });
    }
    fail("sandbox-unsupported-syntax", "Ця конструкція JavaScript ще не підтримується в навчальному режимі.", { line: tokenLine, column: tokenColumn });
  }
  tokens.push({ kind: "eof", value: "", line, column });
  return tokens;
}

function stableFunctionId(identifier: string) {
  return identifier.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

class RestrictedParser {
  private index = 0;
  private parseSteps = 0;
  private nodeCounter = 0;
  private readonly functions: ProgramFunction[] = [];

  constructor(
    private readonly tokens: readonly Token[],
    private readonly challenge: ChallengeDefinition,
    private readonly limits: ResolvedLimits,
    private readonly signal?: AbortSignal,
  ) {}

  parse(): ProgramDefinition {
    const instructions = this.parseStatements(new Map(), 0, null);
    this.expectKind("eof", "Кінець програми прочитано некоректно.");
    return {
      schema: KIDS_PROGRAM_SCHEMA,
      schemaVersion: KIDS_PROGRAM_SCHEMA_VERSION,
      instructions,
      functions: this.functions,
    };
  }

  private current() {
    return this.tokens[this.index];
  }

  private step() {
    this.parseSteps += 1;
    if (this.parseSteps > this.limits.maxParseSteps) {
      fail("sandbox-parse-limit-exceeded", "Програма надто складна для одного рівня.", this.current());
    }
    checkCancelled(this.signal, this.current());
  }

  private consume() {
    this.step();
    const token = this.current();
    this.index += 1;
    return token;
  }

  private matches(value: string) {
    return this.current().value === value;
  }

  private accept(value: string) {
    if (!this.matches(value)) return false;
    this.consume();
    return true;
  }

  private expect(value: string, message = "Перевір дужки та розділові знаки біля цієї команди.") {
    if (!this.matches(value)) fail("sandbox-syntax-error", message, this.current());
    return this.consume();
  }

  private expectKind(kind: TokenKind, message: string) {
    if (this.current().kind !== kind) fail("sandbox-syntax-error", message, this.current());
    return this.consume();
  }

  private identifier(message = "Тут очікується назва.") {
    const token = this.expectKind("identifier", message);
    if (!/^[A-Za-z][A-Za-z0-9]*$/u.test(token.value)) {
      fail("sandbox-invalid-name", "Використай назву лише з латинських літер і цифр.", token, [token.value]);
    }
    if (forbiddenIdentifiers.has(token.value)) {
      fail("sandbox-api-forbidden", "Ця можливість недоступна в навчальному середовищі.", token, [token.value]);
    }
    return token;
  }

  private nextNodeId(label: string) {
    this.nodeCounter += 1;
    return `code-${stableFunctionId(label)}-${this.nodeCounter}`;
  }

  private command(kind: CommandKind, token: Token): CommandDefinition {
    const command = this.challenge.availableCommands.find((entry) => entry.kind === kind);
    if (!command) {
      fail("sandbox-command-unavailable", "Ця команда ще не відкрита в поточному рівні.", token, [kind]);
    }
    return command;
  }

  private parseStatements(variables: Map<string, number>, depth: number, terminator: string | null): ProgramInstruction[] {
    if (depth > this.limits.maxNesting) {
      fail("sandbox-nesting-limit-exceeded", "У програмі забагато вкладених блоків.", this.current());
    }
    const instructions: ProgramInstruction[] = [];
    while (this.current().kind !== "eof" && (terminator === null || !this.matches(terminator))) {
      if (this.accept(";")) continue;
      const token = this.current();
      if (token.value === "const" || token.value === "let") {
        this.parseVariable(variables);
        continue;
      }
      if (token.value === "for") {
        instructions.push(this.parseFor(variables, depth));
        continue;
      }
      if (token.value === "while" || token.value === "do") {
        fail("sandbox-unbounded-loop-forbidden", "Використай обмежений цикл for, щоб програма гарантовано зупинилася.", token);
      }
      if (token.value === "if") {
        instructions.push(this.parseIf(variables, depth));
        continue;
      }
      if (token.value === "function") {
        this.parseFunction(variables, depth);
        continue;
      }
      if (token.value === "hero") {
        instructions.push(this.parseHeroCommand(variables));
        continue;
      }
      if (token.kind === "identifier") {
        instructions.push(this.parseFunctionCall());
        continue;
      }
      fail("sandbox-unsupported-statement", "Почни рядок з команди hero, змінної, for, if або function.", token);
    }
    if (terminator !== null) this.expect(terminator, "Закрий блок фігурною дужкою }.");
    return instructions;
  }

  private parseVariable(variables: Map<string, number>) {
    this.consume();
    const name = this.identifier("Після const або let потрібна назва змінної.");
    this.expect("=", "Присвой змінній ціле число через =.");
    const value = this.parseInteger(variables);
    variables.set(name.value, value);
    this.accept(";");
  }

  private parseInteger(variables: ReadonlyMap<string, number>) {
    const token = this.current();
    if (token.kind === "number") {
      this.consume();
      const value = Number(token.value);
      if (!Number.isSafeInteger(value)) fail("sandbox-number-out-of-range", "Число завелике для цього рівня.", token);
      return value;
    }
    if (token.kind === "identifier") {
      const name = this.identifier();
      const value = variables.get(name.value);
      if (value === undefined) fail("sandbox-variable-unknown", "Цю змінну ще не створено.", name, [name.value]);
      return value;
    }
    fail("sandbox-integer-required", "Тут потрібне ціле число або числова змінна.", token);
  }

  private parseHeroMethodStart() {
    const hero = this.expect("hero");
    this.expect(".", "Після hero додай крапку та назву команди.");
    const method = this.identifier("Після hero. потрібна назва команди.");
    this.expect("(", "Після назви команди відкрий круглі дужки.");
    return { hero, method };
  }

  private parseHeroCommand(variables: ReadonlyMap<string, number>): ProgramInstruction {
    const { method } = this.parseHeroMethodStart();
    const methodKinds: Readonly<Record<string, CommandKind>> = {
      move: "move-forward",
      turnLeft: "turn-left",
      turnRight: "turn-right",
      jump: "jump",
      pick: "pick-item",
    };
    const kind = methodKinds[method.value];
    if (!kind) fail("sandbox-command-not-allowed", "Доступні лише навчальні команди героя.", method, [method.value]);
    const command = this.command(kind, method);
    let argument: number | null = null;
    if (!this.matches(")")) argument = this.parseInteger(variables);
    this.expect(")", "Закрий виклик команди круглою дужкою ).");
    this.accept(";");
    if (command.parameters.length === 0 && argument !== null) {
      fail("sandbox-unexpected-argument", "Ця команда не приймає число.", method, [method.value]);
    }
    if (command.parameters.length > 1) {
      fail("sandbox-command-configuration-invalid", "Цю команду поки не можна використати в Code Mode.", method, [command.id]);
    }
    const argumentsRecord: Record<string, number> = {};
    if (command.parameters[0]) {
      const parameter = command.parameters[0];
      const value = argument ?? parameter.defaultValue;
      if (value < parameter.minimum || value > parameter.maximum) {
        fail(
          "sandbox-argument-out-of-range",
          `Для цієї команди потрібне число від ${parameter.minimum} до ${parameter.maximum}.`,
          method,
          [command.id],
        );
      }
      argumentsRecord[parameter.id] = value;
    }
    return {
      id: this.nextNodeId(method.value),
      type: "command",
      commandId: command.id,
      arguments: argumentsRecord,
    };
  }

  private parseFor(variables: Map<string, number>, depth: number): ProgramInstruction {
    const forToken = this.expect("for");
    const command = this.command("repeat", forToken);
    this.expect("(");
    this.expect("let", "Цикл має починатися з let, наприклад: for (let i = 0; i < 3; i++).");
    const iterator = this.identifier("Дай лічильнику циклу коротку назву, наприклад i.");
    this.expect("=");
    const start = this.parseInteger(variables);
    if (start !== 0) fail("sandbox-loop-must-start-at-zero", "Лічильник циклу має починатися з 0.", iterator);
    this.expect(";");
    const comparedIterator = this.identifier();
    if (comparedIterator.value !== iterator.value) fail("sandbox-loop-counter-mismatch", "У всіх частинах циклу використай той самий лічильник.", comparedIterator);
    this.expect("<", "Використай умову i < кількість.");
    const count = this.parseInteger(variables);
    if (count < 1 || count > this.limits.maxLoopIterations) {
      fail("sandbox-loop-limit-exceeded", `Цикл може повторюватися від 1 до ${this.limits.maxLoopIterations} разів.`, iterator);
    }
    this.expect(";");
    const incrementedIterator = this.identifier();
    if (incrementedIterator.value !== iterator.value) fail("sandbox-loop-counter-mismatch", "Збільшуй той самий лічильник циклу.", incrementedIterator);
    this.expect("++", "Заверши заголовок циклу через i++.");
    this.expect(")");
    this.expect("{", "Після for відкрий блок фігурною дужкою {.");
    const bodyVariables = new Map(variables).set(iterator.value, 0);
    const body = this.parseStatements(bodyVariables, depth + 1, "}");
    return { id: this.nextNodeId("repeat"), type: "repeat", commandId: command.id, count, body };
  }

  private parseIf(variables: Map<string, number>, depth: number): ProgramInstruction {
    const ifToken = this.expect("if");
    const command = this.command("if", ifToken);
    this.expect("(");
    this.expect("hero", "Умова має перевіряти стан героя.");
    this.expect(".");
    const predicate = this.identifier("Додай назву перевірки героя.");
    if (predicate.value !== "pathAheadClear") {
      fail("sandbox-condition-not-allowed", "У цьому рівні доступна умова hero.pathAheadClear().", predicate, [predicate.value]);
    }
    this.expect("(");
    this.expect(")");
    this.expect(")");
    this.expect("{", "Після if відкрий блок фігурною дужкою {.");
    const thenInstructions = this.parseStatements(new Map(variables), depth + 1, "}");
    let elseInstructions: readonly ProgramInstruction[] = [];
    if (this.accept("else")) {
      this.expect("{", "Після else відкрий блок фігурною дужкою {.");
      elseInstructions = this.parseStatements(new Map(variables), depth + 1, "}");
    }
    return {
      id: this.nextNodeId("if"),
      type: "if",
      commandId: command.id,
      predicate: { kind: "path-ahead-clear" },
      then: thenInstructions,
      else: elseInstructions,
    };
  }

  private parseFunction(variables: Map<string, number>, depth: number) {
    const functionToken = this.expect("function");
    const name = this.identifier("Після function потрібна назва.");
    this.command("call-function", functionToken);
    this.expect("(");
    this.expect(")", "Навчальні functions поки не приймають parameters.");
    this.expect("{", "Відкрий тіло function фігурною дужкою {.");
    const instructions = this.parseStatements(new Map(variables), depth + 1, "}");
    this.functions.push({ id: stableFunctionId(name.value), instructions });
  }

  private parseFunctionCall(): ProgramInstruction {
    const name = this.identifier();
    const command = this.command("call-function", name);
    this.expect("(");
    this.expect(")", "Навчальні functions поки викликаються без arguments.");
    this.accept(";");
    return {
      id: this.nextNodeId("call"),
      type: "call-function",
      commandId: command.id,
      functionId: stableFunctionId(name.value),
    };
  }
}

export function compileRestrictedJavaScript(
  source: string,
  challenge: ChallengeDefinition,
  options: Readonly<{ limits?: SandboxLimits; signal?: AbortSignal }> = {},
): SandboxCompileResult {
  if (typeof source !== "string") {
    return { success: false, error: publicError("sandbox-source-required", "Додай JavaScript-команди для героя.") };
  }
  if (source.trim().length === 0) {
    return { success: false, error: publicError("sandbox-source-empty", "Додай хоча б одну команду для героя.") };
  }
  try {
    checkCancelled(options.signal);
    const limits = resolveLimits(options.limits);
    const tokens = tokenize(source, limits, options.signal);
    const candidate = new RestrictedParser(tokens, challenge, limits, options.signal).parse();
    if (candidate.instructions.length === 0) {
      return { success: false, error: publicError("sandbox-no-commands", "Додай команду, яку герой має виконати.") };
    }
    const parsed = parseProgram(candidate, challenge);
    if (!parsed.success) {
      const firstIssue = parsed.issues[0];
      return {
        success: false,
        error: publicError("sandbox-program-invalid", "Програму не вдалося підготувати. Перевір команди та functions.", null, firstIssue?.affectedIds),
      };
    }
    return { success: true, program: parsed.data };
  } catch (error) {
    if (error instanceof SandboxFailure) return { success: false, error: error.publicError };
    return { success: false, error: publicError("sandbox-invalid-code", "Код не вдалося прочитати. Перевір його та спробуй ще раз.") };
  }
}
