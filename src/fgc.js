/**
 * FGC validation: how many ranked games a player needs before their rating is considered settled.
 *
 * ⚠ These two numbers live **only here**. The server counts the games — `total_ranked_games` and
 * `gold_ranked_games`, filled by FgcService — but never applies a threshold to them and exposes no boolean, so the
 * rule is the site's own. It used to be written out twice, in the player list and on the profile, which is one copy
 * too many for a rule nobody would think to change in two places.
 *
 * What each count means, and why they are not the same number: a *ranked* game is one that passes the validity
 * rules the profile's tooltip spells out — ranked, played on OGS or KGS, under 30 days old, 19×19, no handicap,
 * komi between 6 and 9. A *GOLD* game is one of those played between two players registered on the ladder, which is
 * a stricter thing and therefore a lower bar.
 */
export const FGC_RULES = [
    { key: 'totalRankedGames', threshold: 4, gold: false },
    { key: 'goldRankedGames', threshold: 2, gold: true },
];

/** Whether a player meets every FGC condition. */
export function isFgcValid(player) {
    return FGC_RULES.every(rule => player[rule.key] >= rule.threshold);
}
