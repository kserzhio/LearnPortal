import type { ChallengeDefinition, CommandDefinition, Direction } from "../domain";

export const KIDS_PROGRAM_SCHEMA = "systema.kids-program" as const;
export const KIDS_PROGRAM_SCHEMA_VERSION = 1 as const;

const stableIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_PROGRAM_DEPTH = 12;
const MAX_PROGRAM_NODES = 200;
const MAX_REPEAT_COUNT = 50;
const MAX_FUNCTIONS = 24;

export type ProgramArgument = string | number | boolean;

export type PrimitiveInstruction = Readonly<{
  id: string;
  type: "command";
  commandId: string;
  arguments: Readonly<Record<string, ProgramArgument>>;
}>;

export type RepeatInstruction = Readonly<{
  id: string;
  type: "repeat";
  commandId: string;
  count: number;
  body: readonly ProgramInstruction[];
}>;

export type ProgramPredicate =
  | Readonly<{ kind: "path-ahead-clear" }>
  | Readonly<{ kind: "item-here"; itemId: string | null }>
  | Readonly<{ kind: "facing-direction"; direction: Direction }>;

export type IfInstruction = Readonly<{
  id: string;
  type: "if";
  commandId: string;
  predicate: ProgramPredicate;
  then: readonly ProgramInstruction[];
  else: readonly ProgramInstruction[];
}>;

export type FunctionCallInstruction = Readonly<{
  id: string;
  type: "call-function";
  commandId: string;
  functionId: string;
}>;

export type ProgramInstruction = PrimitiveInstruction | RepeatInstruction | IfInstruction | FunctionCallInstruction;

export type ProgramFunction = Readonly<{
  id: string;
  instructions: readonly ProgramInstruction[];
}>;

export type ProgramDefinition = Readonly<{
  schema: typeof KIDS_PROGRAM_SCHEMA;
  schemaVersion: typeof KIDS_PROGRAM_SCHEMA_VERSION;
  instructions: readonly ProgramInstruction[];
  functions: readonly ProgramFunction[];
}>;

export type ProgramIssue = Readonly<{
  code: string;
  path: string;
  message: string;
  affectedIds: readonly string[];
}>;

export type ProgramParseResult =
  | Readonly<{ success: true; data: ProgramDefinition }>
  | Readonly<{ success: false; issues: readonly ProgramIssue[] }>;

type IssueList = ProgramIssue[];
type UnknownRecord = Record<string, unknown>;

function issue(issues: IssueList, code: string, path: string, message: string, affectedIds: readonly string[] = []) {
  issues.push({ code, path, message, affectedIds: [...affectedIds] });
}

function record(value: unknown, path: string, allowedKeys: readonly string[], issues: IssueList): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issue(issues, "program-expected-object", path, "Цей елемент програми пошкоджений.");
    return null;
  }
  const result = value as UnknownRecord;
  for (const key of Object.keys(result)) {
    if (!allowedKeys.includes(key)) issue(issues, "program-unknown-field", `${path}.${key}`, "Програма містить невідоме поле.");
  }
  return result;
}

function array(value: unknown, path: string, issues: IssueList): unknown[] {
  if (!Array.isArray(value)) {
    issue(issues, "program-expected-array", path, "Очікується список команд.");
    return [];
  }
  return value;
}

function string(value: unknown, path: string, issues: IssueList, allowEmpty = false) {
  if (typeof value !== "string" || (!allowEmpty && value.trim().length === 0)) {
    issue(issues, "program-expected-string", path, "Команда має містити текстовий ідентифікатор.");
    return "";
  }
  return value.trim();
}

function stableId(value: unknown, path: string, issues: IssueList) {
  const id = string(value, path, issues);
  if (id && !stableIdPattern.test(id)) issue(issues, "program-invalid-id", path, "Ідентифікатор команди має бути у kebab-case.", [id]);
  return id;
}

function integer(value: unknown, path: string, issues: IssueList, minimum: number, maximum: number) {
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    issue(issues, "program-invalid-number", path, `Потрібне ціле число від ${minimum} до ${maximum}.`);
    return minimum;
  }
  return value as number;
}

function commandFor(
  commandId: string,
  challenge: ChallengeDefinition,
  expectedKinds: readonly CommandDefinition["kind"][],
  path: string,
  issues: IssueList,
) {
  const command = challenge.availableCommands.find((entry) => entry.id === commandId);
  if (!command) {
    issue(issues, "program-command-unavailable", path, "Цієї команди немає в поточному рівні.", [commandId]);
    return null;
  }
  if (!expectedKinds.includes(command.kind)) {
    issue(issues, "program-command-kind-mismatch", path, "Команда використана не у своєму типі блока.", [commandId]);
    return null;
  }
  return command;
}

