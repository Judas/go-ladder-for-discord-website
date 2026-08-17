import { describe, expect, it } from 'vitest';

import { HOUSE_QUIZ_POOL, HOUSE_SLUGS, QUIZ_LENGTH, drawQuiz, houseFromAnswers, leaders, tally } from './houseQuiz.js';
import { housesPopulated } from './__fixtures__/houses.js';

/**
 * Un tirage reproductible, pour que « mélangé » soit vérifiable. Un générateur congruentiel suffit : on ne lui demande
 * pas d'être un bon hasard, seulement d'être le même à chaque exécution.
 */
const seeded = seed => {
    let state = seed;
    return () => {
        state = (state * 1103515245 + 12345) % 2147483648;
        return state / 2147483648;
    };
};

/** Comparer deux jeux de réponses mélangés demande un ordre ; la maison en est un, et il est unique par question. */
const byHouse = (one, other) => one.house.localeCompare(other.house);

/**
 * Le questionnaire est la règle du site : le serveur prend un slug et ne pose aucune question. Rien d'autre que ces
 * tests ne remarquerait qu'une question a perdu une réponse ou nomme une maison qui n'existe plus.
 */
describe('questionnaire de maison', () => {
    /**
     * Les quatre slugs sont écrits en dur ici comme ils le sont dans les réponses. La comparaison avec la capture est
     * ce qui rend un renommage côté serveur visible côté site — sans elle, un slug obsolète produirait un blason
     * manquant et un 404 au moment du join, pas un test rouge.
     */
    it('nomme les quatre maisons que le serveur sert', () => {
        expect([...HOUSE_SLUGS].sort()).toEqual(housesPopulated.houses.map(house => house.slug).sort());
    });

    /** Un vivier plus court que le questionnaire ne le remplirait pas, et le tirage rendrait des trous. */
    it('offre plus de questions qu’il n’en pose, aux identifiants uniques', () => {
        expect(HOUSE_QUIZ_POOL.length).toBeGreaterThan(QUIZ_LENGTH);
        expect(new Set(HOUSE_QUIZ_POOL.map(question => question.id)).size).toBe(HOUSE_QUIZ_POOL.length);
    });

    /**
     * Une réponse par maison et pas deux : c'est ce qui fait qu'une question donne un point à une seule maison — donc
     * qu'un questionnaire complet vaut `QUIZ_LENGTH` points répartis — et ce qui autorise la maison comme clé de liste.
     */
    it('offre exactement une réponse par maison à chaque question', () => {
        for (const question of HOUSE_QUIZ_POOL) {
            const houses = question.answers.map(answer => answer.house);
            expect([...houses].sort(), `question ${question.id}`).toEqual([...HOUSE_SLUGS].sort());
        }
    });

    it('donne un texte à chaque question et à chaque réponse', () => {
        for (const question of HOUSE_QUIZ_POOL) {
            expect(question.question, `question ${question.id}`).toBeTruthy();
            for (const answer of question.answers) {
                expect(answer.label, `${question.id} / ${answer.house}`).toBeTruthy();
            }
        }
    });
});

