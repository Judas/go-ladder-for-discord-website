import React, {useEffect, useState} from "react";
import GameDisplayer from "../Components/gameDisplayer";
import './lastGames.css';
import Loader from "../Components/Loader";
import Avatar from "../Components/avatar";
import {Link} from "react-router-dom";

export default function LastGames() {
    const [games, setGames] = useState([]);
    const [gamesStatus, setGamesStatus] = useState('pending');

    useEffect(() => {
        const api_host = "/api/gold/api/v4";

        const fetchGamesUrl = `${api_host}/games`;
        setGamesStatus('pending');

        fetch(fetchGamesUrl)
            .then(res => {
                if (!res.ok) {
                    throw res.statusText;
                }
                return res;
            })
            .then(res => res.json())
            .then(res => {
                setGames(res);
                setGamesStatus('success');
            })
            .catch(() => setGamesStatus('error'));
    }, []);

    if (gamesStatus === 'pending') {
        return <Loader/>;
    }

    if (gamesStatus === 'error') {
        return <p className={'Error'}>Pb de chargement</p>;
    }

    return (
        <div className={'LastGames'}>
            <h2 className={'LastGames__title'}>Dernières parties</h2>

            <ul className={'LastGames__list NoBulletList'}>
                {games.map(game => (
                    <li key={game.id}><GameCard game={game}/></li>
                ))}
            </ul>
        </div>
    );
}

function GameCard({game}) {
    const winnerPlayer = game.mainPlayer.winner ? game.mainPlayer : game.opponent;
    const black = game.mainPlayer.black ? game.mainPlayer : game.opponent;
    const white = !game.mainPlayer.black ? game.mainPlayer : game.opponent;

    return (
        <article className={'GameCard'}>
            <h3 className={'GameCard__title'}>
                <span className={`GameCard__mainPlayer ${game.mainPlayer === winnerPlayer ? 'winner' : ''}`}>
                    <Avatar src={game.mainPlayer.avatar} size={40} alt={game.mainPlayer.name}
                            className={'GameCard__avatar'}/>
                    <span>{game.mainPlayer.name}</span>
                </span>
                <span className={'GameCard__vs'}>vs</span>
                <span className={`GameCard__opponent ${game.opponent === winnerPlayer ? 'winner' : ''}`}>
                    <Avatar src={game.opponent.avatar} size={40} alt={game.opponent.name}
                            className={'GameCard__avatar'}/>
                    <span>{game.opponent.name}</span>
                </span>
            </h3>

            <p className={`GameCard__name black`}>
                <span>{black.name}</span> <span>({black.currentRank})</span>
            </p>
            <p className={`GameCard__name white`}>
                <span>{white.name}</span> <span>({white.currentRank})</span>
            </p>

            <div className={'GameCard__board'}>
                <GameDisplayer game={game} move={9999}/>
            </div>
            <Link to={`/players/${winnerPlayer.discordId}/game/${game.id}`}>
                <span className={'ReaderOnly'}>Voir la partie</span>
            </Link>
        </article>
    );
}
