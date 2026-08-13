# SYSTEMA — дедуплікований product roadmap

Оновлено: 2026-08-12

Цей backlog деталізує задачі після M6. Він не дозволяє реалізацію всього roadmap одним великим refactor: кожен ID береться окремо, перевіряється та закривається власним `Done when`.

## Що вже покрито чинними задачами

- Product analytics і нові event families розширюють **T-601**, а не створюють другий analytics SDK.
- SEO metadata, canonical, lesson metadata та sitemap належать **T-602**; landing pages — **T-603**.
- Course completion і certificate залишаються в **T-604**; continue learning і м’який streak — у **T-605**.
- Social sharing, reusable share copy і dynamic OG належать **T-607**.
- Content contracts повторно використовують **T-301** і Kids authoring workflow **T-513**.
- Final projects і playground повторно використовують simulator engine **T-304**, persistence **T-107** та versioned import/export **T-205**.
- Alternative explanations доповнюють, але не дублюють Q&A/hints із **T-021** та **T-511**.
- Public learner profile розширює приватний account profile **T-201**, не замінюючи його.

## Спільні product constraints

- Кожна задача повинна посилювати хоча б один етап: `Discover → Start → Learn → Understand → Build → Complete → Return → Share`.
- Не логувати email, приватний progress, project payload, Q&A text або інший user-generated content.
- Усі UI-задачі: keyboard support, visible focus, semantic controls, мінімальний текст `1rem`, WCAG AA, reduced motion, 200% zoom і `20rem` reflow.
- Стан не передавати лише кольором. Діаграми мають мати текстове представлення.
- Віддавати перевагу server rendering, HTML/CSS/SVG та наявним components; не додавати важкі graph/canvas frameworks, WebSockets чи client rendering без доведеної потреби.

## Release 1 — Guided Learning

Головний результат: користувач розуміє, що вчити далі.

### T-701 — Learning Path data model

- **Goal:** створити reusable versioned модель керованих навчальних шляхів.
- **User Story:** як студент, я хочу бачити впорядкований шлях до конкретної мети.
- **Scope:** `LearningPath`, ordered steps, audience, required/optional course references, duration metadata.
- **Functional Requirements:** один курс може належати кільком paths; adult/kids підтримуються одним contract; порядок стабільний.
- **UX Requirements:** authoring data має дозволяти короткий outcome і зрозумілу назву кожного кроку.
- **Accessibility Requirements:** текстові labels є обов’язковими; порядок DOM відповідає порядку навчання.
- **Technical Notes:** PostgreSQL/data-driven contract; course references валідовуються; не дублювати course metadata.
- **Analytics Events:** schema для `learning_path_viewed`, `learning_path_started`, `learning_path_completed` через T-601.
- **Acceptance Criteria:** fixture з adult і kids paths проходить validation; optional step не ламає порядок; invalid course ID відхиляється.
- **Dependencies:** T-301, T-601.
- **Priority:** P0.

### T-702 — Learning Paths listing page

- **Goal:** додати `/paths` із доступними paths.
- **User Story:** як новий студент, я хочу обрати результат, а не вгадувати окремий курс.
- **Scope:** server-rendered cards із outcome, audience, course count, duration і реальним progress.
- **Functional Requirements:** показувати лише published paths; guest бачить нульовий state; authenticated user — aggregate progress.
- **UX Requirements:** adult/kids filters без прихованих empty categories; один основний CTA на card.
- **Accessibility Requirements:** semantic list/headings; filters і cards доступні клавіатурою; progress має text equivalent.
- **Technical Notes:** використовувати T-701 і наявний progress adapter; без окремого client store.
- **Analytics Events:** `learning_path_list_viewed`, `learning_path_selected` без identity data.
- **Acceptance Criteria:** published paths коректно відображаються для guest/auth; empty/error states реалізовані; `20rem` reflow зелений.
- **Dependencies:** T-701.
- **Priority:** P1.

### T-703 — Learning Path detail and progress

