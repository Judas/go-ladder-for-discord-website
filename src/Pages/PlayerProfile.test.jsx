import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PlayerProfile from './PlayerProfile.jsx';
import { tiers, unranked, withHouseAndLeague, withHouseOnly, withoutHouse } from '../__fixtures__/profile.js';
import { expectNoConsoleErrors, renderAt, stubApi } from '../testUtils.jsx';

/**
 * The period is not on the profile — it rides on the `house` and `league` blocks, and both are null exactly when
 * the join buttons are needed — so the page reads it off /api/houses. That stub is not optional here.
 */
const render = (profile, { period = 'VACATION', ...overrides } = {}) => {
    const fetchStub = stubApi({
        '/api/player/': profile,
        '/api/tiers': tiers,
        '/api/houses': { period, season: '2025-2026', houses: [] },
        '/api/house/join': {},
        '/api/league/join': {},
        ...overrides,
    });
    renderAt(<PlayerProfile />, { path: `/player/${profile.discordId}`, route: '/player/:playerId' });
    return fetchStub;
};

/** Signs the visitor in as `discordId`, the way AuthProfile stores it. */
const signInAs = discordId => {
    localStorage.setItem('user_profile', JSON.stringify({
        discordId,
        name: 'Moi',
        avatar: '',
        expirationDate: '2099-01-01T00:00:00Z',
    }));
};

const sectionNamed = name => screen.getByText(name).closest('.Card');

