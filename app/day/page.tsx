"use client";

import { useMemo, useState } from "react";
import { BadgeEuro, Banknote, PackageCheck, Percent, Receipt, TrendingDown } from "lucide-react";
import { DateShopFilters } from "@/components/filters";
import { KpiCard } from "@/components/kpi-card";
import { MetricGrid } from "@/components/metric-grid";
import { PageShell } from "@/components/page-shell";
import { TransactionsTable } from "@/components/transactions-table";
import { useClientData } from "@/components/client-data";
import { getDailyStats, getPreviousDayStats, getTransactionsByDate } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/format";

export default function DayPage() {
  const { shops, transactions } = useClientData();
  const [date, setDate] = useState("2026-06-06");
  const [shopId, setShopId] = useState("");

  const dayTransactions = useMemo(
    () => getTransactionsByDate(date, shopId || undefined, transactions),
    [date, shopId, transactions]
  );
  const stats = getDailyStats(date, shopId || undefined, transactions);
  const previous = getPreviousDayStats(date, shopId || undefined, transactions);
  const profitDelta = stats.netProfit - previous.netProfit;
  const revenueDelta = stats.netRevenue - previous.netRevenue;

  return (
    <PageShell eyebrow="Stats par jour" title="Analyse du jour choisi">
      <DateShopFilters
        date={date}
        shopId={shopId}
        shops={shops}
        onDateChange={setDate}
        onShopChange={setShopId}
      />

      <MetricGrid>
        <KpiCard label="Commandes" value={String(stats.orders)} icon={PackageCheck} />
        <KpiCard label="CA brut" value={formatCurrency(stats.grossRevenue)} icon={Receipt} />
        <KpiCard label="CA net" value={formatCurrency(stats.netRevenue)} icon={BadgeEuro} />
        <KpiCard
          label="Benefice net"
          value={formatCurrency(stats.netProfit)}
          icon={Banknote}
          tone={stats.netProfit >= 0 ? "positive" : "negative"}
        />
        <KpiCard label="Marge" value={formatPercent(stats.margin)} icon={Percent} />
        <KpiCard label="Frais Etsy" value={formatCurrency(stats.etsyFees)} icon={TrendingDown} />
        <KpiCard label="Couts produits" value={formatCurrency(stats.productCost)} icon={Receipt} />
        <KpiCard label="Pub Etsy" value={formatCurrency(stats.etsyAds)} icon={BadgeEuro} />
      </MetricGrid>

      <section className="rounded-lg border border-sage bg-white shadow-soft">
        <div className="border-b border-sage p-4">
          <h2 className="text-base font-semibold">Comparaison avec la veille</h2>
        </div>
        <div className="grid divide-y divide-sage sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <ComparisonCell label="Jour choisi" revenue={stats.netRevenue} profit={stats.netProfit} />
          <ComparisonCell label="Veille" revenue={previous.netRevenue} profit={previous.netProfit} />
          <div className="p-4">
            <p className="text-sm font-medium text-ink/60">Ecart</p>
            <p className={`mt-2 text-xl font-semibold ${revenueDelta >= 0 ? "text-moss" : "text-clay"}`}>
              {formatCurrency(revenueDelta)}
            </p>
            <p className={`mt-1 text-sm font-medium ${profitDelta >= 0 ? "text-moss" : "text-clay"}`}>
              Benefice {formatCurrency(profitDelta)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-base font-semibold">Transactions du {date}</h2>
        <TransactionsTable transactions={dayTransactions} shops={shops} compact />
      </section>
    </PageShell>
  );
}

function ComparisonCell({
  label,
  revenue,
  profit
}: {
  label: string;
  revenue: number;
  profit: number;
}) {
  return (
    <div className="p-4">
      <p className="text-sm font-medium text-ink/60">{label}</p>
      <p className="mt-2 text-xl font-semibold">{formatCurrency(revenue)}</p>
      <p className="mt-1 text-sm font-medium text-moss">Benefice {formatCurrency(profit)}</p>
    </div>
  );
}
