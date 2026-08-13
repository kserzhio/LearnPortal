import { authorKidsCourse, type AuthoringCourse } from "./authoring-model";
import { command, kidsCommandCatalog, program, repeat } from "./templates";

export const spaceLogicLabDraft = {
  id: "space-logic-lab",
  title: "Space Logic Lab",
  shortDescription: "Demo course, що перевіряє configuration-only authoring workflow.",
  accent: "SL",
  minimumAge: 8,
  maximumAge: 12,
  status: "draft",
  commands: kidsCommandCatalog,
  worlds: [{
    id: "orbit",
    position: 1,
    title: "Orbit",
    description: "Короткий author preview world для перевірки повторень.",
    themeKey: "space",
    levels: [{
      id: "space-orbit-01",
      position: 1,
      title: "Сигнал на орбіті",
      description: "Повтори імпульс, щоб дістатися до маяка.",
      difficulty: "starter",
      mode: "blocks",
      grid: { columns: 5, rows: 3 },
      start: { x: 0, y: 1, direction: "east" },
      goal: { x: 3, y: 1 },
      commandIds: ["move", "repeat"],
      intendedCommandId: "repeat",
      maxRecommendedCommands: 2,
      objective: { title: "Дістанься маяка", description: "Зупини корабель на клітинці маяка без зіткнень." },
      hints: {
        conceptual: "Той самий імпульс потрібен кілька разів.",
        strongerClue: "Один MOVE можна помістити всередину REPEAT.",
        partialSolution: "Створи REPEAT на три повторення та додай всередину один MOVE.",
      },
      rewards: [{ id: "space-orbit-01-badge", type: "badge", referenceId: "signal-pilot", quantity: 1 }],
      preview: {
        expectedSuccess: program(repeat("repeat-signal", 3, command("move-signal", "move", { steps: 1 }))),
        expectedFailure: program(command("single-signal", "move", { steps: 1 })),
      },
    }],
  }],
} as const satisfies AuthoringCourse;

export const spaceLogicLabPreview = authorKidsCourse(spaceLogicLabDraft);
