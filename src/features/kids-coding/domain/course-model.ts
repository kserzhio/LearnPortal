export const KIDS_COURSE_SCHEMA = "systema.kids-course" as const;
export const KIDS_COURSE_SCHEMA_VERSION = 1 as const;

const stableIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_GRID_SIZE = 24;
const MAX_TEXT_LENGTH = 500;

export type KidsCourseStatus = "draft" | "published" | "archived";
export type LearningMode = "blocks" | "code";
export type LevelDifficulty = "starter" | "easy" | "medium" | "hard";
export type Direction = "north" | "east" | "south" | "west";
export type CommandKind =
  | "move-forward"
  | "turn-left"
  | "turn-right"
  | "jump"
  | "pick-item"
  | "repeat"
  | "if"
  | "call-function"
  | "set-variable";

export type GridPosition = Readonly<{ x: number; y: number }>;

export type GridDefinition = Readonly<{
  columns: number;
  rows: number;
}>;

export type CharacterDefinition = Readonly<{
  id: string;
  position: GridPosition;
  direction: Direction;
}>;

export type ObstacleDefinition = Readonly<{
  id: string;
  kind: "rock" | "wall" | "water";
  position: GridPosition;
}>;

export type ItemDefinition = Readonly<{
  id: string;
  kind: "star" | "coin" | "key";
  position: GridPosition;
}>;

export type InitialGameState = Readonly<{
  grid: GridDefinition;
  character: CharacterDefinition;
  obstacles: readonly ObstacleDefinition[];
  items: readonly ItemDefinition[];
  goal: GridPosition;
}>;

export type CommandParameterDefinition = Readonly<{
  id: string;
  label: string;
  type: "integer";
  minimum: number;
  maximum: number;
  defaultValue: number;
}>;

export type CommandDefinition = Readonly<{
  id: string;
  kind: CommandKind;
  label: string;
  description: string;
  javascriptExample: string;
  parameters: readonly CommandParameterDefinition[];
}>;

export type ConditionDefinition =
  | Readonly<{ kind: "character-at"; position: GridPosition }>
  | Readonly<{ kind: "item-collected"; itemId: string }>
  | Readonly<{ kind: "command-used"; commandId: string; minimumCount: number }>
  | Readonly<{ kind: "command-count-at-most"; count: number }>
  | Readonly<{ kind: "no-collision" }>;

export type ObjectiveDefinition = Readonly<{
  id: string;
  title: string;
  description: string;
  expectedConditions: readonly ConditionDefinition[];
}>;

export type HintDefinition = Readonly<{
  stage: 1 | 2 | 3;
  text: string;
}>;

export type StarCriterion = Readonly<{
  stars: 1 | 2 | 3;
  label: string;
  conditions: readonly ConditionDefinition[];
}>;

export type RewardDefinition = Readonly<{
  id: string;
  type: "stars" | "badge" | "character" | "skin" | "pet" | "accessory" | "world-unlock";
  referenceId: string;
  quantity: number;
}>;

export type ChallengeDefinition = Readonly<{
  id: string;
  levelId: string;
  contentVersion: number;
  title: string;
  description: string;
  initialGameState: InitialGameState;
  availableCommands: readonly CommandDefinition[];
  objective: ObjectiveDefinition;
  maxRecommendedCommands: number;
  hints: readonly [HintDefinition, HintDefinition, HintDefinition];
  starCriteria: readonly [StarCriterion, StarCriterion, StarCriterion];
  rewards: readonly RewardDefinition[];
}>;

export type LevelDefinition = Readonly<{
  id: string;
  worldId: string;
  slug: string;
  position: number;
  contentVersion: number;
  title: string;
  description: string;
  difficulty: LevelDifficulty;
  learningModes: readonly LearningMode[];
  starterCode?: string;
  challenge: ChallengeDefinition;
}>;

export type WorldDefinition = Readonly<{
  id: string;
  courseId: string;
  slug: string;
  position: number;
  contentVersion: number;
  title: string;
  description: string;
  themeKey: string;
  levels: readonly LevelDefinition[];
}>;

export type KidsCourseDefinition = Readonly<{
  schema: typeof KIDS_COURSE_SCHEMA;
  schemaVersion: typeof KIDS_COURSE_SCHEMA_VERSION;
  contentVersion: number;
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  recommendedAge: Readonly<{ minimum: number; maximum: number | null }>;
  status: KidsCourseStatus;
  accent: string;
  worlds: readonly WorldDefinition[];
}>;

