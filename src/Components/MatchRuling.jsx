import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAuth } from '../auth.js';
import { ADMIN_ERRORS, adminFailure, adminPost } from '../adminApi.js';
import { AWARDS } from '../leagueAwards.js';

import './MatchRuling.css';

/**
 * The "Arbitrer" button on a match card, and the dialog behind it. Admin-only, read off `profile.admin` — the server
 * gates the route on the same Discord roles, so this hides a control rather than protecting one.
 *
 * One button per match rather than one per side, because a ruling is one decision about both players: the server takes
 * both awards in one request and refuses a ruling for one side only, since the other side would then be counted on a
 * result the ruling was meant to overrule. So the dialog asks for both, side by side, and posts once.
 *
 * Offered on every match, played or not, running session or settled: a ruling can overrule a real result as well as
 * settle a refused game, and it can be corrected or withdrawn afterwards.
 */
export default function MatchRuling({session, match, onRuled}) {
    const { profile } = useAuth();
    const [open, setOpen] = useState(false);

    if (profile?.admin !== true) { return null; }

    return (
        <>
            <button type={'button'} className={'MatchRuling__Open'} onClick={() => setOpen(true)}>
                {match.adjudication ? "Modifier l'arbitrage" : 'Arbitrer'}
            </button>
            {open && (
                <RulingDialog
                    session={session}
                    match={match}
                    onClose={() => setOpen(false)}
                    onRuled={() => {
                        setOpen(false);
                        onRuled();
                    }} />
            )}
        </>
    );
}

const RULING_ERRORS = {
    ...ADMIN_ERRORS,
    notFound: "Ce match n'existe plus pour cette session.",
    invalid: 'Arbitrage refusé : choisissez un sort pour chaque joueur, et un seul vainqueur.',
    error: "L'arbitrage a échoué. Réessayez plus tard.",
};

/**
 * The two choices and the confirmation.
 *
 * Starts from the current ruling when there is one, and from nothing otherwise: pre-selecting an outcome would put a
 * verdict under the admin's cursor that nobody chose. Two winners are refused here as they are on the server, before
 * anything is sent.
 *
 * Rendered into `document.body`, for the reason `Components/Modal.jsx` gives: the page's animations would otherwise
 * position a fixed overlay against a transformed ancestor instead of the viewport.
 */
function RulingDialog({session, match, onClose, onRuled}) {
    const { refresh } = useAuth();
    const [black, setBlack] = useState(match.adjudication?.black ?? null);
    const [white, setWhite] = useState(match.adjudication?.white ?? null);
    const [status, setStatus] = useState('idle');
    const firstChoice = useRef(null);

    const pending = status === 'pending';
    const twoWinners = black === 'WINNER' && white === 'WINNER';
    const complete = black != null && white != null && !twoWinners;

    useEffect(() => {
        firstChoice.current?.focus();
        const closeOnEscape = event => {
            if (event.key === 'Escape' && !pending) { onClose(); }
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [onClose, pending]);

    // `null` for both withdraws the ruling: the match goes back to what OGS or the settlement said.
    const submit = async (blackAward, whiteAward) => {
        setStatus('pending');
        try {
            const { ok, status: httpStatus } = await adminPost('/api/admin/league/adjudicate', {
                session: session.number,
                blackDiscordId: match.black.discordId,
                blackAward,
                whiteAward,
            });
            if (ok) {
                onRuled();
                return;
            }
            setStatus(adminFailure(httpStatus));
            if (httpStatus === 403) { await refresh(); }
        } catch {
            setStatus('error');
        }
    };

    return createPortal(
        <div className={'MatchRuling__Overlay'}>
            <div className={'MatchRuling__Dialog'} role={'dialog'} aria-modal={'true'} aria-labelledby={'match-ruling-title'}>
                <h3 id={'match-ruling-title'}>Arbitrer le match</h3>
                <p className={'MatchRuling__Context'}>
                    Session {session.number}. Choisissez le sort de chaque joueur : le fautif perd la session, son
                    adversaire peut être exempté, participant ou vainqueur.
                </p>

                <div className={'MatchRuling__Sides'}>
                    <SideChoice
                        name={'black'}
                        player={match.black}
                        colour={'Noir'}
                        value={black}
                        onChange={setBlack}
                        disabled={pending}
                        firstRef={firstChoice} />
                    <SideChoice
                        name={'white'}
                        player={match.white}
                        colour={'Blanc'}
                        value={white}
                        onChange={setWhite}
                        disabled={pending} />
                </div>

                {twoWinners && <p className={'Error'} role={'alert'}>Un seul vainqueur par match.</p>}
                <p className={'MatchRuling__Note'}>
                    L&apos;arbitrage ne compte que pour la renommée de la ligue : il ne donne aucun point de maison. La
                    partie reste ouverte sur OGS ; si elle est jouée malgré tout, l&apos;arbitrage garde le dernier mot.
                </p>
                {RULING_ERRORS[status] && <p className={'Error'} role={'alert'}>{RULING_ERRORS[status]}</p>}

                <div className={'MatchRuling__Actions'}>
                    <button type={'button'} onClick={onClose} disabled={pending}>Annuler</button>
                    {match.adjudication && (
                        <button type={'button'} onClick={() => submit(null, null)} disabled={pending}>
                            Retirer l&apos;arbitrage
                        </button>
                    )}
                    <button
                        type={'button'}
                        className={'confirm'}
                        onClick={() => submit(black, white)}
                        disabled={pending || !complete}>
                        {pending ? 'En cours…' : "Confirmer l'arbitrage"}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

/** One player's four possible outcomes, as a radio group: exactly one per side, and nothing chosen until clicked. */
function SideChoice({name, player, colour, value, onChange, disabled, firstRef}) {
    return (
        <fieldset className={'MatchRuling__Side'} disabled={disabled}>
            <legend>
                <span className={'MatchRuling__Colour'}>{colour}</span> {player.discordName ?? player.discordId}
            </legend>
            {AWARDS.map((award, index) => (
                <label key={award.value} className={`MatchRuling__Choice ${value === award.value ? 'selected' : ''}`}>
                    <input
                        type={'radio'}
                        name={`ruling-${name}`}
                        value={award.value}
                        checked={value === award.value}
                        onChange={() => onChange(award.value)}
                        ref={index === 0 ? firstRef : undefined} />
                    <span className={'MatchRuling__Award'}>{award.label}</span>
                    <span className={'MatchRuling__Hint'}>{award.points} · {award.bonus}</span>
                </label>
            ))}
        </fieldset>
    );
}
