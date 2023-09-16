import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaMedal, FaStar } from 'react-icons/fa6';
import TableElement from "../Components/Table/TableElement.jsx";
import RowGroupElement from "../Components/Table/RowGroupElement.jsx";
import RowElement from "../Components/Table/RowElement.jsx";
import ColHeaderElement from "../Components/Table/ColHeaderElement.jsx";
import CellElement from "../Components/Table/CellElement.jsx";
import Loader from "../Components/Loader.jsx";
import Avatar from "../Components/Avatar.jsx";

import './ExamHunter.css'

export default function ExamHunter() {
    // Ranking
    const [ranking, setRanking] = useState(undefined)
    const [rankingFetchStatus, setRankingFetchStatus] = useState('pending');
    useEffect(() => {
        fetch(`/api/exam/ranking`)
            .then(res => {
                if (!res.ok) { throw res.statusText; }
                return res;
            })
            .then(res => res.json())
            .then(res => {
                setRanking(res);
                setRankingFetchStatus('success');
            })
            .catch(() => setRankingFetchStatus('error'));
    }, []);
    
    // Titles
    const [titles, setTitles] = useState(undefined)
    const [titlesFetchStatus, setTitlesFetchStatus] = useState('pending');
    useEffect(() => {
        fetch(`/api/exam/titles`)
            .then(res => {
                if (!res.ok) { throw res.statusText; }
                return res;
            })
            .then(res => res.json())
            .then(res => {
                setTitles(res);
                setTitlesFetchStatus('success');
            })
            .catch(() => setTitlesFetchStatus('error'));
    }, []);
    
    const [history, setHistory] = useState(undefined)
    const [historyFetchStatus, setHistoryFetchStatus] = useState('pending');
    useEffect(() => {
        fetch(`/api/exam/history`)
            .then(res => {
                if (!res.ok) { throw res.statusText; }
                return res;
            })
            .then(res => res.json())
            .then(res => {
                setHistory(res);
                setHistoryFetchStatus('success');
            })
            .catch(() => setHistoryFetchStatus('error'));
    }, []);

    const [stats, setStats] = useState(undefined)
    const [statsFetchStatus, setStatsFetchStatus] = useState('pending');
    useEffect(() => {
        fetch(`/api/exam/stats`)
            .then(res => {
                if (!res.ok) { throw res.statusText; }
                return res;
            })
            .then(res => res.json())
            .then(res => {
                setStats(res);
                setStatsFetchStatus('success');
            })
            .catch(() => setStatsFetchStatus('error'));
    }, []);

    if (rankingFetchStatus === 'success' && titlesFetchStatus === 'success' && historyFetchStatus === 'success' && statsFetchStatus === 'success') {
        return <Ranking ranking={ranking} titles={titles} history={history} stats={stats} />;
    } else if (rankingFetchStatus === 'pending' || titlesFetchStatus === 'pending' || historyFetchStatus === 'pending' && statsFetchStatus === 'pending') {
        return <div className={'FlexContainer'}><Loader/></div>;
    } else {
        return <div style={{display: 'grid', height: '100%',}}><p className={'Error'}>Echec lors de la récupération du classement.</p></div>;
    }
}

function Ranking({ranking, titles, history, stats}) {
    return (
        <article className={'Exam'}>
            <div className={'Exam__LeftColumn'}>
                <div className={'Card'}>
                    <TableElement className={'ExamRanking'}>
                        <RowGroupElement className={'ExamRanking__THead'}>
                            <RowElement>
                                <ColHeaderElement><span className={'ReaderOnly'}>Avatar</span></ColHeaderElement>
                                <ColHeaderElement><span className={'ReaderOnly'}>Hunter</span></ColHeaderElement>
                                <ColHeaderElement><span className={'ReaderOnly'}>Pseudo</span></ColHeaderElement>
                                <ColHeaderElement><span className={'ReaderOnly'}>Total</span></ColHeaderElement>
                                <ColHeaderElement><span className={'ReaderOnly'}>Participation</span>🕵️‍</ColHeaderElement>
                                <ColHeaderElement><span className={'ReaderOnly'}>Communauté</span>🔍</ColHeaderElement>
                                <ColHeaderElement><span className={'ReaderOnly'}>Patience</span>🗿</ColHeaderElement>
                                <ColHeaderElement><span className={'ReaderOnly'}>Victoire</span>💰</ColHeaderElement>
                                <ColHeaderElement><span className={'ReaderOnly'}>Raffinement</span>🍽️</ColHeaderElement>
                                <ColHeaderElement><span className={'ReaderOnly'}>Performance</span>🦖</ColHeaderElement>
                                <ColHeaderElement><span className={'ReaderOnly'}>Prouesse</span>☠️</ColHeaderElement>
                                <ColHeaderElement><span className={'ReaderOnly'}>Ratio</span>🎯</ColHeaderElement>
                            </RowElement>
                        </RowGroupElement>
                        <RowGroupElement className={'ExamRanking__TBody'}>
                            {ranking.length === 0  && <p className={'ErrorRow'}>Aucun résultat</p>}
                            {ranking.length > 0  && ranking.map(player => <ExamRow key={player.discordId} player={player} />)}
                        </RowGroupElement>
                    </TableElement>
                </div>
            </div>

            <div className={'Exam__RightColumn'}>
                <div className={'CardHighlighted'}>
                    <h2 className={'CardHeader'}><span>Titres</span></h2>
                    <TableElement className={'ExamTitle'}>
                        <RowGroupElement className={'ReaderOnly'}>
                            <RowElement>
                                <ColHeaderElement>Titre</ColHeaderElement>
                                <ColHeaderElement>Emoji</ColHeaderElement>
                                <ColHeaderElement>Etoiles</ColHeaderElement>
                                <ColHeaderElement>Pseudo</ColHeaderElement>
                            </RowElement>
                        </RowGroupElement>
                        <RowGroupElement className={'   '}>
                            {titles.map(title => <TitleRow title={title} />)}
                        </RowGroupElement>
                    </TableElement>
                </div>
                <div className={'Card'}>
                    <h2 className={'CardHeader'}><span>Statistiques</span></h2>
                    <ExamStats stats={stats} />
                </div>
                <div className={'Card'}>
                    <h2 className={'CardHeader'}><span>Promotions passées</span></h2>
                    <ExamHistory history={history} />
                </div>
            </div>
        </article>
    );
}