export type ConfigurationIssue = Readonly<{
  code: string;
  path: string;
  message: string;
}>;

export type ParseResult<T> =
  | Readonly<{ success: true; data: T }>
  | Readonly<{ success: false; issues: readonly ConfigurationIssue[] }>;

export class KidsCourseConfigurationError extends Error {
  readonly issues: readonly ConfigurationIssue[];

  constructor(issues: readonly ConfigurationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
    this.name = "KidsCourseConfigurationError";
    this.issues = issues;
  }
}

type MutableIssueList = ConfigurationIssue[];
type UnknownRecord = Record<string, unknown>;

function addIssue(issues: MutableIssueList, code: string, path: string, message: string) {
  issues.push({ code, path, message });
}

function readRecord(value: unknown, path: string, allowedKeys: readonly string[], issues: MutableIssueList): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    addIssue(issues, "expected-object", path, "Очікується object.");
    return null;
  }

  const record = value as UnknownRecord;
  for (const key of Object.keys(record)) {
    if (!allowedKeys.includes(key)) addIssue(issues, "unknown-field", `${path}.${key}`, "Невідоме поле конфігурації.");
  }
  return record;
}

function readArray(value: unknown, path: string, issues: MutableIssueList, minimumLength = 0): unknown[] {
  if (!Array.isArray(value)) {
    addIssue(issues, "expected-array", path, "Очікується array.");
    return [];
  }
  if (value.length < minimumLength) addIssue(issues, "array-too-short", path, `Потрібно щонайменше ${minimumLength} element(s).`);
  return value;
}

function readString(value: unknown, path: string, issues: MutableIssueList, options: { id?: boolean; maximumLength?: number } = {}) {
  if (typeof value !== "string" || value.trim().length === 0) {
    addIssue(issues, "expected-string", path, "Очікується непорожній string.");
    return "";
  }
  const normalized = value.trim();
  if (options.id && !stableIdPattern.test(normalized)) {
    addIssue(issues, "invalid-stable-id", path, "ID/slug має містити лише lowercase letters, numbers і hyphens.");
  }
  if (normalized.length > (options.maximumLength ?? MAX_TEXT_LENGTH)) {
    addIssue(issues, "text-too-long", path, `Text перевищує ${(options.maximumLength ?? MAX_TEXT_LENGTH)} characters.`);
  }
  return normalized;
}

function readInteger(
  value: unknown,
  path: string,
  issues: MutableIssueList,
  options: { minimum?: number; maximum?: number } = {},
) {
  if (!Number.isInteger(value)) {
    addIssue(issues, "expected-integer", path, "Очікується integer.");
    return 0;
  }
  const numberValue = value as number;
  if (options.minimum !== undefined && numberValue < options.minimum) {
    addIssue(issues, "number-too-small", path, `Значення має бути не менше ${options.minimum}.`);
  }
  if (options.maximum !== undefined && numberValue > options.maximum) {
    addIssue(issues, "number-too-large", path, `Значення має бути не більше ${options.maximum}.`);
  }
  return numberValue;
}

function readLiteral<T extends string>(value: unknown, path: string, values: readonly T[], issues: MutableIssueList): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    addIssue(issues, "invalid-option", path, `Очікується одне зі значень: ${values.join(", ")}.`);
    return values[0];
  }
  return value as T;
}

function parsePosition(value: unknown, path: string, issues: MutableIssueList): GridPosition {
  const record = readRecord(value, path, ["x", "y"], issues) ?? {};
  return {
    x: readInteger(record.x, `${path}.x`, issues, { minimum: 0 }),
    y: readInteger(record.y, `${path}.y`, issues, { minimum: 0 }),
  };
}

function positionKey(position: GridPosition) {
  return `${position.x}:${position.y}`;
}

function validateInsideGrid(position: GridPosition, grid: GridDefinition, path: string, issues: MutableIssueList) {
  if (position.x >= grid.columns || position.y >= grid.rows) {
    addIssue(issues, "position-out-of-bounds", path, `Position (${position.x}, ${position.y}) виходить за межі grid ${grid.columns}×${grid.rows}.`);
  }
}

