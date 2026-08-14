# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Frontend of the GOLD project (GO Ladder for Discord) — a Go/baduk ranking ladder for a Discord community (FulguroGo). Vite 8, React 19, react-router-dom 7, no TypeScript. Yarn Classic is the package manager (`packageManager` pinned to yarn 1.22.22, Node >= 22.12 — Vite 8's floor).

The UI is in **French**. All user-facing strings, labels and error messages are written in French — keep it that way when adding screens.

## Never push to master

`master` is auto-built and deployed to production by Render. **Never push to `master`.** Always work on a branch and open a PR. This applies to the backend repo too.

## Commands

```bash
yarn devstart        # dev: Vite (:3000) + API proxy (:8080) via concurrently
yarn devreact        # Vite dev server alone
yarn devapiproxy     # API proxy alone (server-proxy-only.js, targets 127.0.0.1:4567)
yarn build           # production build into build/
yarn start           # production: express serves build/ + proxies /api (server.js)
yarn preview         # serve the built output without the Express layer
yarn lint            # eslint (flat config, eslint.config.mjs)
yarn test            # vitest watch mode
yarn test --run                    # single pass
yarn test --run -t "name"          # one test by name
```

Vite writes to `build/`, not `dist/` — `build.outDir` is set so that `server.js` and the Dockerfile keep working unchanged.

`yarn lint` passes with **0 errors and ~21 warnings**. The warnings are deliberate: `eqeqeq` and `react-hooks/set-state-in-effect` are the existing pages' idiom, downgraded in `eslint.config.mjs` rather than silenced. Don't "fix" them file by file — the second disappears when pages move to the planned `useApi` hook.

Docker: `docker compose -f docker-compose.dev.yml up` runs the dev target (port 3000, `./src` and `index.html` bind-mounted). `Dockerfile` builds the production image (port 8080). Both images are `node:22-alpine`.

### Tests

Vitest + jsdom + Testing Library. Two conventions worth keeping:

- **Fixtures are captured, not written.** `src/__fixtures__/api.json` comes from a running backend. When you need a new shape, capture it from `fulguro-server` rather than inventing one — an invented payload makes the test pass and the site break.
- **`console.error` is a failure.** `expectNoConsoleErrors` in `src/testUtils.jsx` wraps a render and fails on any React warning, which is how missing list keys and invalid DOM attributes surface. Use it on every new page. `stubApi()` and `renderAt()` in the same file cover the fetch stubbing and the router wrapper.

`src/setupTests.js` does two non-obvious things. It stubs `window.WGo`, which index.html provides and jsdom cannot. And it redefines `globalThis.localStorage`. Node 24+ ships its own `localStorage` global that is undefined without `--localstorage-file`, and under Vitest the jsdom window *is* globalThis, so that accessor shadows jsdom's storage — `localStorage` and `window.localStorage` both come back undefined. `src/AuthProfile.js` touches a bare `localStorage` on every page load, so without the shim the app throws on render in tests only.

## Backend

The API lives in a separate repo, **fulguro-server** (`git@github.com:Judas/fulguro-server.git`), checked out locally at `/Users/julestrehorel/Workspace/gold/fulguro-server`. Kotlin + Javalin + Gradle, split into modules (`api`, `gold`, `league`, `house`, `discord`, `fgc`, `kgs`, `ogs`, `common`, …). It has its own CLAUDE.md — read it before touching backend code.

Useful landmarks when a frontend question is really an API question:

- `modules/api/.../ApiModule.kt` — the full route table (`get("/gold/api/players", …)` etc.). Source of truth for which endpoints exist.
- `modules/api/.../Api.kt` — the handlers.
- `modules/api/.../db/model/Api*.kt` — the JSON payload shapes (`ApiPlayer`, `ApiGame`, `ApiGoldTier`, `ApiProfile`, `LinkRequestBody`, …). Check these instead of guessing a response field.

The backend listens on the port set by the `gold.api.port` config key; the frontend dev proxy assumes **4567**.

It exposes more than this site consumes today — notably `/gold/api/houses*` and `/gold/api/league*`.

## The /api proxy

The frontend never talks to the backend directly. Every component calls relative paths like `/api/players`, and an express proxy rewrites `^/api` → `/gold/api` on the GOLD backend:

- `server.js` (production, `yarn start`) — proxies to the deployed backend, then serves `build/` and falls back to `index.html` for client-side routes.
- `server-proxy-only.js` (dev, `yarn devapiproxy`) — proxy only, targets `http://127.0.0.1:4567`, i.e. a backend running locally. `server.proxy` in `vite.config.mjs` sends the dev server's `/api` calls to it.

So local development against real data requires the GOLD backend running on port 4567.

⚠ Two traps in these two files, both already paid for:

- The proxy is selected with `pathFilter: '/api'`, **not** mounted as `app.use('/api', proxy)`. Since http-proxy-middleware 3, mounting strips the prefix before the middleware sees the URL, so the `^/api` → `/gold/api` rewrite silently stops matching and every call reaches the backend as `/api/...` → 404 on everything, with a server that starts fine.
- The SPA fallback is `app.get('/*splat')`. Express 5 (path-to-regexp 8) throws at startup on a bare `'/*'`.