- **Goal:** створити `/paths/[slug]` з ordered roadmap.
- **User Story:** як студент, я хочу бачити completed/current/upcoming кроки й продовжити з правильного місця.
- **Scope:** path header, progress, ordered course steps, start/continue actions.
- **Functional Requirements:** state походить лише з real course progress; optional steps позначені; content без потреби не блокується.
- **UX Requirements:** current step помітний текстом та іконкою; completed/upcoming легко скануються.
- **Accessibility Requirements:** ordered list fallback; `aria-current`; стан не лише кольором; діаграма не є єдиним представленням.
- **Technical Notes:** server load + existing progress service; no graph library.
- **Analytics Events:** `learning_path_viewed`, `learning_path_started`, `learning_path_step_clicked`.
- **Acceptance Criteria:** guest/auth і partial/completed states коректні; CTA веде до правильного course/lesson; mobile/keyboard перевірені.
- **Dependencies:** T-701, T-702.
- **Priority:** P1.

### T-704 — Next-course and path recommendation

- **Goal:** показувати один правдивий наступний крок після course completion.
- **User Story:** як студент, що завершив курс, я хочу знати, що вчити далі.
- **Scope:** completion panel і path membership block; related path recommendation об’єднано в цю задачу.
- **Functional Requirements:** рекомендувати лише published next step у path; якщо paths кілька — пояснити вибір або показати короткий список.
- **UX Requirements:** CTA `Продовжити шлях`; без штучного urgency чи lock-in.
- **Accessibility Requirements:** semantic heading/link; reason доступний як text; focus переходить передбачувано.
- **Technical Notes:** інтегрувати з T-604, не створювати ML recommender.
- **Analytics Events:** `next_course_recommended`, `recommendation_clicked` із path/course IDs.
- **Acceptance Criteria:** recommendation відсутня для orphan/completed path; правильна для current path; не веде на unpublished content.
- **Dependencies:** T-703, T-604.
- **Priority:** P1.

### T-705 — Skill taxonomy and content mapping

- **Goal:** створити reusable skill tree та зв’язки skills з lessons/courses.
- **User Story:** як студент, я хочу розуміти, які конкретні навички формує контент.
- **Scope:** skill ID/slug/title/category/parent, lesson/course mappings, validation.
- **Functional Requirements:** багато skills на lesson; shared skills між courses; без fake score.
- **UX Requirements:** назви навичок короткі й зрозумілі; taxonomy не копіює назви lessons механічно.
- **Accessibility Requirements:** кожен node має текстове ім’я; hierarchy доступна як nested list.
- **Technical Notes:** versioned data model; cycle detection; stable IDs для analytics.
- **Analytics Events:** зарезервувати `skill_map_viewed`; не логувати per-user skill details у third-party analytics.
- **Acceptance Criteria:** High Load fixture має валідне дерево; cycles/orphan mappings відхиляються; один skill можна повторно використати.
- **Dependencies:** T-301, T-601.
- **Priority:** P0.

### T-706 — Skill progress calculation

- **Goal:** детерміновано обчислювати `not_started`, `in_progress`, `completed`.
- **User Story:** як студент, я хочу бачити прогрес навички, що відповідає реально завершеним заняттям.
- **Scope:** pure calculation rules, aggregation і server-side adapter.
- **Functional Requirements:** тільки actual completion; no percentage mastery або opaque score; monotonic merge.
- **UX Requirements:** статуси мають короткі пояснення походження.
- **Accessibility Requirements:** API/UI contract включає readable state label, не лише enum/color.
- **Technical Notes:** pure tested function над T-705 mappings і current progress model.
- **Analytics Events:** aggregate `skill_map_viewed`; skill-state transitions залишаються first-party unless consent permits.
- **Acceptance Criteria:** unit fixtures покривають untouched/partial/complete/shared skill; повторний completion не подвоює progress.
- **Dependencies:** T-705, T-202.
- **Priority:** P1.

### T-707 — Accessible Skill Map UI

- **Goal:** додати responsive visual map із рівноцінним text/list view.
- **User Story:** як студент, я хочу побачити зв’язки між набутими та наступними skills.
- **Scope:** full skill map page і reusable compact summary для майбутнього public profile.
- **Functional Requirements:** states з T-706; category/filter support; compact summary не дублює calculation.
- **UX Requirements:** SVG/CSS graph лише для корисних зв’язків; small screens отримують list-first layout.
- **Accessibility Requirements:** keyboard navigation, visible focus, text/list fallback, state icon+text, reduced motion.
- **Technical Notes:** HTML/CSS/SVG; без heavy graph library або canvas.
- **Analytics Events:** `skill_map_viewed`, `skill_selected`, view mode.
- **Acceptance Criteria:** повна інформація доступна без SVG; desktop/`20rem` працюють; screen-reader order логічний.
- **Dependencies:** T-706.
- **Priority:** P1.

