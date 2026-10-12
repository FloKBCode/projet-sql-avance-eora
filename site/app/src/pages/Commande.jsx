import { useEffect, useMemo, useState } from 'react';
import { passerCommande, produits as chargerProduits } from '../api.js';
import './eora.css';

const CATEGORIES = [
  ['fleur', "Fleurs à l'unité"],
  ['bouquet', 'Bouquets'],
  ['sur_mesure', 'Créations sur mesure'],
  ['accessoire', 'Accessoires et coffrets'],
];

const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export default function Commande() {
  const [catalogue, setCatalogue] = useState([]);
  const [quantites, setQuantites] = useState({});
  const [clientId, setClientId] = useState('12');
  const [resultat, setResultat] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const recharger = () =>
    chargerProduits()
      .then(setCatalogue)
      .catch((e) => setResultat({ type: 'refus', texte: e.message }));

  useEffect(() => {
    recharger();
  }, []);

  const changer = (id, delta) => {
    setResultat(null);
    setQuantites((q) => {
      const suivante = Math.max(0, (q[id] ?? 0) + delta);
      const copie = { ...q, [id]: suivante };
      if (suivante === 0) delete copie[id];
      return copie;
    });
  };

  const lignes = useMemo(
    () =>
      catalogue
        .filter((p) => quantites[p.id])
        .map((p) => ({ ...p, quantite: quantites[p.id] })),
    [catalogue, quantites]
  );

  const total = lignes.reduce((somme, l) => somme + l.prix * l.quantite, 0);

  const envoyer = async (evenement) => {
    evenement.preventDefault();
    setEnCours(true);
    setResultat(null);
    try {
      const { commande } = await passerCommande(
        Number(clientId),
        lignes.map((l) => ({ produitId: l.id, quantite: l.quantite }))
      );
      setResultat({ type: 'succes', texte: `Commande n° ${commande} enregistrée, en attente de paiement.` });
      setQuantites({});
      await recharger();
    } catch (e) {
      setResultat({ type: 'refus', texte: e.message });
    } finally {
      setEnCours(false);
    }
  };

  return (
    <main className="eora commande">
      <div className="commande__catalogue">
        <header>
          <h1>Composer une commande</h1>
          <p>
            Le stock affiché est celui de la base. Si vous demandez plus que ce qui reste, c'est la base
            qui refuse la commande, et son message s'affiche dans le panier.
          </p>
        </header>

        {CATEGORIES.map(([code, titre]) => {
          const liste = catalogue.filter((p) => p.categorie === code);
          if (liste.length === 0) return null;
          return (
            <section key={code} className="commande__categorie" aria-labelledby={`categorie-${code}`}>
              <h2 id={`categorie-${code}`}>{titre}</h2>
              {liste.map((p) => (
                <div key={p.id} className="commande__produit">
                  <div>
                    <span className="commande__nom">{p.nom}</span>
                    <span className={p.stock === 0 ? 'commande__stock commande__stock--epuise' : 'commande__stock'}>
                      {p.stock === 0 ? 'Épuisé' : `${p.stock} en stock`}
                    </span>
                  </div>
                  <span className="commande__prix">{euros.format(p.prix)}</span>
                  <div className="quantite">
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
          );
        })}
      </div>

      <form className="panier" onSubmit={envoyer} aria-labelledby="titre-panier">
        <h2 id="titre-panier">Panier</h2>

        {lignes.length === 0 ? (
          <p className="panier__vide">Ajoutez un produit avec le bouton +.</p>
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

        <div className="panier__total">
          <span>Total</span>
          <span>{euros.format(total)}</span>
        </div>

        <label className="eora-champ">
          <span>Numéro client</span>
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          />
        </label>

        {resultat && (
          <p className={`eora-message eora-message--${resultat.type}`} role={resultat.type === 'refus' ? 'alert' : 'status'}>
            {resultat.texte}
          </p>
        )}

        <button className="eora-bouton" type="submit" disabled={enCours || lignes.length === 0}>
          {enCours ? 'Envoi…' : 'Passer la commande'}
        </button>
      </form>
    </main>
  );
}
