import express from "express";
import cors from "cors";
import pg from "pg";

// Connexion avec un utilisateur métier (nora = atelier), JAMAIS le compte admin "festival".
// Les valeurs viennent du fichier .env (voir .env.example).
const pool = new pg.Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "projet",
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

const app = express();
app.use(cors({ origin: "http://localhost:5173" })); // port par défaut de Vite
app.use(express.json());

// Test rapide : l'API répond et dit sous quel utilisateur elle est connectée.
app.get("/api/health", async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT current_user AS utilisateur");
    res.json({ ok: true, ...rows[0] });
  } catch (err) {
    next(err);
  }
});

// Page Atelier : lit la vue d'Alexis (le client y est déjà masqué).
// Droit nécessaire : SELECT sur commandes_a_preparer, accordé à atelier_eora.
app.get("/api/atelier", async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM commandes_a_preparer");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Gestion d'erreur commune. Les erreurs levées par le trigger ou la procédure
// (RAISE EXCEPTION, code P0001) renvoient leur message tel quel, pour que React
// puisse l'afficher (ex. « Stock insuffisant pour ... »).
app.use((err, req, res, next) => {
  if (err.code === "P0001") {
    return res.status(409).json({ erreur: err.message });
  }
  console.error(err);
  res.status(500).json({ erreur: "Erreur serveur" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API sur http://localhost:${PORT}`));