Endpoints in use: `/api/players`, `/api/player/:discordId`, `/api/tiers`, `/api/games`, `/api/game/:goldId`, `/api/accounts`, `/api/link` (POST), `/api/auth` (POST), `/api/auth/profile?goldId=`.

A 404 on one of these usually means the proxy rewrite, not a missing route — compare against `ApiModule.kt`.

## Auth model

Discord OAuth, orchestrated in `src/AuthProfile.js` and entirely localStorage-based — there is no auth context, no token in headers:

1. `authenticateUser()` is called once at boot from `src/main.jsx`. It generates a `gold_uuid` (crypto.randomUUID) in localStorage if absent, then fetches `/api/auth/profile?goldId=` and caches the result under `user_profile`.
2. The Discord login link is `import.meta.env.VITE_DISCORD_AUTH_URL` (different client id / redirect per env — see `.env.development` and `.env.production`, both committed).
3. Discord redirects to `/auth/discord`; `Pages/DiscordAuth.jsx` POSTs `{code, goldId}` to `/api/auth`, then re-runs `authenticateUser(true)`.
4. Components check auth synchronously with `hasValidProfile()` / `getProfile()` — no hooks, no re-render on login. `fetchUserProfile` finishes with `window.location.replace(...)`, which is what makes the header update.

`user_profile` is considered expired past its `expirationDate` field.

## Code conventions

**Fetch-and-status pattern.** Every page owns its data. The idiom, repeated in all pages, is a `useState` for the payload plus a `xFetchStatus` string state cycling `'pending' | 'success' | 'error'`, filled by a `useEffect` with `fetch(...)` → `if (!res.ok) throw res.statusText` → `.json()` → set both states → `.catch(() => setStatus('error'))`. Rendering branches on that status and shows `<Loader/>` while pending. Follow this rather than introducing a data-fetching library.

**Tables are ARIA divs, not `<table>`.** `src/Components/Table/` wraps `role="table" | "rowgroup" | "row" | "columnheader" | "gridcell"` divs so CSS grid can lay them out. `RowElement` often contains a bare `<Link>`/`<a>` as its last child — CSS stretches it to make the whole row clickable. Screen-reader-only headers use the `ReaderOnly` class.

**Styling.** Plain CSS, one file per component/page, imported from the JSX (`import './PlayerList.css'`). Design tokens live in `:root` in `src/Common.css`, which also holds the shared primitives: `Card` / `CardHighlighted` / `CardHeader` / `CardContent`, `Error` / `Success` / `Info`, `Container`, `FlexContainer`, `ReaderOnly`. Class names are BEM-ish (`PlayerProfile__TierShield`). Reuse the Common.css primitives before writing new styles.

**Components** are function components with default exports and destructured props; `Pages/AccountLink.jsx` still contains one legacy class component. Files use `.jsx` except `AuthProfile.js` / `setupTests.js` — anything containing JSX must be `.jsx`, esbuild will not parse it out of a `.js`.

## Domain concepts

- **Tier / division**: a player has `tierRank` + `tierName`. Shields are static SVGs at `public/shields/shield-{tierRank}.svg`, referenced by absolute path (`/shields/...`) — Vite serves `public/` at the root. `/api/tiers` returns `{rank, name, min, max}` used to draw the rating progress bar.
- **FGC validation**: a player is "valid" when `totalRankedGames >= 4 && goldRankedGames >= 2`. This predicate is duplicated in `PlayerList.jsx` (`isValid`) and `PlayerProfile.jsx` (`Stability`) — change both together. A GOLD game is one played between two ladder members; the full validity rules are spelled out in the `Tooltip` of `PlayerProfile.jsx`.
- **Game replay**: SGF records are rendered by **WGo.js**, a non-npm vendored library in `public/wgo/` loaded via classic `<script>` tags in the root `index.html` (never bundled — Vite hoists the entry module to `<head>`, where being deferred means it still runs after `window.WGo` exists). It is reached through the `window.WGo` global — `Components/WGOPlayer.jsx` is the only place that touches it, instantiating `new window.WGo.BasicPlayer(el, {sgf, layout, move})` in a `useEffect` on a ref. It also defines the responsive layout switch (mobile ≤980px vs. two-column desktop). Do not npm-install wgo; edit the vendored files or the wrapper.

## Deployment

Render auto-builds and deploys `master` from the production Dockerfile to `https://fulguro-gold.onrender.com`. A merge into `master` *is* a production release — see "Never push to master" above.

## Current work

`doc/plan-9.1.md` is the plan for catching up with the backend's 9.1 features (houses, league, health), in seven iterations. Read it before starting anything in that area — it records the contract constraints the server imposes and the decisions already taken. Iterations 1 and 2 are done.

`doc/audit-9.1.md` is the state of the existing pages: what was fixed, what was left open and why, and a checklist of what still needs verifying in a real browser.
