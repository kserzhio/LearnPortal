# Responsive CSS and units

## Required units

- Use `rem` for typography, spacing, controls, radii and page dimensions.
- Use `em` when a value should scale with its component's font size.
- Use `%`, `fr`, `minmax()`, `auto-fit` and `auto-fill` for fluid layout.
- Use `clamp()` for fluid type and spacing with safe bounds.
- Keep the root font size at the browser default (`100%`).
- Do not add static `px` values. Express borders and outlines as relative units, for example `0.0625rem` and `0.125rem`.

JavaScript geometry APIs return CSS pixels. Calculations may consume those values, but must derive positions from the DOM instead of adding unexplained pixel constants.

## Migration policy

The current stylesheet contains legacy `px` values. Treat them as debt:

1. Convert rules directly touched by the current task.
2. Preserve the computed scale: divide legacy pixels by `16` for an initial `rem` equivalent, then simplify thoughtfully.
3. Do not mix new `px` declarations into a migrated component.
4. Avoid repository-wide mechanical conversion during an unrelated lesson change.

## Layout rules

- Start with the narrow layout and enhance at wider content-driven breakpoints.
- Avoid fixed heights for text containers.
- Allow 200% text zoom without clipping, overlap or lost controls.
- Keep touch targets at least `2.75rem` where space permits.
- Prevent page-level horizontal scrolling at `20rem` viewport width. A labelled diagram canvas may scroll internally.
- Use design tokens for color, spacing, type, radii, elevation and motion.
- Respect `prefers-reduced-motion`.

```css
.lesson-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: clamp(1rem, 3vw, 2rem);
}

.lesson-title { font-size: clamp(2.25rem, 7vw, 5rem); }

@media (min-width: 48em) {
  .lesson-shell { grid-template-columns: 17rem minmax(0, 1fr); }
}
```