function parseGameState(value: unknown, path: string, issues: MutableIssueList): InitialGameState {
  const record = readRecord(value, path, ["grid", "character", "obstacles", "items", "goal"], issues) ?? {};
  const gridRecord = readRecord(record.grid, `${path}.grid`, ["columns", "rows"], issues) ?? {};
  const grid: GridDefinition = {
    columns: readInteger(gridRecord.columns, `${path}.grid.columns`, issues, { minimum: 2, maximum: MAX_GRID_SIZE }),
    rows: readInteger(gridRecord.rows, `${path}.grid.rows`, issues, { minimum: 2, maximum: MAX_GRID_SIZE }),
  };

  const characterRecord = readRecord(record.character, `${path}.character`, ["id", "position", "direction"], issues) ?? {};
  const character: CharacterDefinition = {
    id: readString(characterRecord.id, `${path}.character.id`, issues, { id: true }),
    position: parsePosition(characterRecord.position, `${path}.character.position`, issues),
    direction: readLiteral(characterRecord.direction, `${path}.character.direction`, ["north", "east", "south", "west"], issues),
  };

  const obstacles = readArray(record.obstacles, `${path}.obstacles`, issues).map((entry, index): ObstacleDefinition => {
    const entryPath = `${path}.obstacles[${index}]`;
    const obstacle = readRecord(entry, entryPath, ["id", "kind", "position"], issues) ?? {};
    return {
      id: readString(obstacle.id, `${entryPath}.id`, issues, { id: true }),
      kind: readLiteral(obstacle.kind, `${entryPath}.kind`, ["rock", "wall", "water"], issues),
      position: parsePosition(obstacle.position, `${entryPath}.position`, issues),
    };
  });

  const items = readArray(record.items, `${path}.items`, issues).map((entry, index): ItemDefinition => {
    const entryPath = `${path}.items[${index}]`;
    const item = readRecord(entry, entryPath, ["id", "kind", "position"], issues) ?? {};
    return {
      id: readString(item.id, `${entryPath}.id`, issues, { id: true }),
      kind: readLiteral(item.kind, `${entryPath}.kind`, ["star", "coin", "key"], issues),
      position: parsePosition(item.position, `${entryPath}.position`, issues),
    };
  });

  const goal = parsePosition(record.goal, `${path}.goal`, issues);
  validateInsideGrid(character.position, grid, `${path}.character.position`, issues);
  obstacles.forEach((obstacle, index) => validateInsideGrid(obstacle.position, grid, `${path}.obstacles[${index}].position`, issues));
  items.forEach((item, index) => validateInsideGrid(item.position, grid, `${path}.items[${index}].position`, issues));
  validateInsideGrid(goal, grid, `${path}.goal`, issues);

  const obstaclePositions = new Set<string>();
  for (const [index, obstacle] of obstacles.entries()) {
    const key = positionKey(obstacle.position);
    if (obstaclePositions.has(key)) addIssue(issues, "duplicate-position", `${path}.obstacles[${index}].position`, "Дві перешкоди не можуть займати одну клітинку.");
    obstaclePositions.add(key);
  }
  if (obstaclePositions.has(positionKey(character.position))) {
    addIssue(issues, "blocked-character", `${path}.character.position`, "Початкова позиція character зайнята obstacle.");
  }
  if (obstaclePositions.has(positionKey(goal))) {
    addIssue(issues, "blocked-goal", `${path}.goal`, "Goal не може бути всередині obstacle.");
  }
  ensureUniqueIds(obstacles, `${path}.obstacles`, issues);
  ensureUniqueIds(items, `${path}.items`, issues);

  return { grid, character, obstacles, items, goal };
}

