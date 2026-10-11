# Journal des sessions

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
