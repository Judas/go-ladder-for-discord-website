import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaCircleInfo } from "react-icons/fa6";

import Avatar from "../Components/Avatar.jsx";
import Crest from "../Components/Crest.jsx";
import Loader from "../Components/Loader.jsx";
import TableElement from "../Components/Table/TableElement.jsx";
import RowGroupElement from "../Components/Table/RowGroupElement.jsx";
import RowElement from "../Components/Table/RowElement.jsx";
import ColHeaderElement from "../Components/Table/ColHeaderElement.jsx";
import CellElement from "../Components/Table/CellElement.jsx";
import useApi from "../hooks/useApi.js";

import './House.css';

/**
 * The seven scoring columns, in the order `ApiHousePoints` declares them, with what each one is worth.
 *
 * The values are printed as a legend only. The figures themselves always come from the server, and so does `total` —
 * re-adding the seven here would make the site wrong the day the scale gains a column while the server stays right.
 */
const SCORING = [
    { key: 'played', emoji: '🎮', worth: 1, label: 'Partie jouée' },
    { key: 'goldOpponent', emoji: '🏅', worth: 2, label: 'Adversaire GOLD' },
    { key: 'rivalHouse', emoji: '⚔️', worth: 2, label: 'Adversaire dans une maison rivale' },
    { key: 'longGame', emoji: '⏳', worth: 2, label: 'Partie longue' },
    { key: 'victory', emoji: '🏆', worth: 2, label: 'Victoire' },
    { key: 'evenGame', emoji: '⚖️', worth: 1, label: 'Partie à égalité' },
    { key: 'ranked', emoji: '🎓', worth: 1, label: 'Partie classée' },
];

export default function House() {
    const { slug } = useParams();
    const [scoringVisible, setScoringVisible] = useState(false);

    // acceptErrorStatus stays off: this API answers 404 with an empty body, so there is nothing to parse. The code
    // rides along with the failure instead — see useApi.
    const { status, data, httpStatus } = useApi(`/api/house/${slug}`);

    if (status === 'pending') {
        return <div className={'FlexContainer'}><Loader/></div>;
    }

    if (status === 'error') {
        return (
            <section className={'House Container'}>
                <h2 className={'PageTitle PageTitle--standalone'}>Maison introuvable</h2>
                <p className={'Error'}>
                    {httpStatus === 404
                        ? `Aucune maison ne porte le nom « ${slug} ».`
                        : 'Erreur lors de la récupération de la maison'}
                </p>
                <p className={'House__Back'}><Link to={'/houses'}>Retour aux maisons</Link></p>
            </section>
        );
    }

    const { house, members } = data;

    return (
        <section className={`House House--${house.slug} Container`} style={{'--house-color': house.color}}>
            <h2 className={'PageTitle PageTitle--standalone'}>{house.name}</h2>

            <header className={'House__Identity'}>
                <Crest slug={house.slug} name={house.name} size={148} className={'House__Crest'} />
                <p className={'House__Tagline'}>{house.tagline}</p>
                <dl className={'House__Figures'}>
                    <div>
                        <dt>Points</dt>
                        <dd>{house.totalPoints}</dd>
                    </div>
                    <div>
                        <dt>Membres</dt>
                        <dd>{house.memberCount}</dd>
                    </div>
                </dl>
            </header>

            <p className={'House__Description'} lang={'fr-FR'}>{house.description}</p>

            <div className={'House__RankingHeader'}>
                <h3 className={'House__RankingTitle'}>Classement</h3>
                <button
                    type="button"
                    className={'House__ScoringButton'}
                    onClick={() => setScoringVisible(true)}
                    aria-label={'Comment les points sont comptés'}>
                    <FaCircleInfo />
                </button>
            </div>

            <Ranking members={members} memberCount={house.memberCount} />

            {scoringVisible && (
                <div className={'Tooltip'}>
                    <button className={'CallToAction'} onClick={() => setScoringVisible(false)}>
                        <span className={'ReaderOnly'}>Fermer</span>
                    </button>
                    <Scoring />
                </div>
            )}
        </section>
    );
}

