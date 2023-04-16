import './PlayerProfile.css'
import React, {useEffect, useState} from 'react';
import 'chart.js/auto'; // To avoid canvas problems
import {Link, Outlet, useMatch, useParams} from "react-router-dom";
import TableElement from "../Components/Table/TableElement";
import RowGroupElement from "../Components/Table/RowGroupElement";
import RowElement from "../Components/Table/RowElement";
import ColHeaderElement from "../Components/Table/ColHeaderElement";
import CellElement from "../Components/Table/CellElement";
import Loader from "../Components/Loader";
import HistoryChart, {historyToChartData} from "../Components/HistoryChart";
import Avatar from "../Components/Avatar";

const api_host = "/api/gold/api/v4";

export default function PlayerProfile() {
    const {playerId, gameId} = useParams()
    const [player, setPlayer] = useState(undefined)
    const [games, setGames] = useState([])
    const [data, setData] = useState(historyToChartData([]))
    const [currentGame, setCurrentGame] = useState(undefined);

    const [playerDataStatus, setPlayerDataStatus] = useState('pending');
    const [playerGamesStatus, setPlayerGamesStatus] = useState('pending');
    const [playerHistoryStatus, setPlayerHistoryStatus] = useState('pending');

    const isPlayerPage = useMatch('/players/:playerId');

    useEffect(() => {
        // get Player infos
        setPlayerGamesStatus('pending');
        setCurrentGame(undefined);
        const fetchPlayer = `${api_host}/${playerId}/profile`
        fetch(fetchPlayer)
            .then(res => {
                if (!res.ok) {
                    throw res.statusText;
                }
                return res;
            })
            .then(res => res.json())
            .then(res => {
                setPlayer(res);
                setPlayerDataStatus('success');
            })
            .catch(() => setPlayerDataStatus('error'));
    }, [playerId])

    useEffect(() => {
        if (playerDataStatus === 'success') {
            const fetchPlayerGames = `${api_host}/${playerId}/games`
            fetch(fetchPlayerGames)
                .then(res => {
                    if(!res.ok) {
                        throw res.statusText;
                    }
                    return res;
                })
                .then(res => res.json())
                .then(res => {
                    setGames(res);
                    setPlayerGamesStatus('success');
                })
                .catch(() => setPlayerGamesStatus('error'));

            const fetchPlayerHistory = `${api_host}/${playerId}/ratings`
            fetch(fetchPlayerHistory)
                .then(res => {
                    if(!res.ok) {
                        throw res.statusText;
                    }
                    return res;
                })
                .then(res => res.json())
                .then(res => {
                    setData(historyToChartData(res))
                    setPlayerHistoryStatus('success')
                })
                .catch(() => setPlayerHistoryStatus('error'));
        }
    }, [playerDataStatus, playerId]);

    useEffect(() => {
        setCurrentGame(gameId);
    }, [gameId])

    if (playerDataStatus === 'pending') {
        return <div style={{display: 'grid', height: '100%',}}>
            <Loader/>
        </div>
    }

    if (playerDataStatus === 'error') {
        return <div style={{display: 'grid', height: '100%',}}>
            <p className={'Error'}>Echec de la récupération des données du joueur.</p>
        </div>
    }

    return (
        <article className="PlayerPage">
            <div className="Card">
                <h2 className="CardHeader">
                    <Avatar src={player.avatar} size={60} className={'CardHeader__avatar'} alt={`avatar ${player.name}`} hidden={true}/>
                    <span>{player.name}</span>
                </h2>
                <div className="Card__content">
                    <section className="headline">
                        <div className="rank">
                            <span>{player.rank}</span>
                            <p>{player.fullRank}</p>
                        </div>
                        <div className="rating">
                            <span>{player.rating}</span>
                            <p>{player.fullRating}</p>
                        </div>
                    </section>
                    <section className="subline">
                        <h3 className={'PlayerPage__tableTitle'}>Dernières parties</h3>
                        {playerGamesStatus === 'pending' && <Loader/>}
                        {playerGamesStatus === 'error' && <p className={'Error'}>Echec de la récupération des parties</p>}
                        {playerGamesStatus === 'success' && games.length > 0 &&
                            <TableElement>
                                <RowGroupElement className={'ReaderOnly'}>
                                    <RowElement>
                                        <ColHeaderElement>
                                            Date
                                        </ColHeaderElement>
                                        <ColHeaderElement>
                                            serveur
                                        </ColHeaderElement>
                                        <ColHeaderElement>
                                            opposant
                                        </ColHeaderElement>
                                        <ColHeaderElement>
                                            opposant avatar
                                        </ColHeaderElement>
                                        {/*<ColHeaderElement>*/}
                                        {/*    opposant rating*/}
                                        {/*</ColHeaderElement>*/}
                                    </RowElement>
                                </RowGroupElement>
                                <RowGroupElement className={'PlayerTable__body'}>
                                    {games.map(game => <RowElement
                                        key={game.id}
                                        className={String(game.id) === currentGame ? "PlayerTable__row selected" : "PlayerTable__row"}
                                    >
                                        <CellElement className="Date">{game.date}</CellElement>
                                        <CellElement className="Server">{game.server}</CellElement>
                                        <CellElement className={'Name'}>
                                            {game.opponent.currentRank !== '?' ? (
                                                <Link  to={`/players/${game.opponent.discordId}`}>
                                                    {game.opponent.name}
                                                </Link>
                                            ) : <span>{game.opponent.name}</span>}
                                        </CellElement>
                                        <CellElement className="Portrait">
                                            <Avatar src={game.opponent.avatar} alt={`avatar ${game.opponent.name}`} className={'logo'}/>
                                        </CellElement>
                                        <CellElement className="Rank">{game.opponent.historicalRank}</CellElement>
                                        {/*<CellElement className="Rating">{game.opponent.historicalRating}</CellElement>*/}
                                        <CellElement className={'GameLink'}>
                                            <Link to={`/players/${playerId}/game/${game.id}`} className={'CallToAction'}>Voir</Link>
                                        </CellElement>
                                    </RowElement>)}
                                </RowGroupElement>
                            </TableElement>
                        }
                    </section>
                    {playerGamesStatus === 'success' && games.length === 0 &&
                        <div className="subline">
                            <p className={'NoGame'}>Aucune partie récente</p>
                        </div>
                    }
                </div>
            </div>

            <section>
                {isPlayerPage ?
                    <div className={'sidebar'}>
                        <h3 className={'ReaderOnly'}>Graphique</h3>
                        {playerHistoryStatus === 'pending' && <Loader/>}
                        {playerHistoryStatus === 'error' &&
                            <p className={'Error'}>Echec de la récupération de l'historique</p>}
                        {playerHistoryStatus === 'success' && <HistoryChart data={data}/>}
                    </div> :
                    <Outlet/>
                }
            </section>
        </article>
    )
}
