# INSTIWISE frontend

React + TypeScript + Vite + Tailwind CSS. Dark mode and English/Swahili from the start.

```bash
cp .env.example .env
npm install
npm run dev          # http://localhost:5173, talks to the backend
npm run dev:mock     # same, with the mock backend (no backend needed)
```

The dev server forwards `/api` to the backend at `http://localhost:3000`. Without a backend the yellow development toolbar shows "API not reachable", which is expected. The same toolbar has the mock role switcher (CLIENT, OPERATOR, ADMIN, signed out); it exists in development builds and in the demo (see below), never in a real production build. To work with fake data instead, run `npm run dev:mock`: every `/api` call is answered by the MSW handlers in `src/mocks` (demo accounts and invitation codes are listed on the sign-in and invitation pages). Plain `npm run dev` without a backend shows "The INSTIWISE server is not answering" on screens that load data, and `http proxy error ... ECONNREFUSED` in the terminal.

## Deploying a demo to Netlify

A public demo runs entirely in the browser on the mock API, so anyone can open it on a phone without a backend. `netlify.toml` already sets the build (`npm run build`, publish `dist`, Node 22) and the single-page-app rewrite, so deep links and reloads work.

1. In Netlify, open **Site configuration > Environment variables** and add `VITE_USE_MOCKS` with the value `true`.
2. **Deploys > Trigger deploy > Deploy site.** Vite reads the variable at build time, so every change to it needs a new deploy.

The demo shows a "Demo data" banner, lists the demo accounts on the sign-in page, remembers the session across reloads and has the role switcher. Its data is fictional, lives in each visitor's own tab, and resets on refresh.

**Switching to the real API later:** set `VITE_USE_MOCKS` to `false` (or delete it) and add the `/api/*` proxy rule that is commented out in `netlify.toml`, pointing at the backend, then redeploy. A proxy keeps one origin, so the httpOnly refresh cookie works and no CORS setup is needed. A build without the flag contains none of the demo code or data.

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
