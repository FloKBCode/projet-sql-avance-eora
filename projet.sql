CREATE TABLE produits (
  id serial PRIMARY KEY,
  nom text NOT NULL UNIQUE,
  categorie text NOT NULL CHECK (categorie IN ('fleur', 'bouquet', 'sur_mesure', 'accessoire')),
  prix numeric(8, 2) NOT NULL CHECK (prix > 0),
  stock integer NOT NULL CHECK (stock >= 0),
  actif boolean NOT NULL DEFAULT true
);

CREATE TABLE clients (
  id serial PRIMARY KEY,
  prenom text NOT NULL,
  nom text NOT NULL,
  email text NOT NULL UNIQUE,
  telephone text,
  ville text NOT NULL,
  inscrit_le date NOT NULL DEFAULT current_date
);

CREATE TABLE commandes (
  id serial PRIMARY KEY,
  client_id integer NOT NULL REFERENCES clients (id),
  canal text NOT NULL CHECK (canal IN ('site', 'marche', 'instagram')),
  statut text NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente', 'payee', 'en_preparation', 'expediee', 'annulee')),
  passee_le timestamp NOT NULL DEFAULT now()
);

CREATE TABLE lignes_commande (
  id serial PRIMARY KEY,
  commande_id integer NOT NULL REFERENCES commandes (id),
  produit_id integer NOT NULL REFERENCES produits (id),
  quantite integer NOT NULL CHECK (quantite > 0),
  prix_unitaire numeric(8, 2) NOT NULL CHECK (prix_unitaire > 0)
);

SELECT setseed(0.42);

INSERT INTO produits (nom, categorie, prix, stock) VALUES
  ('Rose en chenille', 'fleur', 6.00, 120),
  ('Tulipe en chenille', 'fleur', 5.00, 150),
  ('Tournesol en chenille', 'fleur', 7.00, 80),
  ('Marguerite en chenille', 'fleur', 4.50, 140),
  ('Brin de lavande', 'fleur', 4.00, 200),
  ('Pivoine en chenille', 'fleur', 8.00, 60),
  ('Lys en chenille', 'fleur', 7.50, 70),
  ('Camélia en chenille', 'fleur', 6.50, 90),
  ('Mini bouquet', 'bouquet', 15.00, 40),
  ('Bouquet Aurore', 'bouquet', 28.00, 25),
  ('Bouquet Terracotta', 'bouquet', 32.00, 20),
  ('Bouquet Crème', 'bouquet', 30.00, 22),
  ('Bouquet Champêtre', 'bouquet', 35.00, 18),
  ('Bouquet Signature Éora', 'bouquet', 48.00, 12),
  ('Fleur aux couleurs au choix', 'sur_mesure', 9.00, 30),
  ('Bouquet sur mesure', 'sur_mesure', 55.00, 10),
  ('Composition d''anniversaire', 'sur_mesure', 45.00, 8),
  ('Bouquet de mariée', 'sur_mesure', 95.00, 4),
  ('Carte message', 'accessoire', 2.50, 300),
  ('Ruban doré', 'accessoire', 3.00, 180),
  ('Boîte cadeau', 'accessoire', 6.00, 100),
  ('Vase en céramique', 'accessoire', 18.00, 35),
  ('Coffret Découverte', 'accessoire', 39.00, 15),
  ('Coffret Fête des mères', 'accessoire', 52.00, 0);

INSERT INTO clients (prenom, nom, email, telephone, ville, inscrit_le)
SELECT s.prenom,
       s.nom,
       translate(lower(s.prenom || '.' || s.nom), 'éèêëàâîïôöùûç ', 'eeeeaaiioouuc-') || i || '@exemple.fr',
       '063998' || lpad(i::text, 4, '0'),
       s.ville,
       date '2025-10-06' + greatest(0, floor((i - 20) * 0.72)::int)