function parseCommand(value: unknown, path: string, issues: MutableIssueList): CommandDefinition {
  const record = readRecord(value, path, ["id", "kind", "label", "description", "javascriptExample", "parameters"], issues) ?? {};
  const parameters = readArray(record.parameters, `${path}.parameters`, issues).map((entry, index): CommandParameterDefinition => {
    const parameterPath = `${path}.parameters[${index}]`;
    const parameter = readRecord(entry, parameterPath, ["id", "label", "type", "minimum", "maximum", "defaultValue"], issues) ?? {};
    const minimum = readInteger(parameter.minimum, `${parameterPath}.minimum`, issues);
    const maximum = readInteger(parameter.maximum, `${parameterPath}.maximum`, issues);
    const defaultValue = readInteger(parameter.defaultValue, `${parameterPath}.defaultValue`, issues);
    if (minimum > maximum) addIssue(issues, "invalid-range", parameterPath, "Parameter minimum не може перевищувати maximum.");
    if (defaultValue < minimum || defaultValue > maximum) addIssue(issues, "default-out-of-range", `${parameterPath}.defaultValue`, "Default value має бути всередині parameter range.");
    return {
      id: readString(parameter.id, `${parameterPath}.id`, issues, { id: true }),
      label: readString(parameter.label, `${parameterPath}.label`, issues),
      type: readLiteral(parameter.type, `${parameterPath}.type`, ["integer"], issues),
      minimum,
      maximum,
      defaultValue,
    };
  });
  ensureUniqueIds(parameters, `${path}.parameters`, issues);
  return {
    id: readString(record.id, `${path}.id`, issues, { id: true }),
    kind: readLiteral(record.kind, `${path}.kind`, ["move-forward", "turn-left", "turn-right", "jump", "pick-item", "repeat", "if", "call-function", "set-variable"], issues),
    label: readString(record.label, `${path}.label`, issues),
    description: readString(record.description, `${path}.description`, issues),
    javascriptExample: readString(record.javascriptExample, `${path}.javascriptExample`, issues),
    parameters,
  };
}

function parseCondition(value: unknown, path: string, issues: MutableIssueList): ConditionDefinition {
  const record = readRecord(value, path, ["kind", "position", "itemId", "commandId", "minimumCount", "count"], issues) ?? {};
  const kind = readLiteral(record.kind, `${path}.kind`, ["character-at", "item-collected", "command-used", "command-count-at-most", "no-collision"], issues);
  if (kind === "character-at") return { kind, position: parsePosition(record.position, `${path}.position`, issues) };
  if (kind === "item-collected") return { kind, itemId: readString(record.itemId, `${path}.itemId`, issues, { id: true }) };
  if (kind === "command-used") {
    return {
      kind,
      commandId: readString(record.commandId, `${path}.commandId`, issues, { id: true }),
      minimumCount: readInteger(record.minimumCount, `${path}.minimumCount`, issues, { minimum: 1 }),
    };
  }
  if (kind === "command-count-at-most") return { kind, count: readInteger(record.count, `${path}.count`, issues, { minimum: 1 }) };
  return { kind: "no-collision" };
}

function validateConditionReferences(
  condition: ConditionDefinition,
  path: string,
  gameState: InitialGameState,
  commands: readonly CommandDefinition[],
  issues: MutableIssueList,
) {
  if (condition.kind === "character-at") validateInsideGrid(condition.position, gameState.grid, `${path}.position`, issues);
  if (condition.kind === "item-collected" && !gameState.items.some((item) => item.id === condition.itemId)) {
    addIssue(issues, "unknown-item", `${path}.itemId`, `Item ${condition.itemId} відсутній в initialGameState.`);
  }
  if (condition.kind === "command-used" && !commands.some((command) => command.id === condition.commandId)) {
    addIssue(issues, "unknown-command", `${path}.commandId`, `Command ${condition.commandId} відсутня в availableCommands.`);
  }
}

