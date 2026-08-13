# Final Project contract

## Призначення

`systema.final-project` version 1 описує фінальне завдання курсу як data-only content. Contract не містить React, DOM, Supabase client або executable user code, тому один workspace зможе обслуговувати дорослі та дитячі курси.

Перший fixture — `high-load-audit-platform` для курсу High Load Architecture. Він фіксує scenario, assumptions, requirements, constraints, success criteria, стартовий стан і контрольований validator binding.

## Version boundary

Кожен project має:

- `schemaVersion` — версію форми contract;
- `contentVersion` — immutable версію конкретного project;
- `builder.version` — версію дозволених компонентів, policies і failure scenarios;
- `starterScenario.version` — версію стартового стану;
- `validator.version` і `validator.resultVersion` — версії правил та їх structured result.

У version 1 усі п'ять content versions мають збігатися. Registry додатково перевіряє simulator ID, simulator schema version та наявність точного validator descriptor. Несумісне поєднання відхиляється під час authoring/build, а не після студентського run.

Нова редакція опублікованого завдання додається новою `contentVersion` разом із відповідним validator descriptor. Старі студентські artifacts надалі можна відтворити їх власною версією.

## Safety та accessibility

- Authored payload зберігає тільки JSON-compatible state. Functions, class instances та інші executable values відхиляються.
- State проходить parser зареєстрованого simulator до публікації.
- `scenario`, `requirements`, `constraints` і `successCriteria` є короткими структурованими collections для semantic lists у T-802.
- `starterScenario.textDescription` є обов'язковою текстовою альтернативою початкової visual architecture.
- Validator повертає `{ valid, code, message, affectedIds }`; score та випадкові outcomes не вигадуються моделлю.
- `access.guestPreview` задає явну policy для майбутнього workspace, а `status` відділяє draft, published та archived content.

## Межі відповідальності

- Domain parser у `src/features/final-projects/domain` перевіряє content contract, references, JSON safety та version compatibility.
- Content registry у `src/features/final-projects/content` зберігає fixtures і дозволені validator adapters, включно з optional legacy lesson binding для T-107 persistence.
- Existing simulator у `src/lib/simulators/final-system-design.ts` залишається джерелом state parsing та deterministic validation.
- T-802 відповідає за сторінку та run/result flow; T-803 — за constrained builder; T-804 додасть детальні per-scenario remediation results; T-805 — owner-only persistence/library.

## Перевірка

Запустити `npm run check:final-project-model`. Check покриває High Load fixture, invalid/valid result, JSON round-trip, unknown course, invalid starter state, executable payload, missing text alternative та incompatible versions.

## Workspace

T-802 додає public route `/projects/[slug]` лише для `published` definitions. Server Component відображає scenario, semantic lists вимог і success criteria та напряму читає останній сумісний owner-only artifact. Client boundary отримує тільки JSON-compatible project/persistence data й відповідає за run, live result, focus summary та explicit save.

Guest може запустити дозволений preview без локальної імітації account state. Після входу state зберігається у чинній T-107 таблиці `saved_architectures`, відновлюється після reload і повторно проходить parser поточної simulator schema. Network/database failure не очищає workspace та дає повторити save.

## Constrained System Design builder

T-803 додає до workspace data-driven набір компонентів, reliability policies і failure scenarios з `project.builder`. Студент додає або прибирає вузли, створює зв'язки через два `select`, налаштовує policies через checkbox і змінює scenario без drag-and-drop. Selected state завжди передається текстом, `aria-pressed` або checked state, а поточна архітектура має семантичне list-представлення.

Export має формат `systema.final-project-artifact@1` і зберігає `projectId`, `projectContentVersion`, `simulatorId`, `simulatorSchemaVersion` та нормалізований state. Import приймає лише JSON для поточного project/version, повторно перевіряє дозволені component IDs, policy IDs, scenario, connections та їх межі. Legacy T-802 state без `connections` мігрується в порожній список; невідомі або несумісні дані відхиляються без зміни workspace.

Для builder додатково запустити `npm run check:system-design-builder`.

## Scenario validation

T-804 оновлює High Load project і validator contract до content/result version 2. Pure validator перевіряє п'ять сценаріїв: primary database failure, API instance failure, Redis outage, primary region outage та traffic spike / overload. Кожен сценарій має три детерміновані checks: потрібні компоненти, reliability policies і напрямлений data/failover flow.

Structured result містить stable code, чесний score `passed / total`, пояснення кожного scenario/check, remediation та affected IDs. Активний у builder scenario показується першим, але фінальний успіх вимагає проходження всіх 15 checks. UI передає success/error текстом, semantic lists і конкретною наступною дією; rerun після редагування не видаляє state.

Аналітика отримує лише `project_id`, aggregate result та stable `scenario_id`; architecture payload і student connections не передаються. Custom event delivery залишається paused.

Для scenario engine запустити `npm run check:final-project-scenarios`.

Для workspace додатково запустити `npm run check:final-project-workspace`.

## Приватна бібліотека завершених проєктів

T-805 додає owner-only route `/dashboard/projects`. У бібліотеку потрапляє лише artifact, який сервер повторно розібрав за точною `simulatorSchemaVersion`, зв'язав із точною `projectContentVersion` та підтвердив чинним deterministic validator. Позначка `completed_at` сама по собі не є доказом завершення.

Завершена версія приватна за замовчуванням і не потрапляє до public routes, sitemap або analytics payload. RLS таблиці `saved_architectures` обмежує читання, зміну, export і delete поточним `auth.uid()`. Public exposure можливий лише через майбутню T-1001 з окремою згодою користувача.

Повторне редагування не стирає досягнення: valid revision оновлює artifact зі збереженням першої дати завершення, а invalid revision зберігається як окрема чернетка. JSON export містить versioned `systema.final-project-artifact@1`; імпорт і повторне відкриття надалі перевіряють точну версію. Видалення потребує явного checkbox-підтвердження та назавжди видаляє тільки вибраний owner artifact.

Schema migration: `supabase/migrations/202608130002_completed_final_projects.sql`. Для бібліотеки додатково запустити `npm run check:completed-projects`.