## Release 2 — Applied Learning

Головний результат: студент створює перевірюваний проєкт, а не лише завершує заняття.

### T-801 — Final Project data model

- **Goal:** створити reusable contract фінального проєкту курсу.
- **User Story:** як студент, я хочу отримати реальне завдання з вимогами та сценаріями.
- **Scope:** project, course relation, requirements, starter scenario, validator version і publication state.
- **Functional Requirements:** курс може мати versioned project; validator/result прив’язані до тієї ж версії.
- **UX Requirements:** scenario, constraints і success criteria придатні для короткого сканування.
- **Accessibility Requirements:** requirements — semantic list; усі visual artifacts мають text description.
- **Technical Notes:** повторно використати T-301/T-304; не зберігати executable arbitrary code.
- **Analytics Events:** `final_project_viewed`, `final_project_started` через T-601.
- **Acceptance Criteria:** High Load project fixture проходить schema validation; incompatible versions відхиляються.
- **Dependencies:** T-301, T-304, T-601.
- **Priority:** P0.

### T-802 — Final Project workspace

- **Goal:** створити reusable course project page.
- **User Story:** як студент, я хочу в одному місці прочитати scenario, побудувати рішення, запустити його та побачити результат.
- **Scope:** scenario, requirements, workspace mount, run action, result region, save state.
- **Functional Requirements:** guest може спробувати allowed preview; authenticated state persist; route захищає unpublished projects.
- **UX Requirements:** один primary run action; autosave/status не відволікає; recovery після network error.
- **Accessibility Requirements:** heading hierarchy, labelled workspace controls, live result, focus to summary on request, `20rem` reflow.
- **Technical Notes:** Server Component shell + isolated interactive client; use T-107 persistence.
- **Analytics Events:** `final_project_started`, `final_project_run`, `final_project_save_failed` без payload.
- **Acceptance Criteria:** guest/auth flows, reload persistence, error recovery і keyboard path перевірені.
- **Dependencies:** T-801, T-107.
- **Priority:** P1.

### T-803 — System Design project builder

- **Goal:** адаптувати reusable architecture builder для course projects.
- **User Story:** як студент, я хочу зібрати архітектуру з Load Balancer, server, cache, DB, queue, CDN і replica.
- **Scope:** constrained palette, nodes, connections, configuration and textual architecture list.
- **Functional Requirements:** add/remove/configure/connect; component set задається project config; no free-form drawing.
- **UX Requirements:** start simple; presets/examples не підміняють рішення; clear selected state.
- **Accessibility Requirements:** усі дії доступні без drag; architecture має editable text/list representation; target sizes і focus видимі.
- **Technical Notes:** extend T-304, not Figma-like canvas; reuse versioned artifact contract T-205.
- **Analytics Events:** `final_project_component_added`, `final_project_configuration_changed` лише aggregate component type.
- **Acceptance Criteria:** повне valid рішення створюється клавіатурою; export/import не втрачає schema version; mobile має usable fallback.
- **Dependencies:** T-802, T-205, T-304.
- **Priority:** P1.

### T-804 — Project scenario validation

- **Goal:** перевіряти архітектуру проти зрозумілих failure/load scenarios.
- **User Story:** як студент, я хочу знати не лише що неправильно, а чому система не пережила сценарій.
- **Scope:** deterministic validators, score summary, per-scenario result, affected components and remediation.
- **Functional Requirements:** result містить stable code, passed/total, explanation; no random or fake outcomes.
- **UX Requirements:** success/error не лише іконкою; next action конкретний; allow rerun after edits.
- **Accessibility Requirements:** live summary без надмірних announcements; result list semantic; affected nodes reflected in text.
- **Technical Notes:** pure validators atop T-304; version validator with project definition.
- **Analytics Events:** `final_project_run`, `final_project_scenario_failed`, `final_project_completed`; no architecture payload.
- **Acceptance Criteria:** valid/invalid fixtures deterministic; primary DB failure і overload пояснені; no internal exception leakage.
- **Dependencies:** T-803, T-402.
- **Priority:** P1.

