import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import GameViewer from "../Components/Goban/GameViewer";
import Loader from "../Components/Loader";
import Avatar from "../Components/Avatar";

import './RecentGames.css';

export default function RecentGames() {
    const [games, setGames] = useState([]);
    const [gameFetchStatus, setGameFetchStatus] = useState('pending');

    useEffect(() => {
        setGameFetchStatus('pending');

        fetch("/api/games")
            .then(res => {
                if (!res.ok) { throw res.statusText; }
                return res;
            })
            .then(res => res.json())
            .then(res => {
                setGames(res);
                setGameFetchStatus('success');
            })
            .catch(() => setGameFetchStatus('error'));
    }, []);

    switch(gameFetchStatus) {
        case 'success': return (
            <div className={'RecentGames'}>
                <h2 className={'RecentGames__title'}>Parties</h2>
                <ul className={'RecentGames__list NoBulletList'}>
                    {games.map(game => (
                        <li key={game.id}><GameCard game={game}/></li>
                    ))}
                </ul>
            </div>
        );
        case 'pending': return <Loader/>;
        case 'error':
        default :
            return <p className={'Error'}>Erreur lors de la récupération des parties</p>;
    }
}

function GameCard({game}) {
    return (
        <article className={'GameCard'}>
            <h3 className={'GameCard__title'}>
                <span className={`GameCard__player ${game.black.winner ? 'winner' : ''}`}>
                    <Avatar src={game.black.avatar} size={40} alt={game.black.name} className={'GameCard__avatar'}/>
                    <span>{game.black.name}</span>
                </span>
                <span className={'GameCard__vs'}>vs</span>
                <span className={`GameCard__player ${game.white.winner ? 'winner' : ''}`}>
                    <Avatar src={game.white.avatar} size={40} alt={game.white.name} className={'GameCard__avatar'}/>
                    <span>{game.white.name}</span>
                </span>
            </h3>

            <p className={`GameCard__name black`}>
                <span>{game.black.name}</span> <span className={`GameCard__tier`}>{game.black.historicalRating.tierName}</span>
            </p>

            <div className={'GameCard__board'}>
                <GameViewer game={game} move={42}/>
            </div>

            <p className={`GameCard__name white`}>
                <span>{game.white.name}</span> <span className={`GameCard__tier`}>{game.white.historicalRating.tierName}</span>
            </p>

            <Link to={`/game/${game.id}`}><span className={'ReaderOnly'}>Voir la partie</span></Link>
        </article>
    );
}
