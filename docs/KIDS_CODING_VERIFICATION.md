# Kids Coding accessibility, safety and responsive verification

Task: T-512. Verified: 2026-08-11.

## Accessibility contract

- WCAG 2.2 AA contrast is checked for 11 text/background pairs; focus and structural boundaries meet the 3:1 non-text requirement.
- All user-facing text is at least `1rem`. Layout and component CSS use relative units and contain no `px` declarations.
- Native links, buttons, textarea and progress elements provide keyboard and assistive-technology semantics. The builder uses buttons rather than pointer-only drag and drop.
- Focus is visible, state changes use live regions, code errors connect through `aria-invalid` and `aria-errormessage`, and progress controls have explicit accessible names.
- Current, completed and locked levels, objectives, errors and earned stars include text or symbols; none depends on color or animation alone.
- `prefers-reduced-motion` and `forced-colors` fallbacks are part of the level, map and course-card styles.

## Browser matrix

| Scenario | Result |
| --- | --- |
| Level screen, desktop | Named landmarks, board, progress and run-control group; no duplicate IDs or unnamed buttons |
| Level screen, `20rem` viewport | No horizontal overflow; minimum text `1rem`; all visible interactive targets at least `2.75rem` |
| World Map, `20rem` and tablet | No horizontal overflow; current/locked/completed copy and star counts exposed; progress explicitly named |
| Dashboard, `20rem` | No horizontal overflow; both Kids course progress elements explicitly named |
| Keyboard focus | Native controls receive a visible solid focus outline with AA non-text contrast |
| JavaScript compile failure | Editor becomes invalid and references a public error with friendly message and safe line/column; result is announced assertively |
| 200% zoom | Covered by the equivalent `20rem` CSS viewport reflow check with no content loss or two-dimensional scrolling |

## Safety and access control

- Restricted JavaScript is parsed through an allowlist and never executed with `eval` or `Function` in the application context.
- DOM, cookies, storage, network and portal globals remain unavailable to learner code; operation and time limits are covered by the sandbox security suite.
- Progress writes require an authenticated user, same-origin request and server-side challenge re-evaluation.
- Guest HTTP checks confirm the first preview level returns `200`; course maps and later levels redirect to sign-in with a same-origin `next` value.

## Automated commands

Run `npm run check:kids-a11y` for the accessibility and safety contract. The final regression also includes all Kids course/model/engine/sandbox/progress checks, lint, typecheck, font verification and a production build.

The contract test is intentionally dependency-free. A full browser accessibility engine such as axe remains tracked separately in T-404 for the whole portal.
