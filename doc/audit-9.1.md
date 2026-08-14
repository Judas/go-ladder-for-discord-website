# Audit de fonctionnement — itération 2

Photographie de l'état du site avant d'ajouter les cinq pages du plan 9.1. Fait le 15 août 2026, contre un
`fulguro-server` lancé en local sur 4567.

## Méthode

Ce qui a servi de preuve, par ordre de fiabilité :

1. **Les charges utiles réelles.** `src/__fixtures__/api.json` est capturé depuis le backend local, pas écrit à la
   main : joueurs, profil avec 4 parties, profil sans partie, parties récentes, détail de partie, paliers, comptes,
   santé. Un champ qui bouge côté serveur fait donc échouer les tests au lieu de les faire passer sur une forme
   inventée.
2. **Une suite de rendu qui traite `console.error` comme un échec** (`src/testUtils.jsx`,
   `src/Pages/pages.test.jsx`). React signale les `key` manquantes et les attributs DOM invalides par là : une page
   qui « s'affiche bien » mais qui râle est attrapée ici plutôt que dans une console que personne n'a ouverte.
3. **Le linter** (itération 1), qui avait déjà sorti trois morceaux de code mort.
4. **Le serveur de prod** lancé sur le build, avec le proxy vers le vrai backend.

Ce que ça ne couvre pas : les pixels. Voir « Reste à vérifier à l'œil » en fin de document.

## Défauts trouvés

### Corrigés dans cette itération

| # | Où | Quoi | Preuve |
|---|---|---|---|
| 1 | `RecentGames.jsx` | `key={game.id}` — `ApiGame` **n'a pas** de champ `id`, la clé valait `undefined` sur les 20 lignes. Le champ est `goldId` | `console.error` React |
| 2 | `PlayerProfile.jsx` `GameList` | `.map()` sans `key`. La `key` était posée sur le `RowElement` *à l'intérieur* de `GameRow`, ce qui ne compte pas | `console.error` React |
| 3 | `About.jsx` | `.map()` des paliers sans `key` | `console.error` React |
| 4 | `PlayerProfile.jsx` `AccountList` | Même défaut que 2, **masqué** : React dédoublonne l'avertissement par composant parent, et les deux listes passent par `RowGroupElement` | lecture, après correction de 2 |
| 5 | `PlayerProfile.jsx` `TierProgression` | `<div width="64" height="64" />` — attributs invalides sur un `div`. React les laisse passer sans rien dire, donc aucun avertissement : c'est du HTML faux, silencieux | lecture + test palier 1 |
| 6 | `PlayerProfile.jsx` `TierProgression` | Le blason **précédent** portait `alt={currentTier.name}`, soit le nom du palier **courant**. Le blason suivant n'avait pas d'`alt` du tout | lecture |
| 7 | `PlayerList.jsx` | Recherche et filtre recopiés dans l'état par deux `useEffect` qui lisaient un `players` périmé. Conséquence réelle : une recherche tapée pendant le chargement ne renvoyait rien jusqu'à la frappe suivante | lecture + tests de comportement ajoutés |
| 8 | `PlayerList.jsx` | La recherche plantait sur un compte au `name` nul — tous les champs d'`ApiPlayerAccount` sont nullables. Latent : aucune ligne de ce type dans les données actuelles (0 sur 180 joueurs) | modèle serveur + comptage sur les données réelles |

7 supprime deux `useState` et deux `useEffect` : les deux listes sont dérivées au rendu. Cinq tests de comportement
couvrent la recherche par pseudo Discord, par nom de compte lié, le « Aucun résultat » et le filtre « validés ».

Pour mémoire, trouvés et corrigés en itération 1 par le linter : `src/Components/AccountLinkForm.jsx` (jamais importé
et cassé), les props fantômes `gameLink` / `black` de `Game.jsx`, le `require('path')` inutilisé.

### Laissés ouverts, sciemment

