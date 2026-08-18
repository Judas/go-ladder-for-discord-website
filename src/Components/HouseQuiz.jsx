import { useState } from 'react';

import { drawQuiz } from '../houseQuiz.js';

import './HouseQuiz.css';

/**
 * Le questionnaire qui oriente vers une maison : une question à la fois, quatre réponses, et la liste des maisons
 * répondues à la sortie.
 *
 * Il ne dépouille rien, ne rejoint rien et ne connaît aucune route — il appelle `onCompleted(answers)` une fois la
 * dernière réponse donnée, avec un slug de maison par question posée, dans l'ordre où elles l'ont été. C'est
 * l'appelant qui en tire le bilan d'affinités et propose les maisons, ce qui lui permet de réutiliser le bouton
 * d'action du profil, avec ses états 403 / 409 / erreur, plutôt que de les réécrire ici.
 *
 * Les questions et le dépouillement sont dans `src/houseQuiz.js`. Ce composant ne connaît que la forme : une liste de
 * questions, chacune avec quatre réponses portant un slug de maison. Rien à changer ici quand le texte change.
 *
 * ⚠ Une réponse ne dit jamais quelle maison elle vise. Un questionnaire dont on lit le barème n'est qu'un menu — et le
 * bilan de la fin, lui, propose bien les quatre maisons : c'est là que le choix se fait, en connaissance de cause.
 */
export default function HouseQuiz({onCompleted}) {
    // Le tirage est fait une fois, à l'ouverture : refait à chaque rendu, il changerait les questions sous le joueur —
    // et « revenir à la question précédente » ne ramènerait pas celle qu'il vient de quitter.
    const [quiz] = useState(drawQuiz);
    const [answers, setAnswers] = useState([]);

    const question = quiz[answers.length];

    const answer = house => {
        const next = [...answers, house];
        setAnswers(next);
        if (next.length === quiz.length) { onCompleted(next); }
    };

    // La dernière réponse déclenche `onCompleted` dans le même événement que le `setAnswers`, donc l'appelant a déjà
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
