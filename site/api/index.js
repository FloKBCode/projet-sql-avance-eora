import { randomBytes } from 'node:crypto';
import express from 'express';
import pg from 'pg';

const ROLES_METIER = ['lecteur_eora', 'atelier_eora', 'compta_eora'];
const DUREE_SESSION = 2 * 60 * 60 * 1000;
const BASE = new URL(process.env.BASE_URL ?? 'postgres://localhost:5433/projet');

const boutique = new pg.Pool({ connectionString: process.env.BOUTIQUE_URL });
boutique.on('error', (erreur) => console.error(erreur));
const sessions = new Map();

const app = express();

app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', process.env.ORIGINE ?? 'http://localhost:5173');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

const entierPositif = (valeur) => Number.isInteger(valeur) && valeur > 0;

const fermerSession = async (jeton) => {
  const session = sessions.get(jeton);
  if (!session) return;
  sessions.delete(jeton);
  await session.pool.end();
};

setInterval(() => {
  const maintenant = Date.now();
  for (const [jeton, session] of sessions) {
    if (session.expire < maintenant) fermerSession(jeton);
  }
}, 60 * 1000).unref();

app.post('/api/connexion', async (req, res) => {
  const { utilisateur, motDePasse } = req.body ?? {};
  if (typeof utilisateur !== 'string' || typeof motDePasse !== 'string' || !utilisateur || !motDePasse) {
    return res.status(400).json({ erreur: 'Identifiant et mot de passe obligatoires.' });
  }

  const pool = new pg.Pool({
    host: BASE.hostname,
    port: Number(BASE.port || 5432),
    database: BASE.pathname.slice(1),
    user: utilisateur,
    password: motDePasse,
    max: 2,
  });
  pool.on('error', (erreur) => console.error(erreur));

  try {
    const { rows } = await pool.query(
      `SELECT r.rolname
       FROM pg_roles r
       WHERE r.rolname = ANY ($1) AND pg_has_role(current_user, r.oid, 'MEMBER')
         AND NOT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user)`,
      [ROLES_METIER]
    );
    if (rows.length === 0) {
      await pool.end();
      return res.status(403).json({ erreur: "Ce compte n'a aucun rôle-métier Éora." });
    }

    const jeton = randomBytes(32).toString('hex');
    const roles = rows.map((r) => r.rolname);
    sessions.set(jeton, { pool, utilisateur, roles, expire: Date.now() + DUREE_SESSION });
    res.json({ jeton, utilisateur, roles });
  } catch (erreur) {
    await pool.end();
    if (erreur.code === '28P01' || erreur.code === '28000') {
      return res.status(401).json({ erreur: 'Identifiant ou mot de passe incorrect.' });
    }
    throw erreur;
  }
});

const authentifier = (req, res, next) => {
  const [type, jeton] = (req.get('Authorization') ?? '').split(' ');
  const session = type === 'Bearer' ? sessions.get(jeton) : undefined;
  if (!session || session.expire < Date.now()) {
    return res.status(401).json({ erreur: 'Connexion requise.' });
  }
  session.expire = Date.now() + DUREE_SESSION;
  req.jeton = jeton;
  req.session = session;
  next();
};

app.get('/api/moi', authentifier, (req, res) => {
  res.json({ utilisateur: req.session.utilisateur, roles: req.session.roles });
});

app.post('/api/deconnexion', authentifier, async (req, res) => {
  await fermerSession(req.jeton);
  res.sendStatus(204);
});

app.get('/api/catalogue', authentifier, async (req, res) => {
  const { rows } = await req.session.pool.query(
    `SELECT nom, categorie, prix::float AS prix, stock FROM catalogue ORDER BY categorie, nom`
  );
  res.json(rows);
});

app.get('/api/atelier', authentifier, async (req, res) => {
  const { rows } = await req.session.pool.query(
    `SELECT commande, to_char(passee_le, 'YYYY-MM-DD HH24:MI') AS passee_le, canal, statut, client,
            json_agg(json_build_object('produit', produit, 'quantite', quantite) ORDER BY produit) AS lignes
     FROM commandes_a_preparer
     GROUP BY commande, commandes_a_preparer.passee_le, canal, statut, client
     ORDER BY commandes_a_preparer.passee_le`
  );
  res.json(rows);
});

app.post('/api/atelier/:commande/avancer', authentifier, async (req, res) => {
  const commande = Number(req.params.commande);
  if (!entierPositif(commande)) {
    return res.status(400).json({ erreur: 'Numéro de commande invalide.' });
  }
  await req.session.pool.query('CALL faire_avancer($1)', [commande]);
  res.sendStatus(204);
});

app.get('/api/chiffre-affaires', authentifier, async (req, res) => {
  const { rows } = await req.session.pool.query(
    `SELECT to_char(mois, 'YYYY-MM') AS mois, canal, commandes::int AS commandes, ca::float AS ca
     FROM chiffre_affaires
     ORDER BY mois, canal`
  );
  res.json(rows);
});

app.get('/api/produits', async (req, res) => {
  const { rows } = await boutique.query(
    `SELECT id, nom, categorie, prix::float AS prix, stock
     FROM produits
     WHERE actif
     ORDER BY categorie, nom`
  );
  res.json(rows);
});

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
  if (erreur.code === '42501' || erreur.code === '25006') {
    return res.status(403).json({ erreur: `Refusé par la base : ${erreur.message}` });
  }
  if (erreur.code === 'P0001') {
    return res.status(409).json({ erreur: erreur.message });
  }
  console.error(erreur);
  res.status(500).json({ erreur: 'Erreur interne du serveur.' });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`API Éora sur http://localhost:${port}`);
});
