import { Route, Routes } from 'react-router-dom';

import Header from './Components/Header.jsx';
import Footer from './Components/Footer.jsx';
import StatusBanner from './Components/StatusBanner.jsx';

import About from './Pages/About.jsx';
import DiscordAuth from './Pages/DiscordAuth.jsx';
import Game from "./Pages/Game";
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

                    <Route path="/auth/discord" element={<DiscordAuth/>}/>

                    <Route path="/player/:playerId" element={<PlayerProfile/>}/>
                    <Route path="/game/:gameId" element={<Game/>}/>
                </Routes>
            </main>
            <Footer />
            <StatusBanner />
        </div>
    );
}