function Ranking({members, memberCount}) {
    if (members.length === 0) {
        return <p className={'House__NoMember'}>Aucun membre pour l'instant.</p>;
    }

    return (
        <>
            {/*
              * Everything on one line, as the old Exam Hunter ranking did: the seven scoring columns are narrow and
              * fixed, and their headers are an emoji with the real label kept for screen readers. Written out, the
              * seven names would need more width than the figures they label.
              */}
            <div className={'House__RankingScroll'}>
                <TableElement className={'House__Ranking'}>
                    <RowGroupElement className={'House__RankingHead'}>
                        <RowElement>
                            <ColHeaderElement className={'House__Rank'}><span className={'ReaderOnly'}>Rang</span></ColHeaderElement>
                            <ColHeaderElement className={'House__Avatar'}><span className={'ReaderOnly'}>Avatar</span></ColHeaderElement>
                            <ColHeaderElement className={'House__Name'}><span className={'ReaderOnly'}>Joueur</span></ColHeaderElement>
                            {SCORING.map(column => (
                                <ColHeaderElement key={column.key} className={'House__Point'} title={column.label}>
                                    <span className={'ReaderOnly'}>{column.label}</span>{column.emoji}
                                </ColHeaderElement>
                            ))}
                            <ColHeaderElement className={'House__Total'}>Points</ColHeaderElement>
                        </RowElement>
                    </RowGroupElement>
                    <RowGroupElement className={'House__RankingBody'}>
                        {members.map(member => <MemberRow key={member.discordId} member={member} />)}
                    </RowGroupElement>
                </TableElement>
            </div>

            {/*
              * memberCount counts the house's members; this list only holds the ones with a Discord profile row, so
              * it can be the shorter of the two. Saying so beats letting the two numbers quietly disagree.
              */}
            {memberCount > members.length && (
                <p className={'House__Missing'}>
                    {memberCount - members.length} membre{memberCount - members.length > 1 ? 's' : ''} sans profil
                    Discord {memberCount - members.length > 1 ? 'ne sont pas affichés' : "n'est pas affiché"}.
                </p>
            )}
        </>
    );
}

/**
 * One line of the ranking.
 *
 * `rank` is a **competition** rank — equal totals share it and the next one skips, so two players on 17 points are
 * both 1st and the next is 3rd. It is printed as served, never counted off the row's position.
 */
function MemberRow({member}) {
    return (
        <RowElement className={'House__Row'}>
            <CellElement colIndex={1} className={'House__Rank'}>{member.rank}</CellElement>
            <CellElement colIndex={2} className={'House__Avatar'}>
                <Avatar src={member.discordAvatar} size={40} alt={''} hidden={true} />
            </CellElement>
            <CellElement colIndex={3} className={'House__Name'}>{member.discordName ?? member.discordId}</CellElement>
            {SCORING.map((column, index) => (
                <CellElement key={column.key} colIndex={4 + index} className={'House__Point'}>
                    {member.points[column.key]}
                </CellElement>
            ))}
            <CellElement colIndex={11} className={'House__Total'}>{member.points.total}</CellElement>
            <Link to={`/player/${member.discordId}`} />
        </RowElement>
    );
}

/**
 * What the overlay says. It is also the only place the header emoji are mapped back to what they count, so it is
 * load-bearing rather than decorative — see the SCORING comment.
 */
function Scoring() {
    return (
        <>
            <ul className={'House__ScoringList NoBulletList'}>
                {SCORING.map(column => (
                    <li key={column.key}>
                        <span className={'House__ScoringEmoji'} aria-hidden={true}>{column.emoji}</span>
                        <span className={'House__ScoringWorth'}>+{column.worth}</span>
                        <span className={'House__ScoringLabel'}>{column.label}</span>
                    </li>
                ))}
            </ul>
            <p>Une partie cumule les lignes qu'elle vérifie : une victoire longue et classée contre un membre d'une
                maison adverse compte pour huit points.</p>
        </>
    );
}
