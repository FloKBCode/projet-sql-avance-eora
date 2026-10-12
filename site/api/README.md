# API du site Éora

Petite API Express entre le site React et la base PostgreSQL du projet. Elle ne se connecte jamais avec le compte administrateur : le catalogue et les commandes passent par l'utilisateur `site_web` (rôle `boutique_eora`), la page de l'atelier par `nora` (rôle `atelier_eora`).

## Lancer

Avec la base `projet` déjà créée par `projet.sql`, depuis le dossier `base-festival` du cours :

```bash
docker compose cp ../../projet-sql-avance-eora/site/api/acces.sql db:/tmp/acces.sql
docker compose exec db psql -U festival -d projet -f /tmp/acces.sql
```

Puis dans `site/api` (Node 20.6 ou plus récent) :

```bash
cp .env.example .env
npm install
npm start
```

## Routes

| Méthode | Chemin | Rôle utilisé | Réponse |
|---|---|---|---|
| `GET` | `/api/produits` | `boutique_eora` | les produits actifs, triés par catégorie |
| `GET` | `/api/atelier` | `atelier_eora` | les commandes à préparer, une entrée par commande avec ses lignes |
| `POST` | `/api/commandes` | `boutique_eora` | crée une commande `site` ; corps `{ "clientId": 12, "lignes": [{ "produitId": 3, "quantite": 2 }] }` |

`POST /api/commandes` répond `201` avec le numéro de commande. Quand le stock manque, le trigger refuse la ligne : l'API annule toute la commande et renvoie `409` avec le message du trigger, que le site affiche tel quel.

## Droits de `boutique_eora`

Lecture du catalogue, création de commandes et de lignes, et mise à jour de la seule colonne `stock` : le trigger du stock s'exécute avec les droits de l'utilisateur qui insère la ligne, il en a donc besoin pour verrouiller et décrémenter le stock. Aucun droit sur `clients`.
