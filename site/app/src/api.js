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
