import {useState} from "react";
import {Link, Route, Routes} from 'react-router-dom';

import PlayerList from './Pages/PlayerList.jsx';
import PlayerProfile from './Pages/PlayerProfile.jsx';
import RecentGames from "./Pages/RecentGames.jsx";
import Game from "./Pages/Game";
import About from './Pages/About.jsx';

import './App.css';

function App() {
    const [navOpened, setNavOpened] = useState(false);

    return (
        <div className="App">
            <header className={'Header'}>
                <nav aria-label={'Principale'} className={'Nav'} data-open={navOpened ? 'true' : 'false'}>
                    <h1 className={'Title'}>
                        <Link to={'/'}>
                            <span className={'Title--mobile'}>GoLD</span>
                            <span className={'Title--desktop'}>Go Ladder for Discord</span>
                        </Link>
                    </h1>

                    <button className={'NavBtn CallToAction'} onClick={() => setNavOpened(!navOpened)}>
                        <span className={'NavBtn__line-1'}/>
                        <span className={'NavBtn__line-2'}/>
                        <span className={'NavBtn__line-3'}/>
                        <span className={'ReaderOnly'}>Navigation mobile</span>
                    </button>

                    <div className={'NavPanel'}>
                        <Link to={'/'} className={'CallToAction HomeLink'} onClick={() => setNavOpened(false)}>
                            Accueil
                        </Link>
                        <Link to={'/recent-games'} className={'CallToAction'} onClick={() => setNavOpened(false)}>
                            Parties récentes
                        </Link>
                        <Link to={'/about'} className={'CallToAction'} onClick={() => setNavOpened(false)}>
                            À propos
                        </Link>
                    </div>

                    <div className="NavPanel__backdrop" onClick={() => setNavOpened(false)}/>
                </nav>
            </header>

            <main>
                <Routes>
                    <Route path="/" element={<PlayerList/>}/>
                    <Route path="/recent-games" element={<RecentGames/>}/>
                    <Route path="/about" element={<About/>}/>

                    <Route path="/player/:playerId" element={<PlayerProfile/>}/>
                    <Route path="/game/:gameId" element={<Game/>}/>
                </Routes>
            </main>

            <footer className={'Footer'}>
                <p>Developed with ❤ by <a href="/player/236813095207436289">Drooxi</a>, <a
                    href="https://jules.trehorel.bzh/">Judas</a>, <a
                    href="https://theworldasastage.com/">NicoTupe</a> & <a
                    href="/player/119456225724334081">Valloa</a> for <a href="https://fulgurogo.be/">FulguroGo</a>.</p>
            </footer>
        </div>
    );
}

export default App;
