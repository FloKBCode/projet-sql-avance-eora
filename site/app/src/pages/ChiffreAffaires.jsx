import { useEffect, useState } from 'react'
import { appeler } from '../api'

const euros = (valeur) =>
  Number(valeur).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })

const CANAUX = [
  ['site', 'Site'],
  ['marche', 'Marché'],
  ['instagram', 'Instagram'],
]

// "2025-10" devient "octobre 2025"
function nomDuMois(mois) {
  const [annee, numero] = mois.split('-').map(Number)
  return new Date(annee, numero - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
}

export default function ChiffreAffaires() {
  const [donnees, setDonnees] = useState(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    appeler('/chiffre-affaires')
      .then(setDonnees)
      .catch((e) => setErreur(e.message))
  }, [])

  if (erreur) {
    return (
      <p className="erreur" role="alert">
        {erreur}
      </p>
    )
  }
  if (!donnees) return <p>Chargement du chiffre d'affaires…</p>

  // Une ligne par mois, avec le détail de chaque canal.
  const parMois = {}
  for (const l of donnees) {
    if (!parMois[l.mois]) parMois[l.mois] = {}
    parMois[l.mois][l.canal] = { ca: Number(l.ca), commandes: Number(l.commandes) }
  }
  const mois = Object.keys(parMois).sort().reverse()

  const total = donnees.reduce((somme, l) => somme + Number(l.ca), 0)
  const nombreCommandes = donnees.reduce((somme, l) => somme + Number(l.commandes), 0)

  const maintenant = new Date()
  const moisEnCours = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, '0')}`

  return (
    <>
      <p className="discret">
        {euros(total)} sur {nombreCommandes.toLocaleString('fr-FR')} commandes, depuis {nomDuMois(mois[mois.length - 1])}. Ce compte ne voit aucune donnée client : la vue ne contient que des totaux.
      </p>

      <div className="tableau">
        <table>
          <thead>
            <tr>
              <th>Mois</th>
              {CANAUX.map(([cle, titre]) => (
                <th key={cle}>{titre}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {mois.map((m) => {
              const ligne = parMois[m]
              const totalMois = CANAUX.reduce((s, [cle]) => s + (ligne[cle]?.ca ?? 0), 0)
              return (
                <tr key={m}>
                  <th scope="row">
                    {nomDuMois(m)}
                    {m === moisEnCours && <span className="en-cours"> en cours</span>}
                  </th>
                  {CANAUX.map(([cle]) => (
                    <td key={cle}>
                      {ligne[cle] ? (
                        <>
                          {euros(ligne[cle].ca)}
                          <span className="detail">{ligne[cle].commandes} commandes</span>
                        </>
                      ) : (
                        '–'
                      )}
                    </td>
                  ))}
                  <td className="total">{euros(totalMois)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}