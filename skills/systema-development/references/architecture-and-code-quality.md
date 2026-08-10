# Architecture and code quality

## SOLID applied proportionally

- Single responsibility: separate course data, state transitions, rendering, validation and persistence.
- Open/closed: add lessons through data and a lesson module, not unrelated branches throughout one file.
- Liskov substitution: progress and authentication adapters must honor the same contract.
- Interface segregation: prefer `loadProgress`, `saveProgress` and `validateDiagram` over a large application service.
- Dependency inversion: learning logic must not depend directly on `localStorage`, DOM selectors or an HTTP client.

Avoid ceremonial classes. Prefer plain functions and modules when responsibilities remain clear.

## Clean Code rules

- Use descriptive English identifiers and Ukrainian content data.
- Replace magic strings and numbers with named constants or configuration.
- Return structured validation results: `{ valid, code, message, affectedIds }`.
- Keep rendering idempotent: the same state produces the same UI.
- Use event delegation for repeated dynamic controls.
- Avoid global mutable state; keep one state object per simulator.
- Do not use `innerHTML` with user-controlled or server-provided content. Prefer `textContent` and DOM creation.
- Show recoverable errors in the UI without exposing secrets.

## Recommended evolution

```text
src/
  app/                 navigation, progress
  courses/high-load/   course data and lessons
  simulators/core/     state and validation
  simulators/<topic>/  scenario configuration
  infrastructure/      browser and HTTP adapters
  ui/                  theme, toast, shared components
```

Introduce this split incrementally when a touched file has multiple reasons to change. Do not refactor merely to match the diagram.

## Data and state

- Give course, lesson, attempt and diagram entities stable IDs independent of titles.
- Version stored schemas: `{ version, courseId, completedLessonIds, updatedAt }`.
- Keep simulator attempts serializable for future server sync.
- Define migrations before changing persisted data shape.
- Prefer shareable lesson URLs; never encode sensitive state in them.
