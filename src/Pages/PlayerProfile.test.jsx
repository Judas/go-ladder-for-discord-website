import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PlayerProfile from './PlayerProfile.jsx';
import { tiers, unranked, withHouseAndLeague, withHouseOnly, withoutHouse } from '../__fixtures__/profile.js';
import { housesPopulated } from '../__fixtures__/houses.js';
import { HOUSE_QUIZ_POOL, QUIZ_LENGTH } from '../houseQuiz.js';
import { expectNoConsoleErrors, renderAt, stubApi } from '../testUtils.jsx';

/**
 * The period is not on the profile — it rides on the `house` and `league` blocks, and both are null exactly when
 * the join buttons are needed — so the page reads it off /api/houses. That stub is not optional here.
 *
 * The same response carries the four houses, which both the entry questionnaire and a summer `CHANGE` need to name a
 * destination: the captured list, so a slug the site writes down and no longer exists shows up as a failure here.
 */
const render = (profile, { period = 'VACATION', ...overrides } = {}) => {
    const fetchStub = stubApi({
        '/api/player/': profile,
        '/api/tiers': tiers,
        '/api/houses': { period, season: '2025-2026', houses: housesPopulated.houses },
        '/api/house/join': {},
        '/api/league/join': {},
        ...overrides,
    });
    const view = renderAt(<PlayerProfile />, { path: `/player/${profile.discordId}`, route: '/player/:playerId' });
    return Object.assign(fetchStub, { unmount: view.unmount });
};

/** The house lore the page displays comes from /api/houses, so the tests read it from the same place. */
const houseNamed = slug => housesPopulated.houses.find(house => house.slug === slug);

/**
 * The question on screen, read back from the pool.
 *
 * The site draws ten questions out of the pool and shuffles their answers, so a test cannot know in advance which
 * question is asked, nor in which order — only that whatever it shows comes from the pool. Matching on the question
 * text is what gives the answers back, and with them the house each one scores for.
 */
const currentQuestion = () => HOUSE_QUIZ_POOL.find(question => screen.queryByText(question.question) != null);

/**
 * Answers the whole questionnaire towards `slug`: every question offers exactly one answer per house, so ten answers
 * for the same house make it the winner outright and the draw never runs.
 */
