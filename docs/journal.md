# Journal des sessions

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
