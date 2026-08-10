# Verification checklist

Run checks proportional to the change. UI or simulator work requires the complete list.

## Static checks

- Run `node --check app.js` or the equivalent for changed JavaScript modules.
- Run `git diff --check`.
- Search changed CSS for newly introduced `px` declarations.
- Check duplicate IDs, broken internal targets and missing labels.

## Interaction checks

- Open the exact lesson URL/hash.
- Test empty, intentionally invalid and expected valid states.
- Test reset, removal and repeated validation.
- Confirm progress completion does not corrupt other lessons.
- Check the browser console for errors.

## Visual and accessibility checks

- Test light and dark themes.
- Audit WCAG AA contrast for text and controls.
- Test keyboard order, activation and visible focus.
- Test a narrow viewport around `20rem` and a normal desktop viewport.
- Confirm no page-level horizontal overflow.
- Test enlarged text and reduced motion when applicable.

## Future CI quality gates

- HTML validation.
- ESLint and formatting after JavaScript is modularized.
- Stylelint rule preventing `px` declarations.
- axe-core accessibility tests.
- Unit tests for pure validator functions.
- End-to-end lesson navigation, simulator and progress tests.
- Performance budgets for JavaScript, CSS and Largest Contentful Paint.
