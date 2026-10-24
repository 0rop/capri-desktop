[English](README.md) · **Français**

# Capri

Capri, le construct du *Project Capricorn* (Cyberpunk: Edgerunners, saison 2), vit sur ton bureau
et te raconte ce que fait **Claude Code** : elle se téléporte, glitche, commente chaque action,
vient te chercher quand Claude attend ta permission et part en vrille quand la tâche est finie.

![Capri annonce que Claude a terminé](docs/done.png)

![Téléportation, image par image](docs/teleport.png)

## Ce qu'elle fait

- **Pendant que Claude bosse** : un ticker au-dessus d'elle affiche l'action en cours
  (`MODIFIE gigs.ts`, `EXÉCUTE npm test`, `CHERCHE "paginate"`…) et elle lâche des petits glyphes de données.
- **Quand Claude a besoin de toi** (permission, question) : elle se téléporte à côté de ta souris, crinière hérissée, et insiste.
- **Quand une commande plante** : image d'impact rouge, elle encaisse le coup, gros glitch, et la ligne d'erreur utile.
- **Quand c'est fini** : téléportation au milieu de l'écran, éclat de rire crinière déployée,
  cut-in façon anime de son sourire, puis un résumé (`12 actions · 3 fichiers modifiés · 2 min 14`) et la dernière phrase de Claude.
- **Le reste du temps** : elle flotte, sa crinière ondule et perd des éclats, elle se balade d'un coin à l'autre de l'écran,
  se retourne et penche la tête quand ta souris approche, regarde parfois une étoile au-dessus de l'écran (le satellite),
  et s'endort si rien ne se passe pendant 10 minutes.

![Le rire et le cut-in](docs/laugh.png)

### Elle bouge partout

- **Elle s'assoit sur tes fenêtres** : perchée sur le bord du haut d'une fenêtre, les jambes dans le vide qui balancent l'une après l'autre.
  Elle suit la fenêtre quand tu la déplaces, et tombe quand tu la fermes, la réduis ou la caches.
  Pendant que Claude travaille, elle s'installe sur la fenêtre au premier plan si elle peut.
- **Elle dépasse des bords de l'écran** : à moitié cachée à gauche ou à droite, ou la tête en bas depuis le haut.
  Elle est timide : approche ta souris et elle file se cacher sur un autre bord.
- **Elle tombe** : étirée, crinière soufflée vers le haut, de plus en plus vite, puis un gros écrasement et une gerbe d'éclats à l'atterrissage.
  En chemin, le rebord d'une fenêtre peut la rattraper.
- **Pose-la sur une fenêtre** : attrape-la et lâche-la avec les hanches sur le bord du haut d'une fenêtre, elle s'y assoit.
  Lâchée ailleurs, elle tombe.
- **Petites fioritures** : un tour complet avec des images rémanentes, un saut, un regard à gauche puis à droite, la tête penchée.

![Assise sur une fenêtre](docs/sit.png)

![Elle dépasse des bords de l'écran](docs/peek.png)

Le suivi des fenêtres ne marche que sous Windows pour l'instant (un petit script PowerShell lit la position des fenêtres, pas leurs titres ni leur contenu).
Sur macOS et Linux, elle flotte, dépasse des bords, tombe et se balade quand même.

Elle n'attrape la souris que sur son corps (au pixel près) : tout le reste de l'écran reste utilisable normalement.

- **Clic** sur elle : elle te dit où en est Claude.
- **Glisser** : tu la déplaces.
- **Clic** sur le panneau : il se ferme.
- **Ctrl+Alt+C** : la cacher / la faire revenir.
- **Icône près de l'horloge** : téléporter, démo, taille, son, écran, langue, lancement au démarrage, hooks.

Elle parle **français ou anglais et choisit toute seule la langue de ton système**. Tu peux en forcer une dans le menu de l'icône.

## Installation

Il faut [Node.js](https://nodejs.org) 20 ou plus.

```bash
git clone https://github.com/mochiiwuff/capri-desktop.git
cd capri-desktop
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
| `star` | elle regarde le satellite |
| `land` | elle atterrit après une chute |
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
- **Image par image, pose à pose** : rien n'est interpolé. Chaque mouvement est une feuille d'exposition (`acting.js`) :
  des dessins clés tenus quelques images, une anticipation dans l'autre sens, une image de smear avec des copies
  de la tête, un dépassement, des temps de pause. Son flottement au repos, c'est quatre dessins, pas une sinusoïde.
- **Elle joue avec sa tête et sa crinière**, comme dans la série : la tête penchée, les éclats qui se hérissent
  ou explosent, le rire hystérique avec la tête qui tremble à chaque dessin, la tête qui tombe quand elle dort.
  La découpe est riggée : la tête pivote autour du cou, la crinière s'ouvre de façon irrégulière autour d'un visage qui reste rigide,
  et les cuisses se replient (en raccourci, vues de face) pour qu'elle puisse s'asseoir en balançant le bas des jambes.
- **Écrasement, étirement, images rémanentes** : la découpe plate s'écrase en lame pour se retourner, s'étire quand elle tombe,
  s'aplatit à l'atterrissage, et se dédouble en copies verte et rouge (les autres esprits en elle) quand elle tourne ou rit.
- **Le satellite** : de temps en temps elle fixe une étoile au-dessus de l'écran, clin d'œil à la fin de la saison.
- **Sa texture** : la crinière rouge est remise au rouge de la série et couverte de points blancs qui scintillent.
  Des éclats s'en détachent et dérivent.
- **Le décalage violet** : comme dans l'anime, une copie violette décalée sous elle, sous le panneau, sous les éclats.
- **Glitch « relic »** : tranches horizontales décalées et séparation RGB, dans la lignée des apparitions de Johnny Silverhand.
- **Téléportation** : charge, éclats, effondrement en ligne, colonne de lumière rouge vers le ciel,
  éclair jusqu'à la destination, retour avec deux *impact frames*.
- **Cut-in** : son vrai sourire, en poussée de caméra, avec des lignes de vitesse, quand Claude termine une tâche.
- **Typo** : Chakra Petch (coupes en biseau, comme ses éclats) + JetBrains Mono pour les données.

Si Windows est réglé sur « Afficher les animations : non », elle se contente de fondus.

## Comment c'est fait

```
hooks/capri-hook.js      lancé par Claude Code, lit l'événement sur stdin et le poste à l'app
scripts/install-hooks.js ajoute / retire le hook dans ~/.claude/settings.json
src/main/                Electron : fenêtre transparente plein écran, clic à travers, tray, bridge HTTP local
  windows.js / .ps1      où sont les autres fenêtres (Windows), pour qu'elle s'assoie dessus
src/renderer/js/
  sprite.js              shader WebGL : tête, crinière, position assise, smears, images rémanentes, couleurs, glitch
  acting.js              les feuilles d'exposition : chaque mouvement, dessin par dessin
  capri.js               le personnage : postures, téléportation, assise, bords d'écran, chute, drag, sommeil
  fx.js                  éclats, colonnes de lumière, éclairs, glyphes, l'étoile, le cut-in
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
