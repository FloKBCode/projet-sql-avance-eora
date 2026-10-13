// Tous les appels à l'API passent par ce fichier.
// La session (jeton, utilisateur, rôles) reste dans sessionStorage :
// elle disparaît à la fermeture de l'onglet.

const CLE = 'eora-session'

export function lireSession() {
  try {
    return JSON.parse(sessionStorage.getItem(CLE))
  } catch {
    return null
  }
}

export function garderSession(session) {
  sessionStorage.setItem(CLE, JSON.stringify(session))
}

export function effacerSession() {
  sessionStorage.removeItem(CLE)
}

export class ErreurApi extends Error {
  constructor(message, statut) {
    super(message)
    this.statut = statut
  }
}

// Le jeton part dans l'en-tête Authorization, comme l'attend l'API.
// Quand la base refuse (401, 403, 409...), le message de l'API est repris tel quel.
export async function appeler(chemin, { method = 'GET', corps } = {}) {
  const session = lireSession()
  const entetes = {}
  if (corps) entetes['Content-Type'] = 'application/json'
  if (session?.jeton) entetes.Authorization = `Bearer ${session.jeton}`

  let reponse
  try {
    reponse = await fetch(`/api${chemin}`, {
      method,
      headers: entetes,
      body: corps ? JSON.stringify(corps) : undefined,
    })
  } catch {
    throw new ErreurApi("L'API ne répond pas. Vérifie qu'elle est lancée.", 0)
  }

  const donnees = await reponse.json().catch(() => null)
  if (!reponse.ok) {
    throw new ErreurApi(donnees?.erreur ?? 'Erreur inattendue.', reponse.status)
  }
  return donnees
}

export const connexion = (utilisateur, motDePasse) =>
  appeler('/connexion', { method: 'POST', corps: { utilisateur, motDePasse } })

export const deconnexion = () => appeler('/deconnexion', { method: 'POST' })