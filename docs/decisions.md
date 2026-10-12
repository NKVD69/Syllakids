# Décisions techniques

## 2026-10-11 — Vite plutôt que Next.js pour l'application enfant

Le cahier des charges proposait React avec Next.js. L'application enfant doit fonctionner hors ligne et être empaquetée avec Capacitor : une application monopage Vite produit directement des fichiers statiques, sans serveur. Next.js reste envisagé pour le back-office (édition des contenus), qui partagera la bibliothèque `@syllakids/decodabilite`.

## 2026-10-11 — Progression stockée localement en attendant la synchronisation

La progression est enregistrée sur l'appareil (localStorage) dans cette première tranche. Elle passera en IndexedDB, puis sera synchronisée avec Supabase (région UE) quand les comptes adultes et le consentement parental seront en place.

## 2026-10-11 — Synthèse vocale du navigateur en repli provisoire

Les fichiers son n'existent pas encore. Le repli permet de tester les parcours ; il est signalé dans le README et doit disparaître avant toute diffusion.

## 2026-10-11 — Évaluation du tracé sur l'appareil

Le tracé est comparé au modèle de `content/traces-capitales.json` après ré-échantillonnage (32 points) : nombre de traits, ordre, sens, point de départ, forme et taille. Les seuils sont dans `apps/app/src/trace/evaluer.ts` et devront être ajustés avec de vrais tracés d'enfants de 5 ans. Les variantes en traits séparés de M, N, V et W ne sont pas encore reconnues.

## 2026-10-11 — L'enfant n'est jamais bloqué

Après 3 erreurs sur un même élément, l'application donne la bonne réponse (« Voilà la bonne réponse. On la refera plus tard. ») et passe à la suite. Ces éléments devront alimenter les révisions espacées.

## 2026-10-11 — La voix de l'enfant reste en mémoire

Les enregistrements de l'activité R1 ne sont ni sauvegardés ni envoyés : ils existent le temps de l'activité, sur l'appareil. Leur conservation (3 mois, puis partage avec l'enseignant) ne sera ajoutée qu'avec le consentement parental prévu par les documents RGPD.

## 2026-10-12 — Toutes les écritures passent par des fonctions SQL

Les tables ne sont lisibles qu'à travers des règles par ligne (un parent ne voit que ses enfants, un enseignant que ses classes) et aucune écriture directe n'est permise : créer une classe, un élève, rattacher une famille, enregistrer un accord ou une progression passe par une fonction qui vérifie les droits et tient le journal des accès. L'application appelle ces fonctions de la même façon sur Supabase et sur le serveur local (PGlite), ce qui permet de tester les droits sur un vrai Postgres à chaque `npm test`.

## 2026-10-12 — L'enseignant crée les profils, la famille les rejoint par un code personnel

En classe, l'école est responsable du traitement : l'enseignant crée les profils de ses élèves. Chaque élève reçoit un code famille de 8 caractères, imprimé sur un coupon ; le parent le saisit et donne son accord, et retrouve le même profil à la maison (un seul parcours, comme le demande le cahier des charges). Un code de classe partagé aurait obligé à montrer la liste des élèves aux familles. Le code de classe sert seulement au cas inverse : un profil créé à la maison qui rejoint la classe.

## 2026-10-12 — Retrait de l'accord parental

Retirer l'accord d'utilisation détache le parent du profil. Si le profil n'est plus rattaché à personne (ni famille ni classe), il est supprimé avec sa progression. Un profil de classe reste à l'école, responsable de traitement : le parent est invité à demander son retrait à l'enseignant. À faire valider par le juriste.

## 2026-10-12 — Progression : chaque appareil travaille hors ligne, le serveur arbitre par version

La progression d'un enfant est un document JSON avec un numéro de version. Un appareil n'écrit que s'il connaît la dernière version ; sinon il reçoit celle du serveur, fusionne et recommence. La fusion ne perd rien : unités terminées réunies, séances au maximum, pour chaque item la réponse la plus récente, record de lecture le plus haut, temps de lecture compté par appareil puis additionné, réglages modifiés en dernier. Elle est commutative et idempotente (testé), donc tous les appareils convergent.

## 2026-10-12 — Tablette de la classe

Sur la tablette partagée, chaque enfant touche son image puis ses 3 images secrètes (différentes, parmi 9) ; deux erreurs de suite font demander l'aide d'un adulte. 36 images sont disponibles (12 dessins en 3 couleurs d'anneau) pour que chaque élève ait la sienne. Le compte enseignant reste ouvert sur la tablette ; l'espace adulte y demande donc le mot de passe du compte, et non la petite addition.

## 2026-10-12 — Temps de lecture et durée maximale

Le temps est compté par tranches de 15 secondes tant que l'écran d'une séance est visible. L'adulte peut fixer une durée maximale par jour (tous appareils confondus) : une fois atteinte, le chemin se met en pause (« On s'arrête ici pour aujourd'hui »), la séance en cours se termine normalement.

## 2026-10-12 — Ce qui n'est pas encore fait côté comptes

Aucune vérification qu'un compte enseignant appartient bien à un enseignant (prévu avec le rôle « direction »), pas de double authentification (Supabase la permet, l'écran reste à faire), pas d'e-mail avant la suppression d'un compte inactif, pas de suivi des confusions fréquentes ni de seuils réglables par élève. La voix et les tracés ne sont toujours pas conservés : l'accord correspondant est recueilli mais sans effet pour l'instant, ce que le formulaire indique.

## 2026-10-11 — Reconnaissance de l'écriture sur l'appareil

La dictée (E2) reconnaît la lettre écrite dans chaque case avec un comparateur de nuages de points ($P, 48 points), entraîné sur les modèles de `content/traces-capitales.json`. Les accents sont séparés du corps de la lettre (traits au-dessus de la ligne) puis classés à part (aigu, grave, circonflexe), pour ne pas confondre E, É, È et Ê. Aucun tracé ne quitte l'appareil. On vérifie seulement que la case contient la lettre attendue : l'ordre et le sens des traits sont travaillés en E1.

## 2026-10-11 — Révisions espacées par boîtes de Leitner

Chaque élément noté (syllabe, mot, phrase) entre dans une boîte : une réussite le fait monter (révision dans 1, 2, 4, 8 puis 16 jours), une erreur le renvoie en boîte 1. Une séance commence par 5 éléments dus au plus, des unités précédentes, les plus fragiles d'abord. La logique est pure et testée (`apps/app/src/revisions.ts`).

## 2026-10-11 — Critère de maîtrise

Une unité est validée quand la séance 2 atteint 85 % de réussite (5 ans) ou 90 % (6 ans) sur les réponses que l'application peut vérifier (L4, L6, C1, E2, E3 et révisions). Les activités orales (A1 à A3, R1, R2) et auto-évaluées (L5, L7) ne comptent pas. Sous le seuil, la séance 2 est proposée de nouveau ; le bilan (U14) n'a qu'une séance et n'applique pas de seuil.

## 2026-10-11 — C1 attend les illustrations

C1 a besoin d'au moins 3 images pour l'unité ; tant qu'elles n'existent pas, l'activité se termine d'elle-même. La minute de lecture (F1) affiche les mots par pages de 12 pour éviter tout défilement.

## 2026-10-11 — Mots entendus et mots lus

Les activités purement orales (A1, A2, A3) puisent dans tous les mots du parcours, même ceux que l'enfant ne sait pas encore lire, puisque rien n'est écrit à l'écran. Les activités de lecture n'utilisent que des mots lisibles au rang de l'unité.
