# SYSTEMA icon system

SYSTEMA uses Lucide as the single product icon language. Lucide is preferred over Material Symbols because its neutral outline style fits both professional and Kids courses without making the portal look like a Material Design application.

## Rules

- React UI uses `SystemIcon` from `src/components/ui/system-icon.tsx`.
- Legacy UI uses the local SVG factory in `public/legacy/runtime/icons.js`; it never loads icons from a CDN.
- Decorative icons are hidden from assistive technology. Meaningful standalone icons receive a label.
- Icon-only controls keep a visible tooltip/title where useful and always have an `aria-label`.
- Icons use `currentColor`, a consistent `2` stroke and relative `rem` sizes.
- Icons reinforce text; they are never the only success, error or status indicator.
- Course abbreviations (`API`, `DB`, `RPS`) and algorithm movement arrows are learning data, not product icons, so they remain textual.
- Import only the icons used by the product. Do not use a dynamic all-icons loader.

## Migration

New portal UI, shared header, homepage, dashboard, auth, Kids screens and learning-support controls use Lucide. The legacy shell and dynamically rendered simulator controls are progressively enhanced by the local SVG factory and its scoped mutation observer.

Run `npm run check:icons` after changing product controls. The check rejects product emoji in TSX and verifies the React/legacy accessibility and initialization contracts.
