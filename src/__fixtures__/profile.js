import fixtures from './profile.json';

/**
 * Profile fixtures for the house and league blocks of `GET /api/player/{id}`, captured on 17 August 2026 from a
 * local fulguro-server with `doc/seed-houses-dev.sql` and `doc/seed-league-dev.sql` applied.
 *
 * The player is synthetic (`900000000000000001`), so no real member data reaches this repository — fg_dev is a
 * snapshot of production and is not anonymised.
 *
 * Captured as served: the `house` block (rank 1 of Fils du Froid, 25 points broken down over the seven columns) and
 * the `league` block (rank 1, four matches, renown 18, and one of those matches `unplayed`).
 *
 * ⚠ Two things are **derived**, because the capture cannot hold them:
 *
 * - `tierRank` and `rating`. A synthetic player has never played a ranked game, so the server answers `tierRank: 0`
 *   and `rating: 0`. The ranked variants below are set to tier 5 and 1720, which sits inside Maître's 1600–1800.
 *   `unranked` is the capture untouched, and it is the honest "non classé" case.
 * - `withHouseOnly` and `withoutHouse`, made by nulling the blocks. Every synthetic house member was also put in the
 *   league, so no captured profile holds one without the other.
 */

/** In a house and in the league. */
export const withHouseAndLeague = fixtures.withHouseAndLeague;

/** In a house, not in the league — the state the league CTA is for. */
export const withHouseOnly = fixtures.withHouseOnly;

/** In neither, which is what the house CTA is for and what makes the league section refuse. */
export const withoutHouse = fixtures.withoutHouse;

/** Never played a ranked game: tierRank 0, rating 0. */
export const unranked = fixtures.unranked;

/** `GET /api/tiers` — the eight tiers with their bounds. */
export const tiers = fixtures.tiers;