describe('tirage du questionnaire', () => {
    it('pose dix questions du vivier, sans répétition', () => {
        const quiz = drawQuiz(seeded(1));

        expect(quiz).toHaveLength(QUIZ_LENGTH);
        expect(new Set(quiz.map(question => question.id)).size).toBe(QUIZ_LENGTH);
        for (const question of quiz) {
            expect(HOUSE_QUIZ_POOL.map(candidate => candidate.id)).toContain(question.id);
        }
    });

    /** Le même questionnaire pour tout le monde ferait du vivier une décoration. */
    it('ne tire pas les mêmes questions à deux joueurs', () => {
        const first = drawQuiz(seeded(1)).map(question => question.id);
        const second = drawQuiz(seeded(7)).map(question => question.id);
        expect(first).not.toEqual(second);
    });

    /** Le tirage garde la forme : quatre réponses, une par maison, quel que soit le mélange. */
    it('mélange les réponses sans en perdre ni en ajouter', () => {
        for (const question of drawQuiz(seeded(3))) {
            const original = HOUSE_QUIZ_POOL.find(candidate => candidate.id === question.id);
            expect([...question.answers].sort(byHouse), `question ${question.id}`)
                .toEqual([...original.answers].sort(byHouse));
        }
    });

    /**
     * À ordre de réponses constant, cliquer toujours la première désignerait la même maison à coup sûr : le
     * questionnaire ne serait qu'un menu déguisé.
     */
    it('ne place pas la même maison en première réponse partout', () => {
        const quiz = drawQuiz(seeded(5));
        expect(new Set(quiz.map(question => question.answers[0].house)).size).toBeGreaterThan(1);
    });

    /** Le vivier est la source, pas un brouillon : le tirage ne doit pas le réordonner sous les autres appels. */
    it('laisse le vivier intact', () => {
        const before = HOUSE_QUIZ_POOL.map(question => `${question.id}:${question.answers.map(a => a.house).join()}`);
        drawQuiz(seeded(9));
        expect(HOUSE_QUIZ_POOL.map(question => `${question.id}:${question.answers.map(a => a.house).join()}`))
            .toEqual(before);
    });
});

describe('dépouillement', () => {
    it('compte les quatre maisons, celles à zéro comprises', () => {
        expect(tally(['NEXUS_ALPHA', 'NEXUS_ALPHA', 'FILS_DU_FROID'])).toEqual({
            FILS_DU_FROID: 1,
            NEXUS_ALPHA: 2,
            SABRE_SILENCIEUX: 0,
            LUNAIRES_AETHER: 0,
        });
    });

    it('désigne la maison la plus citée', () => {
        const answers = ['NEXUS_ALPHA', 'FILS_DU_FROID', 'NEXUS_ALPHA', 'SABRE_SILENCIEUX'];
        expect(leaders(answers)).toEqual(['NEXUS_ALPHA']);
        expect(houseFromAnswers(answers)).toBe('NEXUS_ALPHA');
    });

    /** Le seul cas où le hasard intervient, et le seul que la fonction ne peut pas trancher seule. */
    it('tire au sort entre les maisons à égalité, et seulement entre elles', () => {
        const answers = ['FILS_DU_FROID', 'LUNAIRES_AETHER', 'NEXUS_ALPHA'];
        expect(leaders(answers)).toEqual(['FILS_DU_FROID', 'NEXUS_ALPHA', 'LUNAIRES_AETHER']);

        expect(houseFromAnswers(answers, () => 0)).toBe('FILS_DU_FROID');
        expect(houseFromAnswers(answers, () => 0.5)).toBe('NEXUS_ALPHA');
        expect(houseFromAnswers(answers, () => 0.99)).toBe('LUNAIRES_AETHER');
    });

    /** Une maison en tête, même d'un point, ne se joue pas aux dés. */
    it('ne tire pas au sort quand il y a un vainqueur net', () => {
        const answers = ['FILS_DU_FROID', 'FILS_DU_FROID', 'NEXUS_ALPHA'];
        for (const draw of [0, 0.5, 0.99]) {
            expect(houseFromAnswers(answers, () => draw)).toBe('FILS_DU_FROID');
        }
    });

    it('ne désigne rien sans réponse', () => {
        expect(leaders([])).toEqual([]);
        expect(houseFromAnswers([])).toBeNull();
    });

    /** Dix questions, une réponse chacune : le total est dix, quelle que soit la répartition. */
    it('répartit dix points sur un questionnaire complet', () => {
        const answers = drawQuiz(seeded(11)).map(question => question.answers[0].house);
        const counts = tally(answers);
        expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(QUIZ_LENGTH);
        expect(HOUSE_SLUGS).toContain(houseFromAnswers(answers));
    });
});
