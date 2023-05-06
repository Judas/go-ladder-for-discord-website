import {Route, Routes} from 'react-router-dom';

import Header from './Components/Header.jsx';
import Footer from './Components/Footer.jsx';

import PlayerList from './Pages/PlayerList.jsx';
import PlayerProfile from './Pages/PlayerProfile.jsx';
import RecentGames from "./Pages/RecentGames.jsx";
import Game from "./Pages/Game";
import About from './Pages/About.jsx';

import './App.css';

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
                </Routes>
            </main>

            <Footer />

        </div>
    );
}
