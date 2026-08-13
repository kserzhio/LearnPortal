import {
  defineKidsCourse,
  type ChallengeDefinition,
  type CommandKind,
  type ConditionDefinition,
  type KidsCourseDefinition,
  type LevelDefinition,
} from "../domain";
import { kidsCommandCatalog } from "../authoring/command-catalog";

const commands = kidsCommandCatalog;

type LevelScenario = Readonly<{
  id: string;
  position: number;
  title: string;
  description: string;
  mode: "blocks" | "code";
  starterCode?: string;
  grid: Readonly<{ columns: number; rows: number }>;
  start: Readonly<{ x: number; y: number; direction: "north" | "east" | "south" | "west" }>;
  goal: Readonly<{ x: number; y: number }>;
  obstacles?: readonly Readonly<{ id: string; x: number; y: number }>[];
  commandIds: readonly (keyof typeof commands)[];
  intendedKind?: CommandKind;
  maxCommands: number;
  hints: readonly [string, string, string];
}>;

function challengeFor(level: LevelScenario): ChallengeDefinition {
  const expectedConditions: ConditionDefinition[] = [
    { kind: "character-at", position: level.goal },
    { kind: "no-collision" },
  ];
  const intendedCommand = level.intendedKind
    ? Object.values(commands).find((command) => command.kind === level.intendedKind) ?? commands.move
    : commands[level.commandIds[0]] ?? commands.move;
  return {
    id: `${level.id}-challenge`,
    levelId: level.id,
    contentVersion: 1,
    title: level.title,
    description: level.description,
    initialGameState: {
      grid: level.grid,
      character: { id: "hero", position: { x: level.start.x, y: level.start.y }, direction: level.start.direction },
      obstacles: (level.obstacles ?? []).map((obstacle) => ({ id: obstacle.id, kind: "rock", position: { x: obstacle.x, y: obstacle.y } })),
      items: [],
      goal: level.goal,
    },
    availableCommands: level.commandIds.map((id) => commands[id]),
    objective: {
      id: `${level.id}-objective`,
      title: "Дістанься фінішу",
      description: "Приведи героя на позначену клітинку без зіткнень.",
      expectedConditions,
    },
    maxRecommendedCommands: level.maxCommands,
    hints: [
      { stage: 1, text: level.hints[0] },
      { stage: 2, text: level.hints[1] },
      { stage: 3, text: level.hints[2] },
    ],
    starCriteria: [
      { stars: 1, label: "Дійди до фінішу", conditions: [{ kind: "character-at", position: level.goal }] },
      { stars: 2, label: "Вкладися в бюджет команд", conditions: [{ kind: "command-count-at-most", count: level.maxCommands }] },
      {
        stars: 3,
        label: "Використай задуману ідею",
        conditions: [{ kind: "command-used", commandId: intendedCommand.id, minimumCount: 1 }],
      },
    ],
    rewards: [{ id: `${level.id}-stars`, type: "stars", referenceId: level.id, quantity: 3 }],
  };
}

function levelFor(worldId: string, scenario: LevelScenario): LevelDefinition {
  return {
    id: scenario.id,
    worldId,
    slug: scenario.id,
    position: scenario.position,
    contentVersion: 1,
    title: scenario.title,
    description: scenario.description,
    difficulty: scenario.position <= 2 ? "starter" : scenario.position <= 4 ? "easy" : "medium",
    learningModes: [scenario.mode],
    ...(scenario.starterCode ? { starterCode: scenario.starterCode } : {}),
    challenge: challengeFor(scenario),
  };
}

const robotScenarios: readonly LevelScenario[] = [
  {
    id: "robot-village-01", position: 1, title: "Перший крок", description: "Зроби один крок до фінішу.", mode: "blocks",
    grid: { columns: 3, rows: 3 }, start: { x: 0, y: 1, direction: "east" }, goal: { x: 1, y: 1 }, commandIds: ["move"], maxCommands: 1,
    hints: ["Фініш прямо перед героєм.", "Потрібна одна команда руху.", "Почни алгоритм із блока MOVE."],
  },
  {
    id: "robot-village-02", position: 2, title: "Кілька кроків", description: "Побудуй послідовність рухів.", mode: "blocks",
    grid: { columns: 5, rows: 3 }, start: { x: 0, y: 1, direction: "east" }, goal: { x: 3, y: 1 }, commandIds: ["move"], maxCommands: 3,
    hints: ["Фініш розташований праворуч.", "Рух потрібно повторити тричі.", "Почни з MOVE та виріши: повторити блок чи змінити кількість кроків."],
  },
  {
    id: "robot-village-03", position: 3, title: "Поворот", description: "Поверни героя та зроби крок.", mode: "blocks",
    grid: { columns: 3, rows: 3 }, start: { x: 1, y: 0, direction: "east" }, goal: { x: 1, y: 1 }, commandIds: ["move", "turn-right", "turn-left"], intendedKind: "turn-right", maxCommands: 2,
    hints: ["Спочатку подивись у бік фінішу.", "Зі сходу до півдня веде поворот праворуч.", "Першою постав TURN RIGHT; після повороту ще знадобиться рух."],
  },
  {
    id: "robot-village-04", position: 4, title: "Обхід перешкоди", description: "Обійди камінь без зіткнення.", mode: "blocks",
    grid: { columns: 4, rows: 3 }, start: { x: 0, y: 1, direction: "east" }, goal: { x: 2, y: 0 }, obstacles: [{ id: "rock-01", x: 1, y: 1 }],
    commandIds: ["move", "turn-left", "turn-right"], intendedKind: "turn-left", maxCommands: 5,
    hints: ["Прямий шлях перекритий.", "Піднімися на верхній ряд, а потім рухайся праворуч.", "Почни з LEFT і MOVE, а далі поверни героя в бік фінішу."],
  },
  {
    id: "robot-village-05", position: 5, title: "Повторення", description: "Скороти однакові рухи через repeat.", mode: "blocks",
    grid: { columns: 6, rows: 3 }, start: { x: 0, y: 1, direction: "east" }, goal: { x: 4, y: 1 }, commandIds: ["move", "repeat"], intendedKind: "repeat", maxCommands: 2,
    hints: ["Одна й та сама дія повторюється.", "Помісти MOVE всередину REPEAT.", "Створи REPEAT на чотири повторення та заповни його дію."],
  },
];

