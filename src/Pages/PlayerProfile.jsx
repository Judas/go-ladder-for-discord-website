import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from "react-router-dom";
import { FaCircleInfo } from "react-icons/fa6";

import { useAuth, useIsSelf } from '../auth.js';
import { ensureUserId } from '../AuthProfile.js';
import TableElement from "../Components/Table/TableElement.jsx";
import RowGroupElement from "../Components/Table/RowGroupElement.jsx";
import RowElement from "../Components/Table/RowElement.jsx";
import ColHeaderElement from "../Components/Table/ColHeaderElement.jsx";
import CellElement from "../Components/Table/CellElement.jsx";
import Loader from "../Components/Loader.jsx";
import Avatar from "../Components/Avatar.jsx";
import Crest from "../Components/Crest.jsx";
import HouseQuiz from "../Components/HouseQuiz.jsx";
import useApi from "../hooks/useApi.js";
import { FGC_RULES } from "../fgc.js";
import { affinities, leaders } from "../houseQuiz.js";

import './PlayerProfile.css'

export default function PlayerProfile() {
    const {playerId} = useParams()

    const [tooltipVisible, setTooltipVisible] = useState(false);

    // Three requests, deliberately: the profile changes with the route, the tier scale does not, and the calendar
    // is not on the profile at all.
    const { status: playerFetchStatus, data: player, reload } = useApi(`/api/player/${playerId}`);
    const { status: tiersFetchStatus, data: tiers } = useApi('/api/tiers');
    // ⚠ `period` rides on the `house` and `league` blocks — and both are null exactly when the join buttons are
    // needed, so a profile alone cannot say whether the season is open. /api/houses always carries it.
    //
    // It also carries the four houses themselves, which is what the entry questionnaire and the summer CHANGE need:
    // both now name a destination, and its name, colour and crest belong to the server, not to a copy kept here.
    const { data: calendar } = useApi('/api/houses');

    if (playerFetchStatus === 'success' && tiersFetchStatus === 'success') {
        return (
            <article className={'PlayerProfile'}>
                <Profile player={player} tiers={tiers} period={calendar?.period} houses={calendar?.houses}
                         reload={reload} tooltipHandler={() => setTooltipVisible(true)} />
                {tooltipVisible && (
                    <div className={'Tooltip'}>
                        <button className={'CallToAction'} onClick={() => setTooltipVisible(false)}>
                            <span className={'ReaderOnly'}>Fermer</span>
                        </button>
                        <Tooltip />
                    </div>
                )}
            </article>
        );
    } else if (playerFetchStatus === 'pending' || tiersFetchStatus === 'pending') {
        return <div className={'FlexContainer'}><Loader/></div>;
    } else {
        return <div style={{display: 'grid', height: '100%',}}><p className={'Error'}>Echec lors de la récupération du profil.</p></div>;
    }
}

function Profile({player, tiers, period, houses, reload, tooltipHandler}) {
    let playerRating = player.rating > 0 
        ? <h2 className={'PlayerProfile__Rating'}>{Math.round(player.rating)}</h2>
        : <h2 className={'PlayerProfile__Unranked'}>[Non classé]</h2>

    return (
        <>
            <div className={'PlayerProfile__LeftColumn'}>
                {/* The header takes the house colour when there is one, so the card is recognisable before it is
                    read. --house-ink is what keeps the label legible on a near-white house; see PlayerProfile.css. */}
                <div
                    className={`Card ${player.house ? `PlayerProfile__HouseCard PlayerProfile__HouseCard--${player.house.slug}` : ''}`}
                    style={player.house ? {'--house-color': player.house.color} : undefined}>
                    <h2 className={'CardHeader'}><span>Maison</span></h2>
                    <HouseSection player={player} period={period} houses={houses} reload={reload} />
                </div>

                <div className={'Card'}>
                    <h2 className={'CardHeader'}><span>Ligue</span></h2>
                    <LeagueSection player={player} period={period} reload={reload} />
                </div>

                <div className={'Card'}>
                    <h2 className={'CardHeader'}><span>Parties récentes</span></h2>
                    <GameList player={player} />
                </div>
            </div>

            <div className={'PlayerProfile__RightColumn'}>
                <div className={'CardHighlighted'}>
                    <h2 className={'CardHeader'}><span>{player.discordName}</span></h2>
                    <Avatar src={player.discordAvatar} size={72} className={'PlayerProfile__Avatar'} alt={`avatar ${player.discordName}`} hidden={true}/>

                    <div className={'CardContent'}>
                        <div className={'PlayerProfile__Tier'}>
                            <TierScale player={player} tiers={tiers} />
                            <p className={'PlayerProfile__TierName'} >{player.tierName}</p>
                            { playerRating }
                        </div>
                    </div>
                </div>

                <div className={'Card'}>
                    <h2 className={'CardHeader'}><span>Comptes</span></h2>
                    <AccountList player={player} reload={reload} />
                </div>

                <div className={'Card TootipIconParent'}>
                    <h2 className={'CardHeader'}>
                        <span>Validation FGC</span>
                        <span className={'TootipIcon'} onClick={tooltipHandler}><FaCircleInfo /></span>
                    </h2>
                    <Stability player={player} />
                </div>
            </div>
        </>
    );
}