### T-805 — Completed Projects library

- **Goal:** зберігати завершені проєкти й показувати їх власнику.
- **User Story:** як authenticated студент, я хочу повернутися до завершених робіт і пізніше обрати, які з них зробити public.
- **Scope:** owner-only persistence, project summary, version, completion date, profile section.
- **Functional Requirements:** private by default; revisions do not erase completion; delete/export follows account policies.
- **UX Requirements:** clear private status; continue/edit/view actions; no badge inflation.
- **Accessibility Requirements:** semantic list/table; status text; accessible confirmation for delete.
- **Technical Notes:** extend T-107/RLS; public exposure only through T-1001 consent.
- **Analytics Events:** `completed_projects_viewed`; do not send titles/payloads to third party.
- **Acceptance Criteria:** RLS owner isolation verified; completed artifact reloads by version; private data absent from public routes.
- **Dependencies:** T-804, T-107, T-207.
- **Priority:** P2.

## Release 3 — Sustainable Habit

Головний результат: користувач має спокійну причину повернутися без daily-pressure механік.

### T-901 — Weekly Learning Goal settings

- **Goal:** дозволити задати добровільну weekly target у lessons.
- **User Story:** як студент, я хочу обрати реалістичну ціль на тиждень.
- **Scope:** persisted target `1/2/3/5 lessons`, timezone, enable/disable.
- **Functional Requirements:** default is unset; changing target does not rewrite completion history; minutes deferred.
- **UX Requirements:** neutral copy, no punishment, loss framing or forced streak.
- **Accessibility Requirements:** native radio/select labels, description and keyboard flow; errors announced.
- **Technical Notes:** owner-only PostgreSQL settings with local guest boundary documented.
- **Analytics Events:** `weekly_goal_set`, `weekly_goal_disabled`, target bucket; no timezone string sent externally.
- **Acceptance Criteria:** save/edit/disable works; default state honest; RLS and mobile/keyboard verified.
- **Dependencies:** T-601, T-201.
- **Priority:** P2.

### T-902 — Weekly Goal progress and reset

- **Goal:** розраховувати progress поточного calendar week у timezone користувача.
- **User Story:** як студент, я хочу бачити `2 / 3 заняття` і коректний новий тиждень.
- **Scope:** week boundaries, progress component, completed state and minimal history.
- **Functional Requirements:** count unique lesson completions; idempotent; previous week не видаляється; timezone fallback documented.
- **UX Requirements:** no alarming reset; completed state supportive; empty state leads to Continue Learning.
- **Accessibility Requirements:** native progress plus text equivalent; not color-only; reduced motion.
- **Technical Notes:** server-side date logic; DST/timezone tests; avoid cron if calculation-on-read suffices.
- **Analytics Events:** `weekly_goal_progress_viewed`, `weekly_goal_completed` once per goal-week.
- **Acceptance Criteria:** week/DST boundaries tested; duplicate lesson does not count twice; no duplicate completion event.
- **Dependencies:** T-901, T-605.
- **Priority:** P2.

### T-903 — Weekly Challenge model and publishing

- **Goal:** створити versioned recurring challenge contract.
- **User Story:** як content owner, я хочу публікувати коротке інтерактивне завдання з чітким window.
- **Scope:** slug, type, starts/ends, challenge data, validator version, audience and publication state.
- **Functional Requirements:** не більше одного featured challenge per audience/time; past challenge immutable by version.
- **UX Requirements:** authoring contract вимагає короткі objective, duration і result explanation.
- **Accessibility Requirements:** textual objective/controls/results mandatory in content validation.
- **Technical Notes:** reuse T-304/T-503 where type fits; no arbitrary executable payload.
- **Analytics Events:** event IDs supported by T-601; no user answer content.
- **Acceptance Criteria:** active/upcoming/expired fixtures deterministic; overlapping featured records rejected.
- **Dependencies:** T-304, T-601.
- **Priority:** P0.

### T-904 — Challenge listing and detail pages

