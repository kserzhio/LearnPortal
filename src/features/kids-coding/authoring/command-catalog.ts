import type { CommandDefinition } from "../domain";

export const kidsCommandCatalog: Readonly<Record<string, CommandDefinition>> = Object.freeze({
  move: {
    id: "move", kind: "move-forward", label: "Рухайся", description: "Переміщує героя вперед.", javascriptExample: "hero.move();",
    parameters: [{ id: "steps", label: "Кроки", type: "integer", minimum: 1, maximum: 5, defaultValue: 1 }],
  },
  "turn-left": { id: "turn-left", kind: "turn-left", label: "Ліворуч", description: "Повертає героя ліворуч.", javascriptExample: "hero.turnLeft();", parameters: [] },
  "turn-right": { id: "turn-right", kind: "turn-right", label: "Праворуч", description: "Повертає героя праворуч.", javascriptExample: "hero.turnRight();", parameters: [] },
  jump: {
    id: "jump", kind: "jump", label: "Стрибок", description: "Стрибає вперед через одну клітинку.", javascriptExample: "hero.jump();",
    parameters: [{ id: "distance", label: "Відстань", type: "integer", minimum: 2, maximum: 3, defaultValue: 2 }],
  },
  pick: { id: "pick", kind: "pick-item", label: "Підбери", description: "Підбирає предмет на клітинці.", javascriptExample: "hero.pick();", parameters: [] },
  repeat: { id: "repeat", kind: "repeat", label: "Повтори", description: "Повторює вкладені команди.", javascriptExample: "for (let i = 0; i < 3; i++) {}", parameters: [] },
  if: { id: "if", kind: "if", label: "Якщо", description: "Перевіряє умову перед виконанням команд.", javascriptExample: "if (hero.pathAheadClear()) {}", parameters: [] },
  call: { id: "call", kind: "call-function", label: "Function", description: "Викликає створену function.", javascriptExample: "advance();", parameters: [] },
});
