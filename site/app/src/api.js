const ADRESSE_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const CLE_SESSION = 'eora-session';

export class ErreurApi extends Error {
  constructor(statut, message) {
    super(message);
    this.statut = statut;
  }
}

const lireSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem(CLE_SESSION));
  } catch {
    return null;
  }
};

const ecrireSession = (session) => {
  try {
    if (session) sessionStorage.setItem(CLE_SESSION, JSON.stringify(session));
    else sessionStorage.removeItem(CLE_SESSION);
  } catch {
    return;
  }
};

let sessionCourante = lireSession();

const requete = async (chemin, { methode = 'GET', corps } = {}) => {
  const entetes = {};
  if (corps !== undefined) entetes['Content-Type'] = 'application/json';
  if (sessionCourante?.jeton) entetes.Authorization = `Bearer ${sessionCourante.jeton}`;

  let reponse;
  try {
    reponse = await fetch(`${ADRESSE_API}${chemin}`, {
      method: methode,
      headers: entetes,
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });
  } catch {
    throw new ErreurApi(0, "L'API ne répond pas. Vérifiez qu'elle est lancée avec npm start dans site/api.");
  }

  const donnees = reponse.status === 204 ? null : await reponse.json().catch(() => null);
  if (!reponse.ok) {
    if (reponse.status === 401 && sessionCourante) {
      sessionCourante = null;
      ecrireSession(null);
    }
    throw new ErreurApi(reponse.status, donnees?.erreur ?? `Erreur ${reponse.status}`);
  }
  return donnees;
};

export const session = () => sessionCourante;

export const connexion = async (utilisateur, motDePasse) => {
  const resultat = await requete('/api/connexion', { methode: 'POST', corps: { utilisateur, motDePasse } });
  sessionCourante = resultat;
  ecrireSession(resultat);
  return resultat;
};

export const deconnexion = async () => {
  try {
    await requete('/api/deconnexion', { methode: 'POST' });
  } finally {
    sessionCourante = null;
    ecrireSession(null);
  }
};

export const moi = () => requete('/api/moi');
export const catalogue = () => requete('/api/catalogue');
export const atelier = () => requete('/api/atelier');
export const faireAvancer = (commande) => requete(`/api/atelier/${commande}/avancer`, { methode: 'POST' });
export const chiffreAffaires = () => requete('/api/chiffre-affaires');
export const produits = () => requete('/api/produits');
export const passerCommande = (clientId, lignes) =>
  requete('/api/commandes', { methode: 'POST', corps: { clientId, lignes } });
