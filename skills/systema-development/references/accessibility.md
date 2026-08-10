# Accessibility standard

Target WCAG 2.2 Level AA for every lesson and simulator.

## Required checks

- Normal text contrast: at least `4.5:1`.
- Large text contrast: at least `3:1`.
- Controls, focus indicators and meaningful graphics: at least `3:1` against adjacent colors.
- Support keyboard-only use in a logical order and show a visible `:focus-visible` indicator.
- Give every control a persistent accessible name and a connected error or hint.
- Announce simulator results through a suitable live region without unexpected focus movement.
- Use buttons for actions and links for navigation.
- Preserve heading hierarchy, landmarks, lists and native form semantics.
- Do not use color, icons or position as the only indicator of validity.
- Give instructional diagrams text alternatives; hide decorative visuals from assistive technology.
- Support 200% text zoom, reflow at `20rem`, high contrast preferences and reduced motion.
- Provide a keyboard/button equivalent for drag-and-drop.

## Simulator behavior

- Expose selected component state programmatically.
- Identify the component, violated rule and correction in each error.
- Explain why a successful architecture works.
- Preserve the student's work after validation.

Automated contrast and semantic checks are required but do not replace keyboard inspection.
