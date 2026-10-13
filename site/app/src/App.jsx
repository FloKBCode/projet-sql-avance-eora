import Atelier from './pages/Atelier'
import { useState } from 'react'
import { lireSession, garderSession, effacerSession, deconnexion } from './api'
import Connexion from './pages/Connexion'
import './index.css'

// Chaque rôle de la base ouvre sa page. Les pages Catalogue, Atelier et
// Chiffre d'affaires restent à écrire : on remplace le texte par le composant.
const PAGES = {
  lecteur_eora: { titre: 'Catalogue' },
  atelier_eora: { titre: 'Atelier' },
  compta_eora: { titre: "Chiffre d'affaires" },
}

function pageDuCompte(roles) {
  const role = roles.find((r) => PAGES[r])
  return role ? PAGES[role] : null
}

export default function App() {
  const [session, setSession] = useState(lireSession)

  function onConnecte(nouvelle) {
    garderSession(nouvelle)
    setSession(nouvelle)
  }

  async function sortir() {
    try {
      await deconnexion()
    } catch {
      // la session est de toute façon fermée côté site
    }
    effacerSession()
    setSession(null)
  }

  if (!session) return <Connexion onConnecte={onConnecte} />

  const page = pageDuCompte(session.roles ?? [])

  return (
    <>
      <header className="entete">
        <strong>Éora</strong>
        <span>
          {session.utilisateur} · {page?.titre ?? 'aucune page'}
        </span>
        <button onClick={sortir}>Se déconnecter</button>
      </header>
      <main className="contenu">
        <h1>{page?.titre ?? 'Compte sans page'}</h1>
        {page?.titre === 'Atelier' ? <Atelier /> : <p>Page à construire.</p>}
      </main>
    </>
  )
}
