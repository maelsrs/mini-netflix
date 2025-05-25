# mini-netflix
> MOREAUX Alexis, SOURISSEAU Maël

Une plateforme de streaming vidéo minimaliste permettant d'upload, de regarder et gérer des vidéos.

## Fonctionnalités Principales

- Upload de vidéos
- Génération automatique de miniatures
- Lecture vidéo en ligne
- Interface administrateur
- Base de données SQLite pour la gestion des infos des vidéos

## Prérequis

- Node.js
- pnpm (ou npm/yarn)
- ffmpeg (pour la génération des miniatures)

## Installation

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/maelsrs/mini-netflix
   cd mini-netflix
   ```

2. Installer les dépendances :
   ```bash
   pnpm install
   # ou
   npm install
   ```

3. Lancer l’application :
   ```bash
   pnpm start
   # ou
   node server.js
   ```

4. Accéder à l’application :
   - Ouvrir http://localhost:3000 dans votre navigateur.

## Structure du Projet

```
.
├── server.js              # Serveur principal Express
├── db/
│   └── database.js        # Gestion de la base de données SQLite
├── views/                 # Templates EJS
├── public/                # Fichiers statiques (CSS, images)
├── uploads/               # Vidéos et miniatures uploadées
├── miniflix.db            # Base de données SQLite
└── package.json           # Dépendances et scripts
```

## Technologies Utilisées

- Node.js
- Express
- EJS (templates)
- SQLite (better-sqlite3)
- Multer (upload)
- ffmpeg (miniatures)
- Tailwind CSS (UI)

## Accès Administrateur

- URL : `/admin`
- Identifiant : `admin`
- Mot de passe : (défini dans `.env` ou par défaut `admin`)