- **Goal:** додати `/challenges` і `/challenges/[slug]`.
- **User Story:** як відвідувач, я хочу швидко знайти активний challenge і спробувати його окремо від course progress.
- **Scope:** active card, archive list, detail runner and authenticated completion persistence.
- **Functional Requirements:** only published challenge accessible; expired remains read/play if configured; course progress unaffected.
- **UX Requirements:** duration/difficulty/audience visible; one start/run flow; clear expired state.
- **Accessibility Requirements:** keyboard-operable runner, semantic archive, live result, `20rem` reflow.
- **Technical Notes:** server-rendered discovery plus reusable runner; no realtime infrastructure.
- **Analytics Events:** `weekly_challenge_viewed`, `weekly_challenge_started`, `weekly_challenge_completed`.
- **Acceptance Criteria:** active/archive/not-found states; guest/auth behavior; deterministic result and no duplicate completion.
- **Dependencies:** T-903.
- **Priority:** P1.

### T-905 — Challenge promotion, result sharing and archive

- **Goal:** зробити challenge recurring acquisition/return surface без дублювання share infrastructure.
- **User Story:** як користувач, я хочу побачити challenge на homepage, завершити й поділитися canonical result link.
- **Scope:** homepage block, result CTA, share integration and browsable archive filters.
- **Functional Requirements:** homepage shows only current published challenge; sharing uses T-607; no private answer/result payload in URL.
- **UX Requirements:** honest result copy; no fabricated popularity/countdown pressure; archive secondary to active challenge.
- **Accessibility Requirements:** share success announced; countdown, якщо буде, має text and reduced-motion safe behavior.
- **Technical Notes:** reuse T-607 share adapter and T-602 metadata; no separate sharing implementation.
- **Analytics Events:** `weekly_challenge_home_clicked`, `weekly_challenge_shared`, `weekly_challenge_archive_viewed`.
- **Acceptance Criteria:** no-active state hides block; canonical link works signed out; archive and share fallbacks work mobile/desktop.
- **Dependencies:** T-904, T-607.
- **Priority:** P1.

## Release 4 — Learning Identity

Головний результат: користувач добровільно показує перевірені результати навчання без витоку приватної активності.

### T-1001 — Public profile identity and privacy controls

- **Goal:** створити opt-in public identity contract із private-by-default policy.
- **User Story:** як студент, я хочу сам вирішувати, чи існує мій public profile і що саме він показує.
- **Scope:** unique username, visibility toggle, section-level publication choices, preview-as-public.
- **Functional Requirements:** default OFF; explicit consent; email/Q&A/timestamps/private progress never public; username moderation/reservation rules.
- **UX Requirements:** наслідки перемикача пояснені до publish; public URL preview; easy disable.
- **Accessibility Requirements:** labelled switches, confirmation text, errors/status announced, focus preserved.
- **Technical Notes:** extend T-201 with dedicated public projection/RLS; do not query private profile row directly from public route.
- **Analytics Events:** `public_profile_enabled`, `public_profile_disabled`; no username in analytics.
- **Acceptance Criteria:** new/existing accounts private; public projection allowlist tested; disable makes route unavailable promptly.
- **Dependencies:** T-201, T-207, T-601.
- **Priority:** P0.

### T-1002 — Public learner profile page

- **Goal:** додати `/u/[username]` із дозволеними completed courses, projects і skills.
- **User Story:** як студент, я хочу показати, що реально завершив і побудував.
- **Scope:** public name, optional bio, T-604 completions, selected T-805 projects, T-707 skill summary.
- **Functional Requirements:** render only verified and explicitly public items; private/unknown user returns safe not-found.
- **UX Requirements:** results over badges; clear SYSTEMA completion wording without accreditation claims.
- **Accessibility Requirements:** correct heading hierarchy, semantic sections/lists, meaningful project/skill links, `20rem` reflow.
- **Technical Notes:** server-rendered allowlisted projection; cache invalidated on visibility changes.
- **Analytics Events:** `public_profile_viewed` with non-identifying profile key or aggregate only.
- **Acceptance Criteria:** no email, private notes, Q&A, raw timestamps or hidden progress in HTML/API; mobile/screen reader checks pass.
- **Dependencies:** T-1001, T-604, T-707, T-805.
- **Priority:** P1.

### T-1003 — Public profile sharing

