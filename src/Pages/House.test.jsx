import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import House from './House.jsx';
import { houseDetail, houseDetailEmpty } from '../__fixtures__/houses.js';
import { expectNoConsoleErrors, renderAt, stubApi } from '../testUtils.jsx';

const FILS = houseDetail.FILS_DU_FROID;
const NEXUS = houseDetail.NEXUS_ALPHA;

const render = (slug, payload) => {
    stubApi({ '/api/house/': payload });
    return renderAt(<House />, { path: `/house/${slug}`, route: '/house/:slug' });
};

const rowOf = name => screen.getByText(name).closest('[role="row"]');

/** The rank is the first cell. Queried by position, because the figure itself repeats in the breakdown. */
const rankOf = name => within(rowOf(name)).getAllByRole('gridcell')[0];

describe('House', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
    });

    it('renders a house with its ranking, and warns about nothing', async () => {
        await expectNoConsoleErrors(async () => {
            render('FILS_DU_FROID', FILS);
            await screen.findByRole('heading', { name: FILS.house.name });
        });

        expect(screen.getByText(FILS.house.tagline)).toBeInTheDocument();
        expect(screen.getByText(FILS.house.description)).toBeInTheDocument();
        expect(screen.getByAltText(FILS.house.name)).toHaveAttribute('src', `/crests/${FILS.house.slug}.svg`);

        for (const member of FILS.members) {
            expect(screen.getByText(member.discordName)).toBeInTheDocument();
        }
    });

    /**
     * Competition ranks: Nexus Alpha's two members are tied on 17 and the server answers rank 1 for both. The page
     * prints what it is given — counting rows would have produced a 1 and a 2.
     */
    it('prints the served rank rather than the row position', async () => {
        const tied = NEXUS.members.filter(m => m.rank === 1);
        expect(tied.length, 'the captured payload should still hold the tie').toBeGreaterThan(1);

        render('NEXUS_ALPHA', NEXUS);
        await screen.findByRole('heading', { name: NEXUS.house.name });

        for (const member of tied) {
            expect(rankOf(member.discordName)).toHaveTextContent(String(member.rank));
        }
    });

    /** A member who has scored nothing stays in the ranking; a roster that hides its quiet members lies about itself. */
    it('keeps a member on zero points in the ranking', async () => {
        const silent = FILS.members.find(m => m.points.total === 0);
        expect(silent, 'the captured payload should still hold a zero-point member').toBeDefined();

        render('FILS_DU_FROID', FILS);
        await screen.findByRole('heading', { name: FILS.house.name });

        expect(rankOf(silent.discordName)).toHaveTextContent(String(silent.rank));
    });

    /**
     * The seven headers are an emoji, so the real label only exists for screen readers — losing it would leave the
     * columns unnameable to anyone not looking at the glyphs.
     */
    it('names every scoring column for a screen reader', async () => {
        render('FILS_DU_FROID', FILS);
        await screen.findByRole('heading', { name: FILS.house.name });

        for (const label of ['Partie jouée', 'Adversaire GOLD', 'Adversaire dans une maison rivale',
                             'Partie longue', 'Victoire', 'Partie à égalité', 'Partie classée']) {
            expect(screen.getByRole('columnheader', { name: new RegExp(label) })).toBeInTheDocument();
        }
    });

    it('puts the seven figures and the total on the member row, in the served order', async () => {
        render('FILS_DU_FROID', FILS);
        await screen.findByRole('heading', { name: FILS.house.name });

        const leader = FILS.members[0];
        const cells = within(rowOf(leader.discordName)).getAllByRole('gridcell');

        // rank, avatar, name, then the seven columns, then the total: one line, eleven cells.
        expect(cells).toHaveLength(11);
        const served = ['played', 'goldOpponent', 'rivalHouse', 'longGame', 'victory', 'evenGame', 'ranked']
            .map(key => String(leader.points[key]));
        expect(cells.slice(3, 10).map(cell => cell.textContent)).toEqual(served);

        // The total is the server's, never a sum recomputed here.
        expect(cells[10]).toHaveTextContent(String(leader.points.total));
    });

    /**
     * The same rule, on the payload that can tell the two apart. Every captured member has played 19×19, where the
     * total happens to equal the sum of the seven columns — so the test above passes just as well against a page that
     * adds them up. A member who has been playing 13×13 or 9×9 comes back with a total *below* that sum, and this is
     * the case that fails the day someone decides the Points column can be computed locally.
     *
     * Derived rather than captured, like the memberCount case below: seeding fg_dev with small-board games to capture
     * it would put real member data one query away for a figure this test can state outright.
     */
    it('prints a total the seven columns do not add up to', async () => {
        const [leader, ...rest] = FILS.members;
        const sum = ['played', 'goldOpponent', 'rivalHouse', 'longGame', 'victory', 'evenGame', 'ranked']
            .reduce((total, key) => total + leader.points[key], 0);

        // Halved and rounded up, which is what the server does to a 13×13. Necessarily below the sum, since the
        // captured leader has scored more than nothing.
        const halved = Math.ceil(sum / 2);
        expect(halved, 'the captured leader should have something to halve').toBeLessThan(sum);

        const smallBoard = { ...leader, points: { ...leader.points, total: halved } };
        render('FILS_DU_FROID', { ...FILS, members: [smallBoard, ...rest] });
        await screen.findByRole('heading', { name: FILS.house.name });

        const cells = within(rowOf(leader.discordName)).getAllByRole('gridcell');
        expect(cells[10]).toHaveTextContent(String(halved));
        expect(cells[10]).not.toHaveTextContent(String(sum));
    });

    /**
     * The scale is behind a button now, and it is the only place the header emoji are explained — so a broken toggle
     * does not just hide a nicety, it makes seven columns unreadable.
     */
    it('keeps the scoring scale behind the info button, and opens it on click', async () => {
        render('FILS_DU_FROID', FILS);
        await screen.findByRole('heading', { name: FILS.house.name });

        // The panel carries no heading of its own, so its close button is what says it is open.
        expect(screen.queryByRole('button', { name: 'Fermer' })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Comment les points sont comptés' }));

        // Scoped to the panel: each label also exists in the column header, where it is screen-reader only.
        const panel = screen.getByRole('button', { name: 'Fermer' }).parentElement;
        for (const column of ['Partie jouée', 'Victoire', 'Partie classée']) {
            expect(within(panel).getByText(column)).toBeInTheDocument();
        }

        // Two lists: the seven columns, then the three boards. All seven are explained, not a subset — the emoji
        // headers have no other legend — and all three boards, since a missing line reads as a board that scores full.
        const [columns, boards] = within(panel).getAllByRole('list');
        expect(within(columns).getAllByRole('listitem')).toHaveLength(7);
        expect(within(boards).getAllByRole('listitem')).toHaveLength(3);
    });

    /**
     * The board coefficient, and why the panel has to name it: it is the only thing on the site that explains a
     * ranking row whose seven figures add up to more than its own Points column.
     */
    it('explains what the board does to a total', async () => {
        render('FILS_DU_FROID', FILS);
        await screen.findByRole('heading', { name: FILS.house.name });

        await userEvent.click(screen.getByRole('button', { name: 'Comment les points sont comptés' }));
        const panel = screen.getByRole('button', { name: 'Fermer' }).parentElement;

        for (const board of [/19×19/, /13×13/, /9×9/]) {
            expect(within(panel).getByText(board)).toBeInTheDocument();
        }
        // The sentence the whole panel exists for. Its wording was rewritten in 9b5b1e7 ("fix points explanation")
        // without the test following, so this matches the shipped copy, not the copy that used to be here.
        expect(within(panel).getByText(/avant division.*après division/)).toBeInTheDocument();
    });

    it('closes the scoring overlay again', async () => {
        render('FILS_DU_FROID', FILS);
        await screen.findByRole('heading', { name: FILS.house.name });

        await userEvent.click(screen.getByRole('button', { name: 'Comment les points sont comptés' }));
        await userEvent.click(screen.getByRole('button', { name: 'Fermer' }));

        expect(screen.queryByRole('button', { name: 'Fermer' })).not.toBeInTheDocument();
    });

    /**
     * The panel is a real dialog now — centred on the viewport wherever the page is scrolled, over a backdrop. The two
     * ways out that come with that shape have to work, since the close button is the only other one and it sits at the
     * top of a panel the reader may have scrolled past.
     */
    it('closes the scoring overlay on Escape and on a click outside it', async () => {
        render('FILS_DU_FROID', FILS);
        await screen.findByRole('heading', { name: FILS.house.name });

        await userEvent.click(screen.getByRole('button', { name: 'Comment les points sont comptés' }));
        await userEvent.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Comment les points sont comptés' }));
        // The backdrop, i.e. the dialog's parent. A click on the panel itself must not close it — selecting a line of
        // the scale is a click inside.
        const dialog = screen.getByRole('dialog');
        await userEvent.click(dialog);
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        await userEvent.click(dialog.parentElement);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not offer a way back from a house that loaded', async () => {
        render('FILS_DU_FROID', FILS);
        await screen.findByRole('heading', { name: FILS.house.name });

        expect(screen.queryByRole('link', { name: 'Retour aux maisons' })).not.toBeInTheDocument();
    });

    it('links each member to their profile', async () => {
        render('FILS_DU_FROID', FILS);
        await screen.findByRole('heading', { name: FILS.house.name });

        const leader = FILS.members[0];
        expect(within(rowOf(leader.discordName)).getByRole('link'))
            .toHaveAttribute('href', `/player/${leader.discordId}`);
    });

    it('says so when the house has no member, without hiding its points', async () => {
        render('SABRE_SILENCIEUX', houseDetailEmpty);
        await screen.findByRole('heading', { name: houseDetailEmpty.house.name });

        expect(screen.getByText("Aucun membre pour l'instant.")).toBeInTheDocument();
        expect(screen.getByText('Points')).toBeInTheDocument();
    });

    /**
     * memberCount counts the house's members, the list only holds the ones with a Discord profile row. The two can
     * legitimately disagree, and the page says so rather than letting the reader notice a mismatch alone.
     */
    it('accounts for members the ranking cannot show', async () => {
        const payload = { ...FILS, house: { ...FILS.house, memberCount: FILS.members.length + 2 } };
        render('FILS_DU_FROID', payload);
        await screen.findByRole('heading', { name: FILS.house.name });

        expect(screen.getByText(/2 membres sans profil Discord ne sont pas affichés/)).toBeInTheDocument();
    });

    it('treats an unknown slug as a missing house, not as a breakdown', async () => {
        stubApi({ '/api/house/': { status: 404 } });
        renderAt(<House />, { path: '/house/NOPE', route: '/house/:slug' });

        expect(await screen.findByText(/Aucune maison ne porte le nom/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Retour aux maisons' })).toHaveAttribute('href', '/houses');
    });

    it('reports a server failure as a failure', async () => {
        stubApi({ '/api/house/': { status: 500 } });
        renderAt(<House />, { path: '/house/FILS_DU_FROID', route: '/house/:slug' });

        expect(await screen.findByText('Erreur lors de la récupération de la maison')).toBeInTheDocument();
    });

    /** Points are counted over a season, so the page that shows them says which one, and whether it is running. */
    it('carries the calendar banner', async () => {
        render('FILS_DU_FROID', FILS);

        expect(await screen.findByText('Intersaison')).toBeInTheDocument();
        expect(screen.getByText(new RegExp(FILS.season))).toBeInTheDocument();
    });
});
