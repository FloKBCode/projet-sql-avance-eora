import { useState } from 'react'
import { connexion } from '../api'

export default function Connexion({ onConnecte }) {
  const [utilisateur, setUtilisateur] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  async function envoyer(evenement) {
    evenement.preventDefault()
    setErreur('')
    setEnvoi(true)
    try {
      // L'API renvoie { jeton, utilisateur, roles }
      const session = await connexion(utilisateur.trim(), motDePasse)
      onConnecte(session)
    } catch (e) {
      setErreur(e.message)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <main className="connexion">
      <h1>Éora</h1>
      <p className="sous-titre">Espace équipe</p>

      <form onSubmit={envoyer}>
        <label htmlFor="utilisateur">Identifiant</label>
        <input
          id="utilisateur"
          value={utilisateur}
          onChange={(e) => setUtilisateur(e.target.value)}
          autoComplete="username"
          required
        />

        <label htmlFor="mdp">Mot de passe</label>
        <input
          id="mdp"
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          autoComplete="current-password"
          required
        />

        {erreur && (
          <p className="erreur" role="alert">
            {erreur}
          </p>
        )}

        <button type="submit" disabled={envoi}>
          {envoi ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <p className="aide">
        Comptes de démo : <strong>lea</strong> (catalogue), <strong>nora</strong> (atelier),{' '}
        <strong>samir</strong> (chiffre d'affaires). Le mot de passe est l'identifiant.
      </p>
    </main>
  )
}