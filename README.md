# ProjetRSQ8

Dashboard prive mobile-first pour suivre le chiffre d'affaires, le CA net, le benefice, les frais et la marge de plusieurs boutiques Etsy.

## Ce qui est inclus

- Next.js, React, TypeScript et Tailwind CSS.
- Dashboard global avec KPI, graphiques 7 jours / 30 jours et classement des boutiques.
- Vue jour avec filtre date + boutique, comparaison avec la veille et transactions du jour.
- Gestion illimitee des boutiques.
- Ajout, suppression, export JSON et export CSV des transactions.
- Import CSV Etsy avec mapping client et detection des doublons `shop_id + order_number`.
- Schema Supabase prive avec tables, calculs SQL et index.
- Donnees initiales reprises du prompt.

## Lancer en local

```bash
npm install
npm run dev
```

Ouvre ensuite `http://localhost:3000`.

L'app fonctionne immediatement avec `localStorage`. Les donnees de base privee sont preparees dans `supabase/schema.sql`.

## Supabase

1. Cree un projet Supabase.
2. Copie `.env.example` vers `.env.local`.
3. Execute `supabase/schema.sql` dans l'editeur SQL Supabase.
4. Execute `supabase/seed.sql` si tu veux charger les donnees initiales.

Le schema ne contient pas de systeme de compte : il est prevu pour une base privee utilisee uniquement par toi.

## Deploiement Vercel

1. Pousse le projet sur GitHub.
2. Importe le repo dans Vercel.
3. Lance le deploiement.

## Pousser sur GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/projetrsq8.git
git push -u origin main
```

Remplace l'URL du remote par celle de ton repository GitHub.

## Structure

- `app/` : pages principales du SaaS.
- `components/` : composants React reutilisables.
- `lib/` : types, calculs, donnees locales, parsing CSV et formatage.
- `data/seed.ts` : boutiques et transactions initiales.
- `supabase/` : schema SQL prive et seed.

## Fonctions metier

Les fonctions demandees sont exposees dans `lib/api.ts` et `lib/calculations.ts` :

- `getShops()`
- `createShop(data)`
- `getTransactionsByDate(date, shopId?)`
- `getDailyStats(date, shopId?)`
- `getPreviousDayStats(date, shopId?)`
- `calculateTransactionMetrics(transaction)`
- `exportTransactions()`

Le parsing CSV client est dans `lib/csv.ts`.
