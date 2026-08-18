/**
 * Le questionnaire d'entrée dans une maison, et le bilan d'affinités qu'il produit.
 *
 * ⚠ Tout ce fichier est **la règle du site**, pas celle du serveur. `POST /api/house/join` prend un slug et ne pose
 * aucune question : il vérifie la période, le joueur, l'absence de maison, et que le slug nomme bien une maison. Le
 * tirage au sort d'avant a disparu du serveur — c'est donc le site qui mène le joueur à une maison, et c'est ici qu'il
 * le fait. Personne d'autre ne lit ces questions.
 *
 * ⚠ Le questionnaire **ne choisit pas** : il classe. Il rend une affinité par maison, les quatre, et c'est le joueur
 * qui clique celle qu'il rejoint. Rien ici ne tire au sort, donc, y compris en cas d'égalité au sommet : deux maisons
 * ex æquo sont deux maisons proposées, ce qui est la réponse honnête, là où un tirage trancherait à la place du joueur.
 *
 * Le questionnaire posé n'est pas la liste écrite ici : `drawQuiz()` tire `QUIZ_LENGTH` questions au sort dans le vivier
 * et mélange les réponses de chacune. Deux joueurs ne passent donc pas le même questionnaire, et le même joueur qui
 * recommencerait n'aurait pas non plus le même. Ajouter, retirer ou réécrire une question est une modification de ce
 * fichier et de rien d'autre — `HouseQuiz.jsx` ne connaît que la forme, et les tests ne vérifient que les invariants.
 *
 * Invariants tenus par `houseQuiz.test.js`, et sur lesquels le composant s'appuie :
 *
 * - Chaque question offre **exactement une réponse par maison**, les quatre. C'est ce qui rend le score lisible — une
 *   question donne un point à une maison, donc le total d'un joueur est le nombre de questions posées — et ce qui
 *   autorise `key={answer.house}` dans le rendu.
 * - Les `id` sont uniques et stables : ils servent de clé de liste, pas la position.
 * - Le vivier compte au moins `QUIZ_LENGTH` questions, sans quoi le tirage n'aurait pas de quoi remplir un
 *   questionnaire.
 */

/** Les quatre maisons, dans l'ordre où le décompte les parcourt — donc l'ordre d'égalité, avant tirage. */
export const HOUSE_SLUGS = ['FILS_DU_FROID', 'NEXUS_ALPHA', 'SABRE_SILENCIEUX', 'LUNAIRES_AETHER'];

/** Le nombre de questions posées, tirées du vivier ci-dessous. */
export const QUIZ_LENGTH = 10;

/**
 * Le vivier des questions.
 *
 * Les réponses sont écrites ici dans l'ordre de `HOUSE_SLUGS`, toujours le même, pour que le fichier se relise : une
 * question dont la troisième réponse ne sonne pas Sabre Silencieux se repère à l'œil. Ce n'est pas l'ordre affiché —
 * `drawQuiz()` le mélange à chaque tirage, faute de quoi cliquer toujours la première réponse désignerait la même
 * maison à coup sûr et le questionnaire ne serait qu'un menu déguisé.
 */
