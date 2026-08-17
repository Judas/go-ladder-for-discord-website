import { describe, expect, it } from 'vitest';

import { FGC_RULES, isFgcValid } from './fgc.js';

const player = (totalRankedGames, goldRankedGames) => ({ totalRankedGames, goldRankedGames });

/**
 * The thresholds live only here — the server counts the games but applies no threshold and exposes no boolean, so
 * nothing else would catch these drifting.
 */
describe('FGC validity', () => {
    it('states the two counts and what each is worth', () => {
        expect(FGC_RULES.map(rule => [rule.key, rule.threshold])).toEqual([
            ['totalRankedGames', 4],
            ['goldRankedGames', 2],
        ]);
    });

    it('needs both counts, not either', () => {
        expect(isFgcValid(player(4, 2))).toBe(true);
        expect(isFgcValid(player(9, 9))).toBe(true);

        // Each alone is not enough — the bug a `||` would introduce, and one nothing else would notice.
        expect(isFgcValid(player(9, 1))).toBe(false);
        expect(isFgcValid(player(3, 9))).toBe(false);
        expect(isFgcValid(player(0, 0))).toBe(false);
    });

    it('takes the threshold as met, not exceeded', () => {
        expect(isFgcValid(player(4, 2))).toBe(true);
        expect(isFgcValid(player(3, 2))).toBe(false);
        expect(isFgcValid(player(4, 1))).toBe(false);
    });
});
