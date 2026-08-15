/**
 * House fixtures.
 *
 * ⚠ Unlike `api.json`, these are **not** a straight capture, and the difference matters when reading a passing test:
 *
 * - The envelope and the empty figures **were** observed on a local fulguro-server on 14 August 2026:
 *   `period: 'VACATION'`, `season: '2025-2026'`, four houses in this order, each with `memberCount: 0`,
 *   `totalPoints: 0`, `leader: null`.
 * - The RP fields — slug, name, tagline, colour, description — are copied from the server's own seed,
 *   `fulguro-server/doc/migration maisons.sql`, which is what the API reads them from.
 * - `populated` is **hand-built** to the shape of `ApiHouses` / `ApiHouse` / `ApiHouseMember` / `ApiHousePoints`.
 *   Nobody has joined a house on the test database yet, so no populated response has ever been seen. Re-verify it
 *   against a real one before trusting a test that depends on it.
 */

const FILS_DU_FROID = {
    slug: 'FILS_DU_FROID',
    name: 'Fils du Froid',
    tagline: 'Le meilleur coup est celui qui brise.',
    color: '#740001',
    description: 'Nés sous les vents du nord, les membres des Fils du Froid embrassent le feu du combat.',
};

const LUNAIRES_AETHER = {
    slug: 'LUNAIRES_AETHER',
    name: 'Lunaires d’Æther',
    tagline: 'Pourquoi jouer comme hier ?',
    color: '#B85209',
    description: 'Curieux, imprévisibles, parfois déconcertants, les Lunaires d’Æther refusent la voie tracée.',
};

const NEXUS_ALPHA = {
    slug: 'NEXUS_ALPHA',
    name: 'Nexus Alpha',
    tagline: 'Chaque coup est une équation.',
    color: '#0E1A40',
    description: 'Nexus Alpha analyse, anticipe, optimise.',
};

const SABRE_SILENCIEUX = {
    slug: 'SABRE_SILENCIEUX',
    name: 'Sabre Silencieux',
    tagline: 'Un coup, un destin !',
    color: '#1A472A',
    description: 'Fidèles au bushido, les membres du Sabre Silencieux considèrent le Go comme un art martial spirituel.',
};

const empty = house => ({ ...house, memberCount: 0, totalPoints: 0, leader: null });

/** The seven scoring columns plus the total the server computes. */
export const points = (over = {}) => {
    const columns = {
        played: 4, goldOpponent: 2, rivalHouse: 2, longGame: 0, victory: 4, evenGame: 1, ranked: 3,
        ...over,
    };
    return { ...columns, total: Object.values(columns).reduce((sum, n) => sum + n, 0) };
};

const member = (discordId, discordName, rank, pts) => ({
    discordId,
    discordName,
    discordAvatar: `https://cdn.discordapp.com/avatars/${discordId}/abc.png`,
    rank,
    points: pts,
});

/** What the route answers today: the season is over, nobody has joined. */
export const housesEmpty = {
    period: 'VACATION',
    season: '2025-2026',
    houses: [empty(FILS_DU_FROID), empty(LUNAIRES_AETHER), empty(NEXUS_ALPHA), empty(SABRE_SILENCIEUX)],
};

/**
 * A season under way. Deliberately awkward in three ways, because each is a case the page has to get right:
 *
 * - the two middle houses are **tied** on 40 points, which is why the API attaches no rank and the page prints none;
 * - Sabre Silencieux has points but **no member and no leader** — the total sums the register, so it keeps what
 *   players who have since left scored;
 * - Nexus Alpha's leader has **no Discord name**, both name and avatar being nullable on ApiHouseMember.
 */
export const housesPopulated = {
    period: 'SEASON',
    season: '2026-2027',
    houses: [
        { ...FILS_DU_FROID, memberCount: 3, totalPoints: 71, leader: member('111', 'Alice', 1, points({ victory: 8 })) },
        { ...LUNAIRES_AETHER, memberCount: 2, totalPoints: 40, leader: member('222', 'Bob', 1, points()) },
        { ...NEXUS_ALPHA, memberCount: 2, totalPoints: 40, leader: { ...member('333', null, 1, points()), discordAvatar: null } },
        { ...SABRE_SILENCIEUX, memberCount: 0, totalPoints: 12, leader: null },
    ],
};
