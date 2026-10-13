import { useState } from 'react'
import { lireSession, garderSession, effacerSession, deconnexion } from './api'
import Connexion from './pages/Connexion'
import Atelier from './pages/Atelier'
import Catalogue from './pages/Catalogue'
import ChiffreAffaires from './pages/ChiffreAffaires'
import Commande from './pages/Commande'
import './index.css'

const PAGES = {
  lecteur_eora: { titre: 'Catalogue', composant: Catalogue },
  atelier_eora: { titre: 'Atelier', composant: Atelier },
  compta_eora: { titre: "Chiffre d'affaires", composant: ChiffreAffaires },
}

function pageDuCompte(roles) {
  const role = roles.find((r) => PAGES[r])
  return role ? PAGES[role] : null
}

export default function App() {
  const [session, setSession] = useState(lireSession)
  const [boutique, setBoutique] = useState(false)

  function onConnecte(nouvelle) {
    garderSession(nouvelle)
    setSession(nouvelle)
  }

  async function sortir() {
    await deconnexion().catch(() => null)
    effacerSession()
    setSession(null)
  }

  if (boutique) {
    return (
      <>
        <header className="entete">
          <strong>Éora</strong>
          <span>Boutique</span>
          <button onClick={() => setBoutique(false)}>Espace équipe</button>
        </header>
        <main className="contenu contenu-large">
          <Commande />
        </main>
      </>
    )
  }

  if (!session) {
    return (
      <>
        <Connexion onConnecte={onConnecte} />
        <p className="aide aide-boutique">
          Vous êtes client ?{' '}
          <button type="button" className="lien" onClick={() => setBoutique(true)}>
            Ouvrir la boutique
          </button>
        </p>
      </>
    )
  }

  const page = pageDuCompte(session.roles ?? [])
  const Composant = page?.composant

  return (
    <>
      <header className="entete">
        <strong>Éora</strong>
        <span>
          {session.utilisateur} · {page?.titre ?? 'aucune page'}
        </span>
        <button onClick={() => setBoutique(true)}>Boutique</button>
        <button onClick={sortir}>Se déconnecter</button>
      </header>
      <main className="contenu">
        <h1>{page?.titre ?? 'Compte sans page'}</h1>
        {Composant ? <Composant /> : <p>Page à construire.</p>}
      </main>
    </>
  )
}
