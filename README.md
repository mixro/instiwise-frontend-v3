# INSTIWISE frontend

React + TypeScript + Vite + Tailwind CSS. Dark mode and English/Swahili from the start.

```bash
cp .env.example .env
npm install
npm run dev          # http://localhost:5173
```

The dev server forwards `/api` to the backend at `http://localhost:3000`. Without a backend the starter page shows "API not reachable", which is expected. To work with fake data instead, run `npm run msw:init` once, then set `VITE_USE_MOCKS=true` in `.env`.

## Before you push

```bash
npm run verify       # lint + format check + type check + tests + build
```

Git hooks (installed by `npm install`): `pre-commit` formats and lints staged files; `pre-push` runs `npm run verify`.

## What is included

| Area                                                 | Where                                                   |
| ---------------------------------------------------- | ------------------------------------------------------- |
| Design tokens, light and dark                        | `src/styles/tokens.css`                                 |
| Theme switch (light, dark, system), no flash on load | `src/components/ThemeProvider.tsx`, `index.html`        |
| English and Swahili                                  | `src/i18n/`                                             |
| Logo (PNG mark + SVG wordmark), favicons             | `src/components/brand/`, `src/assets/brand/`, `public/` |
| API client and MSW mocks                             | `src/lib/api.ts`, `src/mocks/`                          |
| Money and date formatting (TZS, Dar es Salaam time)  | `src/lib/format.ts`                                     |
| Docker image (nginx, SPA fallback, `/api` proxy)     | `Dockerfile`, `nginx.conf`                              |

## Production image

```bash
docker build -t instiwise-frontend .
```

nginx serves the built site and forwards `/api/` to a container named `backend` on port 3000.

## Logo notes

The icon is used as the supplied PNG. The wordmark is drawn as SVG shapes and is an approximation of the Tw Cen MT lettering; see the comment at the top of `src/components/brand/Wordmark.tsx` for how to swap in an exact, outlined version exported from Illustrator.
