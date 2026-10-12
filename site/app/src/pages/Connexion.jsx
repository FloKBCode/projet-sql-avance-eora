import { useState } from 'react';
import { connexion } from '../api.js';
import './eora.css';

export default function Connexion({ onConnecte }) {
  const [utilisateur, setUtilisateur] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const envoyer = async (evenement) => {
    evenement.preventDefault();
    setErreur('');
    setEnCours(true);
    try {
      const resultat = await connexion(utilisateur.trim(), motDePasse);
      onConnecte?.(resultat);
    } catch (e) {
      setErreur(e.message);
      setEnCours(false);
    }
  };

  return (
    <main className="eora connexion">
      <section className="connexion__tige" aria-hidden="true">
        <div>
          <p className="connexion__marque">Éora</p>
          <p className="connexion__devise">Fleurs en fil chenille, façonnées une à une à l'atelier.</p>
        </div>
        <svg viewBox="0 0 220 300" role="presentation">
          <path
            d="M110 292 C 104 240, 128 210, 112 170 S 86 112, 112 86"
            fill="none"
            stroke="#6f8a5e"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray="1 7"
          />
          <path
            d="M114 214 C 140 200, 160 206, 172 188 C 150 182, 130 190, 114 214 Z"
            fill="#6f8a5e"
          />
          <g fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray="1 6">
            <path d="M112 86 C 70 70, 72 30, 112 24 C 152 30, 154 70, 112 86 Z" stroke="#a9502f" />
            <path d="M112 86 C 84 62, 92 40, 112 44 C 132 40, 140 62, 112 86 Z" stroke="#d08a5f" />
            <path d="M112 72 C 104 62, 106 54, 112 54 C 118 54, 120 62, 112 72 Z" stroke="#b08a3a" />
          </g>
        </svg>
      </section>

      <form className="connexion__formulaire" onSubmit={envoyer}>
        <h1>Espace atelier</h1>
        <p className="connexion__intro">
          Connectez-vous avec votre compte employé. Ce que vous voyez dépend de votre rôle.
        </p>

        <label className="eora-champ">
          <span>Identifiant</span>
          <input
            value={utilisateur}
            onChange={(e) => setUtilisateur(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck="false"
            required
          />
        </label>

        <label className="eora-champ">
          <span>Mot de passe</span>
          <input
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {erreur && (
          <p className="eora-message eora-message--refus" role="alert">
            {erreur}
          </p>
        )}

        <button className="eora-bouton" type="submit" disabled={enCours}>
          {enCours ? 'Connexion…' : 'Se connecter'}
        </button>

        <p className="connexion__comptes">
          Comptes de démonstration : <code>lea</code> (lecture), <code>nora</code> (atelier),{' '}
          <code>samir</code> (compta). Le mot de passe est l'identifiant.
        </p>
      </form>
    </main>
  );
}
