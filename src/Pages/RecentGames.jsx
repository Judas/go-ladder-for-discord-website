import { Link } from "react-router-dom";

import Loader from "../Components/Loader.jsx";
import Avatar from "../Components/Avatar.jsx";
import WGOPlayer from "../Components/WGOPlayer.jsx";
import useApi from "../hooks/useApi.js";

import './RecentGames.css';

export default function RecentGames() {
    const { status: gameFetchStatus, data } = useApi("/api/games");
    const games = data ?? [];

    switch(gameFetchStatus) {
        case 'success': return (
            <div className={'RecentGames'}>
                <h2 className={'PageTitle'}>Parties</h2>
                <ul className={'RecentGames__list NoBulletList'}>
                    {games.map(game => (
                        <li key={game.goldId}><GameCard game={game}/></li>
                    ))}
                </ul>
            </div>
        );
        case 'pending': return <div className={'FlexContainer'}><Loader/></div>;;
        case 'error':
        default :
            return <p className={'Error'}>Erreur lors de la récupération des parties</p>;
    }
}

function GameCard({game}) {
    return (
        <article className={'GameCard'}>
            <h3 className={'GameCard__title'}>
                <span className={`GameCard__player ${game.result === "black" ? 'winner' : ''}`}>
                    <Avatar src={game.black.discordAvatar} size={40} alt={game.black.discordName} className={'GameCard__avatar'}/>
                    <span>{game.black.discordName}</span>
                </span>
                <span className={'GameCard__vs'}>vs</span>
                <span className={`GameCard__player ${game.result === "white" ? 'winner' : ''}`}>
                    <Avatar src={game.white.discordAvatar} size={40} alt={game.white.discordName} className={'GameCard__avatar'}/>
                    <span>{game.white.discordName}</span>
                </span>
            </h3>

            <p className={`GameCard__name black`}>
                <span>{game.black.discordName}</span> <span className={`GameCard__tier`}>{game.black.tierName}</span>
            </p>

            <div className={'GameCard__board'}>
                <WGOPlayer sgf={game.sgf} gameLink={game.gameLink} move={42} />
            </div>

            <p className={`GameCard__name white`}>
                <span>{game.white.discordName}</span> <span className={`GameCard__tier`}>{game.white.tierName}</span>
            </p>

            <Link to={`/game/${game.goldId}`}><span className={'ReaderOnly'}>Voir la partie</span></Link>
        </article>
    );
}