function parseChallenge(value: unknown, path: string, levelId: string, issues: MutableIssueList): ChallengeDefinition {
  const record = readRecord(value, path, [
    "id", "levelId", "contentVersion", "title", "description", "initialGameState", "availableCommands",
    "objective", "maxRecommendedCommands", "hints", "starCriteria", "rewards",
  ], issues) ?? {};
  const parsedLevelId = readString(record.levelId, `${path}.levelId`, issues, { id: true });
  if (parsedLevelId !== levelId) addIssue(issues, "wrong-parent-id", `${path}.levelId`, `Challenge має посилатися на level ${levelId}.`);
  const initialGameState = parseGameState(record.initialGameState, `${path}.initialGameState`, issues);
  const availableCommands = readArray(record.availableCommands, `${path}.availableCommands`, issues, 1)
    .map((command, index) => parseCommand(command, `${path}.availableCommands[${index}]`, issues));
  ensureUniqueIds(availableCommands, `${path}.availableCommands`, issues);

  const objectiveRecord = readRecord(record.objective, `${path}.objective`, ["id", "title", "description", "expectedConditions"], issues) ?? {};
  const expectedConditions = readArray(objectiveRecord.expectedConditions, `${path}.objective.expectedConditions`, issues, 1)
    .map((condition, index) => parseCondition(condition, `${path}.objective.expectedConditions[${index}]`, issues));
  expectedConditions.forEach((condition, index) => validateConditionReferences(
    condition,
    `${path}.objective.expectedConditions[${index}]`,
    initialGameState,
    availableCommands,
    issues,
  ));
  const objective: ObjectiveDefinition = {
    id: readString(objectiveRecord.id, `${path}.objective.id`, issues, { id: true }),
    title: readString(objectiveRecord.title, `${path}.objective.title`, issues),
    description: readString(objectiveRecord.description, `${path}.objective.description`, issues),
    expectedConditions,
  };

  const hintEntries = readArray(record.hints, `${path}.hints`, issues);
  if (hintEntries.length !== 3) addIssue(issues, "invalid-hint-count", `${path}.hints`, "Challenge має містити рівно три progressive hints.");
  const hints = [1, 2, 3].map((stage, index): HintDefinition => {
    const hintPath = `${path}.hints[${index}]`;
    const hint = readRecord(hintEntries[index], hintPath, ["stage", "text"], issues) ?? {};
    const parsedStage = readInteger(hint.stage, `${hintPath}.stage`, issues, { minimum: 1, maximum: 3 });
    if (parsedStage !== stage) addIssue(issues, "invalid-hint-stage", `${hintPath}.stage`, `Hint у цій позиції повинен мати stage ${stage}.`);
    return { stage: stage as 1 | 2 | 3, text: readString(hint.text, `${hintPath}.text`, issues) };
  }) as [HintDefinition, HintDefinition, HintDefinition];

  const starEntries = readArray(record.starCriteria, `${path}.starCriteria`, issues);
  if (starEntries.length !== 3) addIssue(issues, "invalid-star-count", `${path}.starCriteria`, "Challenge має містити критерії для 1, 2 і 3 stars.");
  const starCriteria = [1, 2, 3].map((stars, index): StarCriterion => {
    const criterionPath = `${path}.starCriteria[${index}]`;
    const criterion = readRecord(starEntries[index], criterionPath, ["stars", "label", "conditions"], issues) ?? {};
    const parsedStars = readInteger(criterion.stars, `${criterionPath}.stars`, issues, { minimum: 1, maximum: 3 });
    if (parsedStars !== stars) addIssue(issues, "invalid-star-stage", `${criterionPath}.stars`, `Criterion у цій позиції повинен описувати ${stars} star(s).`);
    const conditions = readArray(criterion.conditions, `${criterionPath}.conditions`, issues, 1)
      .map((condition, conditionIndex) => parseCondition(condition, `${criterionPath}.conditions[${conditionIndex}]`, issues));
    conditions.forEach((condition, conditionIndex) => validateConditionReferences(
      condition,
      `${criterionPath}.conditions[${conditionIndex}]`,
      initialGameState,
      availableCommands,
      issues,
    ));
    return {
      stars: stars as 1 | 2 | 3,
      label: readString(criterion.label, `${criterionPath}.label`, issues),
      conditions,
    };
  }) as [StarCriterion, StarCriterion, StarCriterion];

  const rewards = readArray(record.rewards, `${path}.rewards`, issues, 1).map((entry, index): RewardDefinition => {
    const rewardPath = `${path}.rewards[${index}]`;
    const reward = readRecord(entry, rewardPath, ["id", "type", "referenceId", "quantity"], issues) ?? {};
    return {
      id: readString(reward.id, `${rewardPath}.id`, issues, { id: true }),
      type: readLiteral(reward.type, `${rewardPath}.type`, ["stars", "badge", "character", "skin", "pet", "accessory", "world-unlock"], issues),
      referenceId: readString(reward.referenceId, `${rewardPath}.referenceId`, issues, { id: true }),
      quantity: readInteger(reward.quantity, `${rewardPath}.quantity`, issues, { minimum: 1 }),
    };
  });
  ensureUniqueIds(rewards, `${path}.rewards`, issues);

  return {
    id: readString(record.id, `${path}.id`, issues, { id: true }),
    levelId: parsedLevelId,
    contentVersion: readInteger(record.contentVersion, `${path}.contentVersion`, issues, { minimum: 1 }),
    title: readString(record.title, `${path}.title`, issues),
    description: readString(record.description, `${path}.description`, issues),
    initialGameState,
    availableCommands,
    objective,
    maxRecommendedCommands: readInteger(record.maxRecommendedCommands, `${path}.maxRecommendedCommands`, issues, { minimum: 1, maximum: 100 }),
    hints,
    starCriteria,
    rewards,
  };
}