function ExamRow({player}) {
    return (
        <RowElement>
            <CellElement colIndex={1} className={'ExamRanking__Avatar'}><Avatar size={40} src={player.avatar} alt={`avatar ${player.name}`} className={'ExamRanking__AvatarPicture'} /></CellElement>
            <CellElement colIndex={2} className={'ExamRanking__Hunter'}>{player.hunter ? <FaMedal/> : <></>}</CellElement>
            <CellElement colIndex={3} className={'ExamRanking__Pseudo'}>{player.name}</CellElement>
            <CellElement colIndex={4} className={'ExamRanking__Total'}>{player.total}</CellElement>
            <CellElement colIndex={5} className={'ExamRanking__Participation'}>{player.participation}</CellElement>
            <CellElement colIndex={6} className={'ExamRanking__Community'}>{player.community}</CellElement>
            <CellElement colIndex={7} className={'ExamRanking__Patience'}>{player.patience}</CellElement>
            <CellElement colIndex={8} className={'ExamRanking__Victory'}>{player.victory}</CellElement>
            <CellElement colIndex={9} className={'ExamRanking__Refinement'}>{player.refinement}</CellElement>
            <CellElement colIndex={10} className={'ExamRanking__Performance'}>{player.performance}</CellElement>
            <CellElement colIndex={11} className={'ExamRanking__Achievement'}>{player.achievement}</CellElement>
            <CellElement colIndex={12} className={'ExamRanking__Ratio'}>{player.ratio}</CellElement>
            <Link to={`/player/${player.discordId}`} />
        </RowElement>
    );
}

function TitleRow({title}) {
    let stars;
    if (title.stars === 0) {
        stars = (<></>);
    } else {
        let starsList = [];
        for (let i = 0; i < title.stars; i++) {
            starsList.push(<FaStar/>);
        }
        stars = (<>{starsList}</>);
    }

    return (
        <RowElement key={title.title} className={'ExamTitle__Item'}>
            <CellElement className={'ExamTitle__Name'}>{title.title}</CellElement>
            <CellElement className={'ExamTitle__Emoji'}>{title.emoji}</CellElement>
            <CellElement className={'ExamTitle__Stars'}>{stars}</CellElement>
            <CellElement className={'ExamTitle__Pseudo'}>{title.name}</CellElement>
        </RowElement>
    );
}

function ExamStats({stats}) {
    return (
        <div className={'ExamStats'}>
            <StatItem highlight={`${stats.players}`} text={`joueurs actifs`} />
            <StatItem highlight={`${stats.games}`} text={`parties jouées`} />
            <StatItem highlight={`${stats.communityGames}`} text={`parties communautaires`} />
            <StatItem highlight={`${stats.totalPoints}`} text={`points accumulés`} />
        </div>
    );
}

function StatItem({highlight, text}) {
    return (
        <div className={'ExamStats__StatItem'}>
            <p className={'ExamStats__StatHighlight'}>{highlight}</p>
            <p className={'ExamStats__StatText'}>{text}</p>
        </div>
    );
}

function ExamHistory({history}) {
    return (
        <TableElement className={'ExamHistory'}>
            <RowGroupElement>
                <RowElement className={'ExamHistory__PromoHeader'}>
                    <ColHeaderElement className={'ExamHistory__PromoName'}>Date</ColHeaderElement>
                    <ColHeaderElement className={'ExamHistory__PromoPlayers'}>Joueurs</ColHeaderElement>
                    <ColHeaderElement className={'ExamHistory__PromoGames'}>Parties</ColHeaderElement>
                    <ColHeaderElement className={'ExamHistory__PromoScore'}>Points</ColHeaderElement>
                </RowElement>
            </RowGroupElement>
            <RowGroupElement className={'ExamHistory__Content'}>
                {history.map(promo => <PromoRow promo={promo} />)}
            </RowGroupElement>
        </TableElement>
    );
}

function PromoRow({promo}) {
    return (
        <RowElement key={promo.name} className={'ExamHistory__PromoItem'}>
            <CellElement className={'ExamHistory__PromoName'}>{promo.promo}</CellElement>
            <CellElement className={'ExamHistory__PromoPlayers'}>{promo.players}</CellElement>
            <CellElement className={'ExamHistory__PromoGames'}>{promo.games}</CellElement>
            <CellElement className={'ExamHistory__PromoScore'}>{promo.score}</CellElement>
        </RowElement>
    );
}