export const HOUSE_QUIZ_POOL = [
    {
        id: 'idole',
        question: 'Ton idole parmi ces 4 joueurs professionnels :',
        answers: [
            { house: 'FILS_DU_FROID', label: 'Mi Yuting, le créateur du flying-knife joseki' },
            { house: 'NEXUS_ALPHA', label: 'Shin Jinseo, « Artificial Shintelligence »' },
            { house: 'SABRE_SILENCIEUX', label: 'Otake Hideo, l’esthète du Go' },
            { house: 'LUNAIRES_AETHER', label: 'Go Seigen, à l’origine du Shinfuseki' },
        ],
    },
    {
        id: 'angle-vide',
        question: 'Tu accepterais de jouer un angle vide ?',
        answers: [
            { house: 'FILS_DU_FROID', label: 'Si c’est le point vital pour tuer, bien sûr' },
            { house: 'NEXUS_ALPHA', label: 'Si c’est le meilleur coup, bien sûr' },
            { house: 'SABRE_SILENCIEUX', label: 'Jamais, plutôt mourir !' },
            { house: 'LUNAIRES_AETHER', label: 'Je le fais souvent, quel est le problème ?' },
        ],
    },
    {
        id: 'ouverture',
        question: 'Ton ouverture fétiche ?',
        answers: [
            { house: 'FILS_DU_FROID', label: 'Hoshi-hoshi, en support au futur combat' },
            { house: 'NEXUS_ALPHA', label: 'Hoshi-komoku, ce sont les « blue moves » sur mon Katago' },
            { house: 'SABRE_SILENCIEUX', label: 'Komoku-komoku, façon Shusaku' },
            { house: 'LUNAIRES_AETHER', label: 'Tengen, takamoku, mokuhazushi… ça dépend des jours' },
        ],
    },
    {
        id: 'gestion-temps',
        question: 'Ta gestion du temps, ça ressemble à quoi ?',
        answers: [
            { house: 'FILS_DU_FROID', label: 'Je blitz le fuseki pour avoir du temps au chuban' },
            { house: 'NEXUS_ALPHA', label: 'Je perds tout mon temps sur quelques moments où il faut tout calculer' },
            {
                house: 'SABRE_SILENCIEUX',
                label: 'Je prends le temps de soupeser chaque coup, et j’attends que mon adversaire revienne des '
                    + 'toilettes pour jouer',
            },
            { house: 'LUNAIRES_AETHER', label: 'Je suis en byo-yomi au coup 50, il y a trop de coups intéressants à jouer' },
        ],
    },
    {
        id: 'victoires',
        question: 'Comment gagnes-tu la plupart de tes parties sérieuses ?',
        answers: [
            { house: 'FILS_DU_FROID', label: '« Slay the dragon ! »' },
            { house: 'NEXUS_ALPHA', label: 'Je prends l’avantage, puis je le maintiens prudemment avec un comptage minutieux' },
            {
                house: 'SABRE_SILENCIEUX',
                label: 'Mon adversaire pense que je prends du retard, mais mes meilleures formes finissent par payer',
            },
            {
                house: 'LUNAIRES_AETHER',
                label: 'Je ne saurais pas dire, personne ne comprend la partie, mais parfois ça passe',
            },
        ],
    },
    {
        id: 'defaites',
        question: 'Comment perds-tu la plupart de tes parties sérieuses ?',
        answers: [
            { house: 'FILS_DU_FROID', label: 'Mon all-in pour le kill a échoué' },
            { house: 'NEXUS_ALPHA', label: 'Perte au temps en train d’overthinker une séquence de 25 coups' },
            {
                house: 'SABRE_SILENCIEUX',
                label: 'Je ne comprends pas, j’ai joué les coups de forme mais mon adversaire s’en est sorti à chaque fois',
            },
            {
                house: 'LUNAIRES_AETHER',
                label: 'Je ne saurais pas dire, personne ne comprend la partie, mais parfois ça ne passe pas',
            },
        ],
    },
    {
        id: 'joseki',
        question: 'Ton répertoire de joseki ?',
        answers: [
            {
                house: 'FILS_DU_FROID',
                label: 'Dans chaque partie, j’essaie de jouer un flying knife ou une pince basse de 2 intersections, tmtc',
            },
            { house: 'NEXUS_ALPHA', label: 'Invasion san-san, ce n’est jamais mauvais' },
            { house: 'SABRE_SILENCIEUX', label: 'Je connais 607 josekis et j’en ai un adapté à n’importe quelle situation' },
            {
                house: 'LUNAIRES_AETHER',
                label: 'Les jose-quoi ? Rien ne vaut un bon tengen ou un « trou noir des familles »',
            },
        ],
    },
    {
        id: 'plaisir',
        question: 'Comment prends-tu du plaisir au Go ?',
        answers: [
            { house: 'FILS_DU_FROID', label: 'Le frisson du combat, l’adrénaline quand un groupe oscille entre la vie et la mort' },
            { house: 'NEXUS_ALPHA', label: 'La compréhension du jeu et la progression de mon rang' },
            { house: 'SABRE_SILENCIEUX', label: 'L’admiration de la beauté éternelle des pierres qui dansent sur le goban' },
            { house: 'LUNAIRES_AETHER', label: 'L’ivresse de se perdre dans l’infinité du jeu et l’exploration de ses profondeurs' },
        ],
    },
    {
        id: 'serveur',
        question: 'Ton serveur de Go préféré ?',
        answers: [
            { house: 'FILS_DU_FROID', label: 'Fox, ça joue vite et beaucoup' },
            { house: 'NEXUS_ALPHA', label: 'OGS, c’est là que tout se passe dans le monde occidental' },
            { house: 'SABRE_SILENCIEUX', label: 'KGS, pour son côté épuré et le son des pierres' },
            { house: 'LUNAIRES_AETHER', label: 'Je les teste tous : IGS, DGS, GoQuest, Tygem, WBaduk…' },
        ],
    },
    {
        id: 'kibitz',
        question: 'Le kibitz (commenter une partie en cours) pour toi, c’est :',
        answers: [
            { house: 'FILS_DU_FROID', label: 'D’aucun intérêt, j’aime autant jouer moi-même' },
            { house: 'NEXUS_ALPHA', label: 'Poser 26 variations « là, il fallait plutôt jouer ça », assisté en direct par l’IA' },
            { house: 'SABRE_SILENCIEUX', label: '« HIIIII UN TRAVERSE KEIMA !!! »' },
            { house: 'LUNAIRES_AETHER', label: 'De longs débats endiablés sur de possibles variations avec d’autres kibitzeurs' },
        ],
    },
    {
        id: 'hobbies',
        question: 'D’autres hobbies que le Go ?',
        answers: [
            { house: 'FILS_DU_FROID', label: 'Smash Bros, GTA, CS…' },
            { house: 'NEXUS_ALPHA', label: 'Echecs, Rubik’s Cube, Shogi…' },
            { house: 'SABRE_SILENCIEUX', label: 'Peinture, Musique, Théâtre, Lecture…' },
            { house: 'LUNAIRES_AETHER', label: 'Curling, Spéléologie, Quidditch' },
        ],
    },
    {
        id: 'go-cosmique',
        question: 'Une opinion sur le Go cosmique ?',
        answers: [
            { house: 'FILS_DU_FROID', label: 'Parfait pour moi : on laisse les points et puis on tue' },
            { house: 'NEXUS_ALPHA', label: 'Sortir du fuseki avec 5 points de retard, très peu pour moi' },
            {
                house: 'SABRE_SILENCIEUX',
                label: 'J’admire la beauté des coups naturels et le sang-froid du joueur qui laisse les 4 coins',
            },
            { house: 'LUNAIRES_AETHER', label: 'J’essaie à l’occasion, mais il n’y a pas que ça dans la vie' },
        ],
    },
    {
        id: 'cles-perdues',
        question: 'Tu arrives chez toi mais tu as perdu tes clés. Que fais-tu ?',
        answers: [
            { house: 'FILS_DU_FROID', label: 'Je défonce la porte, c’est chez moi ici' },
            { house: 'NEXUS_ALPHA', label: 'Je cherche la clé sous le paillasson ou le pot de fleurs' },
            { house: 'SABRE_SILENCIEUX', label: 'J’appelle mon voisin à qui j’ai laissé une clé de rechange' },
            { house: 'LUNAIRES_AETHER', label: 'J’essaie de crocheter la serrure' },
        ],
    },
    {
        id: 'element',
        question: 'Quel élément te correspond le plus ?',
        answers: [
            { house: 'FILS_DU_FROID', label: 'Feu' },
            { house: 'NEXUS_ALPHA', label: 'Eau' },
            { house: 'SABRE_SILENCIEUX', label: 'Terre' },
            { house: 'LUNAIRES_AETHER', label: 'Vent' },
        ],
    },
    {
        id: 'message-ambigu',
        question: 'Tu reçois un message ambigu d’un proche. Tu :',
        answers: [
            { house: 'FILS_DU_FROID', label: 'Réponds tout de suite, sur le vif' },
            { house: 'NEXUS_ALPHA', label: 'Relis plusieurs fois avant de formuler ta réponse' },
            { house: 'SABRE_SILENCIEUX', label: 'Attends que l’émotion retombe pour répondre plus tard' },
            { house: 'LUNAIRES_AETHER', label: 'Profites de l’ambiguïté pour lancer une conversation inattendue' },
        ],
    },
    {
        id: 'restaurant',
        question: 'Dans un restaurant, le plat n’est pas à ton goût. Tu :',
        answers: [
            { house: 'FILS_DU_FROID', label: 'Le fais remarquer immédiatement au serveur, fermement' },
            { house: 'NEXUS_ALPHA', label: 'Cherches précisément le problème pour expliquer au cuisinier ce qu’il a raté' },
            { house: 'SABRE_SILENCIEUX', label: 'Ne dis rien, tu termines tranquillement' },
            { house: 'LUNAIRES_AETHER', label: 'Remercies le chef pour cette nouveauté' },
        ],
    },
    {
        id: 'ami-annule',
        question: 'Un ami annule au dernier moment. Tu :',
        answers: [
            { house: 'FILS_DU_FROID', label: 'L’appelles pour le sermonner' },
            { house: 'NEXUS_ALPHA', label: 'Réorganises tout ton emploi du temps' },
            { house: 'SABRE_SILENCIEUX', label: 'Acceptes avec sérénité, c’est le cours normal des choses' },
            { house: 'LUNAIRES_AETHER', label: 'Saisis l’occasion pour faire quelque chose d’imprévu' },
        ],
    },
    {
        id: 'chemin-perdu',
        question: 'En voyage, tu perds ton chemin. Tu :',
        answers: [
            { house: 'FILS_DU_FROID', label: 'Avances, tu finiras bien par tomber sur quelque chose' },
            { house: 'NEXUS_ALPHA', label: 'Consultes cartes et applis, et calcules le meilleur itinéraire' },
            { house: 'SABRE_SILENCIEUX', label: 'Retournes à un point de repère connu et sûr' },
            { house: 'LUNAIRES_AETHER', label: 'Suis une piste intrigante, même si elle t’éloigne du but' },
        ],
    },
    {
        id: 'aspirateur',
        question: 'Ton aspirateur tombe en panne. Tu :',
        answers: [
            { house: 'FILS_DU_FROID', label: 'T’énerves et tentes une réparation immédiate, quitte à le casser plus' },
            { house: 'NEXUS_ALPHA', label: 'Cherches la cause exacte du problème et la solution la plus efficace' },
            { house: 'SABRE_SILENCIEUX', label: 'Vis avec la panne tant que c’est gérable' },
            { house: 'LUNAIRES_AETHER', label: 'Le transformes en didgeridoo' },
        ],
    },
    {
        id: 'critique-publique',
        question: 'Un inconnu te critique publiquement. Tu :',
        answers: [
            { house: 'FILS_DU_FROID', label: 'L’insultes en retour, du tac au tac' },
            { house: 'NEXUS_ALPHA', label: 'Réfléchis à une réplique cinglante, qui arrive 2 jours après' },
            { house: 'SABRE_SILENCIEUX', label: 'Gardes ton calme et l’ignores' },
            { house: 'LUNAIRES_AETHER', label: 'Lui déclares ta flamme' },
        ],
    },
    {
        id: 'cadeau',
        question: 'Tu dois choisir un cadeau pour quelqu’un de proche. Tu :',
        answers: [
            { house: 'FILS_DU_FROID', label: 'Achètes quelque chose d’impactant, « qui marque »' },
            { house: 'NEXUS_ALPHA', label: 'Cherches l’objet le plus utile et adapté à ses besoins' },
            { house: 'SABRE_SILENCIEUX', label: 'Optes pour un classique, intemporel, qui ne déçoit jamais' },
            { house: 'LUNAIRES_AETHER', label: 'Trouves un objet original, peu commun, qui raconte une histoire' },
        ],
    },
    {
        id: 'sujet-sensible',
        question: 'On te demande ton avis sur un sujet sensible. Tu :',
        answers: [
            { house: 'FILS_DU_FROID', label: 'Donnes ton opinion franchement, sans filtre' },
            { house: 'NEXUS_ALPHA', label: 'Argumentes avec des faits précis et documentés' },
            { house: 'SABRE_SILENCIEUX', label: 'Restes mesuré(e), tu évites les extrêmes' },
            { house: 'LUNAIRES_AETHER', label: 'Introduis un angle original qui déplace la question' },
        ],
    },
];

