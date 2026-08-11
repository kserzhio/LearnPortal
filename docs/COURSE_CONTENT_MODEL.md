# Course content model

Next.js catalog metadata lives in `src/content`. It is application data, not component markup.

## Files

- `course-contract.ts` defines the reusable course, module, lesson, topic and practice contracts.
- `courses/<course-slug>.ts` contains one complete published course definition.
- `courses.ts` builds catalog summaries and exposes lookup helpers to the application.
- `public/legacy` remains a temporary runtime adapter until T-302; do not add new catalog metadata there.

## Stable identity

- `course.id`, `module.id` and `lesson.id` never depend on a translated title.
- Lesson positions start at `1`, are unique and remain continuous within a course.
- `legacyAnchor` must match the lesson position while the legacy runtime exists.
- Renaming visible content must not rename an existing entity ID because progress and attempts use those IDs.

## Adding a lesson

Every lesson definition must include:

1. A measurable `outcome` and concise `summary`.
2. Topic IDs, titles and Ukrainian explanations of the architecture concepts.
3. A realistic practice task with explicit deliverables.
4. At least one `expectedSuccess` and one `expectedFailure` for the future reusable validator.
5. Duration, module ownership, position and a stable lesson ID.

Run `npm run typecheck`, `npm run lint` and `npm run build`. The runtime contract rejects duplicate IDs, gaps in lesson positions, wrong module ownership and invalid legacy anchors.

## PostgreSQL boundary

The TypeScript definition is the read model for navigation and lesson presentation. PostgreSQL stores enrollment, progress and attempts. The `lessons` table remains an authorization/integrity allow-list for progress writes, so a content release that changes lesson IDs also needs an explicit database migration.
