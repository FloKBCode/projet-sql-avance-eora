import { useEffect, useMemo, useState } from 'react'
import { appeler } from '../api'
import './boutique.css'

const CATEGORIES = [
  ['fleur', "Fleurs à l'unité"],
  ['bouquet', 'Bouquets'],
  ['sur_mesure', 'Créations sur mesure'],
  ['accessoire', 'Accessoires et coffrets'],
]

const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

export default function Commande() {
  const [catalogue, setCatalogue] = useState([])
  const [quantites, setQuantites] = useState({})
  const [clientId, setClientId] = useState('12')
  const [resultat, setResultat] = useState(null)
  const [enCours, setEnCours] = useState(false)

  async function recharger() {
    try {
      setCatalogue(await appeler('/produits'))
    } catch (e) {
      setResultat({ type: 'refus', texte: e.message })
    }
  }

  useEffect(() => {
    appeler('/produits')
      .then(setCatalogue)
      .catch((e) => setResultat({ type: 'refus', texte: e.message }))
  }, [])

  function changer(id, delta) {
    setResultat(null)
    setQuantites((q) => {
      const suivante = Math.max(0, (q[id] ?? 0) + delta)
      const copie = { ...q, [id]: suivante }
      if (suivante === 0) delete copie[id]
      return copie
    })
  }

  const lignes = useMemo(
    () => catalogue.filter((p) => quantites[p.id]).map((p) => ({ ...p, quantite: quantites[p.id] })),
    [catalogue, quantites],
  )

  const total = lignes.reduce((somme, l) => somme + l.prix * l.quantite, 0)

  async function envoyer(evenement) {
    evenement.preventDefault()
    setEnCours(true)
    setResultat(null)
    try {
      const { commande } = await appeler('/commandes', {
        method: 'POST',
        corps: {
          clientId: Number(clientId),
          lignes: lignes.map((l) => ({ produitId: l.id, quantite: l.quantite })),
        },
      })
      setResultat({ type: 'succes', texte: `Commande n° ${commande} enregistrée, en attente de paiement.` })
      setQuantites({})
      await recharger()
    } catch (e) {
      setResultat({ type: 'refus', texte: e.message })
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="boutique">
      <div className="boutique-catalogue">
        <div>
          <h1>Composer une commande</h1>
          <p className="discret">
            Le stock affiché est celui de la base. Si vous demandez plus que ce qui reste, c'est la base qui refuse
            la commande, et son message s'affiche dans le panier.
          </p>
        </div>

        {CATEGORIES.map(([code, titre]) => {
          const liste = catalogue.filter((p) => p.categorie === code)
          if (liste.length === 0) return null
          return (
            <section key={code} className="boutique-categorie" aria-labelledby={`categorie-${code}`}>
              <h2 id={`categorie-${code}`}>{titre}</h2>
              {liste.map((p) => (
                <div key={p.id} className="boutique-produit">
                  <div>
                    <span className="boutique-nom">{p.nom}</span>
                    <span className={p.stock === 0 ? 'boutique-stock boutique-stock-epuise' : 'boutique-stock'}>
                      {p.stock === 0 ? 'Épuisé' : `${p.stock} en stock`}
                    </span>
                  </div>
                  <span className="boutique-prix">{euros.format(p.prix)}</span>
                  <div className="boutique-quantite">
                    <button
                      type="button"
                      onClick={() => changer(p.id, -1)}
                      disabled={!quantites[p.id]}
                      aria-label={`Retirer un ${p.nom}`}
                    >
                      −
                    </button>
                    <output aria-live="polite" aria-label={`Quantité de ${p.nom}`}>
                      {quantites[p.id] ?? 0}
                    </output>
                    <button type="button" onClick={() => changer(p.id, 1)} aria-label={`Ajouter un ${p.nom}`}>
                      +
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )
        })}
      </div>

      <form className="boutique-panier" onSubmit={envoyer} aria-labelledby="titre-panier">
        <h2 id="titre-panier">Panier</h2>

        {lignes.length === 0 ? (
          <p className="discret">Ajoutez un produit avec le bouton +.</p>
        ) : (
          <ul>
            {lignes.map((l) => (
              <li key={l.id}>
                <span>
                  {l.quantite} × {l.nom}
                </span>
                <span>{euros.format(l.prix * l.quantite)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="boutique-total">
          <span>Total</span>
          <span>{euros.format(total)}</span>
        </div>

        <label htmlFor="client">Numéro client</label>
        <input
          id="client"
          type="number"
          min="1"
          inputMode="numeric"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          required
        />

        {resultat && (
          <p
            className={resultat.type === 'refus' ? 'boutique-message boutique-refus' : 'boutique-message boutique-succes'}
            role={resultat.type === 'refus' ? 'alert' : 'status'}
          >
            {resultat.texte}
          </p>
        )}

        <button type="submit" disabled={enCours || lignes.length === 0}>
          {enCours ? 'Envoi…' : 'Passer la commande'}
        </button>
      </form>
    </div>
  )
}
