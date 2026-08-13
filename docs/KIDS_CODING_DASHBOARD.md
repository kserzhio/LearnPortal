# Kids Coding dashboard and catalog integration

T-506 додає reusable server-rendered `KidsCourseDashboard` у дві поверхні порталу:

- `/courses` — публічні cards обох Kids Coding курсів із першим preview-рівнем;
- `/dashboard` — персональні Start/Continue/Replay cards з прогресом із Supabase.

## Data flow

Dashboard залишається Server Component. Запит до `kids_level_progress` виконується паралельно з profile, enrollment, lesson progress, architecture та simulator queries. Окремого browser→API waterfall для першого render немає.

До компонента передається мінімальний summary:

```ts
{
  courseId,
  completedLevelIds,
  startedLevelIds,
  stars
}
```

Course metadata, world і level ordering походять із versioned `kidsCourses` registry. Режим `blocks` або `code` визначається з `learningModes`, а не позицією card.

## Resume rules

- без прогресу: перший level і дія `Почати`;
- є progress: перший незавершений level і дія `Продовжити`;
- усі levels завершені: останній level і дія `Переграти курс`.

Cards показують completed levels, earned stars і native `<progress>` із текстовим еквівалентом.

## Guest access

Гість бачить обидва курси в каталозі, але може відкрити лише перший level кожного курсу:

- `/kids-coding/robot-quest-algorithms/village/robot-village-01`;
- `/kids-coding/code-adventure-javascript/village/code-village-01`.

Інші відомі Kids level URLs перенаправляються на sign-in зі safe same-origin `next` path. Якщо Supabase не налаштований, вони повертаються до preview-рівня відповідного курсу. Це не змінює High Load access flow.

Preview paths поки дублюються в proxy як явний access allowlist. Під час T-513 authoring workflow їх потрібно перенести у server-safe catalog metadata, щоб третій курс додавався configuration-only.

## UI and accessibility

- card — semantic article, CTA — link;
- вік, режим, світ і кількість levels мають текстові labels;
- stars і completion не залежать лише від кольору;
- normal text не менше `1rem`, targets не менше `2.75rem`;
- CSS використовує `rem`, `%`, `fr` і content breakpoints без `px`;
- контрастні dark/lime та dark/violet variants, visible focus і forced-colors borders;
- grid reflow: дві cards на desktop, одна card на tablet/mobile, facts стають vertical на `20rem`.
