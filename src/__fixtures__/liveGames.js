import fixtures from './liveGames.json';

/**
 * `GET /api/games/live` fixtures. ⚠ **Hand-built, not captured.**
 *
 * A live game only exists while someone is playing on OGS: it cannot be seeded on fg_dev, and a capture from
 * production would carry real members. So this follows fulguro-server's `modules/api/.../db/model/ApiLiveGame.kt`
 * field for field instead, with synthetic players (`9000000000000xxx` ids, invented names, Discord's
 * `/embed/avatars/N.png` placeholders) and made-up OGS ids. Replace with a capture if one ever becomes possible.
 *
 * `populated` is shaped around what the page has to get right: a game between two members (`gold: true`), an
 * outsider on either colour, an outsider OGS gives no name or rank for, a member with no tier yet, a member with no
 * avatar, long names on both sides, and every optional game field (`name`, `handicap`, `ranked`, `moveNumber`) null
 * at least once.
 *
 * It is also what `yarn devapiproxy:mock` serves, to see the page in a browser when nobody is playing.
 */
export const liveGames = fixtures.populated;

/** Nobody is playing: the list is fresh and empty, which is not the 503 of a stale one. */
export const liveGamesEmpty = fixtures.empty;
