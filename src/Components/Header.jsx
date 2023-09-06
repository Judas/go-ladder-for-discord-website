import { FaUsers } from 'react-icons/fa6';
import { IoMdInformationCircleOutline} from 'react-icons/io';
import { LuSwords } from 'react-icons/lu';
import { NavLink  } from 'react-router-dom';

import './Header.css';

export default function Header() {
    return (
        <nav className={'Header'}>
            <img 
                src='https://cdn.discordapp.com/app-icons/772833152434831381/39981f8231efcd7aebf265764ce80b7c.png'
                width={48}
                height={48}
                alt='FulguroGo' />

                <NavLink to={'/'} className={'NavLink'}>
                    <span className={'NavButton'}>
                        <FaUsers />
                        <span className={'NavButtonText'}>Joueurs</span>
                    </span>
                </NavLink>

                <NavLink to={'/recent-games'} className={'NavLink'}>
                    <span className={'NavButton'}>
                        <LuSwords />
                        <span className={'NavButtonText'}>Parties</span>
                    </span>
                </NavLink>

                <NavLink to={'/about'} className={'NavLink'}>
                    <span className={'NavButton'}>
                        <IoMdInformationCircleOutline />
                        <span className={'NavButtonText'}>À propos</span>
                    </span>
                </NavLink>
        </nav>
    );
}
