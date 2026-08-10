# Lesson development

## Lesson contract

Every lesson should contain:

1. A specific learning outcome.
2. Concise theory with definitions and trade-offs.
3. A system diagram when relationships matter.
4. A realistic practical task.
5. At least one expected failure and one expected success.
6. A validator that explains the violated principle and correction.
7. A completion action and persistent progress.

## Content rules

- Explain English architecture terms in Ukrainian on first use.
- Prefer concrete numbers, failures and decision criteria over abstract claims.
- Visually separate code, formulas, warnings, examples and tasks.
- State assumptions and trade-offs; no architecture is universally correct.
- Keep lesson number, module, duration and stable IDs in course data.
- Avoid duplicating navigation metadata inside lesson markup.

## Simulator design

- Model rules as data instead of long DOM-specific condition chains.
- Give failures stable codes for analytics and tests.
- Validate architecture properties rather than one exact picture unless ordering is the learning goal.
- Separate scenario configuration from the generic simulator engine.
- Make reset explicit and recoverable when practical.
- Keep attempts serializable for future save, resume and comparison.

## Future course readiness

- Add `courseId`, `moduleId` and `lessonId`; never derive identity from array position.
- Generate navigation from course data.
- Scope progress by course and schema version.
- Prepare content strings for later localization without adding a library prematurely.
- Reuse lesson primitives: comparison, metric, code example, quiz, diagram builder and validation report.