/**
 * The house block, or the way into one.
 *
 * `house` is null for a player in none. Joining is refused outside the season — the server answers 403, and the
 * choices of the summer are what move people — so the button is replaced by the date it reopens rather than left to
 * fail. `period` comes from /api/houses, never from a date computed here.
 */
function HouseSection({player, period, houses, reload}) {
    // Hooks before any branch: the early return below is exactly what rules-of-hooks is about.
    const isSelf = useIsSelf(player.discordId);
    const house = player.house;

    if (house == null) {
        return <JoinHouse player={player} period={period} houses={houses} reload={reload} />;
    }

    return (
        <div className={'PlayerProfile__House'} style={{'--house-color': house.color}}>
            {/* The full crest, not the simplified one: there is room here, and no row to repeat it down. */}
            <Link to={`/house/${house.slug}`} className={'PlayerProfile__HouseIdentity'}>
                <Crest slug={house.slug} name={house.name} size={128} />
                <span className={'PlayerProfile__HouseText'}>
                    <span className={'PlayerProfile__HouseName'}>{house.name}</span>
                    <span className={'PlayerProfile__HouseTagline'}>{house.tagline}</span>
                </span>
            </Link>

            <dl className={'PlayerProfile__Figures'}>
                <div>
                    <dt>Rang</dt>
                    <dd>{house.rank}</dd>
                </div>
                <div>
                    <dt>Points</dt>
                    <dd>{house.points.total}</dd>
                </div>
            </dl>

            {period === 'VACATION' && isSelf && <HouseChoice player={player} houses={houses} reload={reload} />}
        </div>
    );
}

/**
 * Leaving the league.
 *
 * Unlike a house, this is possible **during** the season — there is nothing to protect against out of season, and
 * refusing would leave someone who wants out waiting until September. So no period condition, only membership.
 *
 * Nothing is withdrawn: the renown already earned stays, and rejoining lands on the same row with `active` back to
 * 1. What does not come back is a match already drawn — it stays to be played, and the unplayed rule applies to it
 * like any other. That is the one consequence worth a confirmation step.
 */
function LeaveLeague({player, reload}) {
    const [state, setState] = useState('idle');

    const leave = () => {
        setState('pending');
        post('/api/league/leave', { discordId: player.discordId })
            .then(() => {
                setState('idle');
                reload();
            })
            .catch(() => setState('error'));
    };

    if (state !== 'confirming') {
        return (
            <div className={'PlayerProfile__Leave'}>
                <button
                    type={'button'}
                    className={'PlayerProfile__LeaveButton'}
                    disabled={state === 'pending'}
                    onClick={() => setState('confirming')}>
                    {state === 'pending' ? 'En cours…' : 'Quitter la ligue'}
                </button>
                {state === 'error' && <p className={'Error'}>Le retrait a échoué.</p>}
            </div>
        );
    }

    return (
        <div className={'PlayerProfile__Leave'}>
            <p className={'PlayerProfile__LeaveWarning'}>
                Votre renommée reste acquise, et vous pourrez revenir. En revanche, un match déjà tiré reste à jouer :
                non joué, il comptera comme tel.
            </p>
            <div className={'PlayerProfile__LeaveActions'}>
                <button type={'button'} className={'PlayerProfile__LeaveButton confirm'} onClick={leave}>
                    Confirmer
                </button>
                <button type={'button'} className={'PlayerProfile__LeaveButton'} onClick={() => setState('idle')}>
                    Annuler
                </button>
            </div>
        </div>
    );
}

