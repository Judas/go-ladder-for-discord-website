import fixtures from './league.json';

/**
 * League fixtures, captured from a local fulguro-server on 17 August 2026 after running
 * `doc/seed-league-dev.sql` — which itself needs the house seed, a league member having to be in a house.
 *
 * Every player is synthetic (`9000000000000000xx`); fg_dev is a snapshot of production and is not anonymised.
 *
 * The seed is built around the cases the pages have to get right, and the capture confirms the server answers each:
 *
 * - **`result` has three states.** Session 1 holds a real `black`, a real `white` and one `unplayed` — a match the
 *   settlement closed without it being played. Session 4 holds `null`, which means "still to play". Reading the
 *   first as the second would turn a forfeit into a fixture.
 * - **`winnerDiscordId` is computed by the server** and is null whenever nobody won, including on `unplayed`.
 * - **Exemptions.** Sessions 3 and 4 each leave one player over, reason `ODD`.
 * - **A drawn session and an undrawn one differ.** Session 5 has no row at all: `drawn: false`, no match, no
 *   exemption — which is not the same as session 3, drawn with somebody left over.
 * - **Inactive members stay in the standings** with their renown: Test Nebuleuse left after session 2, Test Frimas
 *   never played a match at all.
 * - **A tie at the top.** Test Boreale and Test Croissant are both on 16 and both come back `rank: 1`.
 * - ⚠ **No invite link anywhere.** `black_invite` and `white_invite` never leave the server; only `spectatorLink`
 *   does. The capture was checked for it.
 *
 * `currentSession` is null: the capture was taken in August, outside the season, and no seeding can change that —
 * the period and the running session are read off the clock, never the database. `doc/seed-league-states-dev.sql`
 * documents the two config keys that move them, and why only one of the two is safe to set.
 *
 * ⚠ These fixtures are **not** refreshed from the database as it now stands. That seed added sixteen real members
 * for volume, and fg_dev is not anonymised: recapturing would pull real Discord names and ids into this repository.
 * The seven players here stay synthetic on purpose, and they still cover every case listed above.
 */

/** `GET /api/league`. */
export const league = fixtures.league;

/** `GET /api/league/session/{number}`, one per case. */
export const sessionSettled = fixtures.session.settled;
export const sessionExempted = fixtures.session.exempted;
export const sessionRunning = fixtures.session.running;
export const sessionUndrawn = fixtures.session.undrawn;
