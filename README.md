# MELECGEST

Gestion du matériel électrique avec base Supabase partagée, accès équipe et administration, interface responsive et export PDF.

## Accès

Application : https://arduino15650.github.io/melecgest/

Chaque utilisateur crée son compte, confirme son adresse par e-mail puis associe une application Authenticator (TOTP). La double authentification est obligatoire pour les administrateurs et l’équipe. L’administrateur initial autorisé est aitelhadjmustapha@yahoo.fr. Les autres adresses sont autorisées dans Administration ; aucun rôle n’est déterminé par les métadonnées modifiables du profil.

Le compte utilisateur et son Authenticator doivent être configurés par leur propriétaire. Le mot de passe n’est jamais partagé.

## Stock et administration

Les références, compteurs et mouvements apparaissent uniquement après sélection d’un type, d’une catégorie ou d’un fournisseur. Le stock initial est une entrée ; chaque modification de stock passe par un mouvement atomique. Les autres appareils actualisent les données toutes les deux secondes. Les informations de l’établissement et le logo sont intégrés au PDF. Envoyer utilise le partage natif ou ouvre la messagerie avec ajout manuel du PDF ; aucun service d’envoi automatique n’est configuré.

## Supabase

Projet : bnpfeilsnupfodcggpro. Schéma initial : supabase/schema.sql (déjà appliqué, ne pas réexécuter sur les tables existantes). Toutes les tables ont des politiques RLS. L’accès au stock exige une adresse autorisée, une adresse confirmée, une session active et le niveau MFA aal2. L’ancienne API D1 est désactivée ; les anciennes données sont conservées comme sauvegarde.

Dans Authentication / URL Configuration, définir Site URL à https://arduino15650.github.io/melecgest/ et autoriser cette URL ainsi que https://melecgest-magasin.espace-de-tr-8048.chatgpt.site/. Vérifier la confirmation des e-mails et le fournisseur TOTP. Les paramètres URL et le parcours d’authentification réel doivent être vérifiés dans le tableau de bord avant ouverture à l’équipe.

Seule la clé publishable est dans le navigateur. Ne jamais y placer une clé secrète ou service_role.

## Compilation et publication

npm install
npx tsc --noEmit
node node_modules/vite/bin/vite.js build --config vite.pages.config.ts

Recréer docs/.nojekyll après compilation et publier la branche main, dossier /docs, sur GitHub Pages. La version Sites utilise npm run build et le workflow du plugin Sites ; sa politique d’accès actuelle est conservée.

L’historique affiche les 200 mouvements récents ; les compteurs portent sur tous les mouvements.
