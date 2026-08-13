# SYSTEMA Learning Support

The learning loop is now `Learn → Build → Simulate → Check → Ask` without adding forum or social-network infrastructure.

## Boundaries

- FAQ, hints and knowledge checks are versionable course content in `src/features/learning-support/content.ts`.
- Q&A is scoped by `courseId + contentId`, so the same API supports adult lessons and Kids levels.
- Replies are flat. There are no nested threads, direct messages, followers or realtime subscriptions.
- Reading Q&A is public. Creating questions, replies and useful votes requires Supabase authentication.
- `INSTRUCTOR` and `ADMIN` can resolve questions, mark official answers and remove discussions. Authorization is enforced by RLS, not by the client flag.
- Lesson feedback is private analytics data. Public clients cannot query it.
- Knowledge answers are checked against trusted server content; the client does not decide correctness for persisted attempts.

## Initial content slice

- High Load lesson 1: three progressive hints, one failover knowledge check and three lesson FAQ entries.
- High Load course: four separate course FAQ entries.
- Kids course maps: shared course FAQ.
- Every Kids level: existing progressive hint engine plus shared feedback and lesson-scoped Q&A.

## Database rollout

`supabase/migrations/202608120001_learning_support.sql` and `202608120002_protect_profile_roles.sql` were applied transactionally to project `lpaeprmvctpilwqvlxgb` on 2026-08-12. They add constrained roles, Q&A, flat replies, useful votes, private feedback and knowledge-check attempts with RLS, then prevent authenticated clients from changing `profiles.role`. The migration files remain the canonical reproducible schema even though the local Supabase CLI is not authenticated.

## Verification

Run `npm run check:learning-support`, `npm run check:font-size`, `npm run typecheck`, `npm run lint` and `npm run build`. Browser QA covers the preview and legacy lesson flows on desktop and `20rem`, keyboard knowledge-check submission, progressive hints, FAQ expansion, feedback follow-up, authenticated/guest Q&A and moderator actions.
## Legacy High Load runtime

Усі 19 занять підключають спільний mount через подію `systema:lesson-change` і стабільний `contentId` формату `high-load-01` … `high-load-19`. Кожне заняття має Q&A, flat replies, feedback, FAQ та послідовні підказки. Server-validated knowledge checks показуються у вибраних контрольних точках: 1, 9, 13, 15 і 19.

Роль `profiles.role` не можна змінювати з authenticated client: міграція `202608120002_protect_profile_roles.sql` відкликає column-level `UPDATE` для цього поля. Призначення `INSTRUCTOR` / `ADMIN` виконується лише з адміністративного database або service context.