/**
 * Une copie mélangée, Fisher-Yates, sans toucher à l'original.
 *
 * Le `Math.min` borne un tirage qui rendrait 1 — `Math.random` ne le fait pas, un tirage injecté le peut, et un indice
 * hors du tableau échangerait une question contre `undefined`.
 */
function shuffled(items, random) {
    const draw = [...items];
    for (let index = draw.length - 1; index > 0; index--) {
        const pick = Math.min(Math.floor(random() * (index + 1)), index);
        [draw[index], draw[pick]] = [draw[pick], draw[index]];
    }
    return draw;
}

/**
 * Le questionnaire d'un joueur : `QUIZ_LENGTH` questions tirées du vivier, réponses mélangées.
 *
 * Le tirage est injectable pour être testable — `Math.random` par défaut, et rien d'autre ne doit le remplacer en
 * production. Il est fait une fois, à l'ouverture du questionnaire : refaire le tirage à chaque rendu changerait les
 * questions sous le joueur, et un retour en arrière ne retrouverait pas celle qu'il vient de quitter.
 */
export function drawQuiz(random = Math.random) {
    return shuffled(HOUSE_QUIZ_POOL, random)
        .slice(0, QUIZ_LENGTH)
        .map(question => ({...question, answers: shuffled(question.answers, random)}));
}

