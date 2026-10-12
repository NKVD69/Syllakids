# Journal des sessions

## Session 5 — 12 octobre 2026

Fait (les points restants de la session 4, sauf la double authentification) :

- Comptes enseignants vérifiés : d'office avec une adresse académique ou d'une école reconnue, sinon validation par l'éditeur ; pas de classe avant la vérification.
- E-mail d'avertissement un mois avant toute suppression pour inactivité (fonction Edge, envoi par Brevo) ; la purge attend cet avertissement. Classes supprimées à la fin de l'année scolaire suivante.
- Voix et lettres tracées gardées selon les accords : sur l'appareil 3 mois, partagées avec l'enseignant jusqu'à la rentrée ; accord papier saisi par l'enseignant ; écoute et relecture dans la fiche de l'enfant ; effacement au retrait de l'accord.
- Juriste : retrait de l'accord sur un profil de classe et code famille personnel validés.
- 33 tests de droits sur la base (12 de plus), 2 tests des e-mails ; parcours automatique classe + maison en 17 étapes ; parcours enfant avec conservation de la voix et des tracés.

À faire par l'éditeur : appliquer la deuxième migration, déployer la fonction Edge et planifier les deux tâches (docs/supabase.md, section 6).


## Session 4 — 12 octobre 2026

Fait :

- Base de données Supabase (`supabase/migrations`) : comptes adultes (parent, enseignant), classes, profils d'enfants, liens famille, accords parentaux, progression, journal des accès ; règles par ligne et fonctions qui vérifient les droits ; purge selon les durées de conservation du registre. 21 tests de droits sur un vrai Postgres (PGlite).
- Plusieurs enfants sur un appareil : choix par l'image ; sur la tablette de la classe, 3 images secrètes. L'ancienne progression est reprise automatiquement.
- Synchronisation hors ligne entre appareils, avec fusion sans perte (tests) ; envoi en fin de séance, au retour du réseau et toutes les 2 minutes.
- Espace adulte refait : profils de l'appareil ; création de compte et connexion ; formulaire de consentement à 3 accords séparés ; côté parent, ajout d'un enfant, rattachement par code famille, suivi (son en cours, temps de la semaine, réussite, éléments à retravailler, record), réglages dont la durée maximale par jour, accords modifiables, export des données, journal des consultations, retrait de l'accord ; côté enseignant, classes, tableau de bord de la classe sans classement, fiche élève, coupons imprimables des codes familles, export CSV, tablette de la classe.
- Serveur local de développement (`npm run serveur:local`) et parcours automatique classe + maison (`npm run parcours:adulte`, 14 étapes).
- Guide de mise en service : `docs/supabase.md`.
- 194 tests automatisés.

À faire par l'éditeur : créer le projet Supabase en UE et renseigner `apps/app/.env.local` (voir le guide).

Reste : double authentification, rôle direction, confusions fréquentes et seuils par élève, mode collectif (TBI) et fiches PDF, conservation de la voix et des tracés, empaquetage Capacitor, sons enregistrés et illustrations.


## Session 3 — 11 octobre 2026

Fait :

- 4 nouvelles activités : E2 dictée tracée (une case de cahier par lettre, reconnaissance de la lettre écrite, accents compris), E3 étiquettes (on reconstitue le mot entendu avec des lettres ; choisie en profil 5 ans et sur les petits écrans), C1 phrase et image (lire une phrase, toucher l'image qui correspond), F1 chrono-lecture (une minute de lecture, record conservé). Les 17 activités du MVP sont maintenant en place.
- Révisions espacées : chaque réponse notée place l'élément dans une boîte (révision à 1, 2, 4, 8 puis 16 jours) ; chaque séance commence par 5 éléments à revoir au plus, pris dans les unités précédentes.
- Critère de maîtrise : une unité n'est validée qu'avec 85 % de réussite à la séance 2 (profil 5 ans) ou 90 % (profil 6 ans) ; sinon, l'enfant refait la séance 2, sans être bloqué ailleurs.
- Reconnaissance de lettres manuscrites sur l'appareil (nuage de points, accents traités à part), pour la dictée.
- Le parcours automatique sait maintenant écrire dans les cases de la dictée, placer les étiquettes, faire la minute de lecture et préparer des éléments à réviser (`REVISIONS=…`) ; images factices pour C1 (`IMAGES_FACTICES=1`).
- 159 tests automatisés.

Points à surveiller :

- C1 est sautée automatiquement tant que les illustrations n'existent pas (il en faut au moins 3 pour l'unité).
- Les seuils de reconnaissance de l'écriture sont à ajuster avec de vrais tracés d'enfants.

Reste après le MVP pédagogique : espace enseignant et parent, comptes et synchronisation, consentement, empaquetage Capacitor, sons enregistrés et illustrations, tests sur tablettes.


## Session 2 — 11 octobre 2026

Fait :

- 7 nouvelles activités : A1 j'entends / je n'entends pas, A2 où est le son, A3 l'intrus sonore, R1 l'écho (micro, réécoute, auto-évaluation), R2 le son qui dure (jauge de volume), L4 quelle syllabe, L6 vrai mot ou mot inventé. 13 activités sur 17 sont maintenant en place.
- Chaque unité se fait en deux séances : découverte du son, puis entraînement et lecture ; le chemin affiche l'avancement par séance.
- Règle « jamais bloqué » : après 3 erreurs sur un même élément, la bonne réponse est donnée et l'activité continue ; R2 propose de continuer après 15 secondes.
- Mots inventés (5 par rang) ajoutés aux listes et vérifiés automatiquement.
- Bibliothèque : repérage d'un son dans un mot et dans ses syllabes.
- Script de parcours automatique (`npm run parcours`) : joue une séance entière avec un micro simulé et prend une capture par activité.
- 129 tests automatisés.

Reste pour le MVP : E2 dictée tracée, E3 étiquettes, C1 phrase et image, F1 chrono-lecture, critère de maîtrise et révisions espacées, espace enseignant, comptes et synchronisation, sons et illustrations.


## Session 1 — 11 octobre 2026

Fait :

- Dépôt en monorepo npm : bibliothèque de déchiffrabilité, contenus JSON, application.
- Bibliothèque `@syllakids/decodabilite` : graphèmes du MVP, mots-outils, syllabation, rang minimal, vérification des phrases.
- Contenus générés pour les rangs 0 à 13 et le bilan : 132 mots, 55 phrases, 8 phrases de bilan, tous vérifiés ; 178 consignes, 15 conseils aux parents ; tracés des 29 capitales.
- Application : chemin des sons (déblocage progressif), profils 5 ans et 6 ans, mode Dys (OpenDyslexic), verrou parental, et 6 activités sur 17 :
  - présentation du son (et des voyelles),
  - L1 la glissade,
  - L3 le tableau de syllabes (puis ordre mélangé en profil 6 ans),
  - L5 lis le mot (vérification par l'écoute),
  - E1 trace la lettre (observer, repasser, guidé, libre) avec évaluation et messages de correction,
  - L7 la phrase karaoké.
- 109 tests automatisés.

Prochaines sessions (proposition) :

1. Activités d'écoute et de répétition : A1, A2, A3, R1 (micro, réécoute), R2, L4, L6.
2. Écriture et compréhension : E2 dictée tracée, E3 étiquettes, C1 phrase et image, F1 chrono-lecture ; critère de maîtrise et révisions espacées.
3. Espace enseignant et parent, comptes Supabase, consentement, synchronisation ; empaquetage Capacitor.
4. Intégration des sons enregistrés et des illustrations ; tests sur tablettes réelles.
