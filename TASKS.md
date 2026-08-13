# Systema Task Tracker

Останнє оновлення: 2026-08-13

Цей файл є основним tracker-ом продукту. Завершені задачі позначаємо `[x]`, активну задачу — `🚧`, заблоковану — `⛔`, заплановану — `[ ]`.

## Поточний стан

- Репозиторій: [kserzhio/LearnPortal](https://github.com/kserzhio/LearnPortal)
- Production URL: [learn-portal-gamma.vercel.app](https://learn-portal-gamma.vercel.app)
- Активний етап: **M9 — Sustainable Habit / T-901**
- Наступна задача: **T-901 — optional Weekly Learning Goal settings**

## Завершено

### M0 — Portal foundation

- [x] **T-001** Створити перший курс із 19 занять.
- [x] **T-002** Додати інтерактивні architecture simulators і structured validation errors.
- [x] **T-003** Додати фінальний System Design simulator із valid та invalid scenarios.
- [x] **T-004** Створити Next.js App Router оболонку порталу.
- [x] **T-005** Додати landing page, каталог курсів і сторінки курсів.
- [x] **T-006** Зберегти чинний курс як legacy runtime без втрати функціональності.
- [x] **T-007** Підключити локальні Manrope Variable і JetBrains Mono Variable з підтримкою української кирилиці.
- [x] **T-008** Додати responsive layout без нових `px`-значень.
- [x] **T-009** Перевірити новий UI на WCAG AA та ширині `20rem`.
- [x] **T-010** Додати Supabase-ready server/browser clients і auth routes.
- [x] **T-011** Підготувати PostgreSQL schema, indexes і RLS policies.
- [x] **T-012** Створити versioned local progress adapter і Supabase progress adapter.
- [x] **T-013** Додати dashboard foundation і безпечний setup mode без env-змінних.
- [x] **T-014** Налаштувати ESLint, TypeScript і production build.
- [x] **T-015** Опублікувати початковий портал у GitHub branch `main`.
- [x] **T-016** Додати живий task tracker із milestones, priorities та `Done when`.
- [x] **T-017** Зафіксувати мінімальний розмір читабельного тексту `1rem`, мігрувати типографіку та додати автоматичну перевірку.
- [x] **T-018** Покращити course sidebar: згортання на desktop, modal navigation на mobile, повернення на головну, системний scrollbar і читабельні назви занять.
- [x] **T-019** Доробити legacy course navigation: компактний `0.8rem` sidebar override, нульовий navigation margin, активний profile avatar, інтерактивні breadcrumbs і реальний elapsed learning day від дати старту курсу.
- [x] **T-020 · P1 · Owner: Codex** Оновити головну SYSTEMA як універсальну інтерактивну вітрину для дорослих і дітей.
  - Реалізовано: universal hero, lightweight High Availability demo, Adults/Kids paths, методика `Learn → Build → Simulate → Check`, result-focused course cards, benefits і final CTA.
  - Прогрес, streak і achievements відображаються лише з реальних Supabase або local progress даних; reusable social proof прихований, доки немає реальної статистики чи відгуків.
  - Accessibility/performance: native keyboard button, live status, текстовий offline state, visible focus, `1rem` minimum text, `20rem` reflow, reduced motion, Forced Colors і жодних важких UI-залежностей.
  - Перевірено: TypeScript, ESLint, production build, font-size gate та browser QA для desktop/mobile й інтерактивного failover сценарію.
- [x] **T-021 · P1 · Owner: Codex + User** Додати lesson learning support: Q&A, FAQ, feedback, knowledge checks і `Need help?`.
  - Реалізовано локально: reusable lesson-scoped Q&A та flat replies, filters, official/resolved moderation, useful reaction, public read/authenticated write, lesson/course FAQ, progressive hints, helpful feedback і server-validated knowledge check.
  - Дані: migration додає `USER / INSTRUCTOR / ADMIN`, RLS, приватну feedback-аналітику й attempts; спільний `contentId` підтримує High Load lessons і Kids levels.
  - Інтегровано: повний vertical slice у High Load preview lesson, course FAQ для High Load/Kids, discussion і feedback у Kids levels.
  - Cloud: migration `202608120001_learning_support.sql` застосована транзакційно до project `lpaeprmvctpilwqvlxgb`; authenticated question create/read/delete перевірено end-to-end, а тимчасові E2E rows видалено.
  - Перевірено: guest/authenticated behavior, native dialog focus, keyboard FAQ/quiz/hints, correct/wrong explanations, negative feedback follow-up, desktop/`20rem` reflow, `1rem` minimum text, `2.75rem` targets, lint, typecheck і production build.
  - Rollout: reusable DOM mount підключено до події навігації всіх 19 legacy-занять; вибрані заняття 1, 9, 13, 15 і 19 мають server-validated knowledge checks, решта — Q&A, FAQ, feedback і progressive hints.
  - Moderator E2E: тимчасова роль `INSTRUCTOR` показала moderator controls; resolve, official answer і confirm-delete пройшли через UI; тестові rows видалено, роль повернуто до `USER`.
  - Security: застосовано `202608120002_protect_profile_roles.sql`, тому authenticated profile не може самостійно підвищити власну роль.
  - Done when: learning-support відображається в усіх 19 adult lessons; moderator resolve/official/delete flow перевірено end-to-end.
- [x] **T-022 · P1 · Owner: Codex** Уніфікувати продуктову систему іконок на Lucide.
  - Рішення: `lucide-react` із прямим контрольованим registry для Next UI та локальний SVG factory без CDN для legacy runtime.
  - Реалізовано: shared `SystemIcon`, dashboard/auth/Kids UI, homepage CTA/demo, profile chip і повний learning-support flow; усі 19 legacy lessons та simulators отримують локальні SVG через progressive enhancement без CDN.
  - Не вважаємо іконками: навчальні скорочення `API / DB / RPS`, числа, математичні оператори та напрямки команд у Kids algorithms.
  - Автоматизація: `npm run check:icons` перевіряє всі TSX-файли, заборонені Unicode glyphs, accessibility contract, tree-shaking і підключення legacy adapter.
  - Перевірено: icon audit, font-size gate, TypeScript, ESLint, production build; browser QA на desktop і `20rem`, включно з динамічними validation results та відсутністю icon-only controls без accessible name.
  - Done when: у product controls немає emoji/довільних Unicode glyphs, усі icon-only controls мають accessible name, build і browser QA зелені.

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
- [x] **T-111 · P0 · Owner: Codex** Підключити Vercel project до GitHub repository.
  - Done when: push у `main` автоматично створює production deployment без локального Vercel CLI token.

## Зараз: M2 — Повноцінний learning account

- [x] **T-201 · P1** Додати сторінку профілю та налаштувань користувача.
- [x] **T-202 · P1** Додати course enrollment і коректний прогрес окремо для кожного курсу.
- [x] **T-203 · P1** Додати resume from last lesson.
- [x] **T-204 · P1** Додати історію simulator attempts і пояснення попередніх помилок.
- [x] **T-205 · P1** Додати export/import навчальної архітектури у versioned JSON.
- [x] **T-208 · P0** Обмежити неавторизований доступ одним preview-заняттям на серверному рівні.
  - Done when: guest не отримує повний HTML курсу; preview містить лише заняття 1; авторизований користувач бачить усі 19 занять.
- [ ] **T-206 · P1** Додати email registration лише після email verification, rate limiting і recovery flow.
  - Реалізовано: email sign-in/signup, generic recovery response, authenticated password update, safe redirects і UI validation.
  - Supabase перевірено: Confirm email увімкнено, callback allow-list правильний, password minimum `12`, Secure password change увімкнено, rate limits активні.
  - Залишилось до Done: підключити custom SMTP і CAPTCHA provider credentials; провести end-to-end тест із реальним confirmation/recovery листом.
- [x] **T-207 · P1** Додати видалення account і персональних даних.
  - Реалізовано: self-service danger zone, точне підтвердження, повторний вхід не давніше ніж 15 хвилин і server-side RPC із `auth.uid()`.
  - Дані видаляються каскадно разом із Supabase Auth identity; `public` та `anon` не мають права виконувати функцію.
  - Перевірено: anonymous RPC повертає `401 permission denied`; помилкове UI-підтвердження не змінює дані. Реальне видалення тестового акаунта навмисно не виконувалося.

## Зараз: M3 — Платформа для багатьох курсів

- [x] **T-301 · P1** Винести lesson metadata та content contract у data-driven modules.
  - Реалізовано: типізований course contract, 6 modules і 19 lessons зі stable IDs, topics, practice, validation expectations та outcomes.
  - Next.js preview, dashboard resume, simulator history і access count використовують catalog source без додаткових metadata queries до PostgreSQL.
  - Runtime guard перевіряє унікальність IDs, безперервні positions і відповідність legacy anchors.
- [x] **T-302 · P1** Розділити великий legacy `app.js` на simulator core, validators, renderers та persistence adapters.
  - `app.js` тепер є компактним ES-module bootstrap; навігація, progress persistence, UI feedback і чотири доменні групи симуляторів ізольовані в `public/legacy/runtime`.
  - Додано контракт structured validation result та спільний renderer; фінальний System Design використовує обидва шари.
  - Legacy navigation отримує доступні modules/lessons із server route; гостьовий payload містить лише preview-заняття.
- [x] **T-303 · P1** Створити reusable lesson shell із theory, code, diagram, practice та result sections.
  - Server Component приймає lesson contract, code example, system diagram і optional practice/result slots без client-side JavaScript.
  - Shell має URL-якорі, семантичну heading hierarchy, текстову альтернативу схеми, expected success/failure та responsive reflow.
  - Preview заняття 1 переведено на спільний shell і використовує course data як єдине джерело topics, practice та outcome.
- [x] **T-304 · P1** Створити reusable simulator engine зі structured result `{ valid, code, message, affectedIds }`.
  - Engine інкапсулює state та надає lifecycle `initialize`, `update`, `replace`, `validate`, `serialize` і `reset`.
  - Validator contract перевіряється перед rendering; persistence отримує серіалізований snapshot та validation result через окремий hook.
  - Фінальний System Design переведено з mutable global state на engine; automated check покриває invalid, valid, repeated validation, state isolation і reset.
- [ ] **T-305 · P2** Додати курс «Архітектура сучасного Frontend».
  - Перетворити статичний блок «Поточний курс» на keyboard-accessible перемикач звичайних професійних курсів; Kids Coding залишається окремою секцією порталу.
- [ ] **T-306 · P2** Додати курс «Platform Engineering та DevOps» і підключити його до спільного course switcher.
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

## Заплановано: M5 — Kids Coding learning engine

Ціль milestone: додати ігрове навчання програмуванню для дітей від 6 років без перетворення порталу на традиційний LMS. Ієрархія контенту: `Course → World → Level → Challenge`. Нові курси мають додаватися через versioned data/configuration, а не через дублювання application logic.

- [x] **T-501 · P1 · Owner: Codex** Провести repository audit і підготувати integration design для Kids Coding.
  - Перевірити чинні routing, design system, authentication, profile, PostgreSQL schema, progress adapters і reusable simulator engine.
  - Зафіксувати межі нового learning engine, URL structure, Server/Client Component boundaries, data ownership і migration strategy без переписування наявних курсів.
  - Done when: створено короткий ADR із component/data flow, integration points, ризиками та послідовністю vertical slice.
  - Реалізовано: `docs/KIDS_CODING_INTEGRATION.md` фіксує audit, native App Router feature boundary, routes, data flow, sandbox, persistence model, child privacy gate і implementation sequence.
- [x] **T-502 · P1 · Owner: Codex** Створити reusable versioned data model `Course → World → Level → Challenge`.
  - Контракти рівня мають підтримувати stable IDs, title, description, recommended age, difficulty, initial game state, available commands, objective, expected conditions, command budget, three-stage hints і rewards.
  - Додати runtime validation конфігурацій та підготувати JSON/database-compatible serialization без прив’язки engine до DOM або Supabase client.
  - Depends on: T-501.
  - Done when: новий course/world/level можна додати даними; invalid configuration повертає зрозумілий structured error; schema має version і migration boundary.
  - Реалізовано: pure TypeScript domain model, strict runtime parser, deeply frozen JSON round-trip, structured authoring issues і automated valid/invalid configuration check.
- [x] **T-503 · P1 · Owner: Codex** Реалізувати deterministic game execution engine для grid-based challenges.
  - Підтримати послідовне виконання команд, керовані animation delays, reset, pause/cancel, objective validation і serializable attempts.
  - Початкові команди: move, turn left/right, jump, pick item; архітектура має дозволяти додати repeat, if і function call без переписування renderer.
  - Depends on: T-502.
  - Done when: однаковий initial state і program дають однаковий result; engine не залежить від React/DOM; automated tests покривають success, collision, invalid command, reset і cancellation.
  - Реалізовано: strict Program AST, pure grid runtime, ordered renderer-independent events, configurable cancellable timing, repeat/if/function execution, objective/stars validation і versioned serializable attempts.
  - Automated check покриває deterministic replay, multi-step movement, success, collision, invalid command, pause/resume, cancel, reset, state isolation та JSON round-trip.
- [x] **T-504 · P0 · Owner: Codex** Створити безпечний JavaScript execution sandbox для Code Mode.
  - Не виконувати user code у main application context; обмежити API дозволеними game commands, execution time, operations count і memory/communication surface.
  - Додати restrictive CSP-compatible design, cancellation і перетворення parser/runtime failures на friendly public errors без витоку technical details.
  - Depends on: T-501, T-502, T-503.
  - Done when: sandbox не має доступу до DOM, cookies, storage, network або portal globals; infinite loop зупиняється; security tests покривають escape attempts і resource limits.
  - Реалізовано: CSP-compatible restricted JavaScript compiler без `eval`/`Function`, allow-list grammar для game API, variables, bounded for, if і functions та runner поверх deterministic engine.
  - Security corpus перевіряє host API/escape attempts, dynamic access, unbounded loops, challenge allow-list, source/token/parser/operation limits, cancellation і wall-clock timeout.
- [x] **T-505 · P1 · Owner: Codex** Побудувати reusable Level / Challenge screen для desktop і tablet.
  - Компоненти: GameBoard, Character, CommandPalette, BlockEditor, CodeEditor boundary, RunControls, HintPanel, LevelResult, Stars і ProgressBar.
  - Підтримати Block Mode з необов’язковим JavaScript equivalent та Code Mode; рішення щодо CodeMirror/Monaco прийняти після bundle/performance comparison.
  - Depends on: T-502, T-503, T-504.
  - Done when: Run/Reset/Hint працюють; execution видно крок за кроком; layout reflow працює на tablet і `20rem`; core content залишається зрозумілим без анімації.
  - Реалізовано: URL-addressable data-driven route, GameBoard/Character, keyboard CommandPalette, BlockEditor із JavaScript equivalent, lightweight CodeEditor boundary, Run/Pause/Resume/Stop/Reset, progressive hints, friendly results, stars і world progress.
  - Browser QA: empty/valid Block Mode, valid/forbidden Code Mode, step-by-step board updates, `20rem` reflow без overflow, WCAG AA token contrast, zero console errors і zero Next error overlays.
- [x] **T-506 · P1 · Owner: Codex** Додати секцію Kids Coding та course dashboard до чинного порталу.
  - Показати cards для `Robot Quest — Algorithms` (6+) і `Code Adventure — JavaScript` (7+) із коротким описом, progress, кількістю levels і Start/Continue action.
  - Візуальна мова має бути дружньою, сучасною та game-like: великі цілі, мінімум тексту, без enterprise-dashboard стилю.
  - Depends on: T-501, T-502.
  - Done when: секція інтегрована з наявними navigation/auth/profile patterns і не змінює поведінку High Load курсу.
  - Реалізовано: reusable server-rendered cards у `/courses` і `/dashboard`, age/mode/world/level metadata, parallel Supabase progress query, Start/Continue/Replay routing, stars і accessible progress.
  - Guest policy: доступні два перші preview-рівні; інші відомі Kids level URLs ведуть на sign-in із safe same-origin `next`, без змін High Load access flow.
- [x] **T-507 · P1 · Owner: Codex** Реалізувати reusable visual World Map.
  - Показувати worlds, level path, current level, locked/unlocked state, completed state і зароблені stars без залежності лише від кольору.
  - Підтримати progression `Village → Forest → Desert → Ice World → Space` через data configuration.
  - Depends on: T-502, T-510.
  - Done when: завершення рівня відкриває наступний; current/locked/completed states доступні клавіатурі та screen reader; stars відображаються на map.
  - Реалізовано: pure deterministic progression model, authenticated course map route, server-side PostgreSQL progress loading, current/available/locked/completed states, stars і загальний progress.
  - Accessibility: native level links, `aria-current="step"`, текстові й символьні state labels, non-interactive locked nodes, visible focus, Forced Colors і `20rem` reflow.
  - Конфігураційний тест покриває `Village → Forest → Desert → Ice World → Space`, послідовне відкриття та server-verified explicit world unlock.
- [x] **T-508 · P1 · Owner: Codex** Створити Algorithms vertical slice: один world і п’ять playable levels.
  - Levels: один move; кілька steps; turn + move; obstacle avoidance; repeating pattern.
  - Рівні поступово вводять sequences, directions і перший loop/repeat без вимоги знати programming syntax.
  - Depends on: T-503, T-505, T-507, T-511.
  - Done when: усі п’ять рівнів мають valid/invalid paths, progressive hints, friendly feedback, star criteria і persistent completion.
  - Реалізовано: five-level Village sequence від single move до repeat, Block Mode controls, три stages hints, friendly structured feedback і intended-concept stars.
  - Persistent completion: versioned attempts записуються у local store для guest preview або server-verified Supabase API для authenticated user; після sync відкривається next level.
  - Access control: Server Component перевіряє World Map progress і не дозволяє обійти locked state прямим URL; network failure має окремий retry-save action.
  - Automated і browser QA: 5 valid + 5 invalid solutions, 15 stars, completed world persistence, real Supabase sync, next-level unlock, locked URL redirect і `20rem` reflow.
- [x] **T-509 · P1 · Owner: Codex** Створити JavaScript vertical slice: один world і п’ять playable levels.
  - Levels: `hero.move()`, `hero.move(3)`, `hero.jump()`, variable + move, basic loop.
  - Починати з видимого game effect, а не з `console.log`; показати зв’язок між visual blocks і JavaScript.
  - Depends on: T-504, T-505, T-507, T-511.
  - Done when: усі п’ять рівнів безпечно виконуються в sandbox, а результат анімується та перевіряється engine.
  - Реалізовано: data-driven starter code для method call, argument, jump, variable і bounded for loop; clean editor state між dynamic routes та starter reset.
  - Safety: restricted parser/engine path без `eval`, DOM чи network; automated corpus перевіряє browser-global rejection і meaningful invalid programs для кожного level.
  - Feedback/accessibility: connected editor help, `aria-invalid`, `aria-errormessage`, safe line/column і конкретні пояснення argument/variable/loop errors без technical leakage.
  - Automated і browser QA: 5 valid + 5 invalid sources, 15 stars, persistent world completion, real Supabase sync, next-level unlock, correct route transition і `20rem` reflow.
- [x] **T-510 · P1 · Owner: Codex** Розширити progress model для worlds, levels, stars і achievements.
  - Зберігати course progress, completed worlds/levels, stars, attempt count, best solution, unlocked content і achievements через спільний local/API adapter contract.
  - Best solution не повинно зберігати небезпечний executable artifact без version і validation; learning analytics відокремити від identity data.
  - Depends on: T-501, T-502.
  - Done when: guest progress працює локально; authenticated progress синхронізується з PostgreSQL/RLS; merge не втрачає кращі stars або completed levels.
  - Реалізовано: versioned attempt-driven model, monotonic/idempotent merge, guest та API stores, server-side challenge re-evaluation, initial ten-level registry, authenticated route і PostgreSQL/RLS migration.
  - Online Supabase перевірено: 5 RLS-enabled tables, 2 worlds, 10 levels, 6 policies, attempt trigger, owner-only `auth.uid()` rules; `anon` не має EXECUTE на unlock function.
- [x] **T-511 · P1 · Owner: Codex** Додати shared hints, friendly feedback, stars і rewards foundation.
  - Three-stage hints: conceptual clue → stronger clue → partial solution; повну відповідь одразу не показувати.
  - Stars: completion → efficient solution → intended concept; public feedback не показує `SyntaxError`, `TypeError` або internal AST details.
  - Підготувати cosmetic rewards contract для characters, robot skins, pets, badges і world unlocks без monetization або loot boxes.
  - Depends on: T-502, T-503.
  - Done when: feedback має stable internal code і child-friendly message; reward/star calculation є pure tested logic.
  - Реалізовано: versioned sequential hint state, allowlisted child-friendly feedback без technical leakage, accessible three-star summary та deterministic/idempotent cosmetic reward grants без monetization або loot boxes.
- [x] **T-512 · P0 · Owner: Codex** Провести Kids Coding accessibility, safety та responsive verification.
  - Перевірити WCAG 2.2 AA, keyboard-only flow, visible focus, semantic controls, live feedback, accessible names, `20rem` reflow, 200% zoom, high contrast і reduced motion.
  - Для drag-and-drop надати рівноцінне keyboard керування; objective, locked state, errors і stars не позначати лише кольором/анімацією.
  - Depends on: T-505, T-506, T-507, T-508, T-509, T-510, T-511.
  - Done when: automated accessibility checks і manual keyboard/tablet сценарії проходять; sandbox security suite, lint, typecheck і production build зелені.
  - Реалізовано: dependency-free `check:kids-a11y` перевіряє semantic contracts, 11 WCAG AA text pairs, non-text contrast, visible focus, minimum `1rem` text, `2.75rem` targets, `20rem` reflow, reduced motion, Forced Colors і security guards.
  - Browser QA: level/map/dashboard пройшли desktop, tablet і `20rem` reflow без horizontal overflow; progress має accessible names, locked/completed/current і stars мають текст, code errors пов'язані з editor та оголошуються live.
  - Safety/access: restricted sandbox не використовує `eval`/`Function`; guest preview `200`, а map і locked level повертають safe sign-in redirects. Повна матриця: `docs/KIDS_CODING_VERIFICATION.md`.
- [x] **T-513 · P2 · Owner: Codex** Підготувати authoring workflow для наступних Kids Coding курсів і 50+ levels.
  - Додати documented templates, config validation, preview fixtures і content checklist для short goals, hints, expected failure/success, command budget та rewards.
  - Depends on: T-502, T-503, T-511.
  - Done when: третій demo course/world створюється configuration-only без копіювання screen, engine, progress або validation logic.
  - Реалізовано: typed authoring contract компілює короткі course/world/level drafts у strict versioned domain model; спільний command catalog і program helpers прибрали потребу копіювати engine або production UI.
  - Demo: draft `Space Logic Lab → Orbit → Сигнал на орбіті` створено лише конфігурацією і навмисно не додано до published registry.
  - Validation: semantic issues мають stable code/path, а executable success/failure previews проходять той самий engine; scale fixture компілює 55 levels без application branches.
  - Документація: `docs/KIDS_CODING_AUTHORING.md` містить level template, publishing flow, content checklist і повний quality gate.

## Заплановано: M6 — Growth, SEO та retention

Ціль milestone: перетворити SYSTEMA з хорошого навчального порталу на вимірюваний продукт, який знаходять через пошук і до якого зручно повертатися. Обов’язковий порядок: `Analytics → SEO → Landing Pages → Completion → Retention → Course Voting → Sharing → Growth Dashboard`. Кожна задача виконується й перевіряється окремо, без одного великого refactor.

- [ ] **T-601 · P0 · Owner: Codex + User** Побудувати privacy-safe Product Analytics foundation.
  - Спочатку проаудитити Vercel Analytics, GA, PostHog, Plausible та інші наявні інтеграції; повторно використати один provider і не встановлювати дублікати.
  - Створити спільний typed `trackEvent()` adapter, незалежний від provider, для `page_view`, course/lesson view-start-complete, Knowledge Checks, hints, Q&A, feedback і основних CTA.
  - Зарезервувати typed namespaces для paths, skills, projects, weekly goals/challenges, public profile, alternative explanations, playground і recommendations; самі feature events вмикати лише разом із відповідною задачею з M7–M13.
  - Підтримати anonymous ID без вимоги login; не передавати email, question/comment text або інші sensitive/user-generated дані.
  - Події мають дозволяти відновити funnel `Homepage → Course View → Course Started → Lessons → Course Completed` і lesson-quality signals.
  - Done when: можна розрахувати Course Start Rate, Lesson/Course Completion Rate, drop-off by lesson, Knowledge Check pass/attempt rate, hint usage, questions і helpful feedback; перевірено guest/auth, consent/privacy assumptions, desktop/mobile та відсутність duplicate events.
  - Реалізовано локально: `@vercel/analytics` 2.x, root page-view integration із redaction, typed provider-independent `trackEvent()`/`trackEventOnce()`, 31 allowlisted event contracts, React і legacy adapters, `/api/analytics`, funnel/learning-support/Kids instrumentation та `check:analytics` privacy gate.
  - Перевірено: valid event `204`, payload із extra `email` відхиляється `400`; session deduplication, TypeScript, ESLint, production build, font/icon gates і browser smoke test зелені.
  - Paused by owner 2026-08-12: page views залишаються enabled; custom provider delivery за замовчуванням вимкнена двома environment flags, typed instrumentation і privacy allowlist збережені. Повернутися після рішення про Vercel Pro, approved provider або Supabase aggregate storage.

- [x] **T-602 · P0 · Owner: Codex** Додати Technical SEO foundation для публічних курсів і занять.
  - Depends on: T-601.
  - Запровадити human-readable lesson URLs із redirects для старих bookmarks; генерувати unique title, description, canonical, Open Graph та keywords із course/lesson data й fallback rules.
  - Додати `sitemap.xml` і `robots.txt`: індексувати homepage, directions, courses і public lessons; виключити auth, profile, dashboard, admin та internal routes.
  - Додати тільки правдиві видимі Schema.org `Course`, `BreadcrumbList` і `FAQPage`; важливий lesson content має залишатися зрозумілим у server-rendered HTML.
  - Done when: усі public course/lesson URLs читабельні та indexable, metadata/canonical унікальні, redirects не ламають старі посилання, sitemap/robots валідні, structured data відповідає видимому контенту.
  - Реалізовано: shared SEO contract із production canonical fallback, unique metadata/OG/keywords, human-readable public lesson URL, permanent `/preview` redirect, `robots.txt`, public-only `sitemap.xml`, private-route `noindex`, правдиві `Course`, `BreadcrumbList` і `FAQPage` schemas та server-rendered lesson content.
  - Перевірено: `check:seo`, TypeScript, ESLint, font/icon/analytics gates і production build зелені; browser smoke test підтвердив canonical/OG/schema, 308 redirect, відсутність console errors/overflow і мінімальний readable font `1rem`.

- [x] **T-603 · P1 · Owner: Codex** Створити learning-direction landing pages лише для напрямів із реальним контентом.
  - Depends on: T-602.
  - Перші сторінки: `/system-design`, `/kids`, `/javascript-for-kids`; не створювати порожні `/frontend`, `/ai`, `/accessibility`, `/qa` до появи курсів.
  - Структура: hero, outcomes, audience, available courses, методика SYSTEMA, наявний interactive example, FAQ та чіткий CTA; повторно використати компоненти й спільний brand language.
  - Done when: кожна сторінка відповідає search intent, посилається лише на реальні курси, має unique SEO metadata, працює на `20rem`, з клавіатури та без fake content.
  - Реалізовано: data-driven `/system-design`, `/kids` і `/javascript-for-kids` на одному reusable server-rendered layout; лише published course/preview links, real failure simulation, Kids level previews, outcomes, audience, method, FAQ, CTA, canonical metadata та structured data.
  - Інтегровано: напрями додані у header, homepage і public sitemap із content registry; planned `/frontend`, `/ai`, `/accessibility` та `/qa` не створювалися.
  - Перевірено: `check:directions` контролює real-content URLs, unique SEO, WCAG AA contrast pairs, `1rem`, relative units, forced colors і reduced motion; TypeScript, ESLint, SEO/font/icon gates, production build та browser desktop/narrow interaction smoke test зелені.

- [x] **T-604 · P1 · Owner: Codex** Реалізувати meaningful Course Completion experience і Certificate of Completion.
  - Depends on: T-603.
  - Показувати фактичні `19 / 19`, learning outcomes і доступні Knowledge Check statistics без meaningless XP.
  - Створити доступний responsive certificate із profile name, course, completion date та точним формулюванням `Certificate of Completion`, без заяв про accreditation/certified engineer.
  - Authenticated completion зберігати й дозволяти відкривати повторно; anonymous completion не блокувати, а login/signup пропонувати лише для персоналізованого persistent certificate.
  - Done when: completion state і certificate походять із реального progress, повторно відкриваються, читабельні screen reader, коректні на desktop/mobile і не містять неправдивої сертифікації.
  - Реалізовано: persistent `/courses/[slug]/completion`, який для authenticated user читає `lesson_progress`, profile name і Knowledge Check attempts із Supabase, а для guest — фактичний локальний progress; `18/19` не створює certificate, `19/19` визначає completion date за останнім persisted lesson timestamp.
  - Certificate містить точне `Certificate of Completion`, profile/guest name, курс, дату, `19/19`, learning outcomes і доступні Knowledge Check statistics; окремо пояснено, що це не професійна accreditation.
  - Інтегровано: фінальний legacy lesson показує completion callout, course page повторно відкриває підсумок, а typed `course_completed` event підготовлено в allowlist із paused delivery policy.
  - Перевірено: dedicated `check:completion`, TypeScript, ESLint, analytics/font gates і production build зелені; browser QA підтвердив real incomplete state, no error overlay/console errors, semantic progressbar, `1rem` minimum і відсутність horizontal overflow на `20rem`.

- [x] **T-605 · P1 · Owner: Codex** Покращити retention і one-click Continue Learning.
  - Depends on: T-604.
  - На homepage, dashboard і доречній course page показувати реальний курс, completed/total, наступне заняття та одну дію `Продовжити`.
  - Зберігати останні course/lesson і, лише якщо виправдано, внутрішню position; додати максимум кілька recently studied items без activity feed.
  - М’яко інтегрувати наявний streak без покарання, aggressive notifications або pressure copy.
  - Done when: returning learner переходить із homepage до правильного next lesson одним кліком; guest/auth sync не втрачає позицію; empty/completed states, keyboard і mobile перевірені.
  - Реалізовано: спільна pure-модель `start / continue / completed` визначає реальні completed/total, останню активність, next incomplete lesson і destination; `19/19` веде до course completion, а не назад на заняття 1.
  - Інтегровано: homepage показує один next-step card і CTA для server/local progress; dashboard має primary Continue Learning action та підхоплює курси як з enrollment, так і з persisted progress; course page використовує той самий guest/auth state з access-aware sign-in boundary.
  - Збережено: наявний versioned `systema-progress-v2` і Supabase `lesson_progress` залишаються єдиними progress stores; legacy `visit` фіксує останній lesson, а merge не втрачає completed state під час guest/auth sync. Streak лишився інформаційним без pressure copy.
  - Перевірено: dedicated `check:continue-learning` покриває empty, visited, completed, duplicate й unknown records; TypeScript, ESLint, analytics/font gates і production build зелені; browser QA підтвердив один CTA, correct href, semantic progress, `1rem`, desktop/`20rem`, zero overflow, console errors і Next overlay.

- [x] **T-606 · P1 · Owner: Codex** Додати course roadmap і voting на основі реального попиту.
  - Depends on: T-605.
  - Показувати Coming Soon лише для курсів, які справді розглядаються: AI Engineering, Frontend Architecture, Accessibility QA або актуальний затверджений список.
  - Реалізувати один vote на upcoming course для authenticated user; guest — найпростіший сумісний local vote або login prompt із безпечним sync boundary.
  - PostgreSQL/RLS model має підтримувати `courseSlug`, user/anonymous identity, createdAt і unique vote; UI показує лише реальні counts і текстовий стан, не лише колір.
  - Done when: duplicate votes неможливі, real counts коректні, unvote/sync policy задокументована, admin може отримати простий ranked query без окремої roadmap CMS.
  - Реалізовано: roadmap будується лише з реальних `planned` entries каталогу; гості отримують login prompt, а authenticated user має один голос, який атомарно переноситься або видаляється.
  - Дані: Supabase migration створює `course_roadmap_votes` із primary key на `user_id`, allowlist course slugs, owner-only RLS і aggregate RPC без розкриття voter IDs; міграцію успішно застосовано до LearPortal.
  - Задокументовано: [docs/COURSE_ROADMAP.md](docs/COURSE_ROADMAP.md) фіксує guest/unvote/sync policy, privacy boundary, оновлення allowlist і простий ranked admin query.
  - Перевірено: dedicated `check:roadmap`, TypeScript, ESLint, font/icon gates і production build зелені; browser QA підтвердив live counts `0→1→0`, atomic transfer між курсами, cancel, `aria-pressed`, textual feedback, `1rem` minimum і відсутність Next overlay.

- [x] **T-607 · P2 · Owner: Codex** Додати sharing для завершень курсів і вибраних public lessons.
  - Depends on: T-606.
  - Completion screen: Web Share API із fallback, Copy Link, LinkedIn, Telegram і X; усі buttons мають accessible names та коректно encoded canonical URL.
  - Створити мінімальну branded share card без sensitive data та dynamic Open Graph cards для course/lesson URLs.
  - Спільний share adapter і OG contract мають розширюватися на public profile, project, challenge, playground і certificate лише після появи стабільного public route; окремі share implementations не створювати.
  - Lesson sharing увімкнути вибірково для High Availability, Load Balancing, Caching, algorithms і Kids exercises, лише коли існує стабільний public URL.
  - Done when: shared URLs відкривають правильний public content, OG previews містять фактичні дані, copy/share success оголошується доступно, mobile/desktop fallbacks і analytics `share` events перевірені.
  - Реалізовано: reusable `SharePanel` і pure URL adapter підтримують Web Share API, Copy Link, LinkedIn, Telegram та X; native/clipboard failure переходить до labelled manual-copy field із live feedback.
  - Public boundary: completion screen ділиться public course URL без learner/certificate data; sharing увімкнено для public High Load lesson і перших indexable Kids Coding exercises, але не для locked/private routes.
  - OG: course, public lesson і Kids exercise routes генерують branded `1200 × 630` images із фактичного content source; X/Twitter metadata використовує `summary_large_image`.
  - Задокументовано: [docs/SHARING.md](docs/SHARING.md) фіксує stable-route allowlist, fallback, privacy/security contract і розширення на майбутні public surfaces.
  - Перевірено: dedicated `check:sharing`, TypeScript, ESLint, icon/font gates і production build зелені; browser QA підтвердив canonical/encoded destinations, Copy Link fallback, factual OG rendering, `1rem` minimum, `3rem` controls і zero overflow на `20rem`.
  - Виняток: custom `share` events не активовано, оскільки T-601 custom events поставлені користувачем на паузу; page-view analytics не змінювалися.

- [x] **T-608 · P2 · Owner: Codex** Створити lightweight internal Growth Dashboard на реальних даних.
  - Depends on: T-601, T-602, T-603, T-604, T-605, T-606, T-607.
  - Acquisition: visitors, course views/starts; Learning: lesson starts/completions і course completions; Conversion: Homepage→Course, Course→Start, Start→Complete.
  - Quality: helpful %, Knowledge Check success/attempts, hints, questions; Demand: upcoming-course votes; окремо Returning Learners і shares.
  - Використати прості server-rendered tables/summary cards без heavy chart library і без побудови BI-платформи; обмежити доступ ролями `INSTRUCTOR / ADMIN`.
  - Done when: dashboard відповідає на основні product questions із перевіреними formulas, не відкриває personal/sensitive data, має empty/date-range states і працює доступно на desktop/mobile.
  - Реалізовано: server-rendered `/dashboard/growth`, role gate `ADMIN/INSTRUCTOR`, aggregate-only Supabase RPC, inclusive date-range form, learning/quality/course/demand summaries та чесні unavailable states без heavy chart library.
  - Формули, snapshot semantics, privacy boundary і measurement gaps задокументовані в `docs/GROWTH_DASHBOARD.md`. Custom events залишаються paused, тому funnel, returning learners, hints і shares не видаються за виміряні дані.

## Заплановано: M7–M14 — Guided Learning, Applied Learning та product loops

Детальний implementation contract для кожної задачі — [docs/NEXT_PRODUCT_ROADMAP.md](docs/NEXT_PRODUCT_ROADMAP.md). Там зафіксовано Goal, User Story, Scope, functional/UX/accessibility requirements, technical notes, analytics, acceptance criteria, dependencies і priority. Чинні T-301, T-304 та T-601–T-607 повторно використовуються; дублікати analytics, SEO, completion, retention, sharing, OG і content contracts не створюються.

### M7 — Guided Learning

- [x] **T-701 · P0 · Owner: Codex** Створити versioned Learning Path data model для adult/kids, shared courses і optional steps.
  - Реалізовано: strict `systema.learning-path` schema v1, stable ordered steps, adult/kids/mixed audience, required/optional semantics, duration metadata, JSON round-trip і structured validation issues.
  - Course steps містять лише `{ catalog, courseId }`; metadata лишається у чинних adult/Kids catalogs. Registry має published adult/kids fixtures і draft adult path з optional step; High Load course входить до двох paths.
  - Перевірено: adult/kids fixtures, many-to-many membership, optional order, immutable output, unknown course, audience mismatch, duplicate reference, unknown field, unsupported version, TypeScript, ESLint і diff check.
  - Документація: `docs/LEARNING_PATHS.md`; custom events залишаються paused.
- [x] **T-702 · P1 · Owner: Codex** Додати server-rendered listing `/paths` із real progress та published-only paths.
  - Реалізовано: SEO-ready `/paths`, URL-фільтри adult/kids, semantic cards, guest zero state, authenticated owner-only Supabase progress і явний unavailable state без підміни помилки нулями.
  - Progress обчислюється pure domain function лише з фактично завершених required lessons/levels; optional courses не блокують 100%. Сервер паралельно читає adult і Kids progress без client store або додаткового API.
  - Навігація: «Шляхи» додано до header, `/paths` — до sitemap. Draft/archived paths не потрапляють у listing HTML; custom events залишаються paused.
  - Перевірено: published filters, guest/partial/completed progress, optional next course, hrefs, TypeScript, ESLint, font/icon gates, production build, SSR route/filter responses, desktop Chromium і справжній `20rem` iframe viewport без overflow. In-app browser bridge був недоступний, тому visual QA виконано локальним headless Chromium.
- [x] **T-703 · P1 · Owner: Codex** Додати `/paths/[slug]` з completed/current/upcoming steps і правильним Continue CTA.
  - Реалізовано: published-only dynamic detail route, SEO metadata, breadcrumbs, real owner-only progress, guest zero state, ordered roadmap та CTA до поточного course. Draft path повертає `404`.
  - Pure presentation model визначає completed/current/upcoming; перший незавершений required step є current, optional позначений текстом і не блокує required progression. Після required completion незавершений optional може стати наступним кроком.
  - Accessibility: native `ol`, `aria-current="step"`, icon + text state labels, semantic progress, keyboard links, Forced Colors і `20rem` reflow. Custom events залишаються paused.
  - Перевірено: dedicated model test, listing/model regressions, TypeScript, ESLint, font/icon gates, production build, published `200`, draft `404`, desktop і `20rem` Chromium QA.
- [x] **T-704 · P1 · Owner: Codex** Інтегрувати next-course/path recommendation у real course completion без ML recommender.
  - Реалізовано: deterministic recommendation domain, який працює лише після фактичного course completion, читає published path membership і пропонує наступний незавершений required course.
  - Target course також повинен бути published. Draft paths, unpublished targets, orphan courses, incomplete current course і вже завершені paths не створюють фальшивої рекомендації; завершений path отримує окреме текстове membership-підтвердження.
  - Якщо course входить до кількох paths, completion screen показує короткий явний список із причиною кожного вибору. CTA веде на `/paths/[slug]` з текстом «Продовжити шлях»; custom events залишаються paused.
  - Перевірено: current/multiple/completed/draft/unpublished/orphan/incomplete fixtures, semantic SSR view, completion regressions, TypeScript, ESLint, font/icon gates, production build, desktop Chromium і справжній `20rem` iframe viewport без overflow.
- [x] **T-705 · P0 · Owner: Codex + Content** Створити skill taxonomy та lesson/course mappings без fake mastery scores.
  - Реалізовано: strict versioned `systema.skill-taxonomy` schema v1 із stable ID/slug, короткими назвами, categories, parent hierarchy та окремими course/unit mappings для adult lessons і Kids levels.
  - High Load fixture має 10 змістовних skills і покриває всі 19 lessons. Одна lesson може формувати багато skills; `systems-thinking` повторно використовується в High Load Architecture і Robot Quest без дублювання metadata.
  - Validator відхиляє cycles, missing parents, duplicate IDs/slugs/mappings, orphan skill/course/unit references, невідомі поля й unsupported schema version; output immutable і підтримує JSON round-trip.
  - Модель не містить score, mastery percentage або user data. Документація: `docs/SKILL_TAXONOMY.md`; custom events залишаються paused.
  - Перевірено: повне High Load coverage, shared/multi-skill mappings, every-skill mapping, cycles/orphans/duplicates/version errors, TypeScript, ESLint, production build і diff check.
- [x] **T-706 · P1 · Owner: Codex** Реалізувати pure skill progress states із actual completion.
  - Реалізовано: pure `not_started / in_progress / completed` calculation із readable українськими labels, поясненням source course та прозорими completed/required evidence counts без percentage або mastery score.
  - Mappings одного course утворюють evidence track; shared skill підтримує альтернативні course tracks. Повне завершення одного track підтверджує skill без вимоги проходити всі курси, де він повторно використаний.
  - Monotonic merge дедуплікує повтори за catalog/course/unit; `completed:true` не скасовується пізнішим false і повторний completion не збільшує evidence.
  - Owner-only server adapter паралельно читає adult `lesson_progress` і Kids `kids_level_progress`; database error повертає explicit unavailable state замість fake `not_started`.
  - Перевірено: untouched, partial, completed, shared-course, repeated, false-after-true, owner query та unavailable fixtures; taxonomy regression, TypeScript, ESLint, production build і diff check. Custom events залишаються paused.
- [x] **T-707 · P1 · Owner: Codex** Побудувати accessible Skill Map із рівноцінним text/list fallback.
  - Реалізовано: server-rendered `/skills`, native recursive `ol` hierarchy, CSS parent-child connectors, state icon + text, evidence explanation і reusable compact summary без percentage/mastery score.
  - URL category filters з `aria-current` зберігають matching nodes та їх ancestors як явно позначений context. Повна інформація доступна без SVG, canvas, JavaScript або окремого прихованого дерева.
  - Guest бачить повну taxonomy й explicit zero state; authenticated progress читається owner-only. Supabase failure показує unavailable statuses без fake `not_started`.
  - «Навички» додано до header, `/skills` — до sitemap. Custom events залишаються paused.
  - Перевірено: category/filter/summary/tree fixtures, SSR full/filtered hierarchy, semantic nested list, TypeScript, ESLint, font/icon gates, production build, desktop Chromium і focused `20rem` iframe без overflow.

### M8 — Applied Learning

- [x] **T-801 · P0 · Owner: Codex + Content** Створити versioned Final Project data model і validator binding.
  - Реалізовано: strict data-only contract `systema.final-project` v1 для course relation, publication/access state, scenario, requirements, constraints, success criteria, starter state і validator/result binding.
  - High Load fixture описує accessibility-аудит платформу з 100 000 users, 10 000 audits/hour, 500 pages, 3-year retention, 99,9% availability, async reports, live status та окремим scaling API/workers.
  - Контрольований registry зв'язує project із чинним `final-system-design` parser/validator; project, starter, validator і result versions мають збігатися, а simulator schema перевіряється окремо.
  - Safety/accessibility: executable state відхиляється, JSON state проходить simulator parser, starter visual має обов'язковий text description, structured result містить `valid/code/message/affectedIds`.
  - Перевірено: valid/invalid High Load states, incompatible versions, unknown course, invalid starter, executable payload, missing text alternative, JSON round-trip, TypeScript, ESLint, analytics regression, simulator regression, production build і diff check. Custom events залишаються paused.
- [x] **T-802 · P1 · Owner: Codex** Побудувати reusable Final Project workspace з run/result/save flow.
  - Реалізовано: published-only `/projects/[slug]` із Server Component shell, scenario, semantic requirements/constraints/success criteria та ізольованим interactive workspace.
  - Guest запускає дозволений preview без fake persistence; authenticated user зберігає owner-only versioned state у T-107 `saved_architectures`, а останній сумісний artifact відновлюється після reload.
  - Один primary run action повертає deterministic structured result, переводить focus на summary, оголошує його через polite live region і показує affected components текстом.
  - Save flow зберігає роботу лише явно, показує ненав'язливий status і після network/database error не очищає state та дозволяє retry. Unpublished projects повертають not found.
  - Додано course CTA, sitemap entry та privacy-safe `final_project_save_failed` без payload; custom analytics delivery залишається paused.
  - Перевірено: guest/auth/restored/unavailable fixtures, invalid/valid validation, semantic markup, owner auth boundary, React/Next review, TypeScript, ESLint, font/icon gates, production build, desktop і `20rem` browser QA.
- [x] **T-803 · P1 · Owner: Codex** Адаптувати constrained System Design project builder із keyboard-equivalent controls.
  - Реалізовано: data-driven palette для 14 дозволених компонентів, add/remove, reliability policies, failure scenario та зв'язки через native selects без canvas або drag-only взаємодії.
  - Доступність: усі дії мають keyboard-equivalent native controls, selected state передається не лише кольором, поточна схема доступна семантичним списком, є visible focus, Forced Colors і `20rem` reflow.
  - Artifact contract: versioned `systema.final-project-artifact@1` з project/content/simulator schema binding, strict safe JSON import та backward-compatible migration стану без `connections`.
  - Аналітика: типізовані privacy-safe `final_project_component_added` і `final_project_configuration_changed`; delivery custom events залишається paused.
  - Перевірено: constrained operations, valid keyboard-equivalent solution, import/export round-trip, incompatible/invalid artifacts, model/workspace regressions, TypeScript, ESLint, font/icon gates і production build; browser QA підтвердив повний valid flow, import restore, контраст primary action `13.68:1`, `1rem` minimum та `20rem` без overflow чи Next.js overlay.
- [x] **T-804 · P1 · Owner: Codex** Додати deterministic scenario validation із поясненням failure та remediation.
  - Реалізовано: version 2 pure validator для primary DB, API instance, Redis, region outage та traffic spike; кожен scenario перевіряє components, policies і напрямлений flow.
  - Result contract: stable code, score `passed/total/percent`, per-scenario explanation, per-check remediation та affected IDs без random/fake outcomes або витоку internal exceptions.
  - UX та accessibility: semantic ordered/unordered result lists, текстові success/error states, конкретна наступна дія, один polite live summary, focus на result і rerun після edits зі збереженням architecture state.
  - Аналітика: типізовані privacy-safe `final_project_run`, `final_project_scenario_failed`, `final_project_completed`; architecture payload не передається, custom delivery залишається paused.
  - Перевірено: deterministic DB failure та overload fixtures, повний valid `15/15`, model/workspace/builder regressions, TypeScript, ESLint, analytics/font/icon gates і production build; browser QA підтвердив empty invalid та full valid flows, `1rem` minimum, `20rem` без overflow і відсутність Next.js overlay.
- [x] **T-805 · P2 · Owner: Codex** Додати private-by-default Completed Projects library із owner-only RLS.
  - Реалізовано: owner-only `/dashboard/projects`, server-verified completion, точне version binding, продовження/редагування, versioned JSON export і підтверджене видалення.
  - Privacy та надійність: бібліотека private-by-default, route має `noindex`, analytics не містить назв або architecture payload; invalid revision створює окрему чернетку й не стирає завершену роботу.
  - Дані: застосовано migration `202608130002_completed_final_projects.sql`; чинна RLS policy `auth.uid() = user_id` ізолює читання та мутації власника.
  - Перевірено: owner filters, invalid-marker rejection, exact-version reload/export, guest redirect, TypeScript, ESLint, analytics/font/icon gates, production build і `git diff --check`.

### M9 — Sustainable Habit

- [ ] **T-901 · P2 · Owner: Codex** Додати optional Weekly Learning Goal settings без pressure mechanics.
- [ ] **T-902 · P2 · Owner: Codex** Реалізувати timezone-aware weekly progress/reset та idempotent completion event.
- [ ] **T-903 · P0 · Owner: Codex + Content** Створити versioned Weekly Challenge model і publication rules.
- [ ] **T-904 · P1 · Owner: Codex** Додати `/challenges` та `/challenges/[slug]` з archive і persistent results.
- [ ] **T-905 · P1 · Owner: Codex** Інтегрувати active challenge на homepage, result sharing через T-607 та archive discovery.

### M10 — Learning Identity

- [ ] **T-1001 · P0 · Owner: Codex + User** Додати unique username і explicit private-by-default public-profile controls.
- [ ] **T-1002 · P1 · Owner: Codex** Створити `/u/[username]` лише з allowlisted completed courses, selected projects і skills.
- [ ] **T-1003 · P2 · Owner: Codex** Додати profile sharing через спільний T-607 adapter без public sensitive data.

### M11 — Better Understanding

- [ ] **T-1101 · P1 · Owner: Codex + Content** Розширити lesson blocks alternative variants `simple` та `example`.
- [ ] **T-1102 · P1 · Owner: Codex** Додати inline `Пояснити простіше` / `Показати приклад` без AI tutor або навігації з lesson.
- [ ] **T-1103 · P2 · Owner: Codex** Додати aggregate difficult-content report як розширення T-608.

### M12 — SYSTEMA Playground

- [ ] **T-1201 · P1 · Owner: Codex** Створити `/playground` catalog лише для реалізованих tools.
- [ ] **T-1202 · P1 · Owner: Codex** Побудувати System Design Playground MVP на reusable T-304 engine.
- [ ] **T-1203 · P1 · Owner: Codex** Додати deterministic results, bottleneck explanations і curated presets.
- [ ] **T-1204 · P2 · Owner: Codex** Додати safe versioned shareable scenarios без arbitrary code або private data.

### M13 — Distribution and Discovery

- [ ] **T-1301 · P3 · Owner: Codex + Content** Додати reusable distribution fields до content source без auto-publishing; SEO/OG залишаються T-602/T-607.
- [ ] **T-1302 · P2 · Owner: Codex + Content** Додати editorial related lessons/courses; T-704 path recommendation має пріоритет.

### M14 — Deferred notification foundation

- [ ] **T-1401 · P3 · Owner: Codex** Підготувати owner-only in-app notification model без push/email delivery.
- [ ] **T-1402 · P3 · Owner: Codex** Активувати Notification Center лише після двох reliable production event producers.

### Межі M6 — не будувати в цій фазі

- Full social network, followers, DMs, live chat, complex forum або instructor marketplace.
- Paid subscriptions без окремого рішення про monetization.
- AI Tutor, ML recommendations, complex adaptive learning, large achievement economy, global leaderboard або mobile application.
- Fake testimonials, popularity, votes, accreditation або vanity metrics як основну product ціль.

## Відомий migration debt

- [ ] Legacy course тимчасово дублюється в root і `public/legacy`; видаляти root-копію лише після перевірки нового runtime.
- [ ] Course content частково залишається у великому HTML-файлі.
- [ ] Повний lesson HTML захищений server redirect, але simulator-конфігурації legacy runtime ще доступні як public assets; перенести lesson payloads у server/data-driven modules у межах T-301/T-302.
- [ ] Решту lesson-specific simulators поступово підключити до reusable engine під час редагування відповідних занять; фінальний System Design уже мігровано в T-304.
- [ ] Історія simulator attempts доступна через API, але ще не має окремого UI.

## Рекомендований порядок наступних робіт

1. T-604 → T-608 — completion, retention, voting, sharing і тільки потім Growth Dashboard; T-601 custom events залишаються paused, page views активні.
2. T-701 → T-707 — Guided Learning: paths, next-course guidance і accessible Skill Map.
3. T-801 → T-805 — Applied Learning: final projects, builder, validation і private library.
4. T-901 → T-905 — Weekly Goals і Challenges без pressure mechanics.
5. T-1001 → T-1003 — opt-in Learning Identity; далі T-1101 → T-1103 — alternative explanations.
6. T-1201 → T-1204 — standalone Playground; T-1301 → T-1302 — distribution/discovery.
7. T-1401/T-1402 залишити deferred до появи reliable notification producers.
8. T-206 — після отримання SMTP і CAPTCHA credentials завершити email flow end-to-end.
9. T-305/T-306 — створювати наступні курси з урахуванням реальних analytics і voting signals.

## Як оновлювати tracker

- Одна задача має один стабільний ID.
- Не позначати задачу завершеною без виконаного `Done when`.
- Нові термінові задачі отримують `P0`; важливі задачі поточного milestone — `P1`; майбутні покращення — `P2`.
- Після кожного завершеного етапу оновлювати дату, active milestone і next task.
- Значні зміни виконувати через окремий commit із ID задачі, наприклад `feat(T-106): sync lesson progress`.
