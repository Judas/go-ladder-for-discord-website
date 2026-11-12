import LiveGames from './LiveGames.jsx';
import RecentGames from './RecentGames.jsx';

import './Games.css';

/**
 * The home page: the games in progress, then the recent ones. Each section fetches on its own, so a stale live list
 * (503) or a slow one never holds back the recent games.
 */
export default function Games() {
    return (
        <div className={'Games'}>
            <h2 className={'PageTitle PageTitle--standalone'}>Parties</h2>
            <LiveGames />
            <RecentGames />
        </div>
    );
}