- **Goal:** додати safe profile sharing на основі спільного share adapter.
- **User Story:** як власник public profile, я хочу скопіювати або поділитися стабільним URL.
- **Scope:** Web Share, Copy Link, supported social intents and public-profile OG data.
- **Functional Requirements:** action visible only while public; canonical URL; disabling profile invalidates public preview.
- **UX Requirements:** concise share copy; success/error feedback; no auto-post.
- **Accessibility Requirements:** accessible names, status live region, keyboard and mobile fallback.
- **Technical Notes:** extend T-607; OG image includes only explicitly public fields.
- **Analytics Events:** `profile_shared` with channel, never username/profile text.
- **Acceptance Criteria:** copy/Web Share/fallback verified; disabled/private profile cannot be shared as live content.
- **Dependencies:** T-1002, T-607.
- **Priority:** P2.

## Release 5 — Better Understanding

Головний результат: студент отримує інше пояснення всередині уроку без повноцінного AI tutor.

### T-1101 — Alternative explanation content model

- **Goal:** розширити lesson blocks versioned variants `default`, `simple`, `example`.
- **User Story:** як author, я хочу додати перевірене простіше пояснення та приклад до складного блока.
- **Scope:** block IDs, optional variants, authoring validation and fallback rules.
- **Functional Requirements:** default required; variants editorial, not runtime AI; stable block ID; missing variant handled gracefully.
- **UX Requirements:** simple variant не є дитячим/поблажливим; example concrete and relevant.
- **Accessibility Requirements:** semantic content preserved; code/diagram variant receives equivalent accessible treatment.
- **Technical Notes:** extend T-301/T-513 content contracts; avoid duplicated full lesson payload.
- **Analytics Events:** schema supports blockId/type via T-601; content itself never logged.
- **Acceptance Criteria:** selected High Load blocks compile with both variants; invalid/missing IDs caught in authoring check.
- **Dependencies:** T-301, T-513, T-601.
- **Priority:** P1.

### T-1102 — Inline “Explain it differently” UI

- **Goal:** розкривати simple/example variant без навігації з lesson.
- **User Story:** як студент, який не зрозумів блок, я хочу одразу побачити простіше пояснення або приклад.
- **Scope:** reusable trigger group, inline expansion, collapse and no-variant state.
- **Functional Requirements:** one variant at a time or clearly grouped; state local to lesson; no AI promise.
- **UX Requirements:** controls біля relevant block; no modal/context loss; labels `Пояснити простіше` / `Показати приклад`.
- **Accessibility Requirements:** native button, `aria-expanded`/`aria-controls`, logical focus, content announced without noisy live region.
- **Technical Notes:** Server-render variant content, small client disclosure; integrate legacy shell progressively where needed.
- **Analytics Events:** `alternative_explanation_opened` with lessonId/blockId/type, once per explicit open.
- **Acceptance Criteria:** keyboard/screen-reader/mobile paths pass; no navigation or duplicate event; absent variants render no dead control.
- **Dependencies:** T-1101.
- **Priority:** P1.

### T-1103 — Difficult-content insight report

- **Goal:** перетворити alternative-explanation usage на privacy-safe editorial signal.
- **User Story:** як instructor, я хочу знайти блоки, які найчастіше потребують іншого пояснення.
- **Scope:** aggregate report by course/lesson/block/type and date range.
- **Functional Requirements:** minimum-volume/empty states; no learner identity or content payload; compare with lesson views.
- **UX Requirements:** simple server-rendered table; explain that opens indicate friction, not failure.
- **Accessibility Requirements:** table headers/captions, sortable controls labelled, mobile list fallback.
- **Technical Notes:** extend T-608, not separate BI stack.
- **Analytics Events:** consumes `alternative_explanation_opened`; report use need not track personal data.
- **Acceptance Criteria:** formulas documented; low-volume and zero states safe; role access restricted.
- **Dependencies:** T-1102, T-608.
- **Priority:** P2.

## Release 6 — SYSTEMA Playground

Головний результат: standalone interactive product attracts users without requiring course enrollment.

### T-1201 — Playground catalog

