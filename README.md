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

### Procédure `faire_avancer`

- **Ce qu'elle fait :** fait avancer une commande d'une étape, de `payee` à `en_preparation` puis à `expediee`, et refuse tout autre statut.
- **Pourquoi elle est là :** c'est la seule action de l'atelier. Elle est en `SECURITY DEFINER` : elle s'exécute avec les droits de son propriétaire, ce qui permet à l'atelier de changer un statut sans aucun droit sur la table `commandes`, et seulement dans l'ordre prévu. Le `REVOKE ... FROM PUBLIC` réserve l'appel au rôle `atelier_eora`.
- **La preuve :** en tant que `nora`, deux `CALL faire_avancer(19367)` passent la commande de `payee` à `en_preparation` puis à `expediee` ; un troisième est refusé : « Commande 19367 au statut « expediee » : l'atelier ne peut pas la faire avancer ». En tant que `samir`, le même appel renvoie `permission denied for procedure faire_avancer`.

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

**Ce qu'il fait** : trois rôles-métiers sans connexion : `lecteur_eora` (consulte le catalogue), `atelier_eora` (prépare les commandes) et `compta_eora` (suit les ventes). Trois utilisateurs, `lea`, `nora` et `samir`, se connectent et en héritent avec `IN ROLE`. Les sessions de `lea` sont en lecture seule (`default_transaction_read_only`).

**Pourquoi il est là** : principe du moindre privilège. Chaque profil n'a que ce dont il a besoin, et les droits sont portés par le métier, pas par la personne : si Nora quitte l'atelier, on supprime `nora` sans toucher aux droits de l'atelier. Les trois profils ont des droits différents : le lecteur ne modifie rien, l'atelier fait avancer les commandes par la procédure `faire_avancer`, la compta contrôle sans rien modifier.

**La preuve** : `SET ROLE nora;` puis `SELECT * FROM commandes_a_preparer;` répond, alors que `SELECT email FROM clients;` affiche `permission denied`. Même chose pour `samir` avec `chiffre_affaires` (autorisé) et `commandes` (refusé). `RESET ROLE;` pour revenir. Connectée en `lea` (`psql -U lea -d projet`), `SELECT * FROM catalogue;` répond, mais `UPDATE produits SET stock = 0;` est refusé (« cannot execute UPDATE in a read-only transaction »), et l'est encore après `SET default_transaction_read_only = off;` (« permission denied for table produits ») : la lecture seule est une protection en plus, les droits restent la vraie barrière.

## Vues

**Ce qu'elles font** : `commandes_a_preparer` liste, pour l'atelier, les commandes payées ou en préparation avec les produits et les quantités ; le client est réduit à son prénom et à l'initiale de son nom. `chiffre_affaires` donne à la compta le chiffre d'affaires et le nombre de commandes par mois et par canal, sans aucune colonne venant de `clients`. `catalogue` montre au lecteur les produits actifs avec leur prix et leur stock, sans aucune donnée de commande ni de client.

**Pourquoi elles sont là** : elles cachent les jointures (quatre tables pour l'atelier) et masquent les données personnelles (email, téléphone, nom complet). Chaque rôle a le droit `SELECT` sur sa vue et aucun droit sur les tables : la vue lit les tables à sa place.

**La preuve** : en tant que `nora`, `SELECT * FROM commandes_a_preparer WHERE commande = 19365;` affiche 4 lignes au nom de `Zoé C.`, sans email ni téléphone, et la table `clients` renvoie `permission denied` ; en tant que `samir`, `chiffre_affaires` répond mais `commandes_a_preparer` est refusée ; en tant que `lea`, `catalogue` renvoie les 24 produits et la table `produits` renvoie `permission denied`.

## Données

**Ce qu'elles font** : 24 produits répartis en quatre catégories, tapés à la main, puis 500 clients, 20 000 commandes et 60 000 lignes de commande fabriqués avec `generate_series`. Les commandes s'étalent du 6 octobre 2025 au 2 octobre 2026 et passent par le site (60 %), les marchés (25 %) ou Instagram (15 %). `setseed(0.42)` rend le tirage identique à chaque exécution.

**Pourquoi elles sont là** : les index ont besoin de volume pour montrer une différence de temps, et les données doivent rester cohérentes pour que les vues et les preuves aient un sens. Chaque commande a au moins une ligne, aucun client ne commande avant son inscription, le prix d'une ligne est celui du catalogue, et seules les commandes des deux dernières semaines sont encore en attente, payées ou en préparation.

**La preuve** : `SELECT count(*) FROM lignes_commande;` renvoie 60 000, et chacun des quatre contrôles de cohérence ci-dessous renvoie 0 :

```sql
SELECT count(*) FROM commandes c
WHERE NOT EXISTS (SELECT 1 FROM lignes_commande l WHERE l.commande_id = c.id);

SELECT count(*) FROM commandes c JOIN clients cl ON cl.id = c.client_id
WHERE c.passee_le::date < cl.inscrit_le;

SELECT count(*) FROM lignes_commande l JOIN produits p ON p.id = l.produit_id
WHERE l.prix_unitaire <> p.prix;

SELECT count(*) FROM commandes
WHERE statut IN ('en_attente', 'payee', 'en_preparation') AND passee_le < timestamp '2026-09-21';
```

Dans l'ordre : aucune commande sans ligne, aucune commande passée avant l'inscription du client, aucun prix différent du catalogue, aucune commande de plus de deux semaines encore en cours.
