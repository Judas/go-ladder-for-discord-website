# Plan de mise à jour du site — 9.1

Le serveur `fulguro-server` est en **9.1** : il sert désormais les maisons, la ligue et un endpoint de santé que le
site n'expose nulle part. Ce document est le plan de rattrapage, en 7 itérations livrables indépendamment.

Sources : `fulguro-server/doc/plan-maisons.md`, `fulguro-server/doc/plan-ligue.md`, et surtout le code — les modèles
`modules/api/.../db/model/Api*.kt` sont le contrat, la table des routes est `ApiModule.kt`. Les deux plans serveur
disent la même chose : **la forme des réponses est posée côté serveur, le site s'aligne.** Rien à renégocier.

Branche de travail : `feat/update-2026`. `master` part en prod à chaque push (Render), donc une itération = une PR.

---

## Contraintes transverses

À respecter dans toutes les itérations, elles viennent du serveur et ne sont pas négociables.

| Contrainte | Pourquoi |
|---|---|
| Les routes du site sont **`/houses`** et **`/league`** | `HouseNotifier.HOUSES_PATH` et `LeagueNotifier.LEAGUE_PATH` : les annonces Discord pointent déjà dessus. Un autre chemin casse des liens déjà envoyés |
| `black_invite` / `white_invite` n'existent pas côté site | Règle de confidentialité du plan ligue : aucune route du serveur n'est authentifiée, publier un lien joueur laisserait n'importe qui jouer le match de n'importe qui. Seul `spectatorLink` sort |
| Les `rank` sont des rangs de compétition (1, 2, 2, 4) | On les **affiche**, on ne compte jamais les lignes |
| Les `total` (points maison, renommée) viennent du serveur | Ne jamais réadditionner un barème côté site : le jour où il gagne une colonne, le site serait faux en silence |
| `period` et `season` voyagent avec chaque réponse | Le serveur reste seul à savoir quand une saison tourne. Aucun calcul de calendrier côté site |
| Les libellés de session (`15 – 30 septembre`) sont servis prêts à afficher | Formater une date en français demande une locale épinglée ; le navigateur a le même piège que la JVM. On imprime, on ne reformate pas |
| L'API n'a **aucune authentification** | Les POST portent le `discordId` dans le corps. Les CTA ne s'affichent que sur son propre profil (`getProfile().discordId === player.discordId`), comme le fait déjà « Lier un compte ». C'est du confort d'affichage, pas de la sécurité |

### ~~Point ouvert~~ Tranché en itération 4

La convention de nommage des **blasons** à partir du `slug`. Le plan maisons la laisse explicitement au dépôt du
site. **Retenu : `public/crests/{SLUG}.svg`**, en miroir de `public/shields/shield-{rank}.svg`. Les 4 fichiers sont
`FILS_DU_FROID.svg`, `NEXUS_ALPHA.svg`, `SABRE_SILENCIEUX.svg`, `LUNAIRES_AETHER.svg`, servis par le composant
`Components/Crest.jsx`.

⚠ **Les 4 fichiers livrés sont des placeholders** — écusson géométrique dans la couleur de la maison, dessinés faute
de visuels. Les vrais blasons sont un remplacement de fichiers, pas un changement de code : garder les noms.

---

## Itération 1 — Nettoyage et dépendances ✅

Aucune fonctionnalité. L'objectif est de ne pas construire cinq pages sur une chaîne d'outils morte depuis 2022.

**Faite.** Six commits, de `(chore) drop unused dependencies` à `(chore) upgrade Express to 5`. Écarts par rapport
au plan ci-dessous, tous assumés :

- **Yarn Classic conservé**, `.yarnrc.yml` supprimé (fichier Berry que Yarn 1.22 ne lit pas) plutôt qu'aligné.
- **`web-vitals` supprimé** au lieu d'être monté en 6 : `main.jsx` appelait `reportWebVitals()` sans argument, donc
  le corps entier était derrière un `if` toujours faux. Migrer aurait consisté à renommer `getCLS`→`onCLS` pour
  garder un no-op en vie.