function parseArguments(value: unknown, path: string, command: CommandDefinition | null, issues: IssueList) {
  const source = record(value, path, command?.parameters.map((parameter) => parameter.id) ?? [], issues) ?? {};
  const result: Record<string, ProgramArgument> = {};
  for (const parameter of command?.parameters ?? []) {
    const parameterValue = source[parameter.id];
    if (!Number.isInteger(parameterValue)
      || (parameterValue as number) < parameter.minimum
      || (parameterValue as number) > parameter.maximum) {
      issue(
        issues,
        "program-argument-out-of-range",
        `${path}.${parameter.id}`,
        `Значення має бути цілим числом від ${parameter.minimum} до ${parameter.maximum}.`,
        command ? [command.id] : [],
      );
      result[parameter.id] = parameter.defaultValue;
    } else {
      result[parameter.id] = parameterValue as number;
    }
  }
  return result;
}

function parsePredicate(value: unknown, path: string, issues: IssueList): ProgramPredicate {
  const source = record(value, path, ["kind", "itemId", "direction"], issues) ?? {};
  const kind = string(source.kind, `${path}.kind`, issues);
  if (kind === "item-here") {
    const itemId = source.itemId === null ? null : stableId(source.itemId, `${path}.itemId`, issues);
    return { kind, itemId };
  }
  if (kind === "facing-direction") {
    const direction = string(source.direction, `${path}.direction`, issues);
    if (!["north", "east", "south", "west"].includes(direction)) {
      issue(issues, "program-invalid-direction", `${path}.direction`, "Невідомий напрямок.");
      return { kind, direction: "north" };
    }
    return { kind, direction: direction as Direction };
  }
  if (kind !== "path-ahead-clear") issue(issues, "program-invalid-predicate", `${path}.kind`, "Невідома умова IF.");
  return { kind: "path-ahead-clear" };
}

function parseInstructions(
  value: unknown,
  path: string,
  challenge: ChallengeDefinition,
  issues: IssueList,
  depth: number,
  nodeIds: Set<string>,
): ProgramInstruction[] {
  if (depth > MAX_PROGRAM_DEPTH) {
    issue(issues, "program-too-deep", path, "Програма має забагато вкладених блоків.");
    return [];
  }

  return array(value, path, issues).map((entry, index): ProgramInstruction => {
    const instructionPath = `${path}[${index}]`;
    const source = record(entry, instructionPath, [
      "id", "type", "commandId", "arguments", "count", "body", "predicate", "then", "else", "functionId",
    ], issues) ?? {};
    const id = stableId(source.id, `${instructionPath}.id`, issues);
    if (nodeIds.has(id)) issue(issues, "program-duplicate-instruction", `${instructionPath}.id`, "Кожен блок має мати унікальний ID.", [id]);
    nodeIds.add(id);
    const type = string(source.type, `${instructionPath}.type`, issues);
    const commandId = stableId(source.commandId, `${instructionPath}.commandId`, issues);

    if (type === "repeat") {
      commandFor(commandId, challenge, ["repeat"], `${instructionPath}.commandId`, issues);
      return {
        id,
        type,
        commandId,
        count: integer(source.count, `${instructionPath}.count`, issues, 1, MAX_REPEAT_COUNT),
        body: parseInstructions(source.body, `${instructionPath}.body`, challenge, issues, depth + 1, nodeIds),
      };
    }

    if (type === "if") {
      commandFor(commandId, challenge, ["if"], `${instructionPath}.commandId`, issues);
      return {
        id,
        type,
        commandId,
        predicate: parsePredicate(source.predicate, `${instructionPath}.predicate`, issues),
        then: parseInstructions(source.then, `${instructionPath}.then`, challenge, issues, depth + 1, nodeIds),
        else: parseInstructions(source.else, `${instructionPath}.else`, challenge, issues, depth + 1, nodeIds),
      };
    }

    if (type === "call-function") {
      commandFor(commandId, challenge, ["call-function"], `${instructionPath}.commandId`, issues);
      return {
        id,
        type,
        commandId,
        functionId: stableId(source.functionId, `${instructionPath}.functionId`, issues),
      };
    }

    if (type !== "command") issue(issues, "program-invalid-instruction", `${instructionPath}.type`, "Невідомий тип блока.", [id]);
    const command = commandFor(
      commandId,
      challenge,
      ["move-forward", "turn-left", "turn-right", "jump", "pick-item"],
      `${instructionPath}.commandId`,
      issues,
    );
    return {
      id,
      type: "command",
      commandId,
      arguments: parseArguments(source.arguments, `${instructionPath}.arguments`, command, issues),
    };
  });
}