/**
 * Le décompte, une entrée par maison — les quatre, y compris celles à zéro.
 *
 * Parcourir `HOUSE_SLUGS` plutôt que les réponses donne un ordre stable, donc une égalité qui ne dépend pas de
 * l'ordre dans lequel le joueur a cliqué.
 */
export function tally(answers) {
    const counts = {};
    for (const slug of HOUSE_SLUGS) { counts[slug] = 0; }
    for (const slug of answers) { counts[slug] = (counts[slug] ?? 0) + 1; }
    return counts;
}

/**
 * Les maisons à égalité au sommet, dans l'ordre de `HOUSE_SLUGS`. Vide sans réponse : rien ne mène nulle part.
 *
 * Elles sont montrées comme telles, plusieurs quand elles sont plusieurs — c'est ce qui remplace le tirage au sort.
 */
export function leaders(answers) {
    const counts = tally(answers);
    const best = Math.max(...Object.values(counts));
    return best === 0 ? [] : Object.keys(counts).filter(slug => counts[slug] === best);
}

/**
 * Le bilan : les quatre maisons, de la plus proche à la plus lointaine, avec leur part des réponses.
 *
 * Le pourcentage se lit sur les réponses données, pas sur `QUIZ_LENGTH` : les deux valent pareil pour un
 * questionnaire terminé, et seul le premier a un sens sur un questionnaire interrompu.
 *
 * `sort` est stable en JavaScript et le tableau part de `HOUSE_SLUGS` : deux maisons à égalité sortent donc toujours
 * dans le même ordre, sans que le hasard ni l'ordre des clics du joueur s'en mêlent.
 */
export function affinities(answers) {
    const counts = tally(answers);
    return HOUSE_SLUGS
        .map(slug => ({
            slug,
            score: counts[slug],
            percent: answers.length === 0 ? 0 : Math.round((counts[slug] / answers.length) * 100),
        }))
        .sort((one, other) => other.score - one.score);
}
