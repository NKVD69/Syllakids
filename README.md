# Syllakids

Application web, tablette et téléphone pour apprendre à lire avec la méthode syllabique, pour les enfants de 5 et 6 ans. L'enfant écoute un son, le répète, le lit, puis l'écrit au doigt ou au stylet, sans jamais rencontrer une lettre qu'on ne lui a pas apprise.

Le cahier des charges complet (progression, activités, consignes, tracés, RGPD) est dans le projet claude.ai « Lecture syllabique ».

## Démarrer

```bash
npm install
npm run dev          # application sur http://localhost:5173
npm test             # tests : déchiffrabilité, contenus, évaluation du tracé
npm run build        # version installable (PWA) dans apps/app/dist
npm run contenu:generer   # régénère content/unites/*.json depuis content/sources/listes.json
```

Node 20 ou plus récent.

## Organisation

| Dossier | Contenu |
| --- | --- |
| `packages/decodabilite` | Règles de lecture : graphèmes, phonèmes, syllabes, rang minimal de lecture d'un mot ou d'une phrase. Utilisée par l'application et par le générateur de contenus. |
| `content/` | Contenus pédagogiques en JSON : listes validées (`sources/listes.json`), unités générées (`unites/U00.json` à `U14.json`), consignes, personnages, tracés des capitales. |
| `apps/app` | Application React + Vite, installable (PWA), conçue pour être empaquetée avec Capacitor pour iOS et Android. |
| `scripts/` | Générateur de contenus. |
| `docs/` | Décisions techniques et journal des sessions de développement. |

## Règle d'or

Aucun mot, aucune phrase ne doit demander de deviner. `npm test` échoue si un contenu contient une lettre ou un son pas encore enseigné au rang où il apparaît. Pour changer une liste, modifier `content/sources/listes.json`, lancer `npm run contenu:generer`, puis `npm test`.

## Sons

L'application cherche d'abord un fichier `apps/app/public/audio/<identifiant>.m4a` :

- contenu lu (phonèmes, syllabes, mots, phrases) : identifiants des items, par exemple `U06-M-LUNE.m4a` ;
- consignes et messages : identifiants de `content/consignes.json`, par exemple `CON-A1-STD.m4a`.

Tant qu'un fichier manque, elle utilise la synthèse vocale du navigateur, **à titre provisoire seulement** : elle prononce mal les sons isolés. Ne jamais publier avec ce repli.

## Avancement

Voir `docs/journal.md`.
