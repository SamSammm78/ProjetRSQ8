# ProjetRSQ8

Dashboard mobile-first pour suivre le chiffre d'affaires, le CA net, le benefice, les frais et la marge de plusieurs boutiques Etsy.

## Ce qui est inclus

- Next.js, React, TypeScript et Tailwind CSS.
- Dashboard global avec KPI, graphiques 7 jours / 30 jours et classement des boutiques.
- Vue jour avec filtre date + boutique, comparaison avec la veille et transactions du jour.
- Gestion illimitee des boutiques.
- Ajout, suppression, export JSON et export CSV des transactions.
- Import CSV Etsy avec mapping client et detection des doublons `shop_id + order_number`.
- Schema Supabase avec tables, calculs SQL et index.
- Donnees initiales reprises du prompt.
- Donnees chargees et enregistrees dans Supabase.

## Lancer en local

```bash
npm install
npm run dev
```

Ouvre ensuite `http://localhost:3000`.

L'app utilise Supabase comme base de donnees. Les tables SQL sont preparees dans `supabase/schema.sql`.

## Supabase

1. Cree un projet Supabase.
2. Copie `.env.example` vers `.env.local`.
3. Renseigne `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` et
   `WIDGET_API_KEY` avec une cle secrete longue.
4. Execute `supabase/schema.sql` dans l'editeur SQL Supabase.
5. Execute `supabase/seed.sql` si tu veux charger les donnees initiales.

Le schema contient les tables principales pour les boutiques et transactions.

Si les boutiques ou transactions existent dans Supabase mais ne s'affichent pas dans l'app,
execute `supabase/fix-dashboard-access.sql`. Cela retire les anciennes policies de compte et
autorise le dashboard a lire/ecrire dans `shops` et `transactions`.

Pour le module Commandes, execute aussi `supabase/supplier-orders.sql` si la table
`supplier_orders` n'existe pas encore ou si les colonnes `status` / `completed_at` manquent.
Ce script cree aussi le bucket Storage `supplier-orders` et la table `supplier_order_images`.

## API Widget

Les routes Widget lisent les vraies transactions Supabase et sont pensees pour Scriptable.

```txt
https://ton-domaine.com/api/widget/monthly
```

- `/api/widget/monthly` : statistiques du mois en cours.
- `/api/widget/today` : statistiques du jour en cours.
- `/api/widget/dashboard` : resume du jour et du mois pour un widget compact.
- `/api/widget/shops` : CA brut et benefice par boutique pour le mois en cours.

Les routes sont publiques : ne partage pas leurs URLs si tu ne veux pas rendre tes statistiques accessibles.

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
- `lib/` : types, calculs, acces Supabase, parsing CSV et formatage.
- `data/seed.ts` : boutiques et transactions initiales.
- `supabase/` : schema SQL et seed.

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
