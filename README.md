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