const codeScenarios: readonly LevelScenario[] = [
  {
    id: "code-village-01", position: 1, title: "hero.move()", description: "Запусти першу видиму JavaScript-команду.", mode: "code",
    starterCode: "hero.move();",
    grid: { columns: 3, rows: 3 }, start: { x: 0, y: 1, direction: "east" }, goal: { x: 1, y: 1 }, commandIds: ["move"], maxCommands: 1,
    hints: ["Герой має зробити один крок.", "Виклич метод move у hero.", "Почни рядок із hero.move і додай потрібні символи виклику."],
  },
  {
    id: "code-village-02", position: 2, title: "hero.move(3)", description: "Передай кількість кроків як argument.", mode: "code",
    starterCode: "hero.move(1);",
    grid: { columns: 5, rows: 3 }, start: { x: 0, y: 1, direction: "east" }, goal: { x: 3, y: 1 }, commandIds: ["move"], maxCommands: 1,
    hints: ["Одній команді можна передати число.", "Фініш за три клітинки.", "Використай форму hero.move(/* кроки */), підставивши потрібне число."],
  },
  {
    id: "code-village-03", position: 3, title: "hero.jump()", description: "Перестрибни через небезпечну клітинку.", mode: "code",
    starterCode: "hero.jump();",
    grid: { columns: 4, rows: 3 }, start: { x: 0, y: 1, direction: "east" }, goal: { x: 2, y: 1 }, obstacles: [{ id: "rock-01", x: 1, y: 1 }],
    commandIds: ["move", "jump"], intendedKind: "jump", maxCommands: 1,
    hints: ["Між героєм і фінішем є камінь.", "Команда jump долає дві клітинки.", "Почни виклик методу jump у об’єкта hero."],
  },
  {
    id: "code-village-04", position: 4, title: "Змінна та рух", description: "Збережи кількість кроків у variable.", mode: "code",
    starterCode: "const steps = 1;\nhero.move(steps);",
    grid: { columns: 5, rows: 3 }, start: { x: 0, y: 1, direction: "east" }, goal: { x: 3, y: 1 }, commandIds: ["move"], maxCommands: 1,
    hints: ["Число можна спочатку назвати.", "Створи const steps = 3.", "Перший рядок уже відомий; у move передай назву steps замість числа."],
  },
  {
    id: "code-village-05", position: 5, title: "Перший цикл", description: "Повтори рух через bounded for loop.", mode: "code",
    starterCode: "for (let i = 0; i < 2; i++) {\n  hero.move();\n}",
    grid: { columns: 6, rows: 3 }, start: { x: 0, y: 1, direction: "east" }, goal: { x: 4, y: 1 }, commandIds: ["move", "repeat"], intendedKind: "repeat", maxCommands: 2,
    hints: ["MOVE повторюється чотири рази.", "Використай for з лічильником від 0 до 4.", "Створи каркас for (let i = 0; i < 4; i++) і додай дію всередину."],
  },
];

function createCourse(
  id: string,
  title: string,
  description: string,
  minimumAge: number,
  scenarios: readonly LevelScenario[],
): KidsCourseDefinition {
  const worldId = "village";
  return defineKidsCourse({
    schema: "systema.kids-course",
    schemaVersion: 1,
    contentVersion: 1,
    id,
    slug: id,
    title,
    shortDescription: description,
    recommendedAge: { minimum: minimumAge, maximum: 12 },
    status: "published",
    accent: id === "robot-quest-algorithms" ? "RQ" : "JS",
    worlds: [{
      id: worldId,
      courseId: id,
      slug: worldId,
      position: 1,
      contentVersion: 1,
      title: "Village",
      description: "Перший світ із короткими видимими challenges.",
      themeKey: "village",
      levels: scenarios.map((scenario) => levelFor(worldId, scenario)),
    }],
  });
}

export const kidsCourses: readonly KidsCourseDefinition[] = [
  createCourse("robot-quest-algorithms", "Robot Quest — Algorithms", "Алгоритмічне мислення через blocks і рух героя.", 6, robotScenarios),
  createCourse("code-adventure-javascript", "Code Adventure — JavaScript", "Перші JavaScript-команди з миттєвим результатом у грі.", 7, codeScenarios),
];

export function getKidsCourse(courseId: string) {
  return kidsCourses.find((course) => course.id === courseId) ?? null;
}

export function getKidsLevel(courseId: string, worldId: string, levelId: string) {
  const course = getKidsCourse(courseId);
  const world = course?.worlds.find((entry) => entry.id === worldId);
  const level = world?.levels.find((entry) => entry.id === levelId);
  return course && world && level ? { course, world, level } : null;
}

export function isKidsPublicPreview(courseId: string, worldId: string, levelId: string) {
  const course = getKidsCourse(courseId);
  return course?.worlds[0]?.id === worldId && course.worlds[0]?.levels[0]?.id === levelId;
}

export function getKidsChallenge(courseId: string, worldId: string, levelId: string) {
  return getKidsLevel(courseId, worldId, levelId)?.level.challenge ?? null;
}
