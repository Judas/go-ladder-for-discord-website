import { useState } from 'react';

import { drawQuiz, houseFromAnswers } from '../houseQuiz.js';

import './HouseQuiz.css';

/**
 * Le questionnaire qui désigne une maison : une question à la fois, quatre réponses, et un slug à la sortie.
 *
 * Il ne rejoint rien et ne connaît aucune route — il appelle `onResolved(slug)` une fois la dernière réponse donnée,
 * et c'est l'appelant qui affiche la maison trouvée et propose de la rejoindre. C'est ce qui permet de réutiliser le
 * bouton d'action du profil, avec ses états 403 / 409 / erreur, plutôt que de les réécrire ici.
 *
 * Les questions et le dépouillement sont dans `src/houseQuiz.js`. Ce composant ne connaît que la forme : une liste de
 * questions, chacune avec quatre réponses portant un slug de maison. Rien à changer ici quand le texte change.
 *
 * ⚠ Une réponse ne dit jamais quelle maison elle vise. Un questionnaire dont on lit le barème n'est qu'un menu, et
 * c'est exactement ce que le tirage au sort du serveur ne faisait pas.
 */
export default function HouseQuiz({onResolved}) {
    // Le tirage est fait une fois, à l'ouverture : refait à chaque rendu, il changerait les questions sous le joueur —
    // et « revenir à la question précédente » ne ramènerait pas celle qu'il vient de quitter.
    const [quiz] = useState(drawQuiz);
    const [answers, setAnswers] = useState([]);

    const question = quiz[answers.length];

    /*
     * Le dépouillement se fait ici, dans le gestionnaire, et pas au rendu : il contient un tirage au sort, et un
     * tirage refait à chaque rendu changerait de maison sous le joueur entre l'affichage du résultat et le clic qui
     * l'accepte.
     */
    const answer = house => {
        const next = [...answers, house];
        setAnswers(next);
        if (next.length === quiz.length) { onResolved(houseFromAnswers(next)); }
    };

    // La dernière réponse déclenche `onResolved` dans le même événement que le `setAnswers`, donc l'appelant a déjà
    // remplacé le questionnaire quand React repeint. Le garde-fou est là pour le cas où il ne le ferait pas.
    if (question == null) { return null; }

    return (
        <div className={'HouseQuiz'}>
            <p className={'HouseQuiz__Progress'}>Question {answers.length + 1} sur {quiz.length}</p>
            <div
                className={'HouseQuiz__Gauge'}
                style={{'--progress': `${(answers.length / quiz.length) * 100}%`}}
                aria-hidden={true} />

            <p className={'HouseQuiz__Question'}>{question.question}</p>

            <ul className={'HouseQuiz__Answers NoBulletList'}>
                {question.answers.map(possible => (
                    <li key={possible.house}>
                        <button
                            type={'button'}
                            className={'HouseQuiz__Answer'}
                            onClick={() => answer(possible.house)}>
                            {possible.label}
                        </button>
                    </li>
                ))}
            </ul>

            {/* Dix questions sans retour en arrière, c'est un clic malheureux qui décide d'une saison. */}
            {answers.length > 0 && (
                <button
                    type={'button'}
                    className={'HouseQuiz__Back'}
                    onClick={() => setAnswers(answers.slice(0, -1))}>
                    Revenir à la question précédente
                </button>
            )}
        </div>
    );
}
