# MELECGEST

Application française de gestion de matériel électrique. Hébergement Sites privé, base D1 partagée, interface responsive. Aucun fond d’écran photographique n’est intégré.

## Utilisation

- Créer les articles avec référence unique, désignation, type, catégorie, fournisseur, unité, emplacement et seuil d’alerte. Aucun catalogue de démonstration n’est injecté en production.
- Sélectionner un type, une catégorie ou un fournisseur pour afficher les articles, les compteurs et l’historique. La recherche seule ne déclenche pas l’affichage. Effacer les filtres masque tout le contenu sous les filtres.
- Enregistrer les entrées et les sorties ; les sorties excessives sont refusées, y compris lors de demandes simultanées. Le stock initial constitue une entrée.
- La modification est immédiatement reflétée sur l’appareil qui l’enregistre. Les autres appareils consultent la base toutes les deux secondes. Les changements nécessitent une connexion.
- Ouvrir Administration à la première utilisation pour choisir l’adresse e-mail et un code de huit caractères minimum. Cette adresse est un identifiant ; aucun e-mail de validation ou de récupération n’est envoyé. Le code est dérivé avec PBKDF2 et un sel aléatoire. Les sessions sont conservées dans des cookies HttpOnly, expirent au bout d’une heure et peuvent être verrouillées. Cinq échecs déclenchent une limitation d’une minute.
- Enregistrer le nom, l’adresse et éventuellement un logo. Ces informations sont reprises dans le PDF de la sélection.
- Le bouton Envoyer prépare un PDF et ouvre la messagerie, ou le partage natif de l’appareil s’il est disponible. La pièce jointe doit être ajoutée manuellement dans la messagerie classique. Aucun service d’envoi d’e-mail automatique n’est configuré.

Le site est privé : son accès est contrôlé par Sites. L’administration est en plus protégée par l’adresse et le code. Les visiteurs autorisés peuvent modifier le stock. La modification de l’établissement et du code exige une session administrateur validée côté serveur.

Les fabricants et distributeurs proposés sont une liste initiale extensible (Schneider Electric, Legrand, Hager, ABB, Siemens, Rexel, Sonepar, etc.), pas un annuaire mondial exhaustif. Un nouveau fournisseur, type ou catégorie peut être saisi lors de la création d’un article. Références de la liste : https://www.sonepar.fr/fr-fr et https://www.se.com/fr/fr/partners/distributors/.

## Développement

Installer les dépendances via le helper Sites ; `npm run dev -- --port 5187` lance l’aperçu. `npm run build` compile l’application et copie le manifeste et les migrations. `npm run db:generate` crée les migrations. Appliquer chaque nouvelle migration à la base locale suivant le README du starter ; Sites applique les migrations de production à la publication.

`node scripts/verify-stock.mjs` vérifie les opérations sur un aperçu local lancé sur le port 5187. Il crée uniquement des données de test locales et ne doit pas être exécuté contre la production.

L’historique affiché est limité aux 200 mouvements les plus récents du magasin. Les compteurs sont calculés sur l’intégralité des mouvements. Les exports reflètent les références sélectionnées, pas l’historique complet.
