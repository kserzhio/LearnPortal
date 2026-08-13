import {
  defineKidsCourse,
  type CommandDefinition,
  type Direction,
  type KidsCourseDefinition,
  type LevelDifficulty,
  type LearningMode,
  type RewardDefinition,
} from "../domain";
import type { ProgramDefinition } from "../engine";

export type AuthoringIssue = Readonly<{
  code: string;
  path: string;
  message: string;
}>;

export type AuthoringHints = Readonly<{
  conceptual: string;
  strongerClue: string;
  partialSolution: string;
}>;

export type AuthoringPreviewFixtures = Readonly<{
  expectedSuccess: ProgramDefinition;
  expectedFailure: ProgramDefinition;
}>;

export type AuthoringLevel = Readonly<{
  id: string;
  position: number;
  title: string;
  description: string;
  difficulty: LevelDifficulty;
  mode: LearningMode;
  starterCode?: string;
  grid: Readonly<{ columns: number; rows: number }>;
  start: Readonly<{ x: number; y: number; direction: Direction }>;
  goal: Readonly<{ x: number; y: number }>;
  obstacles?: readonly Readonly<{ id: string; x: number; y: number; kind?: "rock" | "wall" | "water" }>[];
  items?: readonly Readonly<{ id: string; x: number; y: number; kind: "star" | "coin" | "key" }>[];
  commandIds: readonly string[];
  intendedCommandId: string;
  maxRecommendedCommands: number;
  objective: Readonly<{ title: string; description: string }>;
  hints: AuthoringHints;
  rewards: readonly RewardDefinition[];
  preview: AuthoringPreviewFixtures;
}>;

export type AuthoringWorld = Readonly<{
  id: string;
  position: number;
  title: string;
  description: string;
  themeKey: string;
  levels: readonly AuthoringLevel[];
}>;

export type AuthoringCourse = Readonly<{
  id: string;
  title: string;
  shortDescription: string;
  accent: string;
  minimumAge: number;
  maximumAge: number | null;
  status: "draft" | "published";
  commands: Readonly<Record<string, CommandDefinition>>;
  worlds: readonly AuthoringWorld[];
}>;

export type AuthoredCourse = Readonly<{
  course: KidsCourseDefinition;
  previews: ReadonlyMap<string, AuthoringPreviewFixtures>;
}>;

export class KidsAuthoringError extends Error {
  readonly issues: readonly AuthoringIssue[];

  constructor(issues: readonly AuthoringIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
    this.name = "KidsAuthoringError";
    this.issues = issues;
  }
}

function semanticIssues(source: AuthoringCourse) {
  const issues: AuthoringIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });
  const worldIds = new Set<string>();
  const levelIds = new Set<string>();

  source.worlds.forEach((world, worldIndex) => {
    const worldPath = `$.worlds[${worldIndex}]`;
    if (worldIds.has(world.id)) add("duplicate-world-id", `${worldPath}.id`, "World ID має бути унікальним.");
    worldIds.add(world.id);
    world.levels.forEach((level, levelIndex) => {
      const path = `${worldPath}.levels[${levelIndex}]`;
      if (levelIds.has(level.id)) add("duplicate-level-id", `${path}.id`, "Level ID має бути унікальним у межах курсу.");
      levelIds.add(level.id);
      if (level.title.trim().length > 60) add("title-too-long", `${path}.title`, "Коротка назва рівня має містити не більше 60 символів.");
      if (level.description.trim().length > 160) add("description-too-long", `${path}.description`, "Опис рівня має містити не більше 160 символів.");
      if (level.objective.title.trim().length > 80) add("objective-too-long", `${path}.objective.title`, "Ціль має бути короткою та конкретною.");
      const hints = [level.hints.conceptual, level.hints.strongerClue, level.hints.partialSolution].map((hint) => hint.trim());
      if (hints.some((hint) => !hint)) add("missing-progressive-hint", `${path}.hints`, "Потрібні conceptual clue, stronger clue і partial solution.");
      if (new Set(hints).size !== 3) add("duplicate-progressive-hint", `${path}.hints`, "Три підказки мають давати різний рівень допомоги.");
      if (level.commandIds.length === 0) add("missing-command", `${path}.commandIds`, "Рівень має запропонувати хоча б одну команду.");
      level.commandIds.forEach((id, commandIndex) => {
        if (!source.commands[id]) add("unknown-command", `${path}.commandIds[${commandIndex}]`, `Команда ${id} відсутня у catalog.`);
      });
      if (!level.commandIds.includes(level.intendedCommandId)) add("missing-intended-command", `${path}.intendedCommandId`, "Задумана команда має бути доступною в рівні.");
      if (level.maxRecommendedCommands < 1) add("invalid-command-budget", `${path}.maxRecommendedCommands`, "Command budget має бути додатним.");
      if (level.rewards.length === 0) add("missing-reward", `${path}.rewards`, "Рівень має видати deterministic cosmetic або stars reward.");
      if (!level.preview?.expectedSuccess || !level.preview?.expectedFailure) add("missing-preview-fixture", `${path}.preview`, "Потрібні expected success і expected failure fixtures.");
      if (level.mode === "code" && !level.starterCode?.trim()) add("missing-starter-code", `${path}.starterCode`, "Code Mode потребує видимого starter code.");
    });
  });

  return issues;
}

