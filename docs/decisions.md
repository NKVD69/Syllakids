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