function parseLevel(value: unknown, path: string, worldId: string, issues: MutableIssueList): LevelDefinition {
  const record = readRecord(value, path, [
    "id", "worldId", "slug", "position", "contentVersion", "title", "description", "difficulty", "learningModes", "starterCode", "challenge",
  ], issues) ?? {};
  const id = readString(record.id, `${path}.id`, issues, { id: true });
  const parsedWorldId = readString(record.worldId, `${path}.worldId`, issues, { id: true });
  if (parsedWorldId !== worldId) addIssue(issues, "wrong-parent-id", `${path}.worldId`, `Level має посилатися на world ${worldId}.`);
  const modes: LearningMode[] = readArray(record.learningModes, `${path}.learningModes`, issues, 1)
    .map((mode, index) => readLiteral<LearningMode>(mode, `${path}.learningModes[${index}]`, ["blocks", "code"], issues));
  if (new Set(modes).size !== modes.length) addIssue(issues, "duplicate-value", `${path}.learningModes`, "Learning modes мають бути унікальними.");
  const starterCode = record.starterCode === undefined
    ? undefined
    : readString(record.starterCode, `${path}.starterCode`, issues, { maximumLength: 500 });
  return {
    id,
    worldId: parsedWorldId,
    slug: readString(record.slug, `${path}.slug`, issues, { id: true }),
    position: readInteger(record.position, `${path}.position`, issues, { minimum: 1 }),
    contentVersion: readInteger(record.contentVersion, `${path}.contentVersion`, issues, { minimum: 1 }),
    title: readString(record.title, `${path}.title`, issues),
    description: readString(record.description, `${path}.description`, issues),
    difficulty: readLiteral(record.difficulty, `${path}.difficulty`, ["starter", "easy", "medium", "hard"], issues),
    learningModes: modes,
    ...(starterCode ? { starterCode } : {}),
    challenge: parseChallenge(record.challenge, `${path}.challenge`, id, issues),
  };
}

function parseWorld(value: unknown, path: string, courseId: string, issues: MutableIssueList): WorldDefinition {
  const record = readRecord(value, path, ["id", "courseId", "slug", "position", "contentVersion", "title", "description", "themeKey", "levels"], issues) ?? {};
  const id = readString(record.id, `${path}.id`, issues, { id: true });
  const parsedCourseId = readString(record.courseId, `${path}.courseId`, issues, { id: true });
  if (parsedCourseId !== courseId) addIssue(issues, "wrong-parent-id", `${path}.courseId`, `World має посилатися на course ${courseId}.`);
  const levels = readArray(record.levels, `${path}.levels`, issues, 1)
    .map((level, index) => parseLevel(level, `${path}.levels[${index}]`, id, issues));
  ensureUniqueIds(levels, `${path}.levels`, issues);
  ensureUniqueValues(levels, "slug", `${path}.levels`, issues);
  ensureContinuousPositions(levels, `${path}.levels`, issues);
  return {
    id,
    courseId: parsedCourseId,
    slug: readString(record.slug, `${path}.slug`, issues, { id: true }),
    position: readInteger(record.position, `${path}.position`, issues, { minimum: 1 }),
    contentVersion: readInteger(record.contentVersion, `${path}.contentVersion`, issues, { minimum: 1 }),
    title: readString(record.title, `${path}.title`, issues),
    description: readString(record.description, `${path}.description`, issues),
    themeKey: readString(record.themeKey, `${path}.themeKey`, issues, { id: true }),
    levels,
  };
}

function ensureUniqueIds(entries: readonly { id: string }[], path: string, issues: MutableIssueList) {
  ensureUniqueValues(entries, "id", path, issues);
}

function ensureUniqueValues<T extends Record<string, unknown>>(entries: readonly T[], key: keyof T, path: string, issues: MutableIssueList) {
  const values = new Set<unknown>();
  for (const [index, entry] of entries.entries()) {
    if (values.has(entry[key])) addIssue(issues, "duplicate-value", `${path}[${index}].${String(key)}`, `${String(key)} має бути унікальним.`);
    values.add(entry[key]);
  }
}

