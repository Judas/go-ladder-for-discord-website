import { Route, Routes } from 'react-router-dom';

import Header from './Components/Header.jsx';
import Footer from './Components/Footer.jsx';

import About from './Pages/About.jsx';
import AccountLink from './Pages/AccountLink.jsx';
import AdminLogs from './Pages/AdminLogs.jsx';
import DiscordAuth from './Pages/DiscordAuth.jsx';
import Game from "./Pages/Game";
import Games from './Pages/Games.jsx';
import Health from './Pages/Health.jsx';
import House from './Pages/House.jsx';
import Houses from './Pages/Houses.jsx';
import League from './Pages/League.jsx';
import LeagueSession from './Pages/LeagueSession.jsx';
import PlayerList from './Pages/PlayerList.jsx';
import PlayerProfile from './Pages/PlayerProfile.jsx';

import './App.css';
import './Common.css';

export default function App() {
    return (
        <div className="App">
            <Header />
            <main>
                <Routes>
                    <Route path="/" element={<Games/>}/>
                    <Route path="/game/:gameId" element={<Game/>}/>

                    <Route path="/players" element={<PlayerList/>}/>
                    <Route path="/player/:playerId" element={<PlayerProfile/>}/>

                    <Route path="/auth/discord" element={<DiscordAuth/>}/>
                    <Route path="/link" element={<AccountLink/>}/>

                    <Route path="/houses" element={<Houses/>}/>
                    <Route path="/house/:slug" element={<House/>}/>

                    <Route path="/league" element={<League/>}/>
                    <Route path="/league/session/:number" element={<LeagueSession/>}/>

                    <Route path="/admin" element={<AdminLogs/>}/>
                    <Route path="/health" element={<Health/>}/>

                    <Route path="/about" element={<About/>}/>
                </Routes>
            </main>
            <Footer />
        </div>
    );
}
