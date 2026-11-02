import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAuth } from '../auth.js';
import { ADMIN_ERRORS, adminFailure, adminPost } from '../adminApi.js';

import './HousePointsAdjustment.css';

/** Mirrors the server's bounds on `POST /api/admin/house/points`, so a refusal shows up before anything is sent. */
export const MAX_POINTS = 100;
export const MAX_REASON = 200;

/**
 * The "Ajuster les points" button in a player's house block, and the dialog behind it. Admin-only, read off
 * `profile.admin` — the server gates the route on the same Discord roles, so this hides a control rather than
 * protecting one.
 *
 * Only rendered for a player in a house: the server answers 404 otherwise, since there is no house to credit.
 */
export default function HousePointsAdjustment({player, onAdjusted}) {
    const { profile } = useAuth();
    const [open, setOpen] = useState(false);

    if (profile?.admin !== true || player.house == null) { return null; }

    return (
        <>
            <button type={'button'} className={'HousePointsAdjustment__Open'} onClick={() => setOpen(true)}>
                Ajuster les points
            </button>
            {open && (
                <AdjustmentDialog
                    player={player}
                    onClose={() => setOpen(false)}
                    onAdjusted={() => {
                        setOpen(false);
                        onAdjusted();
                    }} />
            )}
        </>
    );
}

const ADJUST_ERRORS = {
    ...ADMIN_ERRORS,
    notFound: "Ce joueur n'est dans aucune maison.",
    invalid: `Ajustement refusé : un nombre entier de 1 à ${MAX_POINTS} points et une raison de ${MAX_REASON} caractères au plus.`,
    conflict: 'Hors saison : les points ne peuvent être ajustés que du 1er septembre au 31 mai.',
    error: "L'ajustement a échoué. Réessayez plus tard.",
};

/**
 * Direction, amount and reason, then a confirmation that reads the grant back in one sentence.
 *
 * The direction is a separate choice rather than a minus sign typed in the amount: a penalty is a decision, and a
 * missing "-" is exactly the kind of slip that turns one into a bonus. Nothing is pre-selected for the same reason.
 *
 * The reason is posted on Discord as written, next to the amount, which is why it is required.
 *
 * Rendered into `document.body`, for the reason `Components/Modal.jsx` gives.
 */
function AdjustmentDialog({player, onClose, onAdjusted}) {
    const { refresh } = useAuth();
    const [direction, setDirection] = useState(null);
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [status, setStatus] = useState('idle');
    const firstChoice = useRef(null);

    const pending = status === 'pending';
    const value = Number(amount);
    const amountValid = /^\d+$/.test(amount) && value >= 1 && value <= MAX_POINTS;
    const trimmed = reason.trim();
    const complete = direction != null && amountValid && trimmed.length > 0 && trimmed.length <= MAX_REASON;
    const points = direction === 'remove' ? -value : value;

    useEffect(() => {
        firstChoice.current?.focus();
        const closeOnEscape = event => {
            if (event.key === 'Escape' && !pending) { onClose(); }
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [onClose, pending]);

    const submit = async () => {
        setStatus('pending');
        try {
            const { ok, status: httpStatus } = await adminPost('/api/admin/house/points', {
                discordId: player.discordId,
                points,
                reason: trimmed,
            });
            if (ok) {
                onAdjusted();
                return;
            }
            setStatus(httpStatus === 409 ? 'conflict' : adminFailure(httpStatus));
            if (httpStatus === 403) { await refresh(); }
        } catch {
            setStatus('error');
        }
    };

    const name = player.discordName ?? player.discordId;

    return createPortal(
        <div className={'HousePointsAdjustment__Overlay'}>
            <div
                className={'HousePointsAdjustment__Dialog'}
                role={'dialog'}
                aria-modal={'true'}
                aria-labelledby={'house-adjustment-title'}>
                <h3 id={'house-adjustment-title'}>Ajuster les points de maison</h3>
                <p className={'HousePointsAdjustment__Context'}>
                    Pour <strong>{name}</strong>, maison <strong>{player.house.name}</strong>. L&apos;ajustement compte
                    dans son total et celui de sa maison, et reste à la maison s&apos;il la quitte.
                </p>

                <fieldset className={'HousePointsAdjustment__Direction'} disabled={pending}>
                    <legend>Sens</legend>
                    <label className={direction === 'add' ? 'selected' : ''}>
                        <input
                            type={'radio'}
                            name={'adjustment-direction'}
                            checked={direction === 'add'}
                            onChange={() => setDirection('add')}
                            ref={firstChoice} />
                        Ajouter
                    </label>
                    <label className={direction === 'remove' ? 'selected' : ''}>
                        <input
                            type={'radio'}
                            name={'adjustment-direction'}
                            checked={direction === 'remove'}
                            onChange={() => setDirection('remove')} />
                        Retirer
                    </label>
                </fieldset>

                <label className={'HousePointsAdjustment__Field'}>
                    <span>Points</span>
                    <input
                        type={'number'}
                        min={1}
                        max={MAX_POINTS}
                        step={1}
                        inputMode={'numeric'}
                        value={amount}
                        disabled={pending}
                        onChange={event => setAmount(event.target.value)} />
                </label>

                <label className={'HousePointsAdjustment__Field'}>
                    <span>Raison <small>(publiée sur Discord)</small></span>
                    <textarea
                        rows={3}
                        maxLength={MAX_REASON}
                        value={reason}
                        disabled={pending}
                        onChange={event => setReason(event.target.value)} />
                    <small className={'HousePointsAdjustment__Counter'}>{reason.length} / {MAX_REASON}</small>
                </label>

                {complete && (
                    <p className={'HousePointsAdjustment__Summary'} role={'status'}>
                        {points > 0 ? '+' : '−'}{value} point{value > 1 ? 's' : ''} pour {name} ({player.house.name})
                        {' '}— {trimmed}
                    </p>
                )}
                {ADJUST_ERRORS[status] && <p className={'Error'} role={'alert'}>{ADJUST_ERRORS[status]}</p>}

                <div className={'HousePointsAdjustment__Actions'}>
                    <button type={'button'} onClick={onClose} disabled={pending}>Annuler</button>
                    <button type={'button'} className={'confirm'} onClick={submit} disabled={pending || !complete}>
                        {pending ? 'En cours…' : "Confirmer l'ajustement"}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
