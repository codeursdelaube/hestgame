# HESTGame – README

> **Application de tirage au sort** pour l'événement **Octobre Rose & Novembre Bleu**  
> **HEST – Hautes Études de Sciences et Technologies, Lomé, Togo**

---

## Contrôle Total par l'Administrateur (/admin)

L'administrateur est le maître absolu du déroulé de l'événement :
1. **Contrôle Manuel Immédiat (1 Clic) :** Bouton `Ouvrir le tirage maintenant` / `Fermer le tirage` directement dans l'en-tête et sur le tableau de bord. La répercussion est instantanée sur les téléphones des participants et l'écran de projection.
2. **Programmation de l'heure :** L'admin fixe l'heure d'ouverture souhaitée (ex: 13h30, 14h00, etc.) et peut choisir d'activer ou non l'ouverture automatique.
3. **Message d'attente personnalisé :** L'admin définit le message diffusé aux participants tant que le tirage est fermé.
4. **Lancement du Tirage du Gagnant :** L'admin peut lancer la roue du gagnant final à **n'importe quel moment après 14h** d'un simple clic (avec confirmation et possibilité de relancer avec archivage automatique).

---

## Déroulé le Jour J

### Avant l'événement
1. L'admin se connecte sur **`/admin`** avec le code PIN (par défaut `1234`).
2. Dans **Paramètres**, il choisit l'heure d'ouverture (ex: 13h30) et configure le nombre max de participants et le nombre d'équipes.
3. Projeter **`/ecran`** sur le vidéoprojecteur en plein écran.

### À l'heure choisie (ex. 13h30) — Inscriptions
- L'admin clique sur **« Ouvrir le tirage maintenant »** (ou laisse l'ouverture automatique faire).
- Immédiatement, tous les téléphones des participants sur **`/`** se débloquent sans rechargement.
- Chaque participant remplit son identité, fait tourner la roue et obtient son numéro unique + son équipe pour *Génies en herbe*.
- L'écran de projection affiche en direct le compteur et le dernier inscrit.

### Dès 14h00 ou lors du tirage final — Tirage du Grand Gagnant
1. L'admin se rend dans l'onglet **"Tirage final"** (ou clique sur le raccourci depuis le tableau de bord).
2. Cliquer sur **"Lancer la roue du gagnant"**.
3. Sur le vidéoprojecteur (`/ecran`), le compte à rebours de suspense se lance (5..4..3..2..1), la roue tourne et le gagnant est dévoilé en grand avec pluie de confettis !
4. L'admin peut relancer si nécessaire (l'ancien gagnant est conservé dans l'historique).

---

## Installation

```bash
# 1. Cloner le dépôt
git clone <url-du-dépôt>
cd hestg

# 2. Installer les dépendances
npm install

# 3. Copier et remplir les variables d'environnement
cp .env.example .env.local
# → Éditez .env.local avec vos vraies valeurs

# 4. Générer le client Prisma
npx prisma generate

# 5. Lancer la migration (créer les tables en base)
npx prisma migrate deploy
# ou en développement :
# npx prisma migrate dev --name init

# 6. Lancer le serveur de développement
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

---

## Variables d'environnement (`.env.local`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL PostgreSQL pooled (Supabase, ex. via pgbouncer) |
| `DIRECT_URL` | URL PostgreSQL directe (pour les migrations Prisma) |
| `ADMIN_PIN` | Code PIN d'accès à l'espace admin |
| `SESSION_SECRET` | Chaîne secrète pour signer les cookies (≥ 32 caractères) |

---

## Déploiement Vercel + Supabase

### 1. Créer un projet Supabase
- Allez sur [supabase.com](https://supabase.com) → nouveau projet.
- Dans **Settings → Database**, copiez :
  - **Connection string (Transaction mode)** → `DATABASE_URL`
  - **Connection string (Session mode)** → `DIRECT_URL`

### 2. Déployer sur Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
```
Ou connectez votre repo GitHub à [vercel.com](https://vercel.com).

### 3. Ajouter les variables d'environnement sur Vercel
Dans **Project Settings → Environment Variables**, ajoutez :
- `DATABASE_URL`
- `DIRECT_URL`
- `ADMIN_PIN`
- `SESSION_SECRET`

### 4. Lancer la migration en production
```bash
npx prisma migrate deploy
```
> Cette commande applique toutes les migrations sans interactivité.

### 5. Vérifier
- Ouvrez votre URL Vercel.
- Allez sur `/admin` → connectez-vous avec votre PIN.
- Vérifiez les paramètres, ouvrez le tirage.

---

## Architecture

```
app/
├── page.tsx              → Page participant (mobile-first)
├── admin/
│   ├── login/page.tsx    → Connexion admin
│   └── page.tsx          → Tableau de bord admin
├── ecran/page.tsx        → Écran vidéoprojecteur
└── api/
    ├── status/route.ts   → État du tirage
    ├── draw/route.ts     → Tirage participant
    ├── screen/route.ts   → Données écran (polling)
    └── admin/
        ├── login/        → Connexion
        ├── logout/       → Déconnexion
        ├── stats/        → Statistiques
        ├── settings/     → Paramètres
        ├── winner/       → Tirage final
        ├── export/       → Export CSV
        └── reset/        → Réinitialisation

components/
├── SpinningWheel.tsx     → Roue animée Framer Motion
├── NumberCard.tsx        → Carte de résultat participant
├── HESTHeader.tsx        → En-tête de marque
└── ConfettiEffect.tsx    → Pluie de confettis

lib/
├── prisma.ts             → Client Prisma singleton
├── auth.ts               → Gestion session admin (jose JWT)
├── rate-limit.ts         → Anti-flood (20 req/min/IP)
└── schemas.ts            → Validation Zod
```

---

## Commandes utiles

```bash
npm run dev              # Développement (Turbopack)
npm run build            # Build production
npm run start            # Serveur production
npx prisma studio        # Interface graphique BDD
npx prisma migrate dev   # Nouvelle migration (dev)
npx prisma migrate deploy # Appliquer migrations (prod)
```

---

*HESTGame — Fait avec ❤️ pour HEST, Lomé, Togo*