function countNodes(instructions: readonly ProgramInstruction[]): number {
  return instructions.reduce((total, instruction) => {
    if (instruction.type === "repeat") return total + 1 + countNodes(instruction.body);
    if (instruction.type === "if") return total + 1 + countNodes(instruction.then) + countNodes(instruction.else);
    return total + 1;
  }, 0);
}

function functionCalls(instructions: readonly ProgramInstruction[]) {
  return instructions.flatMap((instruction): string[] => {
    if (instruction.type === "call-function") return [instruction.functionId];
    if (instruction.type === "repeat") return functionCalls(instruction.body);
    if (instruction.type === "if") return [...functionCalls(instruction.then), ...functionCalls(instruction.else)];
    return [];
  });
}

function validateFunctions(program: ProgramDefinition, issues: IssueList) {
  const functionsById = new Map(program.functions.map((entry) => [entry.id, entry]));
  for (const [index, entry] of program.functions.entries()) {
    for (const calledId of functionCalls(entry.instructions)) {
      if (!functionsById.has(calledId)) {
        issue(issues, "program-function-missing", `$.functions[${index}]`, "Викликана функція ще не створена.", [calledId]);
      }
    }
  }
  for (const calledId of functionCalls(program.instructions)) {
    if (!functionsById.has(calledId)) issue(issues, "program-function-missing", "$.instructions", "Викликана функція ще не створена.", [calledId]);
  }

  function visit(functionId: string, ancestors: Set<string>) {
    if (ancestors.has(functionId)) {
      issue(issues, "program-recursive-function", "$.functions", "Функція не може викликати сама себе.", [functionId]);
      return;
    }
    const entry = functionsById.get(functionId);
    if (!entry) return;
    const nextAncestors = new Set(ancestors).add(functionId);
    functionCalls(entry.instructions).forEach((calledId) => visit(calledId, nextAncestors));
  }
  program.functions.forEach((entry) => visit(entry.id, new Set()));
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

export function parseProgram(value: unknown, challenge: ChallengeDefinition): ProgramParseResult {
  const issues: IssueList = [];
  const source = record(value, "$", ["schema", "schemaVersion", "instructions", "functions"], issues) ?? {};
  const schema = string(source.schema, "$.schema", issues);
  if (schema !== KIDS_PROGRAM_SCHEMA) issue(issues, "program-invalid-schema", "$.schema", "Невідомий формат програми.");
  const schemaVersion = integer(source.schemaVersion, "$.schemaVersion", issues, 1, Number.MAX_SAFE_INTEGER);
  if (schemaVersion !== KIDS_PROGRAM_SCHEMA_VERSION) {
    issue(issues, "program-unsupported-version", "$.schemaVersion", `Підтримується версія ${KIDS_PROGRAM_SCHEMA_VERSION}.`);
  }
  const nodeIds = new Set<string>();
  const instructions = parseInstructions(source.instructions, "$.instructions", challenge, issues, 1, nodeIds);
  const functionEntries = array(source.functions, "$.functions", issues);
  if (functionEntries.length > MAX_FUNCTIONS) issue(issues, "program-too-many-functions", "$.functions", `Дозволено не більше ${MAX_FUNCTIONS} functions.`);
  const functions = functionEntries.map((entry, index): ProgramFunction => {
    const functionPath = `$.functions[${index}]`;
    const functionRecord = record(entry, functionPath, ["id", "instructions"], issues) ?? {};
    return {
      id: stableId(functionRecord.id, `${functionPath}.id`, issues),
      instructions: parseInstructions(functionRecord.instructions, `${functionPath}.instructions`, challenge, issues, 1, nodeIds),
    };
  });
  const functionIds = new Set<string>();
  functions.forEach((entry, index) => {
    if (functionIds.has(entry.id)) issue(issues, "program-duplicate-function", `$.functions[${index}].id`, "Functions мають унікальні IDs.", [entry.id]);
    functionIds.add(entry.id);
  });
  const program: ProgramDefinition = {
    schema: KIDS_PROGRAM_SCHEMA,
    schemaVersion: KIDS_PROGRAM_SCHEMA_VERSION,
    instructions,
    functions,
  };
  const totalNodes = countNodes(instructions) + functions.reduce((total, entry) => total + countNodes(entry.instructions), 0);
  if (totalNodes > MAX_PROGRAM_NODES) issue(issues, "program-too-large", "$", `Програма може містити не більше ${MAX_PROGRAM_NODES} blocks.`);
  validateFunctions(program, issues);

  return issues.length > 0
    ? { success: false, issues: Object.freeze([...issues]) }
    : { success: true, data: deepFreeze(program) };
}

export function getProgramSourceCommandCount(program: ProgramDefinition) {
  return countNodes(program.instructions) + program.functions.reduce((total, entry) => total + countNodes(entry.instructions), 0);
}
