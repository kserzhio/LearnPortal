# Kids Coding progress and persistence

## Contract

Kids Coding uses a separate `KidsProgressStore` instead of adding game-specific fields to lesson progress:

```ts
interface KidsProgressStore {
  loadCourse(courseId: string): Promise<KidsProgressBundle>;
  recordAttempt(attempt: KidsAttemptRecord): Promise<KidsProgressBundle>;
  recordUnlock(courseId: string, unlock: KidsUnlockRecord): Promise<KidsProgressBundle>;
  mergeCourse(bundle: KidsProgressBundle): Promise<KidsProgressBundle>;
}
```

`BrowserKidsProgressStore` receives a storage port explicitly and uses versioned key `systema-kids-progress-v1`. `ApiKidsProgressStore` uses same-origin `/api/kids-progress`, includes cookies through the browser fetch contract and uploads large guest histories in bounded chunks.

No profile, email, OAuth provider, age or other identity attribute is stored in the progress bundle. PostgreSQL associates private rows with `auth.uid()` only at the authenticated persistence boundary.

## Attempt-driven progress

Every attempt has a client-generated UUID and wraps schema `systema.kids-level-attempt`, version `1`. Completion, stars and best solution are derived from unique attempts:

- completion is monotonic `false → true`;
- stars keep the maximum value;
- attempt count uses unique IDs, so retrying sync is idempotent;
- best solution prefers valid higher stars, then fewer source commands, then the earlier deterministic attempt;
- completed worlds are derived only when every published level in that world is complete;
- unlocks use unique `(kind, referenceId)` keys.

The bundle also contains server summaries so attempt history can be bounded without losing the exact count or best solution.

## Trust boundary

The API never trusts client `valid`, stars, metrics or final game state. For every submitted attempt it:

1. resolves the version-controlled course/world/level challenge;
2. checks challenge and content versions;
3. parses the Program AST against commands enabled for that challenge;
4. executes it again with the deterministic engine and no animation delay;
5. stores the server-generated attempt payload and result.

Best solutions contain a bounded, versioned Program AST rather than JavaScript source. A portable structural parser protects guest imports; the server performs full challenge-aware validation before persistence.

## PostgreSQL model

Migration `202608110001_kids_coding_progress.sql` adds:

- `course_worlds` and `course_levels` as published metadata/foreign-key allow-lists;
- `kids_level_attempts` as immutable, idempotent verified attempts;
- `kids_level_progress` as monotonic level summaries and best Program AST;
- `kids_unlocks` for worlds, achievements and cosmetic rewards.

An `AFTER INSERT` trigger updates progress atomically only when a new attempt ID is inserted. It increments attempt count, keeps completion/stars monotonic, selects the better solution and unlocks the next published world after all levels are complete.

RLS allows published world/level metadata reads. Authenticated users can read only their progress, attempts and unlocks and insert attempts only with their own `user_id`. Progress rows cannot be directly overwritten from the browser. `claim_kids_world_unlock` validates world order before inserting an unlock; achievement and reward rules remain server-controlled for T-511.

## Initial registry

`src/features/kids-coding/content/course-registry.ts` establishes stable IDs and challenge configurations for the first two five-level vertical slices:

- `robot-quest-algorithms / village / robot-village-01…05`;
- `code-adventure-javascript / village / code-village-01…05`.

The same registry will feed the World Map and Level UI. It already provides server verification, so database persistence does not need to trust course definitions sent by a client.

## Verification

Run `npm run check:kids-progress`. It covers both course registries, challenge execution, structural attempt validation, best-solution selection, idempotent merge, monotonic completion/stars, full-world completion, corrupt guest storage recovery and required migration/RLS guards.

The migration was applied to the LearPortal Supabase project on 2026-08-11. Online verification confirmed all five tables, two seeded worlds, ten seeded levels, enabled RLS, the attempt trigger, owner-only policies, and function privileges where `anon` cannot claim worlds while `authenticated` can call the validated function.
