import express from 'express';
import pg from 'pg';

const boutique = new pg.Pool({ connectionString: process.env.BOUTIQUE_URL });
const atelier = new pg.Pool({ connectionString: process.env.ATELIER_URL });

const app = express();

app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', process.env.ORIGINE ?? 'http://localhost:5173');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

app.get('/api/produits', async (req, res) => {
  const { rows } = await boutique.query(
    `SELECT id, nom, categorie, prix::float AS prix, stock
     FROM produits
     WHERE actif
     ORDER BY categorie, nom`
  );
  res.json(rows);
});

app.get('/api/atelier', async (req, res) => {
  const { rows } = await atelier.query(
    `SELECT commande, to_char(passee_le, 'YYYY-MM-DD HH24:MI') AS passee_le, canal, statut, client,
            json_agg(json_build_object('produit', produit, 'quantite', quantite) ORDER BY produit) AS lignes
     FROM commandes_a_preparer
     GROUP BY commande, commandes_a_preparer.passee_le, canal, statut, client
     ORDER BY commandes_a_preparer.passee_le`
  );
  res.json(rows);
});

const entierPositif = (valeur) => Number.isInteger(valeur) && valeur > 0;

app.post('/api/commandes', async (req, res) => {
  const { clientId, lignes } = req.body ?? {};

  if (!entierPositif(clientId)) {
    return res.status(400).json({ erreur: 'Le client est obligatoire.' });
  }
  if (!Array.isArray(lignes) || lignes.length === 0 || lignes.length > 20) {
    return res.status(400).json({ erreur: 'La commande doit contenir entre 1 et 20 lignes.' });
  }
  if (!lignes.every((l) => entierPositif(l?.produitId) && entierPositif(l?.quantite))) {
    return res.status(400).json({ erreur: 'Chaque ligne demande un produit et une quantité positive.' });
  }

  const connexion = await boutique.connect();
  try {
    await connexion.query('BEGIN');

    const { rows } = await connexion.query(
      `INSERT INTO commandes (client_id, canal) VALUES ($1, 'site') RETURNING id`,
      [clientId]
    );
    const commandeId = rows[0].id;

    for (const { produitId, quantite } of lignes) {
      const ajout = await connexion.query(
        `INSERT INTO lignes_commande (commande_id, produit_id, quantite, prix_unitaire)
         SELECT $1, id, $3, prix FROM produits WHERE id = $2 AND actif`,
        [commandeId, produitId, quantite]
      );
      if (ajout.rowCount === 0) {
        await connexion.query('ROLLBACK');
        return res.status(422).json({ erreur: `Le produit ${produitId} n'est pas au catalogue.` });
      }
    }

    await connexion.query('COMMIT');
    res.status(201).json({ commande: commandeId });
  } catch (erreur) {
    await connexion.query('ROLLBACK');
    if (erreur.code === 'P0001') {
      return res.status(409).json({ erreur: erreur.message });
    }
    if (erreur.code === '23503') {
      return res.status(422).json({ erreur: `Le client ${clientId} n'existe pas.` });
    }
    throw erreur;
  } finally {
    connexion.release();
  }
});

app.use((erreur, req, res, next) => {
  if (erreur.type === 'entity.parse.failed') {
    return res.status(400).json({ erreur: 'Le corps de la requête doit être du JSON valide.' });
  }
  console.error(erreur);
  res.status(500).json({ erreur: 'Erreur interne du serveur.' });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`API Éora sur http://localhost:${port}`);
});
