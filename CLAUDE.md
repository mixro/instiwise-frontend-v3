# Frontend rules (React + Vite + TypeScript)

Read the workspace `CLAUDE.md` first (`../workspace/CLAUDE.md`). Product rules there apply here.

## Commands

```bash
npm install            # first time (also installs the git hooks)
npm run dev            # http://localhost:5173, proxies /api to the backend
npm run verify         # lint, format check, type check, tests, build: run before every push
npm run dev:mock       # same, answered by the MSW mock backend in src/mocks (no backend needed)
npm run api:generate   # regenerate src/lib/contract/schema.d.ts from ../workspace/contracts/openapi.yaml
npm run api:check      # fail if the generated types are out of date
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
- **API:** call it only through `apiClient` in `lib/api.ts`, with the contract's paths (`apiClient.GET("/client/projects/{projectId}", { path: { projectId } })`). Types come from `../workspace/contracts/openapi.yaml`: after a contract change run `npm run api:generate` (never edit `src/lib/contract/schema.d.ts` by hand) and fix what the type check reports. Name API types as aliases of `Schema<"...">`, never hand-written interfaces. Show errors by translating `error.code`, never by printing the server's message.
- **Mocks:** declare handlers with `on.get/post/put/patch` and answer errors with `fail(status, code)` from `src/mocks/contract.ts`, so every mock is checked against the contract.
- **Design:** dense, scannable layouts (tables and lists for records), flat surfaces, hairline borders, Lucide icons, specific copy. Every screen has empty, loading, error and success states. Clients use phones: one column, touch targets of at least 44 px. See `../workspace/docs/design/brand.md`.
- **Accessibility:** labels on every control, visible focus, contrast of at least 4.5:1, keyboard navigation.
- Reuse components before creating new ones. Keep files small; one component per file.
- Add or update a test with every behaviour change.

## Brand

Use `Logo` for the full lockup and `Mark` for the icon alone. The mark is the supplied PNG; the wordmark is an SVG component whose letters follow the theme. Do not redraw or recolor the mark.
