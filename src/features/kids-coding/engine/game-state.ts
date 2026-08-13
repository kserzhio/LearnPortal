import type {
  ChallengeDefinition,
  CommandDefinition,
  ConditionDefinition,
  Direction,
  GridPosition,
} from "../domain";
import type { ProgramArgument, ProgramPredicate } from "./program";

export type RuntimeGameState = Readonly<{
  character: Readonly<{
    id: string;
    position: GridPosition;
    direction: Direction;
  }>;
  collectedItemIds: readonly string[];
  collisionCount: number;
  commandUseCounts: Readonly<Record<string, number>>;
  operationCount: number;
  sourceCommandCount: number;
  usedConcepts: readonly string[];
}>;

export type GameEventType =
  | "move"
  | "turn"
  | "jump"
  | "pick-item"
  | "collision"
  | "no-item"
  | "repeat-iteration"
  | "condition"
  | "function-call"
  | "completed"
  | "objective-incomplete"
  | "cancelled";

export type GameEvent = Readonly<{
  sequence: number;
  type: GameEventType;
  code: string;
  instructionId: string | null;
  commandId: string | null;
  affectedIds: readonly string[];
  detail: Readonly<Record<string, string | number | boolean>>;
}>;

export type LevelResult = Readonly<{
  valid: boolean;
  code: string;
  message: string;
  affectedIds: readonly string[];
  stars: 0 | 1 | 2 | 3;
  metrics: Readonly<{
    commandCount: number;
    operationCount: number;
    usedConcepts: readonly string[];
  }>;
}>;

export type PrimitiveOperation = Readonly<{
  instructionId: string;
  commandId: string;
  kind: "move-forward" | "turn-left" | "turn-right" | "jump" | "pick-item";
  arguments: Readonly<Record<string, ProgramArgument>>;
}>;

const directionOrder: readonly Direction[] = ["north", "east", "south", "west"];

function cloneState(state: RuntimeGameState): RuntimeGameState {
  return {
    character: {
      ...state.character,
      position: { ...state.character.position },
    },
    collectedItemIds: [...state.collectedItemIds],
    collisionCount: state.collisionCount,
    commandUseCounts: { ...state.commandUseCounts },
    operationCount: state.operationCount,
    sourceCommandCount: state.sourceCommandCount,
    usedConcepts: [...state.usedConcepts],
  };
}

function nextPosition(position: GridPosition, direction: Direction, distance = 1): GridPosition {
  if (direction === "north") return { x: position.x, y: position.y - distance };
  if (direction === "east") return { x: position.x + distance, y: position.y };
  if (direction === "south") return { x: position.x, y: position.y + distance };
  return { x: position.x - distance, y: position.y };
}

function isInside(position: GridPosition, challenge: ChallengeDefinition) {
  const { columns, rows } = challenge.initialGameState.grid;
  return position.x >= 0 && position.y >= 0 && position.x < columns && position.y < rows;
}

function obstacleAt(position: GridPosition, challenge: ChallengeDefinition) {
  return challenge.initialGameState.obstacles.find((obstacle) => (
    obstacle.position.x === position.x && obstacle.position.y === position.y
  ));
}

function event(
  sequence: number,
  type: GameEventType,
  code: string,
  operation: PrimitiveOperation,
  affectedIds: readonly string[] = [],
  detail: Readonly<Record<string, string | number | boolean>> = {},
): GameEvent {
  return {
    sequence,
    type,
    code,
    instructionId: operation.instructionId,
    commandId: operation.commandId,
    affectedIds: [...affectedIds],
    detail,
  };
}

function incrementOperation(state: RuntimeGameState): RuntimeGameState {
  return { ...cloneState(state), operationCount: state.operationCount + 1 };
}

function move(
  challenge: ChallengeDefinition,
  state: RuntimeGameState,
  operation: PrimitiveOperation,
  sequence: number,
  distance: number,
  type: "move" | "jump",
) {
  const target = nextPosition(state.character.position, state.character.direction, distance);
  const obstacle = obstacleAt(target, challenge);
  const nextState = incrementOperation(state);
  if (!isInside(target, challenge) || obstacle) {
    return {
      state: { ...nextState, collisionCount: nextState.collisionCount + 1 },
      event: event(
        sequence,
        "collision",
        obstacle ? "robot-hit-obstacle" : "robot-left-board",
        operation,
        obstacle ? [state.character.id, obstacle.id] : [state.character.id],
        { x: target.x, y: target.y },
      ),
    };
  }
  return {
    state: {
      ...nextState,
      character: { ...nextState.character, position: target },
    },
    event: event(sequence, type, type === "jump" ? "robot-jumped" : "robot-moved", operation, [state.character.id], {
      x: target.x,
      y: target.y,
    }),
  };
}

export function createInitialRuntimeState(challenge: ChallengeDefinition, sourceCommandCount: number): RuntimeGameState {
  return {
    character: {
      id: challenge.initialGameState.character.id,
      position: { ...challenge.initialGameState.character.position },
      direction: challenge.initialGameState.character.direction,
    },
    collectedItemIds: [],
    collisionCount: 0,
    commandUseCounts: {},
    operationCount: 0,
    sourceCommandCount,
    usedConcepts: [],
  };
}

export function recordCommandUse(
  state: RuntimeGameState,
  command: CommandDefinition,
): RuntimeGameState {
  const counts = { ...state.commandUseCounts, [command.id]: (state.commandUseCounts[command.id] ?? 0) + 1 };
  const conceptKinds = ["repeat", "if", "call-function"];
  const usedConcepts = conceptKinds.includes(command.kind) && !state.usedConcepts.includes(command.kind)
    ? [...state.usedConcepts, command.kind]
    : [...state.usedConcepts];
  return { ...cloneState(state), commandUseCounts: counts, usedConcepts };
}

