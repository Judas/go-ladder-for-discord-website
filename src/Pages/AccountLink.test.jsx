import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AccountLink from './AccountLink.jsx';
import { expectNoConsoleErrors, renderAt, stubApi } from '../testUtils.jsx';

const PROFILE = {
    discordId: '900000000000000099',
    discordName: 'Joueur synthétique',
    discordAvatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
    expirationDate: '2999-01-01T00:00:00Z',
};

describe('AccountLink', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
        localStorage.setItem('user_profile', JSON.stringify(PROFILE));
    });

    it('offers FOX and submits the typed username through the existing link contract', async () => {
        const fetchStub = stubApi({
            '/api/accounts': ['KGS', 'OGS', 'FOX'],
            '/api/link': {},
        });

        await expectNoConsoleErrors(async () => {
            renderAt(<AccountLink />, { path: '/link' });
            await screen.findByRole('option', { name: 'FOX' });
        });

        await userEvent.selectOptions(screen.getByRole('combobox'), 'FOX');
        await userEvent.type(screen.getByRole('textbox'), 'Fox Example');
        await userEvent.click(screen.getByRole('button', { name: 'Valider' }));

        await screen.findByText('Compte ajouté !');
        await waitFor(() => expect(fetchStub).toHaveBeenCalledWith('/api/link', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
                discordId: PROFILE.discordId,
                account: 'FOX',
                accountId: 'Fox Example',
            }),
        })));
    });
});
