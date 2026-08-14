import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import About from './About.jsx';
import Game from './Game.jsx';
import PlayerList from './PlayerList.jsx';
import PlayerProfile from './PlayerProfile.jsx';
import RecentGames from './RecentGames.jsx';
import { expectNoConsoleErrors, fixtures, renderAt, stubApi } from '../testUtils.jsx';

/**
 * The audit suite of doc/audit-9.1.md: every page rendered against payloads captured from a real backend, with
 * console.error treated as a failure.
 */
describe('pages', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
    });

    describe('PlayerList', () => {
        it('lists the players it is served, and warns about nothing', async () => {
            stubApi();
            await expectNoConsoleErrors(async () => {
                renderAt(<PlayerList />);
                await screen.findByText(fixtures.players[0].discordName);
            });

            for (const player of fixtures.players) {
                expect(screen.getByText(player.discordName)).toBeInTheDocument();
            }
        });

        it('shows the error row when the fetch fails', async () => {
            stubApi({ '/api/players': { status: 500 } });
            renderAt(<PlayerList />);

            expect(await screen.findByText('Erreur lors de la récupération des joueurs')).toBeInTheDocument();
        });

        it('filters on the Discord name', async () => {
            stubApi();
            renderAt(<PlayerList />);
            await screen.findByText(fixtures.players[0].discordName);

            const [kept, ...dropped] = fixtures.players;
            await userEvent.type(screen.getByRole('searchbox'), kept.discordName.slice(0, 5));

            expect(screen.getByText(kept.discordName)).toBeInTheDocument();
            for (const player of dropped.filter(p => !p.discordName.toLowerCase().includes(kept.discordName.slice(0, 5).toLowerCase()))) {
                expect(screen.queryByText(player.discordName)).not.toBeInTheDocument();
            }
        });

        it('filters on a linked account name', async () => {
            stubApi();
            renderAt(<PlayerList />);
            await screen.findByText(fixtures.players[0].discordName);

            const withAccount = fixtures.players.find(p => p.accounts?.some(a => a.name));
            const accountName = withAccount.accounts.find(a => a.name).name;
            await userEvent.type(screen.getByRole('searchbox'), accountName);

            expect(screen.getByText(withAccount.discordName)).toBeInTheDocument();
        });

        it('says so when nothing matches', async () => {
            stubApi();
            renderAt(<PlayerList />);
            await screen.findByText(fixtures.players[0].discordName);

            await userEvent.type(screen.getByRole('searchbox'), 'zzzzznobodyzzzzz');

            expect(screen.getByText('Aucun résultat')).toBeInTheDocument();
        });

        it('searches within the validated-only subset', async () => {
            // The fixture players are all unvalidated, so ticking the box must empty the list even with no search.
            stubApi();
            renderAt(<PlayerList />);
            await screen.findByText(fixtures.players[0].discordName);

            await userEvent.click(screen.getByRole('checkbox'));

            const stillShown = fixtures.players.filter(p => p.totalRankedGames >= 4 && p.goldRankedGames >= 2);
            for (const player of fixtures.players) {
                const query = screen.queryByText(player.discordName);
                if (stillShown.includes(player)) expect(query).toBeInTheDocument();
                else expect(query).not.toBeInTheDocument();
            }
        });
    });

    describe('RecentGames', () => {
        it('renders the recent games, and warns about nothing', async () => {
            stubApi();
            await expectNoConsoleErrors(async () => {
                renderAt(<RecentGames />);
                await screen.findByRole('heading', { name: 'Parties' });
            });

            const list = screen.getByRole('list');
            expect(within(list).getAllByRole('listitem')).toHaveLength(fixtures.games.length);
        });
    });

    describe('PlayerProfile', () => {
        it('renders a profile with games and accounts, and warns about nothing', async () => {
            stubApi();
            await expectNoConsoleErrors(async () => {
                renderAt(<PlayerProfile />, { path: `/player/${fixtures.profile.discordId}`, route: '/player/:playerId' });
                await screen.findByRole('heading', { name: fixtures.profile.discordName });
            });

            expect(screen.getByText('Parties récentes')).toBeInTheDocument();
            expect(screen.getByText('Comptes')).toBeInTheDocument();
            expect(screen.getByText('Validation FGC')).toBeInTheDocument();
        });

        it('renders a profile with no game, and warns about nothing', async () => {
            stubApi({ '/api/player/': fixtures.noGamesProfile });
            await expectNoConsoleErrors(async () => {
                renderAt(<PlayerProfile />, { path: `/player/${fixtures.noGamesProfile.discordId}`, route: '/player/:playerId' });
                await screen.findByText('Aucune partie récente');
            });
        });

        it('renders a first-tier profile, and warns about nothing', async () => {
            // The fixture player is tier 7. Tier 1 is the branch that draws no previous shield, and tier 8 the one
            // that draws no progress bar at all — neither is reachable from the captured profile.
            stubApi({ '/api/player/': { ...fixtures.profile, tierRank: 1, rating: 500 } });
            await expectNoConsoleErrors(async () => {
                renderAt(<PlayerProfile />, { path: `/player/${fixtures.profile.discordId}`, route: '/player/:playerId' });
                await screen.findByRole('heading', { name: fixtures.profile.discordName });
            });
        });

        it('renders an unranked profile, and warns about nothing', async () => {
            stubApi({ '/api/player/': { ...fixtures.profile, tierRank: 0, rating: 0, tierName: null } });
            await expectNoConsoleErrors(async () => {
                renderAt(<PlayerProfile />, { path: `/player/${fixtures.profile.discordId}`, route: '/player/:playerId' });
                await screen.findByText('[Non classé]');
            });
        });

        it('shows the FGC counters against the thresholds', async () => {
            stubApi();
            renderAt(<PlayerProfile />, { path: `/player/${fixtures.profile.discordId}`, route: '/player/:playerId' });
            await screen.findByRole('heading', { name: fixtures.profile.discordName });

            expect(screen.getByText(`${fixtures.profile.totalRankedGames}/4`)).toBeInTheDocument();
            expect(screen.getByText(`${fixtures.profile.goldRankedGames}/2`)).toBeInTheDocument();
        });
    });

    describe('Game', () => {
        it('renders both players, and warns about nothing', async () => {
            stubApi();
            await expectNoConsoleErrors(async () => {
                renderAt(<Game />, { path: `/game/${fixtures.gameDetail.goldId}`, route: '/game/:gameId' });
                await screen.findByText(fixtures.gameDetail.black.discordName);
            });

            expect(screen.getByText(fixtures.gameDetail.white.discordName)).toBeInTheDocument();
        });
    });

    describe('About', () => {
        it('renders every tier, and warns about nothing', async () => {
            stubApi();
            await expectNoConsoleErrors(async () => {
                renderAt(<About />);
                await screen.findByText(fixtures.tiers[0].name);
            });

            for (const tier of fixtures.tiers) {
                expect(screen.getByAltText(tier.name)).toBeInTheDocument();
            }
        });
    });
});
