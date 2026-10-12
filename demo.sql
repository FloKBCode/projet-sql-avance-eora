-- ============================================================
-- Éora · demo.sql : requêtes de la présentation (8 minutes)
-- Ordre : rôle, vue, index, trigger (puis procédure en bonus)
-- Lancer : docker compose exec db psql -U festival -d projet -f /tmp/demo.sql
-- ============================================================

\echo
\echo '=== 1. RÔLE : nora (atelier) a le droit de lire sa vue ==='
SET ROLE nora;
SELECT * FROM commandes_a_preparer LIMIT 3;

\echo
\echo '=== 1b. RÔLE : nora n''a aucun droit sur la table clients (refusé) ==='
SELECT email FROM clients;
RESET ROLE;

\echo
\echo '=== 1c. RÔLE : samir (compta) lit le chiffre d''affaires, pas les commandes ==='
SET ROLE samir;
SELECT * FROM chiffre_affaires LIMIT 3;
SELECT * FROM commandes;   -- refusé
RESET ROLE;

-- ------------------------------------------------------------

\echo
\echo '=== 2. VUE : le client est réduit à son prénom et à l''initiale ==='
SET ROLE nora;
SELECT * FROM commandes_a_preparer WHERE commande = 19365;
RESET ROLE;

-- ------------------------------------------------------------

\echo
\echo '=== 3. INDEX : sans index (on les désactive pour la mesure) ==='
SET enable_indexscan = off;
SET enable_bitmapscan = off;
EXPLAIN ANALYZE SELECT * FROM lignes_commande WHERE commande_id = 12345;
EXPLAIN ANALYZE SELECT * FROM commandes WHERE client_id = 250;

\echo
\echo '=== 3b. INDEX : avec index ==='
RESET enable_indexscan;
RESET enable_bitmapscan;
EXPLAIN ANALYZE SELECT * FROM lignes_commande WHERE commande_id = 12345;
EXPLAIN ANALYZE SELECT * FROM commandes WHERE client_id = 250;

-- ------------------------------------------------------------

\echo
\echo '=== 4. TRIGGER : 3 bouquets de mariée passent, 3 de plus sont refusés ==='
-- Tout est annulé à la fin (ROLLBACK) : la démo peut être rejouée.
-- ATTENTION : vérifier les noms de colonnes avec  \d lignes_commande
BEGIN;
SELECT nom, stock FROM produits WHERE nom = 'Bouquet de mariée';

INSERT INTO lignes_commande (commande_id, produit_id, quantite, prix_unitaire)
SELECT 1, id, 3, prix FROM produits WHERE nom = 'Bouquet de mariée';
SELECT nom, stock FROM produits WHERE nom = 'Bouquet de mariée';

SAVEPOINT avant_refus;
INSERT INTO lignes_commande (commande_id, produit_id, quantite, prix_unitaire)
SELECT 1, id, 3, prix FROM produits WHERE nom = 'Bouquet de mariée';   -- refusé
ROLLBACK TO SAVEPOINT avant_refus;
ROLLBACK;

-- ------------------------------------------------------------

\echo
\echo '=== 5. BONUS, PROCÉDURE : une commande déjà expédiée est refusée ==='
CALL annuler_commande(1);

\echo
\echo '=== 5b. BONUS, PROCÉDURE : une commande payée passe à annulée ==='
BEGIN;
SELECT id, statut FROM commandes WHERE id = 19364;
CALL annuler_commande(19364);
SELECT id, statut FROM commandes WHERE id = 19364;
ROLLBACK;