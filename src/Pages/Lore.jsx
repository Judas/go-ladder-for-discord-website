import Crest from "../Components/Crest.jsx";
import LoreEpilogue from "../Components/LoreEpilogue.jsx";

import './Lore.css';

/**
 * Where the four houses went after the Partie des Ruptures, each line beside its crest, the crests alternating left
 * and right.
 *
 * The names are the ones the story itself uses, not the ones /api/houses serves: this page fetches nothing, and they
 * only serve as alt text beside prose that already spells them out.
 */
const EXILES = [
    {
        slug: 'HORDE_DU_FROID',
        name: 'Horde du Froid',
        text: "Et ainsi, la Horde du Froid s'exila vers le nord, jurant de vaincre par la force et la prise.",
    },
    {
        slug: 'NEXUS_ALPHA',
        name: 'Nexus Alpha',
        text: "Le Nexus Alpha descendit dans les souterrains de quartz, y érigeant des calculateurs d'obsidienne pour "
            + "décrypter l'univers.",
    },
    {
        slug: 'SABRE_SILENCIEUX',
        name: 'Sabre Silencieux',
        text: "Le Sabre Silencieux partit vers les forêts de brume, méditant sur l'honneur dans la solitude des pierres "
            + "moussues.",
    },
    {
        slug: 'LUNAIRES_AETHER',
        name: "Lunaires d'Æther",
        text: "Et les Lunaires d'Æther, errants et insaisissables, s'élancèrent vers les îles célestes, là où les "
            + "constellations prennent forme.",
    },
];

/**
 * "La chute de l'Harmonie", the story behind the four houses and the league.
 *
 * Static on purpose: the lore is not in the database — the server's migration says it belongs to no single house and
 * lives in this repository — so this page fetches nothing. It used to close the /houses page and has its own place in
 * the Aurak menu since.
 */
export default function Lore() {
    return (
        <section className={'Lore Container'}>
            <h2 className={'PageTitle'}>Lore</h2>

            <article className={'Lore__Story'} lang={'fr-FR'}>
                <h3>La chute de l'Harmonie</h3>

                <p>
                    Il fut un temps où la main et l'esprit ne faisaient qu'un. Un temps ancien, oublié de la plupart,
                    chanté seulement par les plus vieux bardes. Un temps où les Quatre n'étaient pas Quatre, mais Un,
                    rassemblés autour du Jeu d'Or, don sacré de l'entité divine Gold.
                </p>
                <p>
                    Gold, l'Incréé, était la Source et le But. On racontait qu'il avait façonné le premier plateau dans
                    la nuit du néant, et posé la première pierre pour éclairer les ténèbres. Ses serviteurs, les anciens
                    maîtres, enseignèrent aux mortels les règles parfaites, le rythme céleste des coups, et la sagesse
                    du silence entre les pierres. Ce peuple élu, qui portait alors le nom de Synalithes, vivait en paix
                    dans le Temple des 361 Voies, dressé au sommet du Mont Tengen, là où le ciel touche la terre.
                </p>
                <p>
                    Ils jouaient non pour vaincre, mais pour comprendre. Les parties duraient des jours, des semaines,
                    parfois des mois. Chaque mouvement était une offrande à Gold, chaque forme une prière, chaque
                    victoire une illumination.
                </p>
                <p className={'Lore__Break'}>Mais la perfection est une flamme fragile.</p>
                <p>
                    Nul ne sait ce qui survint. Certains parlent d'une partie interdite, jouée à huis clos dans la
                    crypte du Temple, où une question fut posée à Gold : « Peut-il y avoir une seule voie vers la
                    vérité ? » D'autres murmurent qu'un disciple brisa l'Œil de Vie, un artefact sacré que nul ne devait
                    toucher. Il y eut un bruit de rupture, un frisson dans l'air, un battement d'aile qui fit trembler
                    les fondations du Temple.
                </p>
                <p className={'Lore__Break'}>Puis vint la Disparition de Gold.</p>
                <p>
                    Son absence creusa un vide que l'unité ne put combler. Les maîtres commencèrent à douter. Puis à
                    discuter. Puis à se défier. Une grande partie fut annoncée, la Partie des Ruptures, où les quatre
                    courants naissants s'affrontèrent pour décider de la nouvelle voie.
                </p>
                <p>
                    Le plateau fut dressé, immense, couvrant toute la plaine d'Aurak. Les pierres, taillées dans
                    l'obsidienne et l'ivoire lunaire, vibraient d'énergie. Mais aucun vainqueur ne fut jamais désigné,
                    car à l'instant même où la dernière pierre fut posée, le plateau se fendit en quatre, comme frappé
                    par un éclair invisible. Chacun recula, chacun accusa, chacun jura de ne jamais oublier.
                </p>
                <ul className={'Lore__Exiles'}>
                    {EXILES.map(({slug, name, text}, i) => (
                        <li key={slug} className={i % 2 ? 'Lore__Exile Lore__Exile--Right' : 'Lore__Exile'}>
                            <Crest slug={slug} name={name} size={120} />
                            <p>{text}</p>
                        </li>
                    ))}
                </ul>
                {/* The last two paragraphs are shared with /league, where they open the page — same war, same words. */}
                <LoreEpilogue />
            </article>
        </section>
    );
}