- **Node 20 → 22** dans les deux Dockerfiles : Vite 8 exige `^20.19 || >=22.12`, et Node 20 est en fin de vie.
- **ESLint 9 en flat config ajouté** (`yarn lint`), pas seulement conservé : retirer `react-scripts` supprimait le
  lint qui tournait dans chaque build. Il a immédiatement trouvé du code mort réel — voir 2.2.
- **Vitest + jsdom ajoutés** et un test de rendu (`src/App.test.jsx`) écrit tout de suite, pas en 2.4 : un build ne
  prouve rien ici, il n'exécute jamais un composant. C'est ce test qui a validé chaque montée de version.
- **`docker-compose.dev.yml` réparé** : il construisait `./Dockerfile`, qui n'a pas de stage `development`. Le
  conteneur de dev n'avait jamais pu se construire.

Deux ruptures réelles rencontrées, les deux sur le serveur de prod et invisibles au build :

1. `app.get('/*')` fait planter Express 5 au démarrage (path-to-regexp 8) → `'/*splat'`.
2. Depuis http-proxy-middleware 3, monter sur un préfixe (`app.use('/api', proxy)`) retire ce préfixe avant que le
   middleware ne voie l'URL : la réécriture `^/api` → `/gold/api` ne matchait plus et **toutes** les requêtes
   arrivaient en `/api/...`, donc 404, avec un serveur qui démarre normalement. Corrigé avec `pathFilter`.

Vérifié : `yarn lint` (0 erreur, 21 warnings voulus), `yarn test`, `yarn build`, le serveur de prod contre le vrai
backend (`/api/tiers` renvoie les paliers), et la chaîne de dev de bout en bout contre un bouchon sur 4567.

### 1.1 Ménage

- Supprimer `chart.js` et `react-chartjs-2` : aucun import dans `src/`.
- Supprimer `path` : c'est un shim navigateur du module Node, jamais importé. `server.js` utilise le `path` de Node.
- Supprimer `gh-pages` et les scripts `predeploy` / `deploy` : `homepage` est vide et le site a besoin du proxy
  Express, un déploiement GitHub Pages ne peut pas marcher.
- Choisir un gestionnaire de paquets et s'y tenir : `package-lock.json` **et** `yarn.lock` sont commités, et
  `.yarnrc.yml` (`nodeLinker: node-modules`, un fichier Yarn Berry) contredit `packageManager: yarn@1.22.22`.
  Recommandation : garder Yarn, supprimer `package-lock.json`, aligner `.yarnrc.yml` et `packageManager`.
- Décider pour `@testing-library/*` : aucun test n'existe. Soit on les garde et l'itération 2 pose les premiers tests,
  soit on les sort. Recommandation : les garder, ils servent en itération 2.

### 1.2 Migration Vite

`react-scripts` est figé à 5.0.1 depuis 2022, CRA n'est plus maintenu, et c'est ce qui bloque React 19.

- `public/index.html` → `index.html` à la racine, `%PUBLIC_URL%` → chemins absolus. ⚠ Les trois `<script>` WGo et le
  CSS WGo doivent rester servis depuis `public/`, pas bundlés.
- `process.env.PUBLIC_URL` : 7 occurrences (`PlayerList`, `PlayerProfile` ×2, `Game`, `About`). Chaîne vide en prod
  aujourd'hui — les remplacer par des chemins absolus `/shields/...` est un no-op fonctionnel.
- `process.env.REACT_APP_DISCORD_AUTH_URL` → `import.meta.env.VITE_DISCORD_AUTH_URL`, et renommer la clé dans
  `.env.development` / `.env.production`.
- Le champ `"proxy"` de `package.json` n'existe pas chez Vite → `server.proxy` dans `vite.config.js`, même cible
  (`http://localhost:8080`, donc `server-proxy-only.js` inchangé).
- `Dockerfile`, `docker-compose.dev.yml` et `server.js` sont inchangés : Vite écrit toujours dans `build/`
  (`build.outDir`), Express sert toujours le même dossier.
- Vérification : `yarn build` puis `yarn start`, les 7 routes répondent, le goban s'affiche, l'auth Discord passe.

### 1.3 Montées de version

Une par commit, dans cet ordre, chacune vérifiable seule :

