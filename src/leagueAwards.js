/**
 * What an administrator can rule each side of a league match gets — the four values of the server's `LeagueAward`,
 * in the order the ruling dialog offers them.
 *
 * The points are the server's scale (2 per match played, 5 more per win) and the bonus note is the perfect-attendance
 * rule: a session counts towards it when it was played or exempted. Written here only to be *explained* — the standings
 * the site shows come from the server, which counts the awards itself.
 */
export const AWARDS = [
    { value: 'FORFEIT', label: 'Forfait', points: '0 pt', bonus: 'perd le bonus' },
    { value: 'EXEMPT', label: 'Exempté', points: '0 pt', bonus: 'garde le bonus' },
    { value: 'PARTICIPANT', label: 'Participant', points: '2 pts', bonus: 'garde le bonus' },
    { value: 'WINNER', label: 'Vainqueur', points: '7 pts', bonus: 'garde le bonus' },
];

/** The French label of an award, or the raw value for one this list does not know. */
export function awardLabel(value) {
    return AWARDS.find(award => award.value === value)?.label ?? value;
}
