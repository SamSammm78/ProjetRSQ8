# ProjetRSQ8

SaaS mobile-first pour suivre le chiffre d'affaires, le CA net, le benefice, les frais et la marge de plusieurs boutiques Etsy.

## Ce qui est inclus

- Next.js, React, TypeScript et Tailwind CSS.
- Dashboard global avec KPI, graphiques 7 jours / 30 jours et classement des boutiques.
- Vue jour avec filtre date + boutique, comparaison avec la veille et transactions du jour.
- Gestion illimitee des boutiques.
- Ajout, suppression, export JSON et export CSV des transactions.
- Import CSV Etsy avec mapping client et detection des doublons `shop_id + order_number`.
- Schema Supabase avec tables, calculs SQL, index et policies RLS par utilisateur.
- Donnees seed de demonstration reprises du prompt.

## Lancer en local

```bash
npm install
npm run dev
```

Ouvre ensuite `http://localhost:3000`.

L'app fonctionne immediatement en mode demo avec `localStorage`. Les donnees de production Supabase sont preparees dans `supabase/schema.sql`.

## Supabase

1. Cree un projet Supabase.
2. Copie `.env.example` vers `.env.local`.
3. Renseigne `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Execute `supabase/schema.sql` dans l'editeur SQL Supabase.
5. Cree un utilisateur demo, recupere son `auth.users.id`, remplace l'UUID dans `supabase/seed.sql`, puis execute le seed.

Les policies RLS garantissent que chaque utilisateur ne voit et modifie que ses propres `shops` et `transactions`.

## Deploiement Vercel

1. Pousse le projet sur GitHub.
2. Importe le repo dans Vercel.
3. Ajoute les variables d'environnement Supabase.
4. Lance le deploiement.

Stripe est prevu via les variables `STRIPE_SECRET_KEY` et `NEXT_PUBLIC_STRIPE_ENABLED`, mais desactive par defaut.

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
- `lib/` : types, calculs, API demo, parsing CSV et formatage.
- `data/seed.ts` : boutiques et transactions initiales.
- `supabase/` : schema SQL, RLS et seed.

## Fonctions metier

Les fonctions demandees sont exposees dans `lib/api.ts` et `lib/calculations.ts` :

- `getShops(userId)`
- `createShop(userId, data)`
- `getTransactionsByDate(userId, date, shopId?)`
- `getDailyStats(userId, date, shopId?)`
- `getPreviousDayStats(userId, date, shopId?)`
- `calculateTransactionMetrics(transaction)`
- `exportTransactions(userId)`

Le parsing CSV client est dans `lib/csv.ts`.