| Paquet | De → vers | Ce qui casse |
|---|---|---|
| `react` / `react-dom` | 18 → 19 | Peu ici : pas de `defaultProps` sur des fonctions, pas de `propTypes`, pas de string refs. `AccountLinkForm` (composant classe) reste valide |
| `react-router-dom` | 6 → 7 | Migration surtout de config. Les 7 `<Route>` et les hooks utilisés (`useParams`, `useSearchParams`, `useNavigate`) survivent |
| `react-icons` | 4 → 5 | Vérifier les 4 icônes importées (`fa6`, `io`, `tb`) |
| `web-vitals` | 2 → 6 | ⚠ `reportWebVitals.js` appelle `getCLS/getFID/getFCP/getLCP/getTTFB`, tous renommés en `onCLS/...` et `FID` supprimé au profit de `INP`. Alternative honnête : supprimer `reportWebVitals`, rien ne consomme la sortie |
| `express` | 4 → 5 | ⚠ **Casse `server.js`** : `app.get('/*')` n'est plus un motif valide (path-to-regexp 8). Devient `app.get('/*splat', …)` ou un middleware final. C'est le serveur de prod, à tester avant merge |
| `http-proxy-middleware` | 2 → 4 | Options renommées. Les deux serveurs sont concernés |

`normalize.css` est déjà à jour (8.0.1).

### 1.4 Livrable

`package.json` réduit, build Vite qui passe, prod qui démarre. Rien de visible pour un joueur.

---

## Itération 2 — Audit de fonctionnement ✅

Photographier ce qui marche avant d'ajouter cinq pages. Livrable : `doc/audit-9.1.md`, une liste de défauts classée,
plus les corrections évidentes dans la foulée.

**Faite.** Voir `doc/audit-9.1.md` : 8 défauts corrigés, 6 laissés ouverts avec leur motif, contrat vérifié champ par
champ contre le backend local (aucun écart). Écarts par rapport au plan :

- **2.1 (parcours manuel) non fait** : pas d'outils navigateur dans cette session. Remplacé par une suite de rendu
  qui exécute chaque page contre des charges utiles capturées sur le vrai backend, avec `console.error` traité comme
  un échec. Ce qui reste vraiment visuel — goban, mobile, OAuth Discord — est une checklist en fin d'audit.
- **2.4 (premiers tests) fait plus tôt et plus large** : 17 tests, dont le comportement de recherche et de filtre de
  `PlayerList`, écrits pour prouver l'absence de régression sur la correction 7.
- ⚠ **Découverte bloquante pour la suite** : aucune donnée maison ni ligue en local, et `period` vaut `VACATION`.
  Les états vides sont testables tout de suite, les états peuplés demanderont des données de test avant
  l'itération 5.

### 2.1 Parcours manuel, backend local

Lancer `fulguro-server` en local (port 4567), `yarn devstart`, et dérouler : liste des joueurs, recherche, filtre
« validés », profil, partie (goban, mobile ≤ 980px), parties récentes, à propos, auth Discord, liaison de compte.
Console ouverte.

### 2.2 Défauts déjà identifiés à la lecture

Confirmés contre le code, à corriger ou à consigner :

- **`RecentGames.jsx:36`** — `key={game.id}` : `ApiGame` n'a **pas** de champ `id`. Toutes les clés valent `undefined`.
  Le champ est `goldId`, comme dans `PlayerProfile`.
- **`Game.jsx:48`** — `gameLink={game.gameLink}` : le champ n'existe pas sur `ApiGame`, et `WGOPlayer` n'accepte pas
  la prop. Double code mort.
- **Clés manquantes** sur les `.map()` de `PlayerProfile` (`AccountRow`, `GameRow`) et `About` (tiers) : la `key` est
  posée sur le `RowElement` *à l'intérieur* du composant, ce qui ne compte pas — React la veut sur l'élément mappé.
- **`PlayerProfile.jsx:142`** — la branche « premier palier » rend `<div width="64" height="64" />` : attributs
  invalides sur un `div`, warning React.
- **`PlayerProfile.jsx:155`** — `<img>` du palier suivant sans `alt`.
- **`PlayerList.jsx:43-46`** — deux `useEffect` sur `[searchString]` et `[validOnly]` qui appellent la même fonction,
  laquelle lit `players` sans le déclarer en dépendance. Marche par accident (les données arrivent avant la recherche).
- **`AuthProfile.js`** — `hasValidProfile()` est lu pendant le rendu de `Header` et `PlayerProfile`. Aucun re-rendu à
  la connexion : c'est le `window.location.replace` de `fetchUserProfile` qui rafraîchit la page. L'itération 7 ajoute
  des CTA qui mutent l'état, ce contournement ne tiendra plus (voir 7.4).
- **`fetch` partout** — le motif `if (!res.ok) throw res.statusText` est copié 8 fois. Il rend impossible la lecture
  d'un corps d'erreur, ce dont l'itération 3 a précisément besoin (le health répond 503 **avec** un corps utile).

Trouvés et corrigés en itération 1, par le linter :

- ~~`src/Components/AccountLinkForm.jsx`~~ — supprimé. Jamais importé, et cassé : pas d'import React, un `accounts`
  non défini, un `this.state.value` que le constructeur n'initialise pas. Brouillon abandonné de la classe qui vit
  en ligne dans `Pages/AccountLink.jsx`.
- ~~`Game.jsx` passait `gameLink` et `black`~~ — deux props que ni `WGOPlayer` ni `PlayerHeader` ne déclarent, et
  `gameLink` n'existe pas sur `ApiGame`.
- ~~`path` requis sans être utilisé dans `server-proxy-only.js`~~.

Reste ouvert et à traiter en itération 2 : les `key` manquantes, le `<div width height>`, l'`<img>` sans `alt`, les
`useEffect` de `PlayerList`, `key={game.id}` dans `RecentGames`.

### 2.3 Vérifier le contrat lu vs le contrat servi

Champ par champ, ce que le site lit contre les modèles `Api*.kt` : `ApiPlayer`, `ApiGame`, `ApiPlayerAccount`,
`GoldTier`. C'est le moment de repérer un champ disparu côté serveur, pas en itération 7.

### 2.4 Premiers tests (optionnel, recommandé)

Deux ou trois tests de rendu sur les composants purs (`Avatar`, la table, `isValid`) pour que l'outillage de test soit
prouvé avant que les pages ligue/maisons n'arrivent. Pas de couverture cible.

---

## Itération 3 — Page santé ✅

La plus petite des nouvelles pages, et celle qui sert de banc d'essai aux quatre suivantes.

**Faite.** `src/hooks/useApi.js`, `src/Pages/Health.jsx` + `.css`, route `/health`, lien dans le footer, 10 tests.
Écarts et précisions :

- **`acceptErrorStatus` plutôt qu'une liste de codes acceptés.** Un tableau en option force à gérer son identité
  dans les dépendances de l'effet ; un booléen ne pose pas ce problème. Le sens est le même ici : lire le corps quoi
  qu'il arrive, et exposer `httpStatus` pour que l'appelant tranche.
- **`useApi` ne déclenche aucun avertissement `set-state-in-effect`**, contrairement aux 8 pages existantes : l'état
  n'est écrit que dans les continuations asynchrones, jamais dans le corps de l'effet. Le chemin voyage avec le
  résultat, donc un changement d'URL se lit `pending` au rendu sans effet qui réécrive l'état.
- **Le libellé d'état était rendu deux fois** (une fois `ReaderOnly` sur la pastille, une fois visible à côté du
  nom) : un lecteur d'écran l'aurait lu en double. La pastille ne porte son libellé que pour un service sain.
- **`eqeqeq` exempte désormais `== null`**, seul cas où `==` dit quelque chose que `===` ne dit pas. 12 warnings de
  lint au lieu de 18.

⚠ **Pas vérifié contre le backend en direct** : celui-ci s'est arrêté en cours d'itération (4567 ne répond plus).
Ce qui est vérifié : les 10 tests contre une charge utile de santé capturée sur le vrai serveur, la route `/health`
servie par le fallback SPA du build de prod, et — par accident utile — la branche d'erreur, le proxy Vite ayant
renvoyé un 504 en texte que `res.json()` rejette.

### 3.1 Le piège du 503

`GET /api/health` répond **200 si tout va bien, 503 sinon** — et le corps est utile dans les deux cas. Le motif
`if (!res.ok) throw` du reste du site jetterait exactement l'information qu'on veut afficher.

### 3.2 Extraire `useApi`

Introduire `src/hooks/useApi.js` : un hook qui rend `{data, status, error}` avec le cycle `pending | success | error`
déjà en place partout, plus une option pour accepter certains codes non-2xx. Il sert ici, puis aux itérations 4 à 7.
~~Ne pas réécrire les 8 pages existantes dans cette itération.~~

**Migration faite dans la foulée**, sur demande. Les 6 pages qui font un GET — `PlayerList`, `RecentGames`,
`PlayerProfile` (deux appels), `Game`, `About`, `AccountLink` — passent par le hook. Hors périmètre : les deux POST
(`DiscordAuth`, le formulaire de `AccountLink`) et `AuthProfile.js`, qui tourne hors de React.

Deux effets de bord réels, au-delà du code en moins :

- **`PlayerProfile` ne sert plus le profil précédent pendant le chargement du suivant.** L'ancien code ne remettait
  jamais son statut à `pending` quand `playerId` changeait : naviguer d'un joueur à l'autre affichait l'ancien
  profil, puis le nouveau. Le hook fait voyager le chemin avec le résultat, donc le changement se lit `pending`
  immédiatement.
- **Une réponse en vol est ignorée après démontage**, ce qu'aucune des pages ne faisait.

`react-hooks/set-state-in-effect` tombe de 4 à 1, le dernier étant dans `DiscordAuth`, laissé en place. Lint : 9
warnings au lieu de 18 en début d'itération 3.

### 3.3 La page

- Route `/health`. Pas dans la nav principale : c'est une page d'exploitation, un lien discret depuis le footer ou
  `/about` suffit.
- En-tête : verdict global (`healthy`), lisible en un coup d'œil.
- Un tableau des services, avec les composants `Table` existants : `name`, `running`, `stale`, `healthy`,
  `secondsSinceLastSuccess`, `intervalSeconds`, `staleAfterSeconds`, `consecutiveFailures`, `lastFailure`.
- `secondsSinceLastSuccess` et `secondsSinceStart` sont **nullables** (service qui n'a pas encore tiqué) : afficher
  « jamais », pas « 0 s ».
- Registre vide = non sain, le serveur le dit déjà : afficher le cas plutôt qu'une table vide.
- Rafraîchissement toutes les 30 s, avec un bouton pour couper.

---

## Itération 4 — Page maisons ✅

**Faite.** `/houses`, `Components/Crest.jsx`, `Components/SeasonBanner.jsx`, 4 blasons placeholder, entrée « Maisons »
dans la nav, 10 tests. Écarts et trouvailles :

- **`SeasonBanner` extrait tout de suite** plutôt qu'au fil de l'eau : les itérations 5, 6 et 7 affichent toutes le
  même couple `period` / `season`, et c'est le genre de libellé qui diverge s'il est réécrit quatre fois.
- **Vrai bug trouvé dans `Avatar`**, du code partagé par tout le site : le défaut `src = ''` ne s'applique qu'à
  `undefined`, donc un `discordAvatar` **null** atteignait `src.includes(...)` et faisait tomber la page entière —
  il n'y a aucune error boundary dans cette application. `discordAvatar` est nullable sur `ApiPlayer`,
  `ApiHouseMember` et `ApiLeagueMember`. Sans avatar, le composant rend désormais l'espace et rien d'autre : un
  `<img src="">` demanderait au navigateur de recharger la page courante pour la dessiner en image cassée.
- **`.NoBulletList` déplacé de `RecentGames.css` vers `Common.css`** : une classe partagée coincée dans le CSS d'une
  page, que la liste des maisons voulait aussi.
- **En-tête resserré sous 560px.** Quatre entrées tenaient sur un téléphone en icônes seules ; « Maisons » — et
  « Ligue » derrière — non. La barre est une ligne collante de hauteur fixe, elle ne peut pas passer à la ligne.
- ✅ **Fixtures maisons capturées** (initialement fabriquées à la main, le backend étant arrêté). `fg_dev` a été
  peuplé avec `doc/seed-houses-dev.sql`, les réponses capturées, puis la base nettoyée. La forme fabriquée était
  juste, et les quatre cas visés se comportent comme annoncé :
  égalité entre deux maisons (35 partout), égalité **dans** une maison (deux `rank: 1`), membre à zéro point présent
  au classement (`rank: 3, total: 0`), et 12 points sans aucun membre chez Sabre Silencieux.
- ⚠ **`fg_dev` n'est pas anonymisé** et vit sur le même serveur que `fg_prod`. Le seed n'utilise donc que des joueurs
  synthétiques (`9000000000000000xx`) : aucune donnée réelle n'est entrée dans une fixture, un commit ou un log.

### 4.1 Prérequis : les blasons

Voir « Point ouvert » plus haut. Trancher la convention, produire ou stubber les 4 visuels. Bloquant pour le rendu,
pas pour le code.

### 4.2 Données

`GET /api/houses` → `{period, season, houses[]}`. Chaque maison : `slug`, `name`, `tagline`, `color`, `description`,
`memberCount`, `totalPoints`, `leader` (nullable).

⚠ **Aucun `rank` sur les maisons, volontairement** : à quatre maisons une égalité est probable, et une position
comptée sur la liste afficherait un 2e et un 3e là où la vérité est deux 2e. La liste est déjà ordonnée. Afficher un
podium numéroté demande de gérer les ex æquo à partir de `totalPoints`, ou de ne pas numéroter du tout —
recommandation : pas de numéro, l'ordre suffit.

### 4.3 La page

- Route **`/houses`** (obligatoire, cf. contraintes).
- Le lore d'ouverture : « La chute de l'Harmonie ». Il n'est **pas** en base — le plan serveur le dit explicitement,
  il appartient au dépôt du site. Source : `fulguro-server/assets/maisons.md`. À copier dans le site, en dur.
- 4 cartes maison : blason, nom, slogan, couleur en accent, effectif, total de points, leader (avatar + nom + total).
- `leader` est nullable (maison vide) et `memberCount` peut valoir 0 tout en ayant des points — le total suit le
  registre, qui garde les points des partis. Ne pas déduire l'un de l'autre.
- Chaque carte pointe vers `/house/{slug}`.
- Bandeau de calendrier lisible depuis `period` : en `VACATION`, dire que la saison est finie et que les points
  reprennent le 1er septembre.

### 4.4 Nav

Ajouter « Maisons » au `Header`. ⚠ Il porte déjà 4 entrées + l'avatar, et masque les libellés sous 980px
(`Header.css:87`). Deux entrées de plus (maisons, ligue) demandent de revoir le mobile — le faire ici, pas en 6.

---

## Itération 5 — Page d'une maison

### 5.1 Données

`GET /api/house/{slug}` → `{period, season, house, members[]}`. **404 sur un slug inconnu**, à traiter comme une page
introuvable et pas comme une erreur réseau.

`house` a exactement la même forme que dans la liste : les cartes de l'itération 4 se réutilisent telles quelles.

### 5.2 Classement des membres

`members[]` : `discordId`, `discordName`, `discordAvatar` (les deux derniers nullables), `rank`, et `points` —
les 7 colonnes du barème plus le `total` :

| Colonne | Barème |
|---|---|
| `played` | partie jouée, +1 |
| `goldOpponent` | adversaire GOLD, +2 |
| `rivalHouse` | adversaire d'une maison adverse, +2 |
| `longGame` | partie longue, +2 |
| `victory` | victoire, +2 |
| `evenGame` | partie à égalité, +1 |
| `ranked` | partie classée, +1 |

- Afficher `rank` tel quel (rangs de compétition), jamais l'index de ligne.
- Les membres à zéro sont présents et doivent rester visibles : « une page de maison qui cache ses membres discrets
  est un effectif qui ment ».
- `memberCount` de la maison peut dépasser `members.length` (un membre sans profil Discord est écarté). Ne pas
  afficher l'un comme le compte de l'autre.
- ⚠ 7 colonnes + identité ne tiennent pas sur mobile. Prévoir : total seul, détail dépliable.

### 5.3 Lore

`description` vient de l'API (elle est en base, en français). Le récit commun reste sur `/houses`.

---

## Itération 6 — Page ligue

La plus grosse. Deux routes API, deux vues.

### 6.1 Vue principale — `GET /api/league`

`{season, period, sessionCount, currentSession, sessions[], standings[]}`.

- **`currentSession` est nullable, et c'est une réponse, pas un trou** : hors saison, et dans les deux creux du
  calendrier (première quinzaine de septembre, seconde de décembre). Le dire, ne pas afficher une erreur.
- `sessions[]` est le calendrier complet (16 entrées) avec `number`, `label` (français, prêt à afficher), `start`,
  `end` (**exclusif**), `drawn`, `settled`. Les creux se lisent par absence, la numérotation reste continue.
- `sessionCount` vient de la réponse : ne jamais coder 16 en dur, le bonus « sans faute » est défini contre lui.
- `standings[]` : `rank`, identité, `house` (crest réduit : slug/name/color, nullable), `active`, `played`, `won`,
  `lost`, `exempted`, `renown` (`playedPoints`, `victoryPoints`, `perfectBonus`, `total`).
- **`exempted` doit être affiché** : le bonus est `played + exempted == sessionCount`, une page qui ne montre que
  `played` fait passer un bonus légitime pour une erreur.
- Les inactifs sont dans le classement avec `active: false` et gardent leur renommée. Les marquer, ne pas les cacher.

Barème renommée, à rappeler sur la page : 2 pts par match joué, 5 pts par victoire, 10 pts si tous les matchs de la
saison sont joués ou exemptés.

### 6.2 Vue session — `GET /api/league/session/{number}`

`{season, period, sessionCount, session, matches[], exemptions[]}`. 404 hors des sessions de la saison.

- `matches[]` : `black`, `white` (identité + crest), `spectatorLink` (nullable), `result`, `winnerDiscordId`.
- ⚠ **`result` a trois états** : `null` = session en cours, match pas encore joué ; `"unplayed"` = session réglée
  sans que le match soit joué, il ne comptera jamais ; autre chose = un vrai résultat. Confondre les deux premiers
  transforme un forfait en match à venir.
- `winnerDiscordId` est calculé par le serveur, nullable (match annulé, nul, ou pas encore joué). Ne pas le déduire
  de `result` + couleur.
- `exemptions[]` : joueur + `reason` (`ODD` = effectif impair, `NO_RIVAL` = il ne restait que sa maison). Les afficher,
  sinon la page donne l'impression qu'un membre actif a été oublié. Une exemption ne rapporte aucun point, elle garde
  seulement le bonus atteignable.
- Distinguer « pas encore tiré » (`matches` vide, `session.drawn === false`) de « tiré sans personne à apparier »
  (`matches` vide, `drawn === true`, exemptions présentes).
- Aucun lien joueur nulle part. `spectatorLink` seulement.

### 6.3 Routage

- **`/league`** (obligatoire) : classement + session en cours.
- `/league/session/:number` : navigation dans le calendrier, avec les 16 entrées de `sessions[]` comme sélecteur.

---

## Itération 7 — Refonte de la page joueur

Elle arrive en dernier : elle consomme les blocs `house` et `league` que `GET /api/player/{id}` sert déjà, et réutilise
les composants des itérations 4 à 6.

### 7.1 Section rang, à revoir

L'existant : blason, barre de progression, note, carte « Validation FGC ». Ce qui ne va pas :

- `TierProgression` disparaît entièrement au dernier palier (plus de barre, plus de repère) et pour un joueur non
  classé — deux cas fréquents traités par une absence.
- La branche « premier palier » rend un `div` avec des attributs `width`/`height` (cf. 2.2).
- La note et le palier sont dispersés entre trois blocs.
- L'`<img>` du palier suivant n'a pas d'`alt`.

À trancher au moment de la refonte, avec `/api/tiers` (`rank`, `name`, `min`, `max`) : afficher les bornes du palier
en clair, garder un repère visuel au dernier palier, et traiter « non classé » comme un état à part entière.

### 7.2 Section maison

Bloc `house` de `ApiPlayer` (nullable) : `slug`, `name`, `tagline`, `color`, `points` (les 7 colonnes + total),
`rank` dans la maison, `period`, `season`, `pendingAction`.

CTA pilotés par `period` :

| État | Affichage |
|---|---|
| Sans maison, `SEASON` | Bouton « Rejoindre une maison ». `POST /api/house/join {discordId}` → renvoie la maison **tirée au sort** (le joueur ne choisit pas) |
| Sans maison, `VACATION` | Label « Vous pourrez rejoindre une maison à partir du 1er septembre ». Pas de bouton |
| Avec maison, `SEASON` | Le bloc, sans action : une appartenance est figée pendant la saison |
| Avec maison, `VACATION` | Trois choix pour la rentrée : « Rester » (`STAY`, défaut), « Changer de maison » (`CHANGE`, tirage parmi les 3 autres), « Quitter » (`LEAVE`). `POST /api/house/choice {discordId, action}` |

`pendingAction` est le choix déjà enregistré, et il est **null hors vacances comme pour un membre qui n'a pas encore
choisi** — `period` est ce qui distingue les deux. Un choix se change autant de fois qu'on veut tout l'été, le dernier
gagne.

Codes à traiter, ils sont documentés handler par handler : 400 corps invalide, 403 hors période, 404 joueur inconnu ou
sans compte lié, 409 déjà membre.

### 7.3 Section ligue

Bloc `league` de `ApiPlayer` (nullable) : `active`, `rank`, `played`, `won`, `lost`, `exempted`, `renown` détaillée,
`sessionCount`, et `matches[]` — chaque match avec `session`, `color` (la sienne), `opponent`, `spectatorLink`,
`result`, et `won` **à trois états** (`true` / `false` / `null` = pas de vainqueur : match à jouer, annulé, ou voidé au
règlement). Lire un `null` comme une défaite afficherait une défaite qui n'a pas eu lieu.

CTA :

- **Rejoindre** : `POST /api/league/join {discordId}`. Trois conditions d'éligibilité — être connu du serveur, être
  **membre d'une maison**, avoir un **compte OGS lié**. Le serveur répond 404 si l'une manque, sans dire laquelle :
  le site connaît déjà `player.house` et `player.accounts`, donc afficher la condition manquante *avant* de laisser
  cliquer.
- La réponse porte `registeredWithOgs`. Il est **false** juste après l'inscription (l'appel à OGS est laissé au tick,
  pour qu'une inscription n'échoue pas si OGS est momentanément indisponible) : dire « tu es inscrit, ton premier défi
  arrive », pas afficher un état cassé.
- **Quitter** : `POST /api/league/leave {discordId}`, possible **en cours de saison** contrairement aux maisons. Les
  points restent, le joueur devient inactif. Le match déjà tiré reste à jouer, et la règle du match non joué
  s'applique — le dire dans la confirmation.
- 403 hors saison sur `join`, pas sur `leave`.

### 7.4 Le refactor que ça impose

Un CTA qui mute l'état force à sortir du `hasValidProfile()` lu pendant le rendu (cf. 2.2) : après un POST, la page
doit refléter le nouvel état sans `window.location.replace`. Minimum viable : refetch du profil joueur après chaque
mutation réussie, et l'identité en état React plutôt qu'en lecture directe de `localStorage`. Un contexte d'auth est
la version propre ; à arbitrer ici, pas avant.

---

## Ordre et dépendances

```
1 Nettoyage ──> 2 Audit ──> 3 Health (pose useApi)
                              │
                              ├──> 4 Maisons (blasons) ──> 5 Maison ──┐
                              │                                       ├──> 7 Profil
                              └──> 6 Ligue ──────────────────────────-┘
```

4 et 6 sont parallélisables. 7 vient en dernier parce qu'elle réutilise le badge de maison (4), le tableau de points
(5) et les blocs de match (6). Le seul bloqueur externe est le design des blasons.

## Hors périmètre

- Les routes serveur `POST /api/house/join`, `/house/choice`, `/league/join`, `/league/leave` ne sont pas
  authentifiées et ne le seront pas dans ce plan. C'est un choix serveur assumé et tracé.
- Aucune refonte graphique globale. Les nouvelles pages réutilisent `Common.css` (`Card`, `CardHeader`, `Table`,
  tokens `:root`).
- Pas d'internationalisation : le site est en français, le serveur sert des libellés français.