/**
 * What the member wants for next season. Only during the break, and only on one's own profile.
 *
 * The three intentions are the whole of `house_members.pending_action`'s vocabulary. Nothing is applied on the spot —
 * the season transition reads them back on 1 September — so a choice can be changed as often as one likes all
 * summer, the last one recorded being the one that counts.
 *
 * ⚠ `CHANGE` carries a destination now: the draw that used to pick one is gone from the server, which answers 400 to a
 * `CHANGE` with no slug and 400 again to one naming the house the player is already in. So the button opens a picker
 * of the three others instead of posting, and only the pick posts.
 */
const CHOICES = [
    { action: 'STAY', label: 'Rester', hint: 'Rien ne change.' },
    { action: 'CHANGE', label: 'Changer', hint: 'Désignez la maison que vous rejoindrez.' },
    { action: 'LEAVE', label: 'Quitter', hint: 'Les points déjà gagnés restent à la maison.' },
];

function HouseChoice({player, houses, reload}) {
    const [state, setState] = useState('idle');
    const [picking, setPicking] = useState(false);

    /*
     * ⚠ Null means "has not chosen", not "chose to stay". The two have the same effect on 1 September, but claiming
     * a choice nobody made would be a lie about the one thing this block exists to record — so nothing is
     * pre-selected.
     */
    const chosen = player.house.pendingAction;
    /** The house a recorded `CHANGE` points at — a crest, so it can be named back rather than only counted. */
    const destination = player.house.pendingHouse;

    /*
     * The three others. Naming one's own house is a 400, so offering it would be offering that error.
     *
     * `houses` is loaded whenever this block renders: it rides on the same /api/houses response as the `period` that
     * decides whether the block appears at all. The `?? []` is for the reader, not for a case that happens.
     */
    const others = (houses ?? []).filter(house => house.slug !== player.house.slug);

    // `slug` is left out of the body on STAY and LEAVE rather than sent empty — JSON.stringify drops an undefined
    // value, and the server ignores the field on those two anyway.
    const choose = (action, slug) => {
        setState('pending');
        post('/api/house/choice', { discordId: player.discordId, action, slug })
            .then(() => {
                setState('idle');
                setPicking(false);
                reload();
            })
            .catch(status => setState(status === 403 ? 'forbidden' : 'error'));
    };

    /** A `CHANGE` has nowhere to go until a house is picked, so its button opens the picker rather than posting. */
    const press = action => {
        if (action === 'CHANGE') {
            setPicking(!picking);
            return;
        }
        setPicking(false);
        choose(action);
    };

    const hint = () => {
        if (chosen == null) { return "Sans choix de votre part, vous resterez dans cette maison."; }
        if (chosen !== 'CHANGE') { return CHOICES.find(choice => choice.action === chosen)?.hint; }
        // A `CHANGE` without a destination is what the rows recorded before the server asked for one look like.
        return destination
            ? 'Vous rejoindrez cette maison à la rentrée.'
            : CHOICES.find(choice => choice.action === 'CHANGE').hint;
    };

    return (
        <div className={'PlayerProfile__Choice'}>
            <p className={'PlayerProfile__ChoiceIntro'}>À la rentrée, je souhaite :</p>

            <div className={'PlayerProfile__ChoiceButtons'}>
                {CHOICES.map(choice => (
                    <button
                        key={choice.action}
                        type={'button'}
                        className={`PlayerProfile__ChoiceButton ${chosen === choice.action ? 'chosen' : ''}`}
                        aria-pressed={chosen === choice.action}
                        aria-expanded={choice.action === 'CHANGE' ? picking : undefined}
                        disabled={state === 'pending'}
                        onClick={() => press(choice.action)}>
                        {choice.label}
                    </button>
                ))}
            </div>

            {picking && (
                <ul className={'PlayerProfile__Destinations NoBulletList'}>
                    {others.map(house => (
                        <li key={house.slug}>
                            <button
                                type={'button'}
                                className={`PlayerProfile__Destination ${destination?.slug === house.slug ? 'chosen' : ''}`}
                                style={{'--house-color': house.color}}
                                aria-pressed={destination?.slug === house.slug}
                                disabled={state === 'pending'}
                                onClick={() => choose('CHANGE', house.slug)}>
                                {/* The name is in the span beside it, so the crest carries no alt of its own. */}
                                <Crest slug={house.slug} size={32} small={true} />
                                <span>{house.name}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {!picking && chosen === 'CHANGE' && destination && (
                <p className={'PlayerProfile__Pending'} style={{'--house-color': destination.color}}>
                    <Crest slug={destination.slug} size={32} small={true} />
                    <span>{destination.name}</span>
                </p>
            )}

            <p className={'PlayerProfile__ActionHint'}>{hint()}</p>

            {state === 'forbidden' && <p className={'Error'}>Les choix ne sont ouverts que pendant l'intersaison.</p>}
            {state === 'error' && <p className={'Error'}>Le choix n'a pas pu être enregistré.</p>}
        </div>
    );
}

/**
 * The way into a house: ten questions, then the four houses ranked by how close the answers came to each.
 *
 * ⚠ The questionnaire **guides, it does not decide**. `POST /api/house/join` takes a slug and checks that it names a
 * house, so something on this side has to name one — but a bare list of four would make the choice a shrug, and a
 * single verdict would make the quiz a gate. So the answers are tallied into an affinity per house, the strongest
 * first, and every one of them carries a button: the player is told where their play points, and joins whom they want.
 *
 * The answers are held in state rather than the verdict, since there is no verdict to hold any more — no lottery
 * either, which is what used to make the result something that could not be recomputed under the accepting click.
 *
 * The questionnaire and its scoring live in `src/houseQuiz.js`; nothing here knows a question. The lore of each house
 * comes from /api/houses, never from a copy kept here. Only the slug is this side's.
 */
function JoinHouse({player, period, houses, reload}) {
    const isSelf = useIsSelf(player.discordId);
    const [answers, setAnswers] = useState(null);

    if (!isSelf) {
        return <p className={'PlayerProfile__Empty'}>Ce joueur n'appartient à aucune maison.</p>;
    }

    if (period === 'VACATION') {
        return (
            <p className={'PlayerProfile__Empty'}>
                Vous pourrez rejoindre une maison à partir du 1<sup>er</sup> septembre.
            </p>
        );
    }

    if (answers == null) {
        return (
            <div className={'PlayerProfile__Join'}>
                <p className={'PlayerProfile__JoinIntro'}>
                    Dix questions, et votre façon de jouer vous dira quelle maison vous ressemble.
                </p>
                <HouseQuiz onCompleted={setAnswers} />
            </div>
        );
    }

    // Ex æquo at the top are all marked as such: nothing here breaks a tie, the player does.
    const strongest = leaders(answers);

    return (
        <div className={'PlayerProfile__Join'}>
            <p className={'PlayerProfile__JoinVerdict'}>Vos affinités :</p>

            <ul className={'PlayerProfile__Affinities NoBulletList'}>
                {affinities(answers).map(affinity => {
                    const house = houses?.find(candidate => candidate.slug === affinity.slug);
                    const name = house?.name ?? affinity.slug;

                    return (
                        <li
                            key={affinity.slug}
                            className={`PlayerProfile__Affinity PlayerProfile__Affinity--${affinity.slug}`}
                            style={house ? {'--house-color': house.color} : undefined}>
                            {/* The name is in the text beside it, so the crest carries no alt of its own. */}
                            <Crest slug={affinity.slug} size={64} />

                            <div className={'PlayerProfile__AffinityText'}>
                                <p className={'PlayerProfile__AffinityName'}>{name}</p>
                                {house?.tagline && <p className={'PlayerProfile__AffinityTagline'}>{house.tagline}</p>}
                                <p className={'PlayerProfile__AffinityScore'}>
                                    {affinity.percent} % d'affinité
                                    {strongest.includes(affinity.slug) && (
                                        <span className={'PlayerProfile__AffinityLead'}>la plus forte</span>
                                    )}
                                </p>
                                {/* The figure is written above; the bar only makes it comparable at a glance. */}
                                <div
                                    className={'PlayerProfile__AffinityGauge'}
                                    style={{'--affinity': `${affinity.percent}%`}}
                                    aria-hidden={true} />
                            </div>

                            <Action
                                path={'/api/house/join'}
                                body={{ discordId: player.discordId, slug: affinity.slug }}
                                label={`Rejoindre ${name}`}
                                className={'PlayerProfile__AffinityJoin'}
                                reload={reload} />
                        </li>
                    );
                })}
            </ul>

            <p className={'PlayerProfile__ActionHint'}>
                Le questionnaire ne fait que vous orienter : la maison reste votre choix. Une appartenance est figée
                jusqu'à la fin de la saison.
            </p>
        </div>
    );
}

/**
 * The league block, the way into it, or why the way is closed.
 *
 * The server refuses a join with 404 when any of its three conditions fails — known, in a house, OGS account linked —
 * without saying which. The site knows two of them from the profile it already has, so it says so before letting
 * anyone click.
 */
function LeagueSection({player, period, reload}) {
    const isSelf = useIsSelf(player.discordId);
    const league = player.league;

    if (league != null) {
        return (
            <div className={'PlayerProfile__League'}>
                <dl className={'PlayerProfile__Figures'}>
                    <div>
                        <dt>Rang</dt>
                        <dd>{league.rank}</dd>
                    </div>
                    <div>
                        <dt>Renommée</dt>
                        <dd>{league.renown.total}</dd>
                    </div>
                </dl>
                <p className={'PlayerProfile__LeagueRecord'}>
                    {league.played} joué{league.played > 1 ? 's' : ''} · {league.won} gagné{league.won > 1 ? 's' : ''}
                    {' '}· {league.exempted} exempté{league.exempted > 1 ? 's' : ''}
                </p>
                {!league.active && <p className={'PlayerProfile__Empty'}>Inactif : plus tiré au sort cette saison.</p>}
                {league.active && isSelf && <LeaveLeague player={player} reload={reload} />}
            </div>
        );
    }

    if (player.house == null) {
        return <p className={'PlayerProfile__Empty'}>Il faut appartenir à une maison pour rejoindre la ligue.</p>;
    }

    if (!isSelf) {
        return <p className={'PlayerProfile__Empty'}>Ce joueur n'a pas rejoint la ligue.</p>;
    }

    if (period === 'VACATION') {
        return (
            <p className={'PlayerProfile__Empty'}>
                Les académies se forment à la rentrée : rendez-vous le 1<sup>er</sup> septembre.
            </p>
        );
    }

    return (
        <Action
            path={'/api/league/join'}
            body={{ discordId: player.discordId }}
            label={'Rejoindre la ligue'}
            hint={"Un compte OGS lié est nécessaire."}
            reload={reload} />
    );
}

/**
 * A button that POSTs and then makes the page read itself again.
 *
 * The refetch is the point: the profile is what says whether the player is in a house, so nothing else would show
 * the result of a join. `useApi` cannot serve this — it is a GET hook — so the request is written out here.
 */
/**
 * POSTs `body` to `path`, and rejects with the status code so a caller can tell 403 from 409.
 *
 * No response is parsed: these routes answer 204 with nothing, or a body the site does not need — the profile
 * refetch is what shows the result.
 */
function post(path, body) {
    return fetch(path, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(res => {
        if (!res.ok) { throw res.status; }
    });
}

/**
 * `className` is what lets the house buttons of the affinity bilan be dressed in their house's colour without a second
 * copy of the POST-and-refetch dance; `hint` is optional because that bilan carries one hint for the four of them.
 */
function Action({path, body, label, hint, reload, className}) {
    const [state, setState] = useState('idle');

    const submit = () => {
        setState('pending');
        post(path, body)
            .then(() => {
                setState('idle');
                reload();
            })
            .catch(status => setState(status === 403 ? 'forbidden' : status === 409 ? 'conflict' : 'error'));
    };

    return (
        <div className={`PlayerProfile__Action ${className ?? ''}`}>
            <button type={'button'} className={'PlayerProfile__ActionButton'} onClick={submit} disabled={state === 'pending'}>
                {state === 'pending' ? 'En cours…' : label}
            </button>
            {hint && <p className={'PlayerProfile__ActionHint'}>{hint}</p>}
            {state === 'forbidden' && <p className={'Error'}>Ce n'est pas la période pour ça.</p>}
            {state === 'conflict' && <p className={'Error'}>C'est déjà fait.</p>}
            {state === 'error' && <p className={'Error'}>L'inscription a échoué. Vérifiez qu'un compte est bien lié.</p>}
        </div>
    );
}

/** How many tiers to show either side of the player's own. */
const TIER_WINDOW = 2;

/**
 * The player's tier and its neighbours: two below, two above, fewer at the ends of the ladder.
 *
 * Replaces the progress bar between two tiers, which disappeared entirely at the top tier and for an unranked
 * player — the two cases it was least able to explain. Drawn from `/api/tiers` rather than a hardcoded eight: the
 * server owns how many there are, and the window follows whatever it sends.
 *
 * An unranked player has `tierRank: 0`, which matches no tier. The window then anchors at the bottom of the ladder,
 * which is what they have ahead of them, and nothing is picked out.
 */
function tierWindow(tiers, tierRank) {
    const index = tiers.findIndex(tier => tier.rank === tierRank);
    const anchor = index === -1 ? 0 : index;

    return tiers.slice(Math.max(0, anchor - TIER_WINDOW), anchor + TIER_WINDOW + 1);
}

function TierScale({player, tiers}) {
    return (
        <ol className={'PlayerProfile__TierScale NoBulletList'}>
            {tierWindow(tiers, player.tierRank).map(tier => (
                <li key={tier.rank}>
                    <span
                        className={`PlayerProfile__TierStep ${tier.rank === player.tierRank ? 'current' : ''}`}
                        title={`${tier.name} — ${tier.min} à ${tier.max}`}>
                        <img width="48" height="48" src={`/shields/shield-${tier.rank}.svg`} alt={tier.name} />
                        {tier.rank === player.tierRank && <span className={'ReaderOnly'}>(palier actuel)</span>}
                    </span>
                </li>
            ))}
        </ol>
    );
}

function AccountList({player, reload}) {
    const { profile, refresh } = useAuth();
    const [accountToUnlink, setAccountToUnlink] = useState(null);
    const [unlinkStatus, setUnlinkStatus] = useState('idle');

    const openUnlinkConfirmation = account => {
        setUnlinkStatus('idle');
        setAccountToUnlink(account);
    };

    const closeUnlinkConfirmation = () => {
        if (unlinkStatus !== 'pending') { setAccountToUnlink(null); }
    };

    const unlinkAccount = async () => {
        if (accountToUnlink == null) { return; }
        setUnlinkStatus('pending');
        try {
            const response = await fetch('/api/admin/unlink', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Gold-Id': ensureUserId(),
                },
                body: JSON.stringify({
                    discordId: player.discordId,
                    account: accountToUnlink.server,
                    accountId: accountToUnlink.id,
                }),
            });

            if (response.ok) {
                setAccountToUnlink(null);
                setUnlinkStatus('idle');
                reload();
                return;
            }

            const status = response.status === 401
                ? 'unauthorized'
                : response.status === 403
                    ? 'forbidden'
                    : response.status === 404
                        ? 'missing'
                        : response.status === 503
                            ? 'unavailable'
                            : 'error';
            setUnlinkStatus(status);
            if (response.status === 403) { await refresh(); }
        } catch {
            setUnlinkStatus('error');
        }
    };

    let accountList;
    if (player.accounts.length === 0) {
        accountList = (<p className={'NoAccount'}>Aucun compte lié</p>);
    } else {
        accountList = (
            <RowGroupElement className={'PlayerProfile__AccountListContent'}>
                {player.accounts.map(account => (
                    <AccountRow
                        key={`${account.server}-${account.id}`}
                        account={account}
                        canUnlink={profile?.admin === true}
                        onUnlink={() => openUnlinkConfirmation(account)}
                    />
                ))}
            </RowGroupElement>
        );
    }

    let addAccount;
    if (useIsSelf(player.discordId)) {
        addAccount = (<a href='/link' className={'AddAccount'}>Lier un compte</a>);
    } else {
        addAccount = (<></>);
    }

    return (
        <>
            <TableElement className={'PlayerProfile__AccountList'}>
                <RowGroupElement className={'ReaderOnly'}>
                    <RowElement>
                        <ColHeaderElement>Serveur</ColHeaderElement>
                        <ColHeaderElement>Pseudo</ColHeaderElement>
                        <ColHeaderElement>Rang</ColHeaderElement>
                        {profile?.admin === true && <ColHeaderElement>Administration</ColHeaderElement>}
                    </RowElement>
                </RowGroupElement>
                {accountList}
                {addAccount}
            </TableElement>
            {accountToUnlink && (
                <UnlinkAccountDialog
                    player={player}
                    account={accountToUnlink}
                    status={unlinkStatus}
                    onCancel={closeUnlinkConfirmation}
                    onConfirm={unlinkAccount}
                />
            )}
        </>
    );
}

function AccountRow({account, canUnlink, onUnlink}) {
    return (
        <RowElement className={'PlayerProfile__AccountItem'}>
            <CellElement className={'PlayerProfile__AccountServer'}>{account.server}</CellElement>
            <CellElement className={'PlayerProfile__AccountPseudo'}>{account.name}</CellElement>
            <CellElement className={'PlayerProfile__AccountRank'}>{account.rank}</CellElement>
            {canUnlink && (
                <CellElement className={'PlayerProfile__AccountAdmin'}>
                    <button type="button" className={'PlayerProfile__AccountUnlink'} onClick={onUnlink}>
                        Délier
                    </button>
                </CellElement>
            )}
            {account.link && <a href={account.link} target='_blank' rel='noreferrer' />}
        </RowElement>
    );
}

const UNLINK_ERRORS = {
    unauthorized: 'Votre session a expiré. Reconnectez-vous avec Discord.',
    forbidden: 'Votre accès administrateur a été retiré.',
    missing: 'Ce compte est déjà délié ou a été remplacé.',
    unavailable: 'Le service Discord est temporairement indisponible.',
    error: 'Impossible de délier ce compte. Réessayez plus tard.',
};

function UnlinkAccountDialog({player, account, status, onCancel, onConfirm}) {
    const pending = status === 'pending';
    const confirmButton = useRef(null);

    useEffect(() => {
        confirmButton.current?.focus();
        const closeOnEscape = event => {
            if (event.key === 'Escape' && !pending) { onCancel(); }
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [onCancel, pending]);

    return (
        <div className={'PlayerProfile__UnlinkOverlay'}>
            <div
                className={'PlayerProfile__UnlinkDialog'}
                role="dialog"
                aria-modal="true"
                aria-labelledby="unlink-account-title">
                <h3 id="unlink-account-title">Délier un compte</h3>
                <p>
                    Délier le compte <strong>{account.server}</strong> de <strong>{player.discordName}</strong> ?
                </p>
                <dl>
                    <div><dt>Pseudo</dt><dd>{account.name ?? 'Inconnu'}</dd></div>
                    <div><dt>Identifiant</dt><dd>{account.id}</dd></div>
                </dl>
                {UNLINK_ERRORS[status] && <p className={'Error'} role="alert">{UNLINK_ERRORS[status]}</p>}
                <div className={'PlayerProfile__UnlinkActions'}>
                    <button type="button" onClick={onCancel} disabled={pending}>Annuler</button>
                    <button type="button" onClick={onConfirm} disabled={pending} ref={confirmButton}>
                        {pending ? 'Déliaison…' : 'Confirmer la déliaison'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function GameList({player}) {
    if (player.games.length === 0) {
        return <p className={'NoGame'}>Aucune partie récente</p>;
    }

    return (
        <TableElement className={'PlayerProfile__GameList'}>
            <RowGroupElement className={'ReaderOnly'}>
                <RowElement>
                    <ColHeaderElement>Date</ColHeaderElement>
                    <ColHeaderElement>Résultat</ColHeaderElement>
                    <ColHeaderElement>Avatar adversaire</ColHeaderElement>
                    <ColHeaderElement>Nom adversaire</ColHeaderElement>
                    <ColHeaderElement>Division adversaire</ColHeaderElement>
                </RowElement>
            </RowGroupElement>
            <RowGroupElement className={'PlayerProfile__GameListContent'}>
                {player.games.map(game => <GameRow key={game.goldId} player={player} game={game} />)}
            </RowGroupElement>
        </TableElement>
    );
}

function GameRow({player, game}) {
    const mainIsBlack = game.black.discordId === player.discordId;
    const opponent = game.black.discordId === player.discordId ? game.white : game.black;
    const mainResult = game.result === "jigo" ? 'draw' :
                    (mainIsBlack && game.result === "black") || (!mainIsBlack && game.result === "white") ? 'victory' :
                    'defeat';
    return (
        <RowElement className={'PlayerProfile__GameItem'}>
            <CellElement className={'PlayerProfile__GameDate'}>{game.date}</CellElement>
            <CellElement className={'PlayerProfile__GameResult'}><span className={mainResult} /></CellElement>
            <CellElement className={'PlayerProfile__GameAvatar'}>
                <Avatar src={opponent.discordAvatar} alt={`avatar ${opponent.discordName}`} className={'PlayerProfile__GameAvatarPicture'}/>
            </CellElement>
            <CellElement className={'PlayerProfile__GameName'}>{opponent.discordName}</CellElement>
            <CellElement className={'PlayerProfile__GameTier'}>
                <img width="48" height="48" src={`/shields/shield-${opponent.tierRank}.svg`} alt={opponent.tierName}/>
                <p>{opponent.tierName}</p>
            </CellElement>
            <Link to={`/game/${game.goldId}`} />
        </RowElement>
    );
}

/**
 * The two FGC counters.
 *
 * The threshold is only worth printing while it is still a target: "2/4" says what is missing, but once the count is
 * met "5/4" reads like a cap that has been exceeded rather than a condition that is satisfied.
 */
function Stability({player}) {
    return (
        <div className={'PlayerProfile__Stability'}>
            {FGC_RULES.map(rule => (
                <StabilityItem
                    key={rule.key}
                    count={player[rule.key]}
                    threshold={rule.threshold}
                    text={'parties'}
                    goldSpan={rule.gold} />
            ))}
        </div>
    );
}

function StabilityItem({count, threshold, text, goldSpan}) {
    const valid = count >= threshold;

    return (
        <div className={'PlayerProfile__StabilityItem'}>
            <span className={valid ? 'valid' : 'invalid'} />
            <p className={'PlayerProfile__StabilityHighlight'}>{valid ? count : `${count}/${threshold}`}</p>
            <p className={'PlayerProfile__StabilityText'}>
                {text}
                {goldSpan && <span> GOLD</span>}
            </p>
        </div>
    );
}

function Tooltip() {
    return (
        <>
            <h2>Conditions de validation</h2>
            <p>Pour être valide une partie doit respecter tous ces paramètres :</p>
            <ul>
                <li>Partie classée</li>
                <li>Jouée sur OGS ou KGS</li>
                <li>Datant de moins de 30 jours</li>
                <li>Goban 19x19</li>
                <li>Pas de handicap</li>
                <li>Komi compris entre 6 et 9</li>
            </ul>
            <p>Une partie <span>GOLD</span> est une partie jouée entre 2 joueurs inscrits sur l'échelle.</p>
        </>
    );
}
