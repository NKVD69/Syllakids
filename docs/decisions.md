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

## 2026-10-11 — Mots entendus et mots lus

Les activités purement orales (A1, A2, A3) puisent dans tous les mots du parcours, même ceux que l'enfant ne sait pas encore lire, puisque rien n'est écrit à l'écran. Les activités de lecture n'utilisent que des mots lisibles au rang de l'unité.
