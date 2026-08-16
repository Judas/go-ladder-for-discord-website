import fixtures from './houses.json';

/**
 * House fixtures, captured from a local fulguro-server. Last refreshed 16 August 2026, after the house colours
 * changed in the database — Fils du Froid to #aa0001 and Nexus Alpha to the near-white #7dfffc, both now matching
 * the crests in `public/crests/`.
 *
 * Getting a populated response meant seeding fg_dev, which is a snapshot of production and is **not anonymised**. So
 * every player in here is synthetic: ids in the `9000000000000000xx` range, which no Discord snowflake occupies, and
 * invented names. No real member data reached this file. `doc/seed-houses-dev.sql` is the seed.
 *
 * ⚠ `populated` and `detail` are captures. `empty` and `detailEmpty` are **derived** from them — the same payload
 * with the figures zeroed and the leaders nulled. The 15 August versions were true captures taken after a cleanup;
 * this refresh could not repeat that, the seed being in place and its removal being the maintainer's call. They are
 * only used for "nobody has joined yet" assertions, where the zeroes are the whole point, but do not read a passing
 * test on them as proof that the server answers exactly this.
 *
 * The seed is shaped around the four cases the pages have to get right, and the capture confirms the server answers
 * each of them as the plan said it would:
 *
 * - **A tie between houses.** Lunaires d'Æther and Nexus Alpha both total 35, which is why `ApiHouses` attaches no
 *   rank and why the page prints no podium number.
 * - **A tie inside a house.** Nexus Alpha's two members are both on 17 and both come back `rank: 1` — competition
 *   ranks, so the page prints the field and never counts rows.
 * - **A member on zero points.** Test Frimas is `rank: 3, total: 0` and is in the ranking, not omitted.
 * - **Points without a member.** Sabre Silencieux totals 12 with `memberCount: 0` and `leader: null`: the register
 *   keeps what a player who has since left scored, so the two figures are independent.
 */

/** `GET /api/houses` with a season under way. */
export const housesPopulated = fixtures.populated;

/** `GET /api/houses` as the database stands with nobody in a house. */
export const housesEmpty = fixtures.empty;

/** `GET /api/house/{slug}`, keyed by slug. */
export const houseDetail = fixtures.detail;

/** `GET /api/house/SABRE_SILENCIEUX` with no member and no points. */
export const houseDetailEmpty = fixtures.detailEmpty;
