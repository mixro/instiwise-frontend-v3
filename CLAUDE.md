# Frontend rules (React + Vite + TypeScript)

Read the workspace `CLAUDE.md` first (`../workspace/CLAUDE.md`). Product rules there apply here.

## Commands

```bash
npm install            # first time (also installs the git hooks)
npm run dev            # http://localhost:5173, proxies /api to the backend
npm run verify         # lint, format check, type check, tests, build: run before every push
npm run msw:init       # once, if you want VITE_USE_MOCKS=true (fake API, no backend needed)
```

## Structure

```
src/
├── app/            router and providers
├── components/     shared components (brand/, ui/, toggles)
├── features/       one folder per product area: auth, projects, payments, messages ...
├── hooks/  lib/    helpers (cn, format, api, theme context)
├── i18n/           i18next setup and locales/{en,sw}/*.json
├── mocks/          MSW handlers (fake API)
├── styles/         tokens.css (all colors) and index.css (Tailwind setup)
└── assets/brand/   logo files; never edit the originals in source/
```

## Rules

- **No hard-coded user-facing text.** Every string goes through `t()`; add the key to both `en` and `sw` (a test fails if the key sets differ).
- **No raw colors.** Use semantic Tailwind tokens (`bg-surface`, `text-muted`, `bg-brand`). New colors are added to `styles/tokens.css` with both a light and a dark value. Check every screen in light and dark mode.
- **Money** is an integer number of TZS. Format it only with `formatTzs`; dates only with `formatDate`. Never calculate real totals or balances in the browser; show what the server returns.
- **Roles:** hiding a button is not security. Never assume the UI protects data; the backend does.
- **API:** call it through `lib/api.ts`. Show errors by translating `error.code`, never by printing the server's message. The shapes come from `../workspace/contracts/openapi.yaml`.
- **Design:** dense, scannable layouts (tables and lists for records), flat surfaces, hairline borders, Lucide icons, specific copy. Every screen has empty, loading, error and success states. Clients use phones: one column, touch targets of at least 44 px. See `../workspace/docs/design/brand.md`.
- **Accessibility:** labels on every control, visible focus, contrast of at least 4.5:1, keyboard navigation.
- Reuse components before creating new ones. Keep files small; one component per file.
- Add or update a test with every behaviour change.

## Brand

Use `Logo` for the full lockup and `Mark` for the icon alone. The mark is the supplied PNG; the wordmark is an SVG component whose letters follow the theme. Do not redraw or recolor the mark.
