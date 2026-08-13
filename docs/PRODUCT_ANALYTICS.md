# SYSTEMA Product Analytics

Оновлено: 2026-08-12 · задача T-601

## Provider audit і рішення

У repository не було Google Analytics, PostHog, Plausible, Mixpanel, Segment або іншого analytics SDK. SYSTEMA уже розгорнута на Vercel, тому foundation використовує один provider — Vercel Web Analytics 2.x.

- Page views доступні на всіх Vercel plans, а visitor identity анонімізується без cookies.
- Custom events у Vercel доступні на Pro/Enterprise. Typed adapter і instrumentation працюють незалежно від plan; на Hobby page views працюють, а custom-event dashboard активується після upgrade або заміни provider за adapter boundary.
- Не додаємо другий SDK. Майбутня заміна provider змінює лише `src/lib/analytics/client.ts` і server endpoint, а не feature code.

Production dashboard перевірено 2026-08-12: Web Analytics уже активована, team plan — Hobby. За рішенням owner custom events поставлено на паузу: page views залишаються активними, typed instrumentation збережена, але provider delivery вимкнена за замовчуванням. T-601 повертається в роботу після вибору backend: Vercel Pro/Enterprise, один approved analytics provider або first-party aggregate storage у Supabase.

Custom delivery вмикається лише явними environment flags `NEXT_PUBLIC_PRODUCT_ANALYTICS_CUSTOM_EVENTS=true` і `PRODUCT_ANALYTICS_CUSTOM_EVENTS=true`. До цього client adapter виконує локальну QA-подію з `delivery: paused`, а server endpoint валідує payload і відповідає `204` без запису provider event.

## Privacy contract

Custom events приймаються лише через compile-time event map і runtime allowlist. Кожна подія має рівно дві scalar properties, щоб відповідати Vercel Pro limit.

Заборонено передавати:

- email, username, ім’я, user ID або auth provider identity;
- question/reply/comment text, selected answer text або feedback comment;
- architecture/project/code payload, URL із query/hash, recovery token;
- raw error/stack, IP, user agent або точний learning timestamp.

Дозволені лише stable content IDs, enum result/source/type, bounded counts та booleans. Runtime sanitizer відхиляє extra keys, object/array values, email-like values і довгі довільні рядки.

`beforeSend` видаляє query і hash з page views, редагує майбутній `/u/{username}` до `/u/[username]` і не надсилає `/auth/callback` та `/auth/sign-out`.

## Instrumented funnel

Поточний vertical slice:

- automatic anonymized page views;
- `cta_clicked` для primary homepage CTA;
- `course_viewed`, `course_started`;
- `lesson_viewed`, `lesson_started`, `lesson_completed` для preview/Kids/19 legacy lessons;
- `simulator_run` для Kids challenges;
- `knowledge_check_submitted`, `hint_opened`, `question_created`, `lesson_feedback_submitted` для React learning support.

Legacy runtime використовує `/api/analytics`; endpoint повторно застосовує ту саму allowlist і не приймає довільні fields. Дублікати initial lesson/course events пригнічуються в межах page session.

Namespaces для paths, skills, final projects, weekly goals/challenges, public profiles, alternative explanations, playground і recommendations уже typed, але feature events не надсилаються до реалізації відповідної задачі.

## Product formulas

- Homepage → Course = unique `course_viewed` / homepage visitors.
- Course Start Rate = `course_started` / `course_viewed`.
- Lesson completion = `lesson_completed` / `lesson_viewed`, grouped by `content_id`.
- Course completion = learners with final lesson completed / course starts (повний completion event додається у T-604).
- Knowledge Check pass rate = correct / all `knowledge_check_submitted`.
- Hint usage = `hint_opened` / lesson views.
- Question rate = `question_created` / lesson views.
- Helpful rate = helpful feedback / all `lesson_feedback_submitted`.

Vercel aggregates anonymous visitors. Custom events intentionally do not carry a SYSTEMA anonymous/user identifier; cross-device identity stitching is out of scope and would require a separate consent/retention decision.

## Verification

Run:

```text
npm run check:analytics
npm run typecheck
npm run lint
npm run build
```

Browser QA listens to the local `systema:analytics:tracked` event, so event name/properties and paused delivery can be verified without reading or mutating production analytics.
