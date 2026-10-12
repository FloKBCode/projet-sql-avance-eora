# API du site Éora

Petite API Express entre le site React et la base PostgreSQL du projet. Elle ne se connecte jamais avec le compte administrateur.

- **La boutique** (catalogue public et commandes des clients) passe par l'utilisateur `site_web`, rôle `boutique_eora`.
- **L'espace employé** demande une connexion : l'employé saisit son compte PostgreSQL (`lea`, `nora`, `samir`) et chaque requête s'exécute avec ce compte. C'est la base qui accepte ou refuse, pas le code du site.

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

## Comptes employé

| Compte | Rôle | Peut voir | Peut faire |
|---|---|---|---|
| `lea` | `lecteur_eora` | le catalogue et le stock | rien : session en lecture seule |
| `nora` | `atelier_eora` | les commandes à préparer | faire avancer une commande (`payee` → `en_preparation` → `expediee`) |
| `samir` | `compta_eora` | le chiffre d'affaires par mois et par canal | rien |

Le mot de passe de chaque compte est son identifiant. Le compte administrateur et `site_web` sont refusés à la connexion, car ils n'ont aucun rôle-métier.

## Routes

| Méthode | Chemin | Connexion | Réponse |
|---|---|---|---|
| `POST` | `/api/connexion` | aucune | corps `{ "utilisateur": "nora", "motDePasse": "nora" }` ; renvoie `{ jeton, utilisateur, roles }` |
| `GET` | `/api/moi` | jeton | le compte connecté et ses rôles |
| `POST` | `/api/deconnexion` | jeton | ferme la session |
| `GET` | `/api/catalogue` | jeton | la vue `catalogue` |
| `GET` | `/api/atelier` | jeton | les commandes à préparer, une entrée par commande avec ses lignes |
| `POST` | `/api/atelier/:commande/avancer` | jeton | appelle la procédure `faire_avancer` |
| `GET` | `/api/chiffre-affaires` | jeton | la vue `chiffre_affaires` |
| `GET` | `/api/produits` | `site_web` | les produits actifs du catalogue public |
| `POST` | `/api/commandes` | `site_web` | crée une commande `site` ; corps `{ "clientId": 12, "lignes": [{ "produitId": 3, "quantite": 2 }] }` |

Le jeton s'envoie dans l'en-tête `Authorization: Bearer <jeton>`. Une session expire après deux heures sans activité.

## Réponses d'erreur

| Code | Cas |
|---|---|
| `401` | identifiant ou mot de passe incorrect, ou jeton absent ou expiré |
| `403` | compte sans rôle-métier, ou action refusée par la base (droit manquant, session en lecture seule) ; le message de PostgreSQL est renvoyé |
| `409` | règle métier refusée par la base : stock insuffisant, commande qui ne peut pas avancer |
| `400` et `422` | requête mal formée, client ou produit inconnu |

## Droits de `boutique_eora`

Lecture du catalogue, création de commandes et de lignes, et mise à jour de la seule colonne `stock` : le trigger du stock s'exécute avec les droits de l'utilisateur qui insère la ligne, il en a donc besoin pour verrouiller et décrémenter le stock. Aucun droit sur `clients`.
