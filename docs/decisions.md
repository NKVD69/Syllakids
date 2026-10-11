# Décisions techniques

## 2026-10-11 — Vite plutôt que Next.js pour l'application enfant

Le cahier des charges proposait React avec Next.js. L'application enfant doit fonctionner hors ligne et être empaquetée avec Capacitor : une application monopage Vite produit directement des fichiers statiques, sans serveur. Next.js reste envisagé pour le back-office (édition des contenus), qui partagera la bibliothèque `@syllakids/decodabilite`.

## 2026-10-11 — Progression stockée localement en attendant la synchronisation

La progression est enregistrée sur l'appareil (localStorage) dans cette première tranche. Elle passera en IndexedDB, puis sera synchronisée avec Supabase (région UE) quand les comptes adultes et le consentement parental seront en place.

## 2026-10-11 — Synthèse vocale du navigateur en repli provisoire

Les fichiers son n'existent pas encore. Le repli permet de tester les parcours ; il est signalé dans le README et doit disparaître avant toute diffusion.

## 2026-10-11 — Évaluation du tracé sur l'appareil

Le tracé est comparé au modèle de `content/traces-capitales.json` après ré-échantillonnage (32 points) : nombre de traits, ordre, sens, point de départ, forme et taille. Les seuils sont dans `apps/app/src/trace/evaluer.ts` et devront être ajustés avec de vrais tracés d'enfants de 5 ans. Les variantes en traits séparés de M, N, V et W ne sont pas encore reconnues.
