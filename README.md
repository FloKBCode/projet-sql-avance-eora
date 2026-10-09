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
