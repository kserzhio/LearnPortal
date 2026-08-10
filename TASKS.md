# Systema Task Tracker

Останнє оновлення: 2026-08-10

Цей файл є основним tracker-ом продукту. Завершені задачі позначаємо `[x]`, активну задачу — `🚧`, заблоковану — `⛔`, заплановану — `[ ]`.

## Поточний стан

- Репозиторій: [kserzhio/LearnPortal](https://github.com/kserzhio/LearnPortal)
- Production URL: [learn-portal-gamma.vercel.app](https://learn-portal-gamma.vercel.app)
- Активний етап: **M2 — Повноцінний learning account**
- Наступна задача: **T-201 — додати профіль і налаштування користувача**

## Завершено

### M0 — Portal foundation

- [x] **T-001** Створити перший курс із 19 занять.
- [x] **T-002** Додати інтерактивні architecture simulators і structured validation errors.
- [x] **T-003** Додати фінальний System Design simulator із valid та invalid scenarios.
- [x] **T-004** Створити Next.js App Router оболонку порталу.
- [x] **T-005** Додати landing page, каталог курсів і сторінки курсів.
- [x] **T-006** Зберегти чинний курс як legacy runtime без втрати функціональності.
- [x] **T-007** Підключити локальні Open Sans Variable і Space Mono.
- [x] **T-008** Додати responsive layout без нових `px`-значень.
- [x] **T-009** Перевірити новий UI на WCAG AA та ширині `20rem`.
- [x] **T-010** Додати Supabase-ready server/browser clients і auth routes.
- [x] **T-011** Підготувати PostgreSQL schema, indexes і RLS policies.
- [x] **T-012** Створити versioned local progress adapter і Supabase progress adapter.
- [x] **T-013** Додати dashboard foundation і безпечний setup mode без env-змінних.
- [x] **T-014** Налаштувати ESLint, TypeScript і production build.
- [x] **T-015** Опублікувати початковий портал у GitHub branch `main`.
- [x] **T-016** Додати живий task tracker із milestones, priorities та `Done when`.

## Завершено: M1 — Cloud foundation та авторизація

- [x] **T-101 · P0 · Owner: User** Створити online Supabase project.
  - Done when: отримані Project URL і publishable key; secrets не додані в Git.
- [x] **T-102 · P0 · Owner: User + Codex** Створити `.env.local` і підключити локальний портал до Supabase.
  - Depends on: T-101.
  - Done when: setup mode вимкнений, клієнт і server routes бачать Supabase.
- [x] **T-103 · P0 · Owner: Codex** Виконати SQL migration та перевірити таблиці, indexes і RLS.
  - Depends on: T-101.
  - Done when: migration застосована; anonymous user не читає приватні rows; authenticated user бачить лише власні rows.
- [x] **T-104 · P0 · Owner: User + Codex** Налаштувати Google OAuth для локальної розробки.
  - Depends on: T-101.
  - Done when: sign-in, callback, session refresh і sign-out працюють end-to-end.
- [x] **T-105 · P0 · Owner: User + Codex** Налаштувати GitHub OAuth для локальної розробки.
  - Depends on: T-101.
  - Done when: sign-in, callback, session refresh і sign-out працюють end-to-end.
## Завершено: M1 — синхронізація навчальних даних

- [x] **T-106 · P0 · Owner: Codex** Підключити legacy progress до спільного progress service.
  - Depends on: T-103.
  - Done when: guest progress залишається локальним; після входу прогрес синхронізується без втрати завершених занять.

## Завершено: M1 — збереження практичних робіт

- [x] **T-107 · P0 · Owner: Codex** Зберігати simulator attempts і saved architectures у PostgreSQL.
  - Depends on: T-103.
  - Done when: користувач може зберегти, відкрити та видалити лише власну схему.

## Завершено: M1 — production deployment

- [x] **T-108 · P0 · Owner: User + Codex** Розгорнути портал на Vercel.
  - Depends on: T-102.
  - Done when: production build доступний через HTTPS; env-змінні налаштовані окремо від Git.
- [x] **T-110 · P0 · Owner: Codex** Додати production URL до Supabase, Google OAuth і GitHub OAuth.
  - Depends on: T-108.
  - Done when: production callback URLs налаштовані без зміни локального OAuth flow.
- [x] **T-109 · P0 · Owner: Codex** Провести production smoke test.
  - Depends on: T-104, T-105, T-108.
  - Done when: landing, catalog, lesson navigation, обидва OAuth providers, progress sync і sign-out проходять перевірку без console errors.

## Зараз: M2 — Повноцінний learning account

- [ ] 🚧 **T-201 · P1** Додати сторінку профілю та налаштувань користувача.
- [ ] **T-202 · P1** Додати course enrollment і коректний прогрес окремо для кожного курсу.
- [ ] **T-203 · P1** Додати resume from last lesson.
- [ ] **T-204 · P1** Додати історію simulator attempts і пояснення попередніх помилок.
- [ ] **T-205 · P1** Додати export/import навчальної архітектури у versioned JSON.
- [ ] **T-206 · P1** Додати email registration лише після email verification, rate limiting і recovery flow.
- [ ] **T-207 · P1** Додати видалення account і персональних даних.

## M3 — Платформа для багатьох курсів

- [ ] **T-301 · P1** Винести lesson metadata та content contract у data-driven modules.
- [ ] **T-302 · P1** Розділити великий legacy `app.js` на simulator core, validators, renderers та persistence adapters.
- [ ] **T-303 · P1** Створити reusable lesson shell із theory, code, diagram, practice та result sections.
- [ ] **T-304 · P1** Створити reusable simulator engine зі structured result `{ valid, code, message, affectedIds }`.
- [ ] **T-305 · P2** Додати курс «Архітектура сучасного Frontend».
- [ ] **T-306 · P2** Додати курс «Platform Engineering та DevOps».
- [ ] **T-307 · P2** Підготувати localization boundary для української та англійської мов.

## M4 — Якість, безпека та експлуатація

- [ ] **T-401 · P1** Додати GitHub Actions: lint, typecheck і build для pull requests.
- [ ] **T-402 · P1** Додати unit tests для pure architecture validators.
- [ ] **T-403 · P1** Додати end-to-end tests для auth, lesson navigation, simulator і progress sync.
- [ ] **T-404 · P1** Додати automated axe-core accessibility tests.
- [ ] **T-405 · P1** Додати Stylelint rule, що забороняє нові `px` declarations.
- [ ] **T-406 · P1** Додати security headers, CSP та перевірку open redirects.
- [ ] **T-407 · P1** Додати error monitoring і privacy-safe observability.
- [ ] **T-408 · P2** Визначити performance budgets для JavaScript, CSS і LCP.
- [ ] **T-409 · P2** Додати backup/restore runbook для Supabase PostgreSQL.

## Відомий migration debt

- [ ] Legacy course тимчасово дублюється в root і `public/legacy`; видаляти root-копію лише після перевірки нового runtime.
- [ ] Course content частково залишається у великому HTML-файлі.
- [ ] Validators і DOM rendering поки поєднані у великому `app.js`.
- [ ] Історія simulator attempts доступна через API, але ще не має окремого UI.

## Рекомендований порядок наступних робіт

1. T-201 — додати сторінку профілю та налаштувань користувача.
2. T-202 — додати course enrollment і прогрес окремо для кожного курсу.
3. T-203 — додати resume from last lesson.

## Як оновлювати tracker

- Одна задача має один стабільний ID.
- Не позначати задачу завершеною без виконаного `Done when`.
- Нові термінові задачі отримують `P0`; важливі задачі поточного milestone — `P1`; майбутні покращення — `P2`.
- Після кожного завершеного етапу оновлювати дату, active milestone і next task.
- Значні зміни виконувати через окремий commit із ID задачі, наприклад `feat(T-106): sync lesson progress`.