| # | Où | Quoi | Décision |
|---|---|---|---|
| 9 | 10 endroits | `==` au lieu de `===` | Cosmétique. Warning de lint, pas de correction en masse |
| 10 | `WGOPlayer.jsx` | L'effet ne dépend pas de `move` : changer de coup ne redessinerait pas le goban | Latent — aucun appelant ne passe `move` aujourd'hui. À traiter si une page l'utilise |
| 11 | `DiscordAuth.jsx` | L'effet ne dépend pas de `queryParams` | Voulu : l'échange OAuth est à un coup, au montage |
| 12 | `AuthProfile.js` | `hasValidProfile()` est lu pendant le rendu, sans re-rendu à la connexion. C'est le `window.location.replace` de `fetchUserProfile` qui masque le problème | **Bloque l'itération 7** : des CTA qui mutent l'état ne peuvent pas s'en contenter. Traité en 7.4 |
| 13 | 8 pages | `if (!res.ok) throw res.statusText` empêche de lire un corps d'erreur | **Bloque l'itération 3** : `/api/health` répond 503 **avec** un corps utile. Traité par le hook `useApi` |
| 14 | `PlayerList` / `PlayerProfile` | `isValid` (`>= 4 && >= 2`) dupliqué | À fusionner lors de la refonte du profil, itération 7 |

## Contrat lu vs contrat servi

Vérifié champ par champ contre le backend local. **Aucun écart** sur ce que le site consomme aujourd'hui.

- `ApiPlayer` — tous les champs lus par le site sont là. Les blocs `house` et `league` existent désormais et valent
  `null` en local (personne n'a rejoint).
- `ApiGame` — `goldId`, `date`, `black`, `white`, `result`, `sgf`. Ni `id` ni `gameLink` : voir défauts 1 et
  itération 1.
- `ApiPlayerAccount` — `server`, `id`, `name`, `rank`, `link`. Tous nullables au modèle ; tous remplis en pratique.
- `/api/tiers` — 8 paliers, rangs 1 à 8. ⚠ `public/shields/shield-0.svg` n'est donc atteint par aucun `tierRank` ;
  un joueur non classé (`tierRank: 0`) le toucherait, mais les 180 joueurs ont un rating > 0.
- `/api/accounts` — `["KGS", "OGS"]`, cohérent avec le formulaire de liaison.
- `/api/health` — `healthy` + `services[]` de 11 services, avec `stale` et `healthy` déjà calculés côté serveur.

## Ce que le backend local dit des itérations 4 à 7

⚠ **Il n'y a aucune donnée maison ni ligue en local.** Constaté sur 60 profils : 0 maison, 0 ligue.

- `/api/houses` — les 4 maisons, `memberCount: 0`, `totalPoints: 0`, `leader: null`.
- `/api/league` — `sessionCount: 16`, les 16 sessions du calendrier, `standings: []`, `currentSession: null`.
- `period` vaut **`VACATION`** (nous sommes en août), `season` vaut `2025-2026`.

Deux conséquences pour la suite :

1. Les états vides sont **la** chose qu'on peut tester tout de suite, et ils comptent : une maison sans membre, une
   ligue sans classement, une session nulle hors saison. Les construire d'abord est le bon ordre.
2. Les états peuplés demanderont des données de test. À prévoir avant l'itération 5, sinon les classements ne seront
   jamais vus autrement qu'à vide.

Et comme `period` est `VACATION` aujourd'hui, c'est le parcours « vacances » de l'itération 7 qui sera visible en
premier : pas de bouton « Rejoindre une maison », mais le libellé du 1<sup>er</sup> septembre.

## Pièges d'environnement

Deux trouvés en montant les tests, tous deux consignés dans `CLAUDE.md` :

- **Node 24+ fournit son propre `localStorage`**, indéfini sans `--localstorage-file`, et il masque celui de jsdom.
  `AuthProfile.js` touche un `localStorage` nu à chaque chargement : sans le correctif de `setupTests.js`,
  l'application plante au rendu dans les tests et seulement là.
- **`window.WGo` n'existe pas sous jsdom.** `WGOPlayer` lit `window.WGo.BasicPlayer.layouts` **pendant le rendu**, pas
  dans un effet, donc toute page portant un goban plante. Un bouchon est posé dans `setupTests.js`.

## Reste à vérifier à l'œil

Non couvert par cette itération, faute d'outils navigateur. Chaîne de dev : `yarn devstart`, backend local sur 4567,
puis `http://localhost:3000`.

- [ ] Le goban WGo s'affiche et se navigue sur `/game/:goldId`, et la bascule de mise en page à 980px.
- [ ] La liste des joueurs sur mobile (colonnes, largeur, blasons).
- [ ] L'authentification Discord de bout en bout : redirection, retour sur `/auth/discord`, avatar dans l'en-tête.
- [ ] La liaison d'un compte depuis `/link`.
- [ ] Le profil d'un joueur de dernier palier (rang 8) : la barre de progression disparaît entièrement, ce qui est le
      comportement actuel et l'un des points à revoir en 7.1.
- [ ] Les polices Google et les icônes se chargent (le CSP de Render, pas testé en local).