function ensureContinuousPositions(entries: readonly { position: number }[], path: string, issues: MutableIssueList) {
  const sorted = entries.map((entry) => entry.position).toSorted((first, second) => first - second);
  if (sorted.some((position, index) => position !== index + 1)) {
    addIssue(issues, "invalid-position-sequence", path, "Positions мають бути унікальними, без пропусків і починатися з 1.");
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

export function parseKidsCourse(value: unknown): ParseResult<KidsCourseDefinition> {
  const issues: MutableIssueList = [];
  const path = "$";
  const record = readRecord(value, path, [
    "schema", "schemaVersion", "contentVersion", "id", "slug", "title", "shortDescription",
    "recommendedAge", "status", "accent", "worlds",
  ], issues) ?? {};
  const schema = readLiteral(record.schema, "$.schema", [KIDS_COURSE_SCHEMA], issues);
  const schemaVersion = readInteger(record.schemaVersion, "$.schemaVersion", issues, { minimum: 1 });
  if (schemaVersion !== KIDS_COURSE_SCHEMA_VERSION) {
    addIssue(issues, "unsupported-schema-version", "$.schemaVersion", `Підтримується schema version ${KIDS_COURSE_SCHEMA_VERSION}.`);
  }
  const id = readString(record.id, "$.id", issues, { id: true });
  const age = readRecord(record.recommendedAge, "$.recommendedAge", ["minimum", "maximum"], issues) ?? {};
  const minimumAge = readInteger(age.minimum, "$.recommendedAge.minimum", issues, { minimum: 4, maximum: 18 });
  const maximumAge = age.maximum === null
    ? null
    : readInteger(age.maximum, "$.recommendedAge.maximum", issues, { minimum: 4, maximum: 18 });
  if (maximumAge !== null && maximumAge < minimumAge) {
    addIssue(issues, "invalid-age-range", "$.recommendedAge", "Maximum age не може бути меншим за minimum age.");
  }
  const worlds = readArray(record.worlds, "$.worlds", issues, 1)
    .map((world, index) => parseWorld(world, `$.worlds[${index}]`, id, issues));
  ensureUniqueIds(worlds, "$.worlds", issues);
  ensureUniqueValues(worlds, "slug", "$.worlds", issues);
  ensureContinuousPositions(worlds, "$.worlds", issues);

  const allLevels = worlds.flatMap((world) => world.levels);
  ensureUniqueIds(allLevels, "$.worlds[*].levels", issues);
  const challenges = allLevels.map((level) => level.challenge);
  ensureUniqueIds(challenges, "$.worlds[*].levels[*].challenge", issues);

  const course: KidsCourseDefinition = {
    schema,
    schemaVersion: KIDS_COURSE_SCHEMA_VERSION,
    contentVersion: readInteger(record.contentVersion, "$.contentVersion", issues, { minimum: 1 }),
    id,
    slug: readString(record.slug, "$.slug", issues, { id: true }),
    title: readString(record.title, "$.title", issues),
    shortDescription: readString(record.shortDescription, "$.shortDescription", issues),
    recommendedAge: { minimum: minimumAge, maximum: maximumAge },
    status: readLiteral(record.status, "$.status", ["draft", "published", "archived"], issues),
    accent: readString(record.accent, "$.accent", issues, { maximumLength: 4 }),
    worlds,
  };

  return issues.length > 0
    ? { success: false, issues: Object.freeze([...issues]) }
    : { success: true, data: deepFreeze(course) };
}

export function defineKidsCourse(value: unknown): KidsCourseDefinition {
  const result = parseKidsCourse(value);
  if (!result.success) throw new KidsCourseConfigurationError(result.issues);
  return result.data;
}

export function serializeKidsCourse(course: KidsCourseDefinition) {
  return JSON.stringify(defineKidsCourse(course));
}

export function parseKidsCourseJson(serialized: string): ParseResult<KidsCourseDefinition> {
  try {
    return parseKidsCourse(JSON.parse(serialized) as unknown);
  } catch {
    return {
      success: false,
      issues: [{ code: "invalid-json", path: "$", message: "Course configuration не є valid JSON." }],
    };
  }
}

export function getKidsCourseLevelCount(course: KidsCourseDefinition) {
  return course.worlds.reduce((total, world) => total + world.levels.length, 0);
}

export function getKidsLevel(
  course: KidsCourseDefinition,
  worldSlug: string,
  levelSlug: string,
): { world: WorldDefinition; level: LevelDefinition } | null {
  const world = course.worlds.find((entry) => entry.slug === worldSlug);
  const level = world?.levels.find((entry) => entry.slug === levelSlug);
  return world && level ? { world, level } : null;
}