- **Goal:** створити `/playground` для реально реалізованих tools.
- **User Story:** як відвідувач, я хочу експериментувати без старту курсу.
- **Scope:** server-rendered catalog cards, audience/mode, availability and deep links.
- **Functional Requirements:** only implemented playgrounds listed; no coming-soon cards masquerading as available.
- **UX Requirements:** clear difference from courses; each card states what can be changed and learned.
- **Accessibility Requirements:** semantic list/headings, keyboard links, text alternatives for previews, `20rem` reflow.
- **Technical Notes:** registry-driven; reuse course visual components without coupling progress.
- **Analytics Events:** `playground_catalog_viewed`, `playground_opened`.
- **Acceptance Criteria:** empty/one/multiple states; no dead links; metadata and mobile/keyboard verified.
- **Dependencies:** T-601, T-602.
- **Priority:** P1.

### T-1202 — System Design Playground MVP

- **Goal:** додати configurable System Design sandbox із traffic, servers, cache і replicas.
- **User Story:** як відвідувач, я хочу змінити систему й побачити наслідки без проходження уроку.
- **Scope:** bounded controls, architecture summary, run/reset, initial presets boundary.
- **Functional Requirements:** labelled traffic range, increment/decrement servers/replicas, cache toggle; safe min/max.
- **UX Requirements:** immediate configuration summary; no complex free-form canvas in MVP.
- **Accessibility Requirements:** programmatic labels, keyboard controls, values exposed, text architecture view, target sizes.
- **Technical Notes:** reuse deterministic T-304 engine; state serializable through versioned schema.
- **Analytics Events:** `playground_opened`, `playground_configuration_changed` aggregate, `playground_run`.
- **Acceptance Criteria:** keyboard-only configuration works; invalid ranges prevented; desktop/`20rem` responsive.
- **Dependencies:** T-1201, T-304.
- **Priority:** P1.

### T-1203 — Playground simulation results and presets

- **Goal:** пояснювати stable/unstable result і додати curated scenarios.
- **User Story:** як користувач, я хочу зрозуміти bottleneck і швидко спробувати Traffic Spike або DB Failure.
- **Scope:** deterministic metrics/result, suggestions, presets `10K`, `100K`, Server/Traffic/DB failure.
- **Functional Requirements:** presets are versioned config; suggestions correspond to actual validator; rerun after change.
- **UX Requirements:** error not only red/cross; show failed requests/bottleneck with explanation; clear preset reset.
- **Accessibility Requirements:** live summary, semantic issue list, not color-only, reduced motion.
- **Technical Notes:** no random simulation claims; reuse T-304 validation result shape.
- **Analytics Events:** `playground_run`, `playground_success`, `playground_preset_selected`, failure code only.
- **Acceptance Criteria:** each preset deterministic and tested; changes can resolve failure; no internal error leakage.
- **Dependencies:** T-1202.
- **Priority:** P1.

### T-1204 — Safe shareable playground scenarios

- **Goal:** створити shareable URL/config ID без arbitrary code.
- **User Story:** як користувач, я хочу надіслати конфігурацію іншій людині для повторного запуску.
- **Scope:** allowlisted versioned parameters or server ID, canonical open flow, invalid/expired state.
- **Functional Requirements:** strict size/range validation; no executable/user HTML; URL contains no identity/private progress.
- **UX Requirements:** preview before share; Copy/Web Share fallback; recipient sees configuration source.
- **Accessibility Requirements:** accessible share controls/status; validation errors linked to input/URL state.
- **Technical Notes:** reuse T-205 schema and T-607 share adapter; sign/validate server IDs if used.
- **Analytics Events:** `playground_shared`, `shared_playground_opened`; no raw query payload.
- **Acceptance Criteria:** malicious/oversized configs rejected; valid link round-trips exactly; version migration covered.
- **Dependencies:** T-1203, T-205, T-607.
- **Priority:** P2.

## Release 7 — Distribution and Discovery

Головний результат: наявний контент перевикористовується для discovery без дублювання SEO/share infrastructure.

### T-1301 — Reusable content distribution fields

