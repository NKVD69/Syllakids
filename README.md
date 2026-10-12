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
npm run parcours -- U07 0 6ans essai   # joue une séance automatiquement (après build + preview)
npm run serveur:local     # base locale (même SQL que Supabase) pour essayer comptes et synchronisation
npm run parcours:adulte   # parcours classe + maison (serveur local + build avec VITE_SERVEUR_LOCAL)
```

Options du parcours automatique (variables d'environnement) : `IMAGES_FACTICES=1` (images de remplacement pour C1), `REVISIONS=U02-M-AMI,U03-S-RO` (éléments à revoir en début de séance), `DUREE_MAX=600` (secondes), `CAPTURES=dossier`.

## Images

Les illustrations sont attendues dans `apps/app/public/images/<image>` (nom indiqué par le champ `image` des items, par exemple `lave.webp`). L'activité C1 se saute d'elle-même tant qu'une unité a moins de 3 images.

Node 20 ou plus récent.

## Organisation

| Dossier | Contenu |
| --- | --- |
| `packages/decodabilite` | Règles de lecture : graphèmes, phonèmes, syllabes, rang minimal de lecture d'un mot ou d'une phrase. Utilisée par l'application et par le générateur de contenus. |
| `content/` | Contenus pédagogiques en JSON : listes validées (`sources/listes.json`), unités générées (`unites/U00.json` à `U14.json`), consignes, personnages, tracés des capitales. |
| `apps/app` | Application React + Vite, installable (PWA), conçue pour être empaquetée avec Capacitor pour iOS et Android. |
| `supabase/` | Base de données : migration (tables, règles d'accès, fonctions), tests des droits. |
| `scripts/` | Générateur de contenus, serveur local, parcours automatiques. |
| `docs/` | Décisions techniques et journal des sessions de développement. |

## Règle d'or

Aucun mot, aucune phrase ne doit demander de deviner. `npm test` échoue si un contenu contient une lettre ou un son pas encore enseigné au rang où il apparaît. Pour changer une liste, modifier `content/sources/listes.json`, lancer `npm run contenu:generer`, puis `npm test`.

## Comptes et synchronisation

Sans configuration, Syllakids fonctionne sur un seul appareil, sans compte. Avec Supabase (hébergé dans l'UE), les parents et les enseignants ont un compte, la progression d'un enfant se retrouve en classe et à la maison, et les adultes suivent ses progrès. Mise en service : `docs/supabase.md`. Variables dans `apps/app/.env.local` (modèle : `apps/app/.env.example`).

## Sons

L'application cherche d'abord un fichier `apps/app/public/audio/<identifiant>.m4a` :

- contenu lu (phonèmes, syllabes, mots, phrases) : identifiants des items, par exemple `U06-M-LUNE.m4a` ;
- consignes et messages : identifiants de `content/consignes.json`, par exemple `CON-A1-STD.m4a`.

Tant qu'un fichier manque, elle utilise la synthèse vocale du navigateur, **à titre provisoire seulement** : elle prononce mal les sons isolés. Ne jamais publier avec ce repli.

## Avancement

Voir `docs/journal.md`.
