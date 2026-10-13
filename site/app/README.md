# Site du projet Éora

Site React (Vite) branché sur l'API de `site/api`. Il a deux entrées :

- **la boutique**, ouverte à tous : le catalogue public et la prise de commande ;
- **l'espace employé**, après connexion avec un compte PostgreSQL. Chaque rôle ouvre sa page :

| Compte | Page |
|---|---|
| `lea` | Catalogue, en lecture seule |
| `nora` | Atelier : les commandes à préparer, avec le bouton pour les faire avancer |
| `samir` | Chiffre d'affaires par mois et par canal |

## Lancer

La base et l'API doivent tourner (voir le README principal et `site/api/README.md`). Puis, dans `site/app` :

```bash
npm install
npm run dev
```

Le site s'ouvre sur http://localhost:5173. Les appels à `/api` sont redirigés vers l'API sur le port 3001.

## Autres commandes

| Commande | Rôle |
|---|---|
| `npm run build` | construit le site dans `dist` |
| `npm run lint` | vérifie le code avec oxlint |
| `npm run preview` | sert la version construite |
