function About() {
    return (
        <section className={'Explanation Container'}>
            <h2 className={'Explanation__title'}>À propos</h2>

            <img src="https://flagicons.lipis.dev/flags/4x3/fr.svg" alt={'Français'} className={'Explanation__flag'}/>
            <p lang={'fr-FR'} className={'Explanation__text'}>
                GO Ladder for Discord (GOLD) est une échelle de rang pour le jeu de Go destinée aux communautés Discord.
                Elle utilise les parties jouées sur KGS et OGS entre les joueurs inscrits.<br/>
                Plus d'infos en rejoignant le Discord <a href="https://discord.gg/fulgurogo">FulguroGo</a>.
            </p>

            <img src="https://flagicons.lipis.dev/flags/4x3/gb.svg" alt={'English'} className={'Explanation__flag'}/>
            <p lang={'en-US'} className={'Explanation__text'}>
                GO Ladder for Discord (GOLD) is a Go game ranking ladder aimed at Discord communities. It is based on
                the KGS & OGS games played by the subscribed players.<br/>
                More info in the <a href="https://discord.gg/fulgurogo">FulguroGo</a> Discord.
            </p>
        </section>
    );
}

export default About
