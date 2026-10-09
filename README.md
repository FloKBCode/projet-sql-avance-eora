# Éora · base de données de la boutique

Projet de groupe du cours SQL avancé (Ynov, Bachelor 2, 2026-2027).
Éora est une boutique artisanale de fleurs en fil chenille : la base suit son catalogue, ses clients et ses commandes passées sur le site, sur les marchés et par Instagram.

## Modèle de données

| Table | Contenu | Lignes |
|---|---|---|
| `produits` | le catalogue : fleurs à l'unité, bouquets, créations sur mesure, accessoires et coffrets, avec le prix et le stock | 24 |
| `clients` | les personnes qui ont commandé | 500 |
| `commandes` | une commande par client, avec son canal (`site`, `marche`, `instagram`) et son statut | 20 000 |
| `lignes_commande` | les produits d'une commande, avec la quantité et le prix au moment de l'achat | 60 000 |

Une commande appartient à un client, une ligne appartient à une commande et désigne un produit.
Le statut d'une commande suit le parcours `en_attente`, `payee`, `en_preparation`, `expediee`, ou s'arrête sur `annulee`.

## Lancer le script

Depuis le dossier `base-festival` du cours, avec le conteneur démarré :

```bash
docker compose exec db psql -U festival -c "DROP DATABASE IF EXISTS projet WITH (FORCE)" -c "CREATE DATABASE projet"
docker compose cp ../../projet-sql-avance-eora/projet.sql db:/tmp/projet.sql
docker compose exec db psql -U festival -d projet -f /tmp/projet.sql
```

Pour se connecter ensuite à la base :

```bash
docker compose exec db psql -U festival -d projet
```

## Procédure, trigger et index

### Procédure `annuler_commande`

- **Ce qu'elle fait :** passe une commande au statut `annulee` et remet ses produits en stock.
- **Pourquoi elle est là :** une commande inconnue, déjà expédiée ou déjà annulée est refusée, avec un message qui donne le numéro de commande. Un simple `UPDATE` ne dirait rien (0 ligne modifiée) ou annulerait un colis déjà parti.
- **La preuve :** `CALL annuler_commande(19364)` passe la commande de `payee` à `annulee` ; `CALL annuler_commande(1)` est refusé : « Commande 1 déjà expédiée : impossible de l'annuler ».

### Trigger `verifier_stock_avant_ajout`

- **Ce qu'il fait :** avant chaque ajout dans `lignes_commande`, compare la quantité demandée au stock du produit, refuse si elle le dépasse, sinon baisse le stock.
- **Pourquoi il est dans la base :** Éora vend sur le site, au marché et par Instagram. Placée dans la base, la règle tient quel que soit le canal ; dans le site React, elle ne protégerait que les ventes en ligne.
- **La preuve :** avec 4 bouquets de mariée en stock, une ligne de 3 passe (il en reste 1), puis une seconde ligne de 3 est refusée : « Stock insuffisant pour « Bouquet de mariée » : 3 demandé(s), 1 disponible(s) ».

### Index

Deux clés étrangères souvent cherchées (PostgreSQL ne les indexe pas tout seul) et sélectives. Mesures `EXPLAIN ANALYZE`, seconde mesure gardée :

| Index | Requête | Avant | Après |
|---|---|---|---|
| `lignes_commande (commande_id)` | détail de la commande 12345 (4 lignes sur 60 000) | Seq Scan, 3,343 ms | Bitmap Index Scan, 0,038 ms |
| `commandes (client_id)` | historique du client 250 (36 commandes sur 20 000) | Seq Scan, 1,640 ms | Index Scan, 0,046 ms |

## Rôles

**Ce qu'il fait** : deux rôles-métiers, `atelier` (prépare les commandes) et `compta` (suit les ventes), sans connexion. Deux utilisateurs, `nora` et `samir`, se connectent et en héritent avec `IN ROLE`.

**Pourquoi il est là** : principe du moindre privilège. Chaque profil n'a que ce dont il a besoin, et les droits sont portés par le métier, pas par la personne : si Nora quitte l'atelier, on supprime `nora` sans toucher aux droits de l'atelier.

**La preuve** : `SET ROLE nora;` puis `SELECT * FROM commandes_a_preparer;` répond, alors que `SELECT email FROM clients;` affiche `permission denied`. Même chose pour `samir` avec `chiffre_affaires` (autorisé) et `commandes` (refusé). `RESET ROLE;` pour revenir.

## Vues

**Ce qu'elles font** : `commandes_a_preparer` liste, pour l'atelier, les commandes payées ou en préparation avec les produits et les quantités ; le client est réduit à son prénom et à l'initiale de son nom. `chiffre_affaires` donne à la compta le chiffre d'affaires et le nombre de commandes par mois et par canal, sans aucune colonne venant de `clients`.

**Pourquoi elles sont là** : elles cachent les jointures (quatre tables pour l'atelier) et masquent les données personnelles (email, téléphone, nom complet). Chaque rôle a le droit `SELECT` sur sa vue et aucun droit sur les tables : la vue lit les tables à sa place.

**La preuve** : en tant que `nora`, la vue affiche `Léa B.` mais pas d'email, et la table `clients` renvoie `permission denied` ; en tant que `samir`, `chiffre_affaires` répond mais `commandes_a_preparer` est refusée.
