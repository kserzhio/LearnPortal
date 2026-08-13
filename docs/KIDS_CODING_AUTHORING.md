# Kids Coding authoring workflow

Цей workflow дозволяє додавати нові курси, worlds і 50+ levels як конфігурацію. Автор не копіює route, React screen, execution engine, sandbox, progress store або World Map.

## Основні файли

- `src/features/kids-coding/authoring/authoring-model.ts` — typed authoring contract, semantic guardrails і compiler у production `KidsCourseDefinition`.
- `src/features/kids-coding/authoring/command-catalog.ts` — lightweight спільний catalog команд без залежності від UI або engine runtime.
- `src/features/kids-coding/authoring/templates.ts` — helpers для executable preview programs.
- `src/features/kids-coding/authoring/demo-course.ts` — мінімальний configuration-only draft `Space Logic Lab`.
- `scripts/check-kids-authoring.mjs` — domain validation і реальне виконання expected success/failure fixtures.

## Як створити курс

1. Скопіюй структуру `spaceLogicLabDraft` у новий data module.
2. Дай course, world і level стабільні kebab-case IDs. Не змінюй ID після публікації; для зміни змісту збільшуй content version у production model.
3. Обери команди зі спільного `kidsCommandCatalog`. Нову команду спершу додай у domain/engine allowlist і security tests.
4. Для кожного рівня задай коротку ціль, grid, start/goal, command budget, задуману команду, три рівні підказок і deterministic reward.
5. Додай два executable preview fixtures: один має пройти ціль, другий — коректно запуститися, але не виконати її.
6. Виклич `authorKidsCourse(draft)`. У published catalog додавай лише `.course`, а authoring metadata і fixtures не потрапляють у клієнтський payload.
7. Запусти `npm run check:kids-authoring`, потім повний quality gate.

## Level template

```ts
{
  id: "course-world-01",
  position: 1,
  title: "Коротка назва",
  description: "Одна конкретна навчальна дія.",
  difficulty: "starter",
  mode: "blocks",
  grid: { columns: 5, rows: 3 },
  start: { x: 0, y: 1, direction: "east" },
  goal: { x: 3, y: 1 },
  commandIds: ["move", "repeat"],
  intendedCommandId: "repeat",
  maxRecommendedCommands: 2,
  objective: {
    title: "Дістанься фінішу",
    description: "Зупини героя на позначеній клітинці без зіткнень.",
  },
  hints: {
    conceptual: "Назви принцип, але не відповідь.",
    strongerClue: "Підкажи потрібний інструмент або наступний крок.",
    partialSolution: "Покажи каркас рішення, не видаючи все одразу.",
  },
  rewards: [{
    id: "course-world-01-badge",
    type: "badge",
    referenceId: "first-signal",
    quantity: 1,
  }],
  preview: {
    expectedSuccess: program(/* intended solution */),
    expectedFailure: program(/* meaningful wrong attempt */),
  },
}
```

Для Code Mode додай `starterCode`. Він має показувати нову ідею без прихованого доступу до browser APIs; допустимий синтаксис визначає restricted sandbox.

## Content checklist

Перед review кожен level повинен мати:

- одну коротку, перевірювану learning goal;
- українське пояснення нового англійського терміна;
- title до 60 символів і description до 160 символів;
- доступні команди без зайвих понять із майбутніх рівнів;
- додатний command budget і одну intended concept/command;
- conceptual clue, stronger clue та partial solution без дублювання;
- expected success fixture, що проходить engine;
- expected failure fixture, що запускається, але дає friendly failure;
- критерії 1/2/3 stars, сформовані compiler-ом із goal, budget та intended command;
- deterministic stars/cosmetic reward без monetization, loot boxes або випадковості;
- короткий visible effect у грі, а не абстрактний `console.log`;
- перевірку keyboard, `20rem`, reduced motion і WCAG AA, якщо додано новий UI primitive.

## Validation boundaries

`authorKidsCourse` спочатку перевіряє authoring semantics, потім передає зібрану конфігурацію strict runtime parser-у. Помилки мають stable `code`, `path` і безпечне повідомлення. Compiler видаляє preview fixtures із production course, тому executable test data не зберігається у progress і не відправляється користувачу.

`Space Logic Lab` навмисно має status `draft` і не входить до `kidsCourses`: це preview fixture, а не третій видимий продукт. Щоб опублікувати готовий курс, додай compiled course до registry та Supabase catalog migration після проходження всіх перевірок.

## Quality gate

```text
npm run check:kids-authoring
npm run check:kids-course-model
npm run check:kids-game-engine
npm run check:kids-js-sandbox
npm run check:kids-a11y
npm run typecheck
npm run lint
npm run build
```
