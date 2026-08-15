import { Route, Routes } from 'react-router-dom';

import Header from './Components/Header.jsx';
import Footer from './Components/Footer.jsx';

import About from './Pages/About.jsx';
import AccountLink from './Pages/AccountLink.jsx';
import DiscordAuth from './Pages/DiscordAuth.jsx';
import Game from "./Pages/Game";
import Health from './Pages/Health.jsx';
import Houses from './Pages/Houses.jsx';
import PlayerList from './Pages/PlayerList.jsx';
import PlayerProfile from './Pages/PlayerProfile.jsx';
import RecentGames from "./Pages/RecentGames.jsx";

import './App.css';
import './Common.css';

export default function App() {
    return (
        <div className="App">
            <Header />
            <main>
                <Routes>
                    <Route path="/" element={<PlayerList/>}/>
                    <Route path="/recent-games" element={<RecentGames/>}/>
                    <Route path="/about" element={<About/>}/>
                    <Route path="/player/:playerId" element={<PlayerProfile/>}/>
                    <Route path="/game/:gameId" element={<Game/>}/>
                    <Route path="/auth/discord" element={<DiscordAuth/>}/>
                    <Route path="/link" element={<AccountLink/>}/>
                    <Route path="/health" element={<Health/>}/>
                    {/* /houses is imposed by the server: HouseNotifier.HOUSES_PATH, and Discord announcements
                        already link to it. */}
                    <Route path="/houses" element={<Houses/>}/>
                </Routes>
            </main>
            <Footer />
        </div>
    );
}
