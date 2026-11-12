import { useEffect, useRef, useState } from 'react';
import { FaUsers, FaDiscord, FaShieldHalved, FaTrophy, FaUserShield, FaPeopleGroup, FaScroll, FaHeartPulse } from 'react-icons/fa6';
import { GiCastle } from 'react-icons/gi';
import { IoMdInformationCircleOutline} from 'react-icons/io';
import { TbGoGame } from 'react-icons/tb';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '../auth.js';
import Avatar from './Avatar.jsx';

import './Header.css';

/*
 * The navigation, as data. A group has no page of its own: it only opens its menu. `matches` decides when the group
 * reads as active, which covers the pages reached from inside a section (a profile, a game, a house, a session) and
 * not only the ones listed in its menu.
 */
const COMMUNITY = {
    label: 'Communauté',
    icon: <FaPeopleGroup />,
    matches: path => path === '/' || /^\/(players?|game)(\/|$)/.test(path),
    links: [
        { to: '/', label: 'Parties', icon: <TbGoGame />, end: true },
        { to: '/players', label: 'Joueurs', icon: <FaUsers /> },
    ],
};

const AURAK = {
    label: 'Aurak',
    icon: <GiCastle />,
    matches: path => /^\/(houses?|league)(\/|$)/.test(path),
    links: [
        { to: '/houses', label: 'Maisons', icon: <FaShieldHalved /> },
        { to: '/league', label: 'Ligue', icon: <FaTrophy /> },
    ],
};

const ADMIN = {
    label: 'Admin',
    icon: <FaUserShield />,
    matches: path => /^\/(admin|health)(\/|$)/.test(path),
    links: [
        { to: '/admin', label: 'Logs', icon: <FaScroll /> },
        { to: '/health', label: 'Services', icon: <FaHeartPulse /> },
    ],
};

export default function Header() {
    const { profile } = useAuth();

    let authButton;
    if (profile != null) {
        authButton = (
            <Link to={`/player/${profile.discordId}`} >
                <Avatar size={48} src={profile.avatar} alt={`avatar ${profile.name}`} />
            </Link>
        );
    } else {
        authButton = (
            <Link className={'DiscordAuth'} to={import.meta.env.VITE_DISCORD_AUTH_URL}>
                <span className={'NavButton'}>
                    <FaDiscord />
                    <span className={'NavButtonText'}>Discord</span>
                </span>
            </Link>
        );
    }

    return (
        <nav className={'Header'}>
            <Link to={'/'} className={'Header__Home'} aria-label={'Accueil'}>
                <img
                    src='https://cdn.discordapp.com/app-icons/772833152434831381/39981f8231efcd7aebf265764ce80b7c.png'
                    width={48}
                    height={48}
                    alt='FulguroGo' />
            </Link>

                <NavGroup group={COMMUNITY} />
                <NavGroup group={AURAK} />
                {profile?.admin === true && <NavGroup group={ADMIN} />}

                <NavLink to={'/about'} className={'NavLink'}>
                    <span className={'NavButton'}>
                        <IoMdInformationCircleOutline />
                        <span className={'NavButtonText'}>À propos</span>
                    </span>
                </NavLink>

                {authButton}
        </nav>
    );
}

/**
 * A section of the navigation: a button that opens a menu of links, never a link itself.
 *
 * Opened on click rather than hover so it behaves the same on a phone. It closes when a link is followed, on Escape,
 * and on a click anywhere else.
 */
function NavGroup({ group }) {
    const [open, setOpen] = useState(false);
    const { pathname } = useLocation();
    const ref = useRef(null);
    const menuId = `NavGroup-${group.label}`;

    useEffect(() => {
        if (!open) return undefined;

        const onPointerDown = event => {
            if (ref.current && !ref.current.contains(event.target)) setOpen(false);
        };
        const onKeyDown = event => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const active = group.matches(pathname);

    return (
        <div className={'NavGroup'} ref={ref}>
            <button
                type={'button'}
                className={`NavLink NavGroup__Toggle${active ? ' active' : ''}${open ? ' open' : ''}`}
                aria-expanded={open}
                aria-controls={menuId}
                onClick={() => setOpen(o => !o)}
            >
                <span className={'NavButton'}>
                    {group.icon}
                    <span className={'NavButtonText'}>{group.label}</span>
                </span>
            </button>

            <ul id={menuId} className={'NavGroup__Menu NoBulletList'} hidden={!open}>
                {group.links.map(link => (
                    <li key={link.to}>
                        <NavLink to={link.to} end={link.end} className={'NavGroup__Link'} onClick={() => setOpen(false)}>
                            {link.icon}
                            <span>{link.label}</span>
                        </NavLink>
                    </li>
                ))}
            </ul>
        </div>
    );
}
