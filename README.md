# Capri

Capri, le construct du *Project Capricorn* (Cyberpunk: Edgerunners, saison 2), vit sur ton bureau
et te raconte ce que fait **Claude Code** : elle se téléporte, glitche, commente chaque action,
vient te chercher quand Claude attend ta permission et fait la fête quand la tâche est finie.

![Capri annonce que Claude a terminé](docs/done.png)

![Téléportation, image par image](docs/teleport.png)

## Ce qu'elle fait

- **Pendant que Claude bosse** : un ticker au-dessus d'elle affiche l'action en cours
  (`MODIFIE gigs.ts`, `EXÉCUTE npm test`, `CHERCHE "paginate"`…) et elle lâche des petits glyphes de données.
- **Quand Claude a besoin de toi** (permission, question) : elle se téléporte à côté de ta souris et insiste.
- **Quand une commande plante** : image d'impact rouge, gros glitch, et la ligne d'erreur utile.
- **Quand c'est fini** : téléportation au milieu de l'écran, célébration, résumé
  (`12 actions · 3 fichiers modifiés · 2 min 14`) et la dernière phrase de Claude.
- **Le reste du temps** : elle flotte, sa crinière bouge, elle se balade d'un coin à l'autre de l'écran,
  te fait signe quand ta souris approche, et s'endort si rien ne se passe pendant 10 minutes.

Elle est cliquable uniquement sur son corps (pixel près) : tout le reste de l'écran reste utilisable normalement.

- **Clic** sur elle : elle te dit où en est Claude.
- **Glisser** : tu la déplaces.
- **Clic** sur le panneau : il se ferme.
- **Ctrl+Alt+C** : la cacher / la faire revenir.
- **Icône près de l'horloge** : téléporter, démo, taille, son, écran, langue (FR/EN), lancement au démarrage, hooks.

## Installation

Il faut [Node.js](https://nodejs.org) 20 ou plus.

```bash
git clone <ce-repo> capri
cd capri
npm install
npm start
```

### La brancher sur Claude Code

Clique sur l'icône de Capri près de l'horloge, puis **Installer les hooks Claude Code**. Ou en ligne de commande :

```bash
npm run hooks:install
```

Ça ajoute un hook à `~/.claude/settings.json` (une sauvegarde est faite à côté, tes hooks existants sont gardés).
Relance tes sessions Claude Code ensuite. Pour retirer : `npm run hooks:uninstall`.

Les hooks sont lancés en `async` : ils ne ralentissent jamais Claude, et si Capri n'est pas lancée ils ne font rien.

### Tester sans Claude

```bash
npm run demo
```

Rejoue une fausse session complète (lecture, écriture, test qui plante, demande de permission, fin).
C'est aussi dans le menu de l'icône.

## Sons

Tous les sons sont synthétisés en direct (Web Audio), rien n'est fourni sous droits.
Tu peux mettre tes propres fichiers dans le dossier des sons perso (menu › Son › *Ouvrir le dossier des sons perso*),
avec ces noms (`.mp3`, `.wav`, `.ogg` ou `.m4a`) :

| Fichier | Quand |
|---|---|
| `teleport-out` | elle disparaît |
| `teleport-in` | elle réapparaît |
| `done` | Claude a fini |
| `alert` | Claude attend ta permission |
| `error` | une commande a planté |
| `hello` | une session démarre |
| `blip` | chaque syllabe quand elle parle |
| `tick` | petit rappel discret |

## Ce qui part de ta machine

Rien. Le hook ne garde que ce qui sert à l'affichage (nom de l'outil, chemin du fichier, commande lancée,
début de ton prompt et du dernier message de Claude, le tout tronqué) et l'envoie à `127.0.0.1` uniquement.
Le contenu de tes fichiers n'est jamais transmis : pour une écriture, seule sa taille passe.

## Direction artistique

Le but : qu'on ait l'impression qu'elle sort de l'anime, pas d'un widget.

- **Cel animation** : le corps est redessiné 12 fois par seconde (« on twos ») comme un anime,
  24 pendant les téléportations. Chaque dessin a un léger *boil* (le tremblement du trait redessiné à la main).
- **Un vrai rig** : la découpe est séparée en corps + deux bras articulés aux épaules, la crinière ondule par le haut.
- **Sa texture** : la crinière rouge est remise au rouge de la série et couverte de points blancs qui scintillent.
- **Le décalage violet** : comme dans l'anime, une copie violette décalée sous elle, sous le panneau, sous les éclats.
- **Glitch « relic »** : tranches horizontales décalées et séparation RGB, dans la lignée des apparitions de Johnny Silverhand.
- **Téléportation** : charge, éclats, effondrement en ligne, colonne de lumière rouge vers le ciel
  (clin d'œil à la fin de la saison), éclair jusqu'à la destination, retour avec deux *impact frames*.
- **Typo** : Chakra Petch (coupes en biseau, comme ses éclats) + JetBrains Mono pour les données.

Si Windows est réglé sur « Afficher les animations : non », elle se contente de fondus.

## Comment c'est fait

```
hooks/capri-hook.js      lancé par Claude Code, lit l'événement sur stdin et le poste à l'app
scripts/install-hooks.js ajoute / retire le hook dans ~/.claude/settings.json
src/main/                Electron : fenêtre transparente plein écran, clic à travers, tray, bridge HTTP local
src/renderer/js/
  sprite.js              shader WebGL : rig, couleurs, paillettes, glitch, effondrement
  capri.js               le personnage : position, gestes, téléportation, drag, sommeil
  fx.js                  éclats, colonnes de lumière, éclairs, glyphes
  panel.js               le panneau « transmission » et le ticker
  brain.js               traduit les événements Claude en répliques et en actions
  lines.js               ce qu'elle dit (FR / EN)
  voice.js               les sons
```

Pour bosser dessus : `npm run dev` active des routes de debug sur le bridge (`/debug/capture` enregistre une image de la fenêtre dans `captures/`).

## Crédits et droits

Capri / Project Capricorn, Cyberpunk et Cyberpunk: Edgerunners appartiennent à CD PROJEKT RED, Studio Trigger et Netflix.
Projet de fan, non commercial, sans lien avec eux. Les images du personnage dans `assets/capri/` viennent d'images de la série
et d'une découpe faite par des fans ; elles ne sont **pas** couvertes par la licence MIT du code.
Si un ayant droit veut qu'elles soient retirées, ouvre une issue.

Polices : Chakra Petch et JetBrains Mono, sous licence SIL Open Font License, via Fontsource.

---

### English

A desktop companion for Claude Code. Capri, the personality construct from *Cyberpunk: Edgerunners* season 2,
floats on your desktop, teleports around, narrates what Claude is doing (via Claude Code hooks), comes to your
cursor when Claude needs permission and celebrates when the task is done.
`npm install && npm start`, then tray icon › *Install Claude Code hooks* (switch the language to English in the same menu).
