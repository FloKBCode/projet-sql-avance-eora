CREATE ROLE boutique_eora NOLOGIN;

CREATE ROLE site_web LOGIN PASSWORD 'site_web' IN ROLE boutique_eora;

GRANT SELECT ON produits TO boutique_eora;
GRANT UPDATE (stock) ON produits TO boutique_eora;
GRANT INSERT ON commandes, lignes_commande TO boutique_eora;
GRANT SELECT (id) ON commandes TO boutique_eora;
GRANT USAGE ON SEQUENCE commandes_id_seq, lignes_commande_id_seq TO boutique_eora;