- **Goal:** доповнити source content структурованими excerpts для зовнішнього використання.
- **User Story:** як content owner, я хочу з одного перевіреного джерела сформувати SEO/social/newsletter drafts без копіювання фактів.
- **Scope:** short description, social description, learning takeaway, excerpt blocks and provenance/version.
- **Functional Requirements:** fields optional with fallback; no automatic publishing/generation; source remains canonical.
- **UX Requirements:** authoring guidance обмежує length і вимагає фактичну відповідність lesson.
- **Accessibility Requirements:** generated excerpts remain plain meaningful text; images require alt purpose.
- **Technical Notes:** extend T-301/T-513 and T-602 metadata; dynamic OG stays T-607, не дублюється.
- **Analytics Events:** none required for authoring; downstream clicks use T-601/T-607.
- **Acceptance Criteria:** one lesson can supply page metadata/share copy/newsletter excerpt without duplicated source files; fallback tested.
- **Dependencies:** T-301, T-513, T-602, T-607.
- **Priority:** P3.

### T-1302 — Related lessons and courses

- **Goal:** додати editorial, non-AI related-content discovery.
- **User Story:** як студент, я хочу побачити до трьох справді пов’язаних lessons/courses після поточного кроку.
- **Scope:** explicit related IDs, end-of-lesson/course component, fallback and publication validation.
- **Functional Requirements:** max three; no self/unpublished links; path next step from T-704 has precedence.
- **UX Requirements:** explain relation briefly; avoid infinite carousels and generic popularity ranking.
- **Accessibility Requirements:** semantic list/heading, descriptive links, logical reading order.
- **Technical Notes:** editorial mapping in content registry; no ML recommendations.
- **Analytics Events:** `recommendation_shown`, `recommendation_clicked` with source/target/type.
- **Acceptance Criteria:** invalid/self links rejected; component absent when empty; canonical target and analytics verified.
- **Dependencies:** T-602, T-704.
- **Priority:** P2.

## Deferred foundation — Notifications

Цей блок P3 не входить у найближчі releases і не дозволяє push/email notifications.

### T-1401 — In-app notification model

- **Goal:** підготувати мінімальний owner-only contract для корисних product notifications.
- **User Story:** як користувач, я хочу пізніше бачити важливу відповідь або новий challenge без spam.
- **Scope:** typed event, recipient, created/read state, safe destination, retention policy.
- **Functional Requirements:** allowlist `question_answered`, `official_answer_added`, `new_weekly_challenge`, `course_completed`; idempotency.
- **UX Requirements:** copy concise/actionable; no fake urgency; per-type future preference boundary.
- **Accessibility Requirements:** message text self-contained; read/unread not color-only.
- **Technical Notes:** PostgreSQL/RLS; producers out of scope until real use case implemented.
- **Analytics Events:** no notification content; future aggregate delivered/opened only after consent review.
- **Acceptance Criteria:** schema/RLS/idempotency tests pass; no UI or external delivery implied.
- **Dependencies:** T-021, T-604, T-903.
- **Priority:** P3.

### T-1402 — Notification Center activation gate

- **Goal:** створити notification center лише після появи щонайменше двох reliable event producers.
- **User Story:** як користувач, я хочу одну доступну чергу справді корисних оновлень.
- **Scope:** list, unread count, mark read, destination and empty/error states.
- **Functional Requirements:** feature flag/activation gate; owner-only; pagination; no push/email.
- **UX Requirements:** no attention traps; bulk mark-read secondary; clear timestamps in user locale.
- **Accessibility Requirements:** labelled count, semantic list, keyboard actions, live update without focus theft.
- **Technical Notes:** server-render first page; polling only if justified, no WebSocket by default.
- **Analytics Events:** aggregate `notification_center_opened`, `notification_clicked`; no message payload.
- **Acceptance Criteria:** task remains blocked from implementation until two producers meet reliability criteria; RLS/mobile/keyboard verified when activated.
- **Dependencies:** T-1401 plus two production event producers.
- **Priority:** P3.

## Release order

1. Finish M6 foundation: T-601 → T-608.
2. Guided Learning: T-701 → T-707.
3. Applied Learning: T-801 → T-805.
4. Sustainable Habit: T-901 → T-905.
5. Learning Identity: T-1001 → T-1003.
6. Better Understanding: T-1101 → T-1103.
7. SYSTEMA Playground: T-1201 → T-1204.
8. Distribution/Discovery: T-1301 → T-1302.
9. Notifications remain deferred: T-1401 → T-1402.
