import { describe, expect, it } from 'vitest';

import { HOUSE_QUIZ_POOL, HOUSE_SLUGS, QUIZ_LENGTH, affinities, drawQuiz, leaders, tally } from './houseQuiz.js';
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

    it('nomme la maison la plus citée', () => {
        expect(leaders(['NEXUS_ALPHA', 'FILS_DU_FROID', 'NEXUS_ALPHA', 'SABRE_SILENCIEUX'])).toEqual(['NEXUS_ALPHA']);
    });

    /**
     * Une égalité au sommet n'est plus tranchée : elle est rendue telle quelle, et c'est le joueur qui choisit. Un
     * tirage au sort ici déciderait à sa place, ce que le questionnaire ne fait plus.
     */
    it('rend toutes les maisons à égalité au sommet, sans en tirer une', () => {
        const answers = ['FILS_DU_FROID', 'LUNAIRES_AETHER', 'NEXUS_ALPHA'];
        expect(leaders(answers)).toEqual(['FILS_DU_FROID', 'NEXUS_ALPHA', 'LUNAIRES_AETHER']);
    });

    it('ne désigne rien sans réponse', () => {
        expect(leaders([])).toEqual([]);
    });
});

describe('bilan d’affinités', () => {
    /** Les quatre maisons sont proposées, y compris celles que le joueur n'a jamais citées : le bilan est un classement,
     * pas une sélection. */
    it('classe les quatre maisons, de la plus proche à la plus lointaine', () => {
        expect(affinities(['NEXUS_ALPHA', 'FILS_DU_FROID', 'NEXUS_ALPHA', 'NEXUS_ALPHA'])).toEqual([
            { slug: 'NEXUS_ALPHA', score: 3, percent: 75 },
            { slug: 'FILS_DU_FROID', score: 1, percent: 25 },
            { slug: 'SABRE_SILENCIEUX', score: 0, percent: 0 },
            { slug: 'LUNAIRES_AETHER', score: 0, percent: 0 },
        ]);
    });

    /** Deux maisons ex æquo doivent sortir dans le même ordre à chaque appel, sans quoi le bilan sauterait sous le
     * joueur au moindre rendu — l'ordre est celui de `HOUSE_SLUGS`, pas celui des clics. */
    it('ordonne les ex æquo comme HOUSE_SLUGS, quel que soit l’ordre des réponses', () => {
        const ordered = affinities(['LUNAIRES_AETHER', 'NEXUS_ALPHA']).map(affinity => affinity.slug);
        expect(ordered).toEqual(['NEXUS_ALPHA', 'LUNAIRES_AETHER', 'FILS_DU_FROID', 'SABRE_SILENCIEUX']);
        expect(affinities(['NEXUS_ALPHA', 'LUNAIRES_AETHER']).map(affinity => affinity.slug)).toEqual(ordered);
    });

    it('ne prête aucune affinité sans réponse', () => {
        expect(affinities([]).map(affinity => affinity.percent)).toEqual([0, 0, 0, 0]);
    });

    /** Dix questions, une réponse chacune : dix points répartis, donc cent pour cent d'affinité répartis. */
    it('répartit dix points, soit cent pour cent, sur un questionnaire complet', () => {
        const answers = drawQuiz(seeded(11)).map(question => question.answers[0].house);
        const counts = tally(answers);
        expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(QUIZ_LENGTH);

        const bilan = affinities(answers);
        expect(bilan.map(affinity => affinity.slug).sort()).toEqual([...HOUSE_SLUGS].sort());
        expect(bilan.reduce((sum, affinity) => sum + affinity.percent, 0)).toBe(100);
    });
});
