# Kids Coding content model

The authoring contract lives in `src/features/kids-coding/domain`. It contains no React, DOM, storage, HTTP or Supabase dependencies.

## Hierarchy

```text
KidsCourseDefinition
└── WorldDefinition[]
    └── LevelDefinition[]
        └── ChallengeDefinition
            ├── InitialGameState
            ├── CommandDefinition[]
            ├── ObjectiveDefinition
            ├── HintDefinition[3]
            ├── StarCriterion[3]
            └── RewardDefinition[]
```

The first vertical slice uses one challenge per level. Keeping challenge as its own entity gives attempts and content migrations a stable ID without coupling them to a visible level title.

Code Mode levels may additionally define optional `starterCode`. It is validated as bounded plain text and remains configuration data; executable behavior is still created only by the restricted sandbox parser at runtime.

## Identity and versions

- `id` values are stable lowercase kebab-case identifiers used by progress and attempts.
- `slug` values are URL segments and must be unique among siblings.
- `position` starts at `1`, is continuous, and controls presentation only.
- `schemaVersion` describes the shape of the complete document.
- `contentVersion` changes when authored behavior or scoring changes while the entity ID remains stable.
- Renaming visible text must not rename an existing ID.

The current document marker is:

```json
{
  "schema": "systema.kids-course",
  "schemaVersion": 1
}
```

An unsupported schema version is rejected with `unsupported-schema-version`. Before increasing the version, add a pure migration from the previous JSON-compatible shape and test both migration and current parsing. Never silently reinterpret persisted attempts from a different content version.

## Authoring boundary

Use `defineKidsCourse(data)` for trusted version-controlled definitions. It still runs the same parser used for imported or server-provided data and throws `KidsCourseConfigurationError` with structured issues.

Use `parseKidsCourse(value)` when input is untrusted:

```ts
const result = parseKidsCourse(input);

if (!result.success) {
  for (const issue of result.issues) {
    console.error(issue.code, issue.path, issue.message);
  }
}
```

Each issue contains:

- a stable `code` for tests and tooling;
- a JSON-like `path` to the invalid field;
- an author-facing message.

The parser reconstructs a deeply frozen plain-data object. Unknown fields, functions and other executable configuration are discarded and reported instead of entering the application model.

## Validation invariants

Runtime validation currently enforces:

- known schema and positive content versions;
- stable IDs, safe slugs and correct parent IDs;
- unique IDs/slugs and continuous positions;
- recommended age range;
- grid size and entity positions inside the board;
- no duplicate obstacles, blocked character or blocked goal;
- unique commands, parameters, items and rewards;
- references from conditions to existing items and commands;
- exactly three progressive hints in order;
- exactly three star criteria in order;
- positive command budget and reward quantity;
- known learning modes, difficulty, commands, conditions and reward types.
- bounded optional starter code for data-driven Code Mode authoring.

## Serialization

`serializeKidsCourse(course)` validates before returning JSON. `parseKidsCourseJson(json)` handles malformed JSON and returns the same `ParseResult` contract.

Course data may therefore be stored in TypeScript today and moved to JSON/database records later without changing the domain model. Full executable configuration remains version-controlled during the first vertical slice; PostgreSQL will store published metadata and personal progress in T-510.

## Adding a course

1. Create a plain JSON-compatible object under `src/features/kids-coding/content`.
2. Wrap it with `defineKidsCourse`.
3. Keep visible Ukrainian content separate from English IDs.
4. Add or change content versions intentionally.
5. Run `npm run check:kids-course-model`, `npm run typecheck`, `npm run lint` and `npm run build`.

The automated fixture covers a valid document, JSON round-trip, unsupported version, unknown field, out-of-bounds position, missing hint and duplicate IDs.
