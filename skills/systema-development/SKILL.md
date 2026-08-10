---
name: systema-development
description: Develop and review the Systema high-load architecture learning portal. Use for lesson creation, HTML/CSS/JavaScript changes, interactive architecture simulators, responsive design, accessibility, authentication preparation, refactoring, testing, or architectural decisions in this project.
---

# Systema Development

Build lessons as understandable learning experiences, not static articles. Preserve the visual language while keeping implementation ready for future courses, accounts and server-side persistence.

## Workflow

1. Inspect the existing lesson, navigation, state and shared styles before editing.
2. Read only the references relevant to the task.
3. Define the learning outcome and validation rules before building an interactive exercise.
4. Keep content, state, rendering, validation and persistence responsibilities separate.
5. Use semantic HTML first. Add ARIA only when native semantics are insufficient.
6. Use fluid relative units. Do not add fixed `px` declarations.
7. Validate syntax, expected failure, expected success, keyboard behavior, mobile layout, both themes and WCAG AA contrast.
8. Report important trade-offs and remaining migration debt.

## Reference routing

- Read [responsive-css.md](references/responsive-css.md) for every layout, typography or CSS change.
- Read [architecture-and-code-quality.md](references/architecture-and-code-quality.md) for JavaScript, state, data models, refactoring or new features.
- Read [auth-and-security.md](references/auth-and-security.md) for identity, login, persistence, forms, user content or backend planning.
- Read [accessibility.md](references/accessibility.md) for all UI work and interactive exercises.
- Read [lesson-development.md](references/lesson-development.md) when adding or changing course content or simulators.
- Read [verification.md](references/verification.md) before completing implementation work.

## Product direction

- Keep courses and lessons data-driven so another course does not require duplicated navigation logic.
- Prefer URL-addressable lesson state and versioned progress storage.
- Design an adapter boundary for local progress versus future authenticated server progress.
- Keep Ukrainian learning content separate from English code identifiers to prepare for localization.
- Use progressive enhancement; core lesson content must remain readable if JavaScript fails.
- Maintain performance budgets and avoid unnecessary third-party runtime dependencies.