export function authorKidsCourse(source: AuthoringCourse): AuthoredCourse {
  const issues = semanticIssues(source);
  if (issues.length > 0) throw new KidsAuthoringError(issues);
  const previews = new Map<string, AuthoringPreviewFixtures>();

  const course = defineKidsCourse({
    schema: "systema.kids-course",
    schemaVersion: 1,
    contentVersion: 1,
    id: source.id,
    slug: source.id,
    title: source.title,
    shortDescription: source.shortDescription,
    recommendedAge: { minimum: source.minimumAge, maximum: source.maximumAge },
    status: source.status,
    accent: source.accent,
    worlds: source.worlds.map((world) => ({
      id: world.id,
      courseId: source.id,
      slug: world.id,
      position: world.position,
      contentVersion: 1,
      title: world.title,
      description: world.description,
      themeKey: world.themeKey,
      levels: world.levels.map((level) => {
        previews.set(level.id, level.preview);
        const commands = level.commandIds.map((id) => source.commands[id]);
        const intendedCommand = source.commands[level.intendedCommandId];
        return {
          id: level.id,
          worldId: world.id,
          slug: level.id,
          position: level.position,
          contentVersion: 1,
          title: level.title,
          description: level.description,
          difficulty: level.difficulty,
          learningModes: [level.mode],
          ...(level.starterCode ? { starterCode: level.starterCode } : {}),
          challenge: {
            id: `${level.id}-challenge`,
            levelId: level.id,
            contentVersion: 1,
            title: level.title,
            description: level.description,
            initialGameState: {
              grid: level.grid,
              character: { id: "hero", position: { x: level.start.x, y: level.start.y }, direction: level.start.direction },
              obstacles: (level.obstacles ?? []).map((obstacle) => ({ id: obstacle.id, kind: obstacle.kind ?? "rock", position: { x: obstacle.x, y: obstacle.y } })),
              items: (level.items ?? []).map((item) => ({ id: item.id, kind: item.kind, position: { x: item.x, y: item.y } })),
              goal: level.goal,
            },
            availableCommands: commands,
            objective: {
              id: `${level.id}-objective`,
              title: level.objective.title,
              description: level.objective.description,
              expectedConditions: [{ kind: "character-at", position: level.goal }, { kind: "no-collision" }],
            },
            maxRecommendedCommands: level.maxRecommendedCommands,
            hints: [
              { stage: 1, text: level.hints.conceptual },
              { stage: 2, text: level.hints.strongerClue },
              { stage: 3, text: level.hints.partialSolution },
            ],
            starCriteria: [
              { stars: 1, label: "Виконай ціль", conditions: [{ kind: "character-at", position: level.goal }] },
              { stars: 2, label: "Вкладися в бюджет команд", conditions: [{ kind: "command-count-at-most", count: level.maxRecommendedCommands }] },
              { stars: 3, label: "Використай задуману ідею", conditions: [{ kind: "command-used", commandId: intendedCommand.id, minimumCount: 1 }] },
            ],
            rewards: level.rewards,
          },
        };
      }),
    })),
  });

  return { course, previews };
}
