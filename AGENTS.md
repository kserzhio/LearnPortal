# Systema project instructions

Use the project skill at `skills/systema-development/SKILL.md` for every change to the learning portal.

Non-negotiable rules:

- Keep the portal accessible, responsive and framework-free until the project explicitly changes direction.
- Do not introduce new fixed `px` values. Use `rem`, `em`, `%`, `fr`, `minmax()` and `clamp()` according to the CSS reference.
- Keep all readable interface and lesson text at `1rem` or larger. Smaller sizes are allowed only for non-text decorative marks that are hidden from assistive technology.
- Treat existing `px` CSS as migration debt. Convert selectors touched by a task when safe; do not rewrite unrelated styling without approval.
- Preserve WCAG 2.2 AA contrast, keyboard operation, visible focus and semantic HTML.
- Apply SOLID and Clean Code proportionally. Split state, rendering, validation and persistence when adding behavior.
- Never simulate future authentication with credentials or authorization state in `localStorage`.
- Run syntax, interaction, responsive and contrast checks before completing UI work.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
