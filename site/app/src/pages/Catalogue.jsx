import { useEffect, useState } from 'react'
import { appeler } from '../api'

const euros = (valeur) =>
  Number(valeur).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

const CATEGORIES = [
  ['fleur', "Fleurs à l'unité"],
  ['bouquet', 'Bouquets'],
  ['sur_mesure', 'Créations sur mesure'],
  ['accessoire', 'Accessoires et coffrets'],
]

export default function Catalogue() {
  const [produits, setProduits] = useState(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    appeler('/catalogue')
      .then(setProduits)
      .catch((e) => setErreur(e.message))
  }, [])

  if (erreur) {
    return (
      <p className="erreur" role="alert">
        {erreur}
      </p>
    )
  }
  if (!produits) return <p>Chargement du catalogue…</p>

  return (
    <>
      <p className="discret">
        {produits.length} produits. Ce compte est en lecture seule : la base refuserait toute
        modification.
      </p>

      {CATEGORIES.map(([cle, titre]) => {
        const liste = produits.filter((p) => p.categorie === cle)
        if (liste.length === 0) return null
        return (
          <section key={cle} className="categorie">
            <h2>{titre}</h2>
            <ul className="produits">
              {liste.map((p) => (
                <li key={p.nom} className="produit">
                  <strong>{p.nom}</strong>
                  <span className="prix">{euros(p.prix)}</span>
                  <span className={Number(p.stock) === 0 ? 'stock rupture' : 'stock'}>
                    {Number(p.stock) === 0 ? 'Épuisé' : `${p.stock} en stock`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}
