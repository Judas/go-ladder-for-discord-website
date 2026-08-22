## graphify

## Project guidance

Read `CLAUDE.md` as the detailed source of truth for this repository. The key rules are:

- This is the French-language React/Vite frontend. Use Yarn Classic with Node >= 22.12. Main commands are `yarn devstart`, `yarn build`, `yarn lint`, and `yarn test --run`.
- Never push to `master`: Render deploys `master` to production. Work on a branch and open a PR; this also applies when changing the backend repository.
- Vite outputs to `build/`, not `dist/`. Keep the existing Docker and Express proxy behavior intact; do not replace the `/api` path-filter rewrite or the Express 5 SPA fallback.
- Every GET request goes through `src/hooks/useApi.js`; do not introduce a data-fetching library or hand-roll component fetches. Preserve the pending/success/error status pattern and use the shared CSS primitives from `src/Common.css`.
- Keep all user-facing strings and error messages in French. JSX files use `.jsx`; keep the vendored WGo.js integration in `public/wgo/` and do not install WGo from npm.
- Fixtures must come from the backend where possible. Never commit real member data: `fg_dev` is not anonymised, so use synthetic IDs such as `9000000000000xxx` and check avatar URLs too. Use `expectNoConsoleErrors` for new rendered-page tests.
- The backend is the sibling `fulguro-server` repository. Read its `CLAUDE.md` before backend work, verify local runs use `fg_dev`, and consult `modules/api/.../ApiModule.kt` and the API models instead of guessing endpoint shapes.
- Read `doc/plan-9.1.md` before work on houses, league, or health features, and consult `doc/audit-9.1.md` for remaining frontend verification work.

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