describe('PlayerProfile', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
    });

    describe('rank', () => {
        /** Two tiers either side of the player's own, and nothing else of the ladder. */
        it('shows the player\'s tier with two neighbours either side, and warns about nothing', async () => {
            await expectNoConsoleErrors(async () => {
                render(withHouseAndLeague);
                await screen.findByText(withHouseAndLeague.tierName);
            });

            const current = withHouseAndLeague.tierRank;
            const shown = tiers.filter(t => Math.abs(t.rank - current) <= 2);
            const hidden = tiers.filter(t => Math.abs(t.rank - current) > 2);
            expect(shown.length, 'the fixture player should sit away from both ends').toBe(5);
            expect(hidden.length).toBeGreaterThan(0);

            for (const tier of shown) { expect(screen.getByAltText(tier.name)).toBeInTheDocument(); }
            for (const tier of hidden) { expect(screen.queryByAltText(tier.name)).not.toBeInTheDocument(); }
            expect(screen.getByText('(palier actuel)')).toBeInTheDocument();
        });

        /** At the top of the ladder there is nothing above, so the window is simply shorter. */
        it('shortens the window at the end of the ladder', async () => {
            const top = tiers[tiers.length - 1];
            render({ ...withHouseAndLeague, tierRank: top.rank, tierName: top.name });
            await screen.findByText(top.name);

            expect(screen.getByAltText(top.name)).toBeInTheDocument();
            expect(screen.getByAltText(tiers[tiers.length - 3].name)).toBeInTheDocument();
            expect(screen.queryByAltText(tiers[tiers.length - 4].name)).not.toBeInTheDocument();
        });

        /** The ladder comes from /api/tiers; a ninth tier is reachable without a code change. */
        it('follows the served tiers rather than a hardcoded eight', async () => {
            const mythique = { rank: 9, name: 'Mythique', min: 2400, max: 2600 };
            render({ ...withHouseAndLeague, tierRank: 9, tierName: 'Mythique' }, { '/api/tiers': [...tiers, mythique] });
            await screen.findByText('Mythique');

            expect(screen.getByAltText('Mythique')).toBeInTheDocument();
        });

        it('keeps the tier name and the rating', async () => {
            render(withHouseAndLeague);

            expect(await screen.findByText(withHouseAndLeague.tierName)).toBeInTheDocument();
            expect(screen.getByText(String(Math.round(withHouseAndLeague.rating)))).toBeInTheDocument();
        });

        /**
         * tierRank 0 matches no tier at all, so nothing is picked out and the window anchors at the bottom of the
         * ladder — what an unranked player has ahead of them.
         */
        it('picks nothing out for an unranked player, and shows the foot of the ladder', async () => {
            render(unranked);

            expect(await screen.findByText('[Non classé]')).toBeInTheDocument();
            expect(screen.queryByText('(palier actuel)')).not.toBeInTheDocument();
            expect(screen.getByAltText(tiers[0].name)).toBeInTheDocument();
            expect(screen.queryByAltText(tiers[tiers.length - 1].name)).not.toBeInTheDocument();
        });
    });

    describe('house', () => {
        it('shows the house, the rank in it and the points earned', async () => {
            render(withHouseAndLeague);
            await screen.findByText(withHouseAndLeague.tierName);

            const section = sectionNamed('Maison');
            const house = withHouseAndLeague.house;
            expect(within(section).getByText(house.name)).toBeInTheDocument();
            expect(within(section).getByText(String(house.rank))).toBeInTheDocument();
            expect(within(section).getByText(String(house.points.total))).toBeInTheDocument();
            expect(within(section).getByRole('link')).toHaveAttribute('href', `/house/${house.slug}`);
        });

        it('offers no join button on somebody else\'s profile', async () => {
            render(withoutHouse);
            await screen.findByText(withoutHouse.tierName);

            expect(within(sectionNamed('Maison')).queryByRole('button')).not.toBeInTheDocument();
        });

        /**
         * Joining is refused outside the season — the server answers 403 — so the button is replaced by the date it
         * reopens rather than left to fail.
         */
        it('says when joining reopens instead of offering a button that would 403', async () => {
            signInAs(withoutHouse.discordId);
            render(withoutHouse);
            await screen.findByText(withoutHouse.tierName);

            const section = sectionNamed('Maison');
            expect(within(section).getByText(/à partir du 1/)).toBeInTheDocument();
            expect(within(section).queryByRole('button')).not.toBeInTheDocument();
        });

        it('offers the join button in season, and refetches the profile once it lands', async () => {
            signInAs(withoutHouse.discordId);
            const fetchStub = render(withoutHouse, { period: 'SEASON' });
            await screen.findByText(withoutHouse.tierName);

            const profileCalls = () => fetchStub.mock.calls.filter(([url]) => String(url).includes('/api/player/')).length;
            const before = profileCalls();
            await userEvent.click(screen.getByRole('button', { name: 'Rejoindre une maison' }));

            const posted = await waitFor(() => {
                const call = fetchStub.mock.calls.find(([url]) => String(url).includes('/api/house/join'));
                expect(call).toBeDefined();
                return call;
            });
            expect(posted[1].method).toBe('POST');
            expect(JSON.parse(posted[1].body)).toEqual({ discordId: withoutHouse.discordId });

            // The profile is what says whether the player is in a house, so nothing else would show the result.
            await waitFor(() => expect(profileCalls()).toBeGreaterThan(before));
        });
    });

    describe('league', () => {
        it('shows the rank and the renown earned', async () => {
            render(withHouseAndLeague);
            await screen.findByText(withHouseAndLeague.tierName);

            const section = sectionNamed('Ligue');
            const league = withHouseAndLeague.league;
            expect(within(section).getByText(String(league.renown.total))).toBeInTheDocument();
            expect(within(section).getByText(new RegExp(`${league.played} joué`))).toBeInTheDocument();
        });

        /** The server refuses with a 404 that says nothing; the site knows this condition already, so it says it. */
        it('says a house is required when the player has none', async () => {
            signInAs(withoutHouse.discordId);
            render(withoutHouse);
            await screen.findByText(withoutHouse.tierName);

            const section = sectionNamed('Ligue');
            expect(within(section).getByText(/appartenir à une maison/)).toBeInTheDocument();
            expect(within(section).queryByRole('button')).not.toBeInTheDocument();
        });

        it('offers the join button to a housed player, in season', async () => {
            signInAs(withHouseOnly.discordId);
            const fetchStub = render(withHouseOnly, { period: 'SEASON' });
            await screen.findByText(withHouseOnly.tierName);

            await userEvent.click(screen.getByRole('button', { name: 'Rejoindre la ligue' }));

            await waitFor(() => {
                const posted = fetchStub.mock.calls.find(([url]) => String(url).includes('/api/league/join'));
                expect(posted).toBeDefined();
                expect(JSON.parse(posted[1].body)).toEqual({ discordId: withHouseOnly.discordId });
            });
        });

        it('offers no join button on somebody else\'s profile', async () => {
            render(withHouseOnly);
            await screen.findByText(withHouseOnly.tierName);

            expect(within(sectionNamed('Ligue')).queryByRole('button')).not.toBeInTheDocument();
        });

        it('marks a member who is no longer drawn', async () => {
            const inactive = { ...withHouseAndLeague, league: { ...withHouseAndLeague.league, active: false } };
            render(inactive);
            await screen.findByText(inactive.tierName);

            expect(within(sectionNamed('Ligue')).getByText(/plus tiré au sort/)).toBeInTheDocument();
        });
    });

    /** The other three sections are untouched by this iteration and must stay that way. */
    describe('untouched sections', () => {
        it('still shows accounts, FGC validation and recent games', async () => {
            render(withHouseAndLeague);
            await screen.findByText(withHouseAndLeague.tierName);

            expect(screen.getByText('Comptes')).toBeInTheDocument();
            expect(screen.getByText('Validation FGC')).toBeInTheDocument();
            expect(screen.getByText('Parties récentes')).toBeInTheDocument();
        });

        /**
         * The threshold is only worth printing while it is a target. Once met, "5/4" reads like a cap that has been
         * exceeded rather than a condition that is satisfied.
         */
        it('drops the threshold from an FGC counter that has been met', async () => {
            render({ ...withHouseAndLeague, totalRankedGames: 2, goldRankedGames: 5 });
            await screen.findByText(withHouseAndLeague.tierName);

            expect(screen.getByText('2/4')).toBeInTheDocument();
            expect(screen.getByText('5')).toBeInTheDocument();
            expect(screen.queryByText('5/2')).not.toBeInTheDocument();
        });
    });
});
