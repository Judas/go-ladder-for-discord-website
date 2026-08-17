/**
 * The closing of "La chute de l'Harmonie", shared by the two pages that carry the war it describes.
 *
 * It ends the story on /houses and opens the league on /league — the same words in both places, because the league
 * *is* that war: four houses still settling it on a goban. Written once so the two cannot drift apart, which is the
 * only real risk with a paragraph of prose living in two files.
 *
 * The lore is not in the database, and deliberately: the server's migration says it belongs to no single house and
 * lives in this repository.
 */
export default function LoreEpilogue() {
    return (
        <>
            <p className={'LoreEpilogue'} lang={'fr-FR'}>
                Depuis lors, les quatre clans s'affrontent dans des parties cérémonielles et des duels secrets, chacun
                croyant incarner la volonté originelle de Gold. Certains disent que lorsque le Jeu d'Or sera joué à
                nouveau dans sa forme parfaite — un plateau, quatre esprits, une vérité — Gold reviendra.
            </p>
            <p className={'LoreEpilogue LoreEpilogue--break'} lang={'fr-FR'}>
                Mais jusqu'à ce jour, la fracture demeure.<br/>
                Et sur le Goban, c'est la guerre des âmes qui se poursuit.
            </p>
        </>
    );
}
