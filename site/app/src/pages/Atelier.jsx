import { useEffect, useState } from 'react'
import { appeler } from '../api'

// Le bouton dépend du statut actuel de la commande.
const ACTION = { payee: 'Mettre en préparation', en_preparation: 'Marquer expédiée' }
const LIBELLE = { payee: 'Payée', en_preparation: 'En préparation' }

export default function Atelier() {
  const [commandes, setCommandes] = useState(null)
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(null)
  const [limite, setLimite] = useState(30)

  async function charger() {
    try {
      setCommandes(await appeler('/atelier'))
    } catch (e) {
      setErreur(e.message)
    }
  }

  useEffect(() => {
    charger()
  }, [])

  async function avancer(id) {
    setEnCours(id)
    setErreur('')
    try {
      await appeler(`/atelier/${id}/avancer`, { method: 'POST' })
      await charger()
    } catch (e) {
      // message de la base, par exemple « la commande ne peut pas avancer »
      setErreur(e.message)
    } finally {
      setEnCours(null)
    }
  }

  if (!commandes && !erreur) return <p>Chargement des commandes…</p>

  return (
    <>
      {erreur && (
        <p className="erreur" role="alert">
          {erreur}
        </p>
      )}

      {commandes && (
        <>
          <p className="discret">
            {commandes.length} commande(s) à préparer. Le nom du client est réduit à son prénom et à
            l'initiale.
          </p>

          <ul className="commandes">
            {commandes.slice(0, limite).map((c) => (
              <li key={c.commande} className="commande">
                <div className="commande-tete">
                  <strong>Commande {c.commande}</strong>
                  <span className="etat">{LIBELLE[c.statut] ?? c.statut}</span>
                </div>
                <p className="discret">
                  {c.client} · {c.canal} · {c.passee_le}
                </p>
                <ul>
                  {c.lignes.map((l, i) => (
                    <li key={i}>
                      {l.quantite} × {l.produit}
                    </li>
                  ))}
                </ul>
                {ACTION[c.statut] && (
                  <button onClick={() => avancer(c.commande)} disabled={enCours === c.commande}>
                    {enCours === c.commande ? 'En cours…' : ACTION[c.statut]}
                  </button>
                )}
              </li>
            ))}
          </ul>

          {commandes.length > limite && (
            <button className="secondaire" onClick={() => setLimite(limite + 30)}>
              Afficher 30 commandes de plus
            </button>
          )}
        </>
      )}
    </>
  )
}