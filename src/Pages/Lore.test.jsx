import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Lore from './Lore.jsx';
import { expectNoConsoleErrors, renderAt } from '../testUtils.jsx';

describe('Lore', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
    });

    it('tells the whole story, and warns about nothing', async () => {
        await expectNoConsoleErrors(async () => {
            renderAt(<Lore />, { path: '/lore' });
            await screen.findByRole('heading', { name: 'Lore' });
        });

        expect(screen.getByRole('heading', { name: "La chute de l'Harmonie" })).toBeInTheDocument();
        expect(screen.getByText(/Partie des Ruptures/)).toBeInTheDocument();
        // The closing paragraphs come from the component /league shares, so this page must still show them.
        expect(screen.getByText(/la guerre des âmes qui se poursuit/)).toBeInTheDocument();
    });
});
