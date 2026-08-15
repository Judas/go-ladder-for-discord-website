import fixtures from './houses.json';

/**
 * House fixtures — **captured**, like `api.json`, from a local fulguro-server on 15 August 2026.
 *
 * Getting a populated response meant seeding fg_dev, which is a snapshot of production and is **not anonymised**. So
 * every player in here is synthetic: ids in the `9000000000000000xx` range, which no Discord snowflake occupies, and
 * invented names. No real member data reached this file. `doc/seed-houses-dev.sql` is the seed, and it was rolled
 * back afterwards — the `empty` payload below is the database as it was found, captured after the cleanup.
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