const answerEverythingFor = async slug => {
    for (let asked = 0; asked < QUIZ_LENGTH; asked++) {
        const answer = currentQuestion().answers.find(candidate => candidate.house === slug);
        await userEvent.click(screen.getByRole('button', { name: answer.label }));
    }
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
         * The card is tinted with the house colour, and the slug modifier is what lets a near-white house switch to
         * dark ink. Lose the modifier and Nexus Alpha's header goes white-on-cyan — unreadable, and silently so.
         */
        it('tints the card with the house colour, keyed by slug', async () => {
            render(withHouseAndLeague);
            await screen.findByText(withHouseAndLeague.tierName);

            const card = sectionNamed('Maison');
            const house = withHouseAndLeague.house;
            expect(card).toHaveClass(`PlayerProfile__HouseCard--${house.slug}`);
            expect(card.style.getPropertyValue('--house-color')).toBe(house.color);
        });

        it('leaves the card untinted when there is no house', async () => {
            render(withoutHouse);
            await screen.findByText(withoutHouse.tierName);

            const card = sectionNamed('Maison');
            expect(card).not.toHaveClass('PlayerProfile__HouseCard');
            expect(card.style.getPropertyValue('--house-color')).toBe('');
        });

        /**
         * The summer intentions. Only during the break — the server answers 403 the rest of the year — and only on
         * one's own profile, since the body carries the Discord id and nothing authenticates it.
         */
        it('offers the three intentions during the break, on one\'s own profile', async () => {
            signInAs(withHouseAndLeague.discordId);
            render(withHouseAndLeague, { period: 'VACATION' });
            await screen.findByText(withHouseAndLeague.tierName);

            const section = sectionNamed('Maison');
            for (const label of ['Rester', 'Changer', 'Quitter']) {
                expect(within(section).getByRole('button', { name: label })).toBeInTheDocument();
            }
        });

        it('offers no intention in season, when the server would refuse anyway', async () => {
            signInAs(withHouseAndLeague.discordId);
            render(withHouseAndLeague, { period: 'SEASON' });
            await screen.findByText(withHouseAndLeague.tierName);

            expect(within(sectionNamed('Maison')).queryByRole('button', { name: 'Rester' })).not.toBeInTheDocument();
        });

        it('offers no intention on somebody else\'s profile', async () => {
            render(withHouseAndLeague, { period: 'VACATION' });
            await screen.findByText(withHouseAndLeague.tierName);

            expect(within(sectionNamed('Maison')).queryByRole('button', { name: 'Rester' })).not.toBeInTheDocument();
        });

        /** `slug` is left out entirely rather than sent empty: the server ignores it here, and an empty one is a 400. */
        it('records an intention and reads the profile again', async () => {
            signInAs(withHouseAndLeague.discordId);
            const fetchStub = render(withHouseAndLeague, { period: 'VACATION', '/api/house/choice': {} });
            await screen.findByText(withHouseAndLeague.tierName);

            const profileCalls = () => fetchStub.mock.calls.filter(([url]) => String(url).includes('/api/player/')).length;
            const before = profileCalls();
            await userEvent.click(screen.getByRole('button', { name: 'Rester' }));

            const posted = await waitFor(() => {
                const call = fetchStub.mock.calls.find(([url]) => String(url).includes('/api/house/choice'));
                expect(call).toBeDefined();
                return call;
            });
            expect(JSON.parse(posted[1].body)).toEqual({ discordId: withHouseAndLeague.discordId, action: 'STAY' });
            await waitFor(() => expect(profileCalls()).toBeGreaterThan(before));
        });

        /**
         * A `CHANGE` carries its destination now — the draw is gone from the server, which answers 400 to a `CHANGE`
         * with no slug. So the button opens the picker instead of posting a request that would be refused.
         */
        it('asks which house before recording a change, and never posts one without', async () => {
            signInAs(withHouseAndLeague.discordId);
            const fetchStub = render(withHouseAndLeague, { period: 'VACATION', '/api/house/choice': {} });
            await screen.findByText(withHouseAndLeague.tierName);

            await userEvent.click(screen.getByRole('button', { name: 'Changer' }));
            expect(fetchStub.mock.calls.some(([url]) => String(url).includes('/api/house/choice'))).toBe(false);

            const destination = houseNamed('NEXUS_ALPHA');
            await userEvent.click(screen.getByRole('button', { name: destination.name }));

            const posted = await waitFor(() => {
                const call = fetchStub.mock.calls.find(([url]) => String(url).includes('/api/house/choice'));
                expect(call).toBeDefined();
                return call;
            });
            expect(JSON.parse(posted[1].body)).toEqual({
                discordId: withHouseAndLeague.discordId,
                action: 'CHANGE',
                slug: 'NEXUS_ALPHA',
            });
        });

        /** Naming one's own house is a 400 on the server, so offering it would be offering that error. */
        it('offers the three other houses, never the one the player is in', async () => {
            signInAs(withHouseAndLeague.discordId);
            render(withHouseAndLeague, { period: 'VACATION' });
            await screen.findByText(withHouseAndLeague.tierName);

            await userEvent.click(screen.getByRole('button', { name: 'Changer' }));

            const section = sectionNamed('Maison');
            const own = withHouseAndLeague.house.slug;
            const others = housesPopulated.houses.filter(house => house.slug !== own);
            expect(others).toHaveLength(3);

            for (const house of others) {
                expect(within(section).getByRole('button', { name: house.name })).toBeInTheDocument();
            }
            expect(within(section).queryByRole('button', { name: houseNamed(own).name })).not.toBeInTheDocument();
        });

        /**
         * `pendingHouse` is what lets the site name a recorded change back rather than only say that one was asked
         * for. It rides on the profile, only during the break and only on a `CHANGE`.
         */
        it('names the house a recorded change points at', async () => {
            signInAs(withHouseAndLeague.discordId);
            const destination = houseNamed('LUNAIRES_AETHER');
            const changing = {
                ...withHouseAndLeague,
                house: {
                    ...withHouseAndLeague.house,
                    pendingAction: 'CHANGE',
                    pendingHouse: { slug: destination.slug, name: destination.name, color: destination.color },
                },
            };
            render(changing, { period: 'VACATION' });
            await screen.findByText(changing.tierName);

            const section = sectionNamed('Maison');
            expect(within(section).getByText(destination.name)).toBeInTheDocument();
            expect(within(section).getByText(/rejoindrez cette maison/)).toBeInTheDocument();
            expect(within(section).getByRole('button', { name: 'Changer' })).toHaveAttribute('aria-pressed', 'true');
        });

        /**
         * ⚠ Rows recorded before the server asked for a destination hold a `CHANGE` with none. Reading that as a
         * house would print an empty crest; it is a change still waiting to be aimed.
         */
        it('asks for a destination when a recorded change has none', async () => {
            signInAs(withHouseAndLeague.discordId);
            const changing = {
                ...withHouseAndLeague,
                house: { ...withHouseAndLeague.house, pendingAction: 'CHANGE', pendingHouse: null },
            };
            render(changing, { period: 'VACATION' });
            await screen.findByText(changing.tierName);

            expect(within(sectionNamed('Maison')).getByText(/Désignez la maison/)).toBeInTheDocument();
        });

        it('marks the intention already recorded', async () => {
            signInAs(withHouseAndLeague.discordId);
            const chosen = { ...withHouseAndLeague, house: { ...withHouseAndLeague.house, pendingAction: 'LEAVE' } };
            render(chosen, { period: 'VACATION' });
            await screen.findByText(chosen.tierName);

            expect(screen.getByRole('button', { name: 'Quitter' })).toHaveAttribute('aria-pressed', 'true');
            expect(screen.getByRole('button', { name: 'Rester' })).toHaveAttribute('aria-pressed', 'false');
        });

        /**
         * Null means "has not chosen", not "chose to stay". The two land in the same place on 1 September, but
         * pre-selecting Rester would claim a choice nobody made.
         */
        it('marks nothing when no intention has been recorded', async () => {
            signInAs(withHouseAndLeague.discordId);
            expect(withHouseAndLeague.house.pendingAction).toBeNull();
            render(withHouseAndLeague, { period: 'VACATION' });
            await screen.findByText(withHouseAndLeague.tierName);

            for (const label of ['Rester', 'Changer', 'Quitter']) {
                expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'false');
            }
        });

        /** The full drawing here: there is room, and no row to repeat it down. */
        it('uses the full crest, not the simplified one', async () => {
            render(withHouseAndLeague);
            await screen.findByText(withHouseAndLeague.tierName);

            const house = withHouseAndLeague.house;
            expect(within(sectionNamed('Maison')).getByAltText(house.name))
                .toHaveAttribute('src', `/crests/${house.slug}.svg`);
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

        /**
         * The server no longer draws a house: `join` takes a slug, so something on this side has to name one. The
         * questionnaire is what leads there — the whole of it, ten questions, before any house is on offer — and what
         * it produces is a bilan: an affinity for each of the four, each with its own way in.
         */
        it('puts the questionnaire in the way, then shows an affinity and a button for each house', async () => {
            signInAs(withoutHouse.discordId);
            render(withoutHouse, { period: 'SEASON' });
            await screen.findByText(withoutHouse.tierName);

            expect(screen.getByText(`Question 1 sur ${QUIZ_LENGTH}`)).toBeInTheDocument();
            for (const house of housesPopulated.houses) {
                expect(screen.queryByRole('button', { name: `Rejoindre ${house.name}` })).not.toBeInTheDocument();
            }

            await answerEverythingFor('SABRE_SILENCIEUX');

            // Every house is named with the lore the server serves, not with a copy of it kept in the site.
            const section = sectionNamed('Maison');
            for (const house of housesPopulated.houses) {
                expect(within(section).getByText(house.name)).toBeInTheDocument();
                expect(within(section).getByText(house.tagline)).toBeInTheDocument();
                expect(within(section).getByRole('button', { name: `Rejoindre ${house.name}` })).toBeInTheDocument();
                expect(section.querySelector(`img[src="/crests/${house.slug}.svg"]`)).toBeInTheDocument();
            }

            // Ten answers for one house is a hundred per cent of them, and nothing at all for the other three.
            const found = houseNamed('SABRE_SILENCIEUX');
            expect(within(section).getByText(/^100 % d'affinité/)).toBeInTheDocument();
            expect(within(section).getAllByText(/^0 % d'affinité/)).toHaveLength(3);

            // The house the answers point to is marked, in the order the bilan is read: strongest first.
            expect(within(section).getByText('la plus forte').closest('li'))
                .toHaveTextContent(found.name);
            expect([...section.querySelectorAll('.PlayerProfile__AffinityName')][0]).toHaveTextContent(found.name);
        });

        /**
         * ⚠ The bilan guides, it does not decide: the button under any crest joins that house, including one the
         * answers did not point to. A quiz that only offered its own verdict would be a gate with extra steps.
         */
        it('joins whichever house is clicked, not the one the answers point to', async () => {
            signInAs(withoutHouse.discordId);
            const fetchStub = render(withoutHouse, { period: 'SEASON' });
            await screen.findByText(withoutHouse.tierName);

            const profileCalls = () => fetchStub.mock.calls.filter(([url]) => String(url).includes('/api/player/')).length;
            const before = profileCalls();

            await answerEverythingFor('SABRE_SILENCIEUX');
            expect(fetchStub.mock.calls.some(([url]) => String(url).includes('/api/house/join'))).toBe(false);

            const other = houseNamed('LUNAIRES_AETHER');
            await userEvent.click(screen.getByRole('button', { name: `Rejoindre ${other.name}` }));

            const posted = await waitFor(() => {
                const call = fetchStub.mock.calls.find(([url]) => String(url).includes('/api/house/join'));
                expect(call).toBeDefined();
                return call;
            });
            expect(posted[1].method).toBe('POST');
            expect(JSON.parse(posted[1].body)).toEqual({ discordId: withoutHouse.discordId, slug: other.slug });

            // The profile is what says whether the player is in a house, so nothing else would show the result.
            await waitFor(() => expect(profileCalls()).toBeGreaterThan(before));
        });

        /** Ten questions with no way back would let one misclick decide a season. */
        it('takes back an answer', async () => {
            signInAs(withoutHouse.discordId);
            render(withoutHouse, { period: 'SEASON' });
            await screen.findByText(withoutHouse.tierName);

            const first = currentQuestion();
            await userEvent.click(screen.getByRole('button', { name: first.answers[0].label }));
            expect(screen.getByText(`Question 2 sur ${QUIZ_LENGTH}`)).toBeInTheDocument();

            await userEvent.click(screen.getByRole('button', { name: /question précédente/ }));
            expect(screen.getByText(`Question 1 sur ${QUIZ_LENGTH}`)).toBeInTheDocument();

            // The same question, not a fresh draw: going back has to land where the player was, answers and all.
            expect(currentQuestion().id).toBe(first.id);
            expect(screen.getByRole('button', { name: first.answers[0].label })).toBeInTheDocument();

            // Nothing to go back to on the first question, so nothing offers it.
            expect(screen.queryByRole('button', { name: /question précédente/ })).not.toBeInTheDocument();
        });

        /** A questionnaire whose scoring is readable on screen is a menu with extra steps. */
        it('never says which house an answer leads to', async () => {
            signInAs(withoutHouse.discordId);
            render(withoutHouse, { period: 'SEASON' });
            await screen.findByText(withoutHouse.tierName);

            for (let asked = 0; asked < QUIZ_LENGTH; asked++) {
                const question = currentQuestion();
                for (const house of housesPopulated.houses) {
                    expect(screen.queryByText(house.name), `${question.id} names ${house.slug}`).not.toBeInTheDocument();
                }
                await userEvent.click(screen.getByRole('button', { name: question.answers[0].label }));
            }
        });

        /** Joining is refused during the break, so the questionnaire is not offered then either. */
        it('does not open the questionnaire during the break', async () => {
            signInAs(withoutHouse.discordId);
            render(withoutHouse, { period: 'VACATION' });
            await screen.findByText(withoutHouse.tierName);

            expect(screen.queryByText(`Question 1 sur ${QUIZ_LENGTH}`)).not.toBeInTheDocument();
        });

        it('warns about nothing while the questionnaire runs', async () => {
            signInAs(withoutHouse.discordId);
            await expectNoConsoleErrors(async () => {
                render(withoutHouse, { period: 'SEASON' });
                await screen.findByText(withoutHouse.tierName);
                await answerEverythingFor('FILS_DU_FROID');
            });
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

        /**
         * Leaving is possible **in season**, unlike a house — there is nothing to protect against out of season, and
         * refusing would leave someone who wants out waiting until September. So no period condition here.
         */
        it('offers the way out to an active member, in season and out of it', async () => {
            signInAs(withHouseAndLeague.discordId);

            for (const period of ['SEASON', 'VACATION']) {
                const view = render(withHouseAndLeague, { period });
                await screen.findByText(withHouseAndLeague.tierName);

                expect(
                    within(sectionNamed('Ligue')).getByRole('button', { name: 'Quitter la ligue' }),
                    `should be offered during ${period}`,
                ).toBeInTheDocument();

                view.unmount();
            }
        });

        it('asks before leaving, and names what does not come back', async () => {
            signInAs(withHouseAndLeague.discordId);
            const fetchStub = render(withHouseAndLeague, { '/api/league/leave': {} });
            await screen.findByText(withHouseAndLeague.tierName);

            await userEvent.click(screen.getByRole('button', { name: 'Quitter la ligue' }));

            // A drawn match stays to be played, and counts as unplayed if it is not — the one thing leaving costs.
            expect(screen.getByText(/match déjà tiré reste à jouer/)).toBeInTheDocument();
            expect(fetchStub.mock.calls.some(([url]) => String(url).includes('/api/league/leave'))).toBe(false);

            await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }));

            const posted = await waitFor(() => {
                const call = fetchStub.mock.calls.find(([url]) => String(url).includes('/api/league/leave'));
                expect(call).toBeDefined();
                return call;
            });
            expect(JSON.parse(posted[1].body)).toEqual({ discordId: withHouseAndLeague.discordId });
        });

        it('backs out of the confirmation', async () => {
            signInAs(withHouseAndLeague.discordId);
            const fetchStub = render(withHouseAndLeague);
            await screen.findByText(withHouseAndLeague.tierName);

            await userEvent.click(screen.getByRole('button', { name: 'Quitter la ligue' }));
            await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));

            expect(screen.getByRole('button', { name: 'Quitter la ligue' })).toBeInTheDocument();
            expect(fetchStub.mock.calls.some(([url]) => String(url).includes('/api/league/leave'))).toBe(false);
        });

        it('offers no way out on somebody else\'s profile', async () => {
            render(withHouseAndLeague);
            await screen.findByText(withHouseAndLeague.tierName);

            expect(screen.queryByRole('button', { name: 'Quitter la ligue' })).not.toBeInTheDocument();
        });

        /** Already inactive: there is nothing left to leave, and the server would answer on a row already at 0. */
        it('offers no way out to a member who has already left', async () => {
            signInAs(withHouseAndLeague.discordId);
            const inactive = { ...withHouseAndLeague, league: { ...withHouseAndLeague.league, active: false } };
            render(inactive);
            await screen.findByText(inactive.tierName);

            expect(screen.queryByRole('button', { name: 'Quitter la ligue' })).not.toBeInTheDocument();
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
