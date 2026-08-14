# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Frontend of the GOLD project (GO Ladder for Discord) — a Go/baduk ranking ladder for a Discord community (FulguroGo). Create React App (react-scripts 5), React 18, react-router-dom 6, no TypeScript. Yarn is the package manager (`packageManager` pinned to yarn 1.22.22, Node >= 20).

The UI is in **French**. All user-facing strings, labels and error messages are written in French — keep it that way when adding screens.

## Never push to master

`master` is auto-built and deployed to production by Render. **Never push to `master`.** Always work on a branch and open a PR. This applies to the backend repo too.

## Commands

```bash
yarn devstart        # dev: CRA dev server (:3000) + API proxy (:8080) via concurrently
yarn devreact        # CRA dev server alone
yarn devapiproxy     # API proxy alone (server-proxy-only.js, targets 127.0.0.1:4567)
yarn build           # production build into build/
yarn start           # production: express serves build/ + proxies /api (server.js)
yarn test            # CRA/Jest watch mode
yarn test --watchAll=false -t "name"   # single test by name
```

No test files exist yet; testing-library is installed but unused. There is no lint script — ESLint runs through react-scripts (`react-app` config) during dev/build.

Docker: `docker compose -f docker-compose.dev.yml up` runs the dev target (port 3000, `./src` bind-mounted). `Dockerfile` builds the production image (port 8080).

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
- `server-proxy-only.js` (dev, `yarn devapiproxy`) — proxy only, targets `http://127.0.0.1:4567`, i.e. a backend running locally. CRA's `"proxy": "http://localhost:8080"` in package.json sends the dev server's `/api` calls to it.

So local development against real data requires the GOLD backend running on port 4567.

Endpoints in use: `/api/players`, `/api/player/:discordId`, `/api/tiers`, `/api/games`, `/api/game/:goldId`, `/api/accounts`, `/api/link` (POST), `/api/auth` (POST), `/api/auth/profile?goldId=`.

A 404 on one of these usually means the proxy rewrite, not a missing route — compare against `ApiModule.kt`.

## Auth model

Discord OAuth, orchestrated in `src/AuthProfile.js` and entirely localStorage-based — there is no auth context, no token in headers:

1. `authenticateUser()` is called once at boot from `src/index.js`. It generates a `gold_uuid` (crypto.randomUUID) in localStorage if absent, then fetches `/api/auth/profile?goldId=` and caches the result under `user_profile`.
2. The Discord login link is `process.env.REACT_APP_DISCORD_AUTH_URL` (different client id / redirect per env — see `.env.development` and `.env.production`, both committed).
3. Discord redirects to `/auth/discord`; `Pages/DiscordAuth.jsx` POSTs `{code, goldId}` to `/api/auth`, then re-runs `authenticateUser(true)`.
4. Components check auth synchronously with `hasValidProfile()` / `getProfile()` — no hooks, no re-render on login. `fetchUserProfile` finishes with `window.location.replace(...)`, which is what makes the header update.

`user_profile` is considered expired past its `expirationDate` field.

## Code conventions

**Fetch-and-status pattern.** Every page owns its data. The idiom, repeated in all pages, is a `useState` for the payload plus a `xFetchStatus` string state cycling `'pending' | 'success' | 'error'`, filled by a `useEffect` with `fetch(...)` → `if (!res.ok) throw res.statusText` → `.json()` → set both states → `.catch(() => setStatus('error'))`. Rendering branches on that status and shows `<Loader/>` while pending. Follow this rather than introducing a data-fetching library.

**Tables are ARIA divs, not `<table>`.** `src/Components/Table/` wraps `role="table" | "rowgroup" | "row" | "columnheader" | "gridcell"` divs so CSS grid can lay them out. `RowElement` often contains a bare `<Link>`/`<a>` as its last child — CSS stretches it to make the whole row clickable. Screen-reader-only headers use the `ReaderOnly` class.

**Styling.** Plain CSS, one file per component/page, imported from the JSX (`import './PlayerList.css'`). Design tokens live in `:root` in `src/Common.css`, which also holds the shared primitives: `Card` / `CardHighlighted` / `CardHeader` / `CardContent`, `Error` / `Success` / `Info`, `Container`, `FlexContainer`, `ReaderOnly`. Class names are BEM-ish (`PlayerProfile__TierShield`). Reuse the Common.css primitives before writing new styles.

**Components** are function components with default exports and destructured props; `Pages/AccountLink.jsx` still contains one legacy class component. Files use `.jsx` except `AuthProfile.js` / `index.js`.

## Domain concepts

- **Tier / division**: a player has `tierRank` + `tierName`. Shields are static SVGs at `public/shields/shield-{tierRank}.svg`, referenced via `${process.env.PUBLIC_URL}/shields/...`. `/api/tiers` returns `{rank, name, min, max}` used to draw the rating progress bar.
- **FGC validation**: a player is "valid" when `totalRankedGames >= 4 && goldRankedGames >= 2`. This predicate is duplicated in `PlayerList.jsx` (`isValid`) and `PlayerProfile.jsx` (`Stability`) — change both together. A GOLD game is one played between two ladder members; the full validity rules are spelled out in the `Tooltip` of `PlayerProfile.jsx`.
- **Game replay**: SGF records are rendered by **WGo.js**, a non-npm vendored library in `public/wgo/` loaded via `<script>` tags in `public/index.html`. It is reached through the `window.WGo` global — `Components/WGOPlayer.jsx` is the only place that touches it, instantiating `new window.WGo.BasicPlayer(el, {sgf, layout, move})` in a `useEffect` on a ref. It also defines the responsive layout switch (mobile ≤980px vs. two-column desktop). Do not npm-install wgo; edit the vendored files or the wrapper.

## Deployment

Render auto-builds and deploys `master` from the production Dockerfile to `https://fulguro-gold.onrender.com`. A merge into `master` *is* a production release — see "Never push to master" above.

`gh-pages` deploy scripts remain in package.json but are unused (`homepage` is empty and the app needs the express proxy).