FROM (
  SELECT i,
         (ARRAY['Inès', 'Léa', 'Chloé', 'Manon', 'Camille', 'Sarah', 'Jade', 'Louise', 'Emma', 'Zoé',
                'Aïcha', 'Fatou', 'Clara', 'Lina', 'Nina', 'Hugo', 'Lucas', 'Nathan', 'Yanis', 'Théo',
                'Adam', 'Mehdi', 'Jules', 'Noah', 'Élise'])[1 + (i % 25)] AS prenom,
         (ARRAY['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy',
                'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'Traoré', 'Diallo', 'Benali',
                'Nguyen', 'Fontaine', 'Chevalier', 'Lambert', 'Rousseau'])[1 + (i % 23)] AS nom,
         (ARRAY['Paris', 'Nanterre', 'Lyon', 'Marseille', 'Lille', 'Bordeaux', 'Nantes', 'Toulouse',
                'Rennes', 'Strasbourg', 'Versailles', 'Montreuil'])[1 + (i % 12)] AS ville
  FROM generate_series(1, 500) AS i
) AS s;

INSERT INTO commandes (client_id, canal, statut, passee_le)
SELECT s.client_id,
       CASE WHEN s.tirage_canal < 0.60 THEN 'site'
            WHEN s.tirage_canal < 0.85 THEN 'marche'
            ELSE 'instagram'
       END,
       CASE WHEN s.tirage_statut < 0.04 THEN 'annulee'
            WHEN s.passee_le < timestamp '2026-09-21' THEN 'expediee'
            WHEN s.tirage_statut < 0.30 THEN 'en_attente'
            WHEN s.tirage_statut < 0.65 THEN 'payee'
            WHEN s.tirage_statut < 0.85 THEN 'en_preparation'
            ELSE 'expediee'
       END,
       s.passee_le
FROM (
  SELECT 1 + floor(random() * least(500, 20 + i / 40))::int AS client_id,
         random() AS tirage_canal,
         random() AS tirage_statut,
         timestamp '2025-10-06 09:00' + (i * interval '26 minutes') AS passee_le
  FROM generate_series(1, 20000) AS i
) AS s;

INSERT INTO lignes_commande (commande_id, produit_id, quantite, prix_unitaire)
SELECT s.commande_id, s.produit_id, s.quantite, p.prix
FROM (
  SELECT CASE WHEN i <= 20000 THEN i ELSE 1 + floor(random() * 20000)::int END AS commande_id,
         1 + floor(random() * 24)::int AS produit_id,
         1 + floor(random() * 3)::int AS quantite
  FROM generate_series(1, 60000) AS i
) AS s
JOIN produits p ON p.id = s.produit_id;

-- Procédure : annuler une commande
-- Refuse une commande inconnue, déjà expédiée ou déjà annulée.
CREATE PROCEDURE annuler_commande(p_commande_id int)
LANGUAGE plpgsql
AS $$
DECLARE
    v_statut text;
BEGIN
    SELECT statut INTO v_statut FROM commandes WHERE id = p_commande_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Commande % inconnue : impossible de l''annuler', p_commande_id;
    END IF;

    IF v_statut = 'expediee' THEN
        RAISE EXCEPTION 'Commande % déjà expédiée : impossible de l''annuler', p_commande_id;
    END IF;

    IF v_statut = 'annulee' THEN
        RAISE EXCEPTION 'Commande % déjà annulée : rien à faire', p_commande_id;
    END IF;

    UPDATE commandes SET statut = 'annulee' WHERE id = p_commande_id;

    -- Les produits de la commande reviennent en stock
    UPDATE produits p
    SET stock = p.stock + l.total
    FROM (SELECT produit_id, sum(quantite) AS total
          FROM lignes_commande
          WHERE commande_id = p_commande_id
          GROUP BY produit_id) AS l
    WHERE p.id = l.produit_id;
END;
$$;

-- Trigger : refuser une ligne de commande qui dépasse le stock, sinon baisser le stock
-- La fonction fait la vérification, le trigger la lance avant chaque insertion.
CREATE FUNCTION verifier_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_nom text;
    v_stock integer;
BEGIN
    -- FOR UPDATE bloque le produit le temps de la vérification (deux commandes simultanées)
    SELECT nom, stock INTO v_nom, v_stock FROM produits WHERE id = NEW.produit_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produit % inconnu : impossible de l''ajouter à la commande', NEW.produit_id;
    END IF;

    IF NEW.quantite > v_stock THEN
        RAISE EXCEPTION 'Stock insuffisant pour « % » : % demandé(s), % disponible(s)',
            v_nom, NEW.quantite, v_stock;
    END IF;

    UPDATE produits SET stock = stock - NEW.quantite WHERE id = NEW.produit_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER verifier_stock_avant_ajout
BEFORE INSERT ON lignes_commande
FOR EACH ROW
EXECUTE FUNCTION verifier_stock();