export function applyPrimitiveOperation(
  challenge: ChallengeDefinition,
  state: RuntimeGameState,
  operation: PrimitiveOperation,
  sequence: number,
): Readonly<{ state: RuntimeGameState; event: GameEvent }> {
  if (operation.kind === "move-forward") return move(challenge, state, operation, sequence, 1, "move");
  if (operation.kind === "jump") {
    const distance = typeof operation.arguments.distance === "number" ? operation.arguments.distance : 2;
    return move(challenge, state, operation, sequence, distance, "jump");
  }
  if (operation.kind === "turn-left" || operation.kind === "turn-right") {
    const currentIndex = directionOrder.indexOf(state.character.direction);
    const offset = operation.kind === "turn-left" ? -1 : 1;
    const direction = directionOrder[(currentIndex + offset + directionOrder.length) % directionOrder.length];
    const nextState = incrementOperation(state);
    return {
      state: { ...nextState, character: { ...nextState.character, direction } },
      event: event(sequence, "turn", operation.kind === "turn-left" ? "robot-turned-left" : "robot-turned-right", operation, [state.character.id], { direction }),
    };
  }

  const item = challenge.initialGameState.items.find((entry) => (
    entry.position.x === state.character.position.x
    && entry.position.y === state.character.position.y
    && !state.collectedItemIds.includes(entry.id)
  ));
  const nextState = incrementOperation(state);
  if (!item) {
    return {
      state: nextState,
      event: event(sequence, "no-item", "nothing-to-pick", operation, [state.character.id]),
    };
  }
  return {
    state: { ...nextState, collectedItemIds: [...nextState.collectedItemIds, item.id] },
    event: event(sequence, "pick-item", "item-picked", operation, [state.character.id, item.id], { itemId: item.id }),
  };
}

export function isProgramPredicateTrue(
  predicate: ProgramPredicate,
  challenge: ChallengeDefinition,
  state: RuntimeGameState,
) {
  if (predicate.kind === "facing-direction") return state.character.direction === predicate.direction;
  if (predicate.kind === "item-here") {
    return challenge.initialGameState.items.some((item) => (
      (predicate.itemId === null || item.id === predicate.itemId)
      && item.position.x === state.character.position.x
      && item.position.y === state.character.position.y
      && !state.collectedItemIds.includes(item.id)
    ));
  }
  const target = nextPosition(state.character.position, state.character.direction);
  return isInside(target, challenge) && !obstacleAt(target, challenge);
}

function conditionPassed(condition: ConditionDefinition, state: RuntimeGameState) {
  if (condition.kind === "character-at") {
    return state.character.position.x === condition.position.x && state.character.position.y === condition.position.y;
  }
  if (condition.kind === "item-collected") return state.collectedItemIds.includes(condition.itemId);
  if (condition.kind === "command-used") return (state.commandUseCounts[condition.commandId] ?? 0) >= condition.minimumCount;
  if (condition.kind === "command-count-at-most") return state.sourceCommandCount <= condition.count;
  return state.collisionCount === 0;
}

function failureFor(condition: ConditionDefinition, challenge: ChallengeDefinition): Omit<LevelResult, "stars" | "metrics"> {
  if (condition.kind === "character-at") {
    return { valid: false, code: "goal-not-reached", message: "Майже! Робот ще не дістався потрібної клітинки.", affectedIds: [challenge.initialGameState.character.id] };
  }
  if (condition.kind === "item-collected") {
    return { valid: false, code: "item-not-collected", message: "Предмет залишився на полі. Спробуй підібрати його.", affectedIds: [condition.itemId] };
  }
  if (condition.kind === "command-used") {
    return { valid: false, code: "required-command-missing", message: "Рівень пройдено іншим шляхом, але потрібну ідею ще не використано.", affectedIds: [condition.commandId] };
  }
  if (condition.kind === "command-count-at-most") {
    return { valid: false, code: "too-many-commands", message: "Рішення працює, але його можна зробити коротшим.", affectedIds: [] };
  }
  return { valid: false, code: "collision-detected", message: "Ой! Робот зіткнувся з перешкодою або краєм поля.", affectedIds: [challenge.initialGameState.character.id] };
}

export function evaluateLevelResult(challenge: ChallengeDefinition, state: RuntimeGameState): LevelResult {
  const failedCondition = challenge.objective.expectedConditions.find((condition) => !conditionPassed(condition, state));
  const metrics = {
    commandCount: state.sourceCommandCount,
    operationCount: state.operationCount,
    usedConcepts: [...state.usedConcepts],
  };
  if (failedCondition) return { ...failureFor(failedCondition, challenge), stars: 0, metrics };

  let stars: 0 | 1 | 2 | 3 = 0;
  for (const criterion of challenge.starCriteria) {
    if (criterion.conditions.every((condition) => conditionPassed(condition, state))) stars = criterion.stars;
    else break;
  }
  return {
    valid: true,
    code: stars === 3 ? "level-completed-perfectly" : "level-completed",
    message: stars === 3 ? "Чудово! Ти знайшов сильне й коротке рішення." : "Готово! Робот виконав завдання.",
    affectedIds: [challenge.id],
    stars,
    metrics,
  };
}

export function cloneRuntimeState(state: RuntimeGameState) {
  return cloneState(state);
}
