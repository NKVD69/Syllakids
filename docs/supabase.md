# Mettre en service les comptes (Supabase)

Sans cette étape, Syllakids fonctionne sur un seul appareil, sans compte. Comptez une demi-heure.

## 1. Créer le projet

1. Créer un compte sur supabase.com avec l'adresse de l'éditeur (le titulaire du compte développeur).
2. **New project** : nom `syllakids`, mot de passe de base de données fort (à garder dans un coffre-fort de mots de passe), **région dans l'Union européenne** : *West EU (Paris)* de préférence, sinon *Central EU (Frankfurt)*.
3. Signer l'avenant de protection des données (DPA) de Supabase depuis les réglages de l'organisation, et le joindre au registre des traitements.

## 2. Installer la base

Dans **SQL Editor**, coller tout le contenu de `supabase/migrations/20261012000000_comptes_et_progression.sql` et l'exécuter.
(Avec l'outil en ligne de commande : `supabase link --project-ref <ref>` puis `supabase db push`.)

La migration crée les tables, les règles d'accès par ligne et les fonctions appelées par l'application. Elle est testée à chaque `npm test` sur un vrai Postgres local.

## 3. Régler l'authentification

Dans **Authentication** :

- *Sign In / Providers* → Email : activé, **Confirm email** activé, longueur minimale du mot de passe **10**, protection contre les mots de passe divulgués activée si l'offre le permet.
- *URL Configuration* : **Site URL** = l'adresse publique de l'application (par exemple `https://app.syllakids.fr/`) ; ajouter la même adresse dans **Redirect URLs** (et `http://localhost:5173/` pour le développement).
- *Emails* : traduire en français les modèles « Confirm signup » et « Reset password ». Pour un envoi fiable, brancher un service d'e-mails (SMTP) hébergé dans l'UE.
- Désactiver les fournisseurs inutiles (connexion par téléphone, réseaux sociaux).

## 4. Relier l'application

Dans **Project Settings → API**, copier l'URL du projet et la clé **anon public**. Créer `apps/app/.env.local` (jamais versionné) :

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

puis `npm run build`. La clé *anon* est publique par conception : elle ne donne accès qu'aux fonctions prévues, avec les droits de la personne connectée. **Ne jamais mettre la clé `service_role` dans l'application.**

## 5. Durées de conservation

Dans **Database → Extensions**, activer `pg_cron`, puis dans le SQL Editor :

```sql
select cron.schedule('purge-syllakids', '30 3 * * *', $$select public.purger_donnees()$$);
```

La fonction supprime chaque nuit les journaux d'accès de plus de 6 mois, les comptes sans connexion depuis 12 mois et les profils d'enfants qui ne sont plus rattachés à personne. L'e-mail d'avertissement avant la suppression d'un compte inactif reste à mettre en place (fonction Edge planifiée, un mois avant).

## 6. Vérifier

1. Créer un compte enseignant, une classe, deux élèves ; ouvrir « Codes pour les familles ».
2. Sur un autre appareil, créer un compte parent et saisir un code famille : la progression de la classe apparaît.
3. Dans le SQL Editor : `select count(*) from public.enfants;` doit montrer les élèves, mais une requête avec la clé *anon* sur `/rest/v1/enfants` doit renvoyer une liste vide, et un appel à `/rest/v1/rpc/purger_donnees` doit être refusé.
4. Supprimer un compte de test depuis l'espace adulte : il doit disparaître de **Authentication → Users**. (Si Supabase refuse la suppression dans `auth.users` depuis la fonction, la remplacer par une fonction Edge qui utilise l'API d'administration.)

## Essayer sans Supabase

Le serveur local reprend la même base sur PGlite (Postgres dans Node) :

```bash
npm run serveur:local                                    # port 54330, données en mémoire
VITE_SERVEUR_LOCAL=http://localhost:54330 npm run dev    # ou npm run build + preview
npm run parcours:adulte                                  # parcours automatique classe + maison
```

Réservé au développement : authentification simplifiée, aucun e-mail envoyé.
