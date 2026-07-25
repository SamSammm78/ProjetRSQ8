"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeEuro,
  ChartNoAxesCombined,
  Crown,
  HandCoins,
  Landmark,
  PackageCheck,
  Percent,
  Scale,
  Receipt,
  ShoppingBasket,
  TrendingUp,
  X
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { KpiCard } from "@/components/kpi-card";
import { MetricGrid } from "@/components/metric-grid";
import { PageShell } from "@/components/page-shell";
import { useClientData } from "@/components/client-data";
import { DashboardRequiredActions } from "@/components/dashboard-required-actions";
import { FinalizedSalesSummary } from "@/components/finalized-sales-summary";
import {
  addDays,
  aggregateDailyStats,
  calculatePeriodOrderStatistics,
  calculateShopStatistics
} from "@/lib/calculations";
import { getMonthStartIsoDate, getTodayIsoDate } from "@/lib/dates";
import { formatCurrency, formatPercent, formatRatio } from "@/lib/format";
import type {
  PeriodOrderStatistics,
  Shop,
  ShopPeriodStatistics,
  Transaction
} from "@/lib/types";

type PeriodDetail = "average-order" | "average-profit" | "refund-rate";

function isBetween(date: string, startDate: string, endDate: string) {
  return date >= startDate && date <= endDate;
}

function getDatesBetween(startDate: string, endDate: string) {
  const dates: string[] = [];
  let current = startDate;

  while (current <= endDate) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

export default function DashboardPage() {
  const { shops, transactions } = useClientData();
  const [today] = useState(() => getTodayIsoDate());
  const [monthStart] = useState(() => getMonthStartIsoDate());
  const [startDate, setStartDate] = useState(() => getMonthStartIsoDate());
  const [endDate, setEndDate] = useState(() => getTodayIsoDate());
  const [isDailyRevenueOpen, setIsDailyRevenueOpen] = useState(false);
  const [periodDetail, setPeriodDetail] = useState<PeriodDetail | null>(null);
  const userTransactions = transactions;

  const todayStats = aggregateDailyStats(
    userTransactions.filter((transaction) => transaction.date === today)
  );
  const todayTransactions = useMemo(
    () => userTransactions.filter((transaction) => transaction.date === today),
    [today, userTransactions]
  );
  const monthStats = aggregateDailyStats(
    userTransactions.filter((transaction) => isBetween(transaction.date, monthStart, today))
  );
  const periodTransactions = useMemo(
    () =>
      userTransactions.filter((transaction) =>
        isBetween(transaction.date, startDate, endDate)
      ),
    [endDate, startDate, userTransactions]
  );
  const periodStats = aggregateDailyStats(periodTransactions);
  const periodOrderStats = useMemo(
    () => calculatePeriodOrderStatistics(periodTransactions),
    [periodTransactions]
  );
  const periodShopStats = useMemo(
    () => calculateShopStatistics(periodTransactions, shops),
    [periodTransactions, shops]
  );

  const periodChartData = useMemo(() => {
    return getDatesBetween(startDate, endDate).map((date) => {
      const stats = aggregateDailyStats(
        periodTransactions.filter((transaction) => transaction.date === date)
      );
      return {
        date: date.slice(5),
        brut: Number(stats.grossRevenue.toFixed(2)),
        ca: Number(stats.netRevenue.toFixed(2)),
        benefice: Number(stats.netProfit.toFixed(2))
      };
    });
  }, [endDate, periodTransactions, startDate]);

  const shopRanking = shops
    .map((shop) => {
      const stats = aggregateDailyStats(
        periodTransactions.filter((transaction) => transaction.shopId === shop.id)
      );
      return { shop, stats };
    })
    .sort((a, b) => b.stats.netProfit - a.stats.netProfit);

  const bestShop = shopRanking[0];

  return (
    <PageShell
      eyebrow="Vue globale"
      title="ProjetRSQ8"
      actions={
        <a
          href="/day"
          className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg bg-moss px-4 text-sm font-semibold text-white"
        >
          <ChartNoAxesCombined size={18} />
          Voir le jour
        </a>
      }
    >
      <MetricGrid>
        <KpiCard label="CA du mois" value={formatCurrency(monthStats.grossRevenue)} icon={Landmark} />
        <KpiCard
          label="Benefice du mois"
          value={formatCurrency(monthStats.netProfit)}
          icon={TrendingUp}
          tone={monthStats.netProfit >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          label="Ratio rentabilite mois"
          value={formatRatio(monthStats.profitabilityRatioAverage)}
          icon={Scale}
        />
        <KpiCard
          label="CA du jour"
          value={formatCurrency(todayStats.grossRevenue)}
          icon={BadgeEuro}
          onClick={() => setIsDailyRevenueOpen(true)}
          ariaLabel="Ouvrir le detail du CA du jour"
        />
        <KpiCard
          label="Benefice du jour"
          value={formatCurrency(todayStats.netProfit)}
          icon={TrendingUp}
          tone={todayStats.netProfit >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          label="Ratio rentabilite jour"
          value={formatRatio(todayStats.profitabilityRatioAverage)}
          icon={Scale}
        />
        <KpiCard label="Marge" value={formatPercent(todayStats.margin)} icon={Percent} />
        <KpiCard label="Commandes" value={String(todayStats.orders)} icon={PackageCheck} />
      </MetricGrid>

      <DashboardRequiredActions />

      <section className="grid gap-4 rounded-lg border border-sage bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Statistiques par periode</h2>
          <p className="text-sm text-ink/60">
            Choisis une plage de dates pour recalculer tous les chiffres de cette page.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-ink/70">
            Date de debut
            <input
              className="focus-ring h-12 rounded-lg border border-sage bg-mist px-3 text-ink"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-ink/70">
            Date de fin
            <input
              className="focus-ring h-12 rounded-lg border border-sage bg-mist px-3 text-ink"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiCard label="CA brut periode" value={formatCurrency(periodStats.grossRevenue)} icon={Receipt} />
          <KpiCard label="Remboursements" value={formatCurrency(periodStats.refunds)} icon={Receipt} />
          <KpiCard label="CA net periode" value={formatCurrency(periodStats.netRevenue)} icon={BadgeEuro} />
          <KpiCard
            label="Benefice periode"
            value={formatCurrency(periodStats.netProfit)}
            icon={TrendingUp}
            tone={periodStats.netProfit >= 0 ? "positive" : "negative"}
          />
          <KpiCard label="Commandes periode" value={String(periodStats.orders)} icon={PackageCheck} />
          <KpiCard label="Marge periode" value={formatPercent(periodStats.margin)} icon={Percent} />
          <KpiCard
            label="Ratio rentabilite"
            value={formatRatio(periodStats.profitabilityRatioAverage)}
            icon={Scale}
          />
          <KpiCard label="Frais Etsy" value={formatCurrency(periodStats.etsyFees)} icon={Receipt} />
          <KpiCard label="Couts produits" value={formatCurrency(periodStats.productCost)} icon={Receipt} />
          <KpiCard
            label="Panier moyen global"
            value={formatCurrency(periodOrderStats.averageOrderValue)}
            icon={ShoppingBasket}
            onClick={() => setPeriodDetail("average-order")}
            ariaLabel="Ouvrir le detail du panier moyen par boutique"
          />
          <KpiCard
            label="Taux de remboursement"
            value={formatPercent(periodOrderStats.refundRate)}
            icon={Percent}
            onClick={() => setPeriodDetail("refund-rate")}
            ariaLabel="Ouvrir le detail des remboursements"
          />
          <KpiCard
            label="Benefice moyen par commande"
            value={formatCurrency(periodOrderStats.averageProfitPerOrder)}
            icon={HandCoins}
            tone={periodOrderStats.averageProfitPerOrder >= 0 ? "positive" : "negative"}
            onClick={() => setPeriodDetail("average-profit")}
            ariaLabel="Ouvrir le detail du benefice moyen par boutique"
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-sage bg-white p-4 shadow-soft">
          <h2 className="mb-4 text-base font-semibold">CA et benefice sur la periode</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={periodChartData}>
                <CartesianGrid stroke="#dfe9e2" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Area dataKey="ca" stroke="#2f6b4f" fill="#dfe9e2" name="CA net" />
                <Area dataKey="benefice" stroke="#b45538" fill="#f1d9d1" name="Benefice" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-lg border border-sage bg-white p-4 shadow-soft">
          <h2 className="mb-4 text-base font-semibold">CA brut sur la periode</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={periodChartData}>
                <CartesianGrid stroke="#dfe9e2" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="brut" fill="#2f6b4f" radius={[4, 4, 0, 0]} name="CA brut" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-sage bg-white shadow-soft">
          <div className="border-b border-sage p-4">
            <h2 className="text-base font-semibold">Classement par benefice sur la periode</h2>
          </div>
          <div className="divide-y divide-sage">
            {shopRanking.map(({ shop, stats }) => (
              <div key={shop.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{shop.name}</p>
                  <p className="text-sm text-ink/60">{stats.orders} commandes</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-moss">{formatCurrency(stats.netProfit)}</p>
                  <p className="text-sm text-ink/60">{formatPercent(stats.margin)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-sage bg-white p-5 shadow-soft">
          <span className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-mist text-moss">
            <Crown size={21} />
          </span>
          <p className="text-sm font-medium text-ink/60">Boutique la plus rentable</p>
          <h2 className="mt-1 text-xl font-semibold">{bestShop?.shop.name ?? "-"}</h2>
          <p className="mt-4 text-3xl font-semibold text-moss">
            {formatCurrency(bestShop?.stats.netProfit ?? 0)}
          </p>
        </aside>
      </section>

      <FinalizedSalesSummary />

      {periodDetail ? (
        <PeriodStatisticsDetail
          detail={periodDetail}
          globalStats={periodOrderStats}
          shopStats={periodShopStats}
          onClose={() => setPeriodDetail(null)}
        />
      ) : null}

      {isDailyRevenueOpen ? (
        <DailyRevenueDetail
          date={today}
          shops={shops}
          stats={todayStats}
          transactions={todayTransactions}
          onClose={() => setIsDailyRevenueOpen(false)}
        />
      ) : null}
    </PageShell>
  );
}

function PeriodStatisticsDetail({
  detail,
  globalStats,
  shopStats,
  onClose
}: {
  detail: PeriodDetail;
  globalStats: PeriodOrderStatistics;
  shopStats: ShopPeriodStatistics[];
  onClose: () => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const sortedShops = useMemo(() => {
    const value = (shop: ShopPeriodStatistics) => {
      if (detail === "average-order") return shop.averageOrderValue;
      if (detail === "average-profit") return shop.averageProfitPerOrder;
      return shop.refundRate;
    };

    return [...shopStats].sort((left, right) => value(right) - value(left));
  }, [detail, shopStats]);

  const title =
    detail === "average-order"
      ? "Detail du panier moyen par boutique"
      : detail === "average-profit"
        ? "Detail du benefice moyen par boutique"
        : "Detail des remboursements";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-ink/55 sm:items-center sm:justify-center sm:p-4"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="period-detail-title"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-soft sm:max-w-6xl sm:rounded-lg"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-sage bg-white p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-normal text-ink/55">
              Periode selectionnee
            </p>
            <h2 id="period-detail-title" className="text-xl font-semibold">{title}</h2>
          </div>
          <button
            type="button"
            className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-sage text-ink/70"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-4">
          {detail === "refund-rate" ? (
            <RefundSummary stats={globalStats} />
          ) : null}

          <div className="grid gap-3 md:hidden">
            {sortedShops.map((shop) => (
              <ShopStatisticsCard key={shop.shopId} detail={detail} stats={shop} />
            ))}
            {detail !== "refund-rate" ? (
              <ShopStatisticsCard detail={detail} stats={globalStats} isTotal />
            ) : null}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border border-sage md:block">
            {detail === "average-order" ? (
              <AverageOrderTable globalStats={globalStats} shopStats={sortedShops} />
            ) : detail === "average-profit" ? (
              <AverageProfitTable globalStats={globalStats} shopStats={sortedShops} />
            ) : (
              <RefundTable shopStats={sortedShops} />
            )}
          </div>

          <button
            type="button"
            className="focus-ring h-11 rounded-lg bg-moss px-4 text-sm font-semibold text-white sm:w-fit"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      </section>
    </div>
  );
}

function RefundSummary({ stats }: { stats: PeriodOrderStatistics }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <SummaryValue label="Commandes totales" value={String(stats.ordersCount)} />
      <SummaryValue
        label="Sans remboursement"
        value={String(stats.ordersCount - stats.refundedOrdersCount)}
      />
      <SummaryValue
        label="Partiellement remboursees"
        value={String(stats.partiallyRefundedOrdersCount)}
      />
      <SummaryValue
        label="Integralement remboursees"
        value={String(stats.fullyRefundedOrdersCount)}
      />
      <SummaryValue label="Taux global" value={formatPercent(stats.refundRate)} />
      <SummaryValue label="Montant rembourse" value={formatCurrency(stats.refundAmount)} />
    </div>
  );
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-sage bg-mist p-3">
      <p className="text-sm text-ink/60">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ShopStatisticsCard({
  detail,
  stats,
  isTotal = false
}: {
  detail: PeriodDetail;
  stats: PeriodOrderStatistics | ShopPeriodStatistics;
  isTotal?: boolean;
}) {
  const name = isTotal
    ? "Toutes les boutiques"
    : (stats as ShopPeriodStatistics).shopName;

  return (
    <article className={`rounded-lg border border-sage p-4 ${isTotal ? "bg-mist" : "bg-white"}`}>
      <h3 className="font-semibold">{name}</h3>
      <div className="mt-3 grid gap-2 text-sm">
        <DetailRow label="Commandes" value={String(stats.ordersCount)} />
        {detail === "refund-rate" ? (
          <>
            <DetailRow label="Commandes remboursees" value={String(stats.refundedOrdersCount)} />
            <DetailRow label="Taux de remboursement" value={formatPercent(stats.refundRate)} />
            <DetailRow label="Montant rembourse" value={formatCurrency(stats.refundAmount)} />
          </>
        ) : (
          <>
            <DetailRow label="CA brut" value={formatCurrency(stats.grossRevenue)} />
            {detail === "average-order" ? (
              <DetailRow label="Panier moyen" value={formatCurrency(stats.averageOrderValue)} />
            ) : (
              <>
                <DetailRow label="Benefice total" value={formatCurrency(stats.totalProfit)} />
                <DetailRow
                  label="Benefice moyen"
                  value={formatCurrency(stats.averageProfitPerOrder)}
                />
                <DetailRow label="Marge" value={formatPercent(stats.margin)} />
              </>
            )}
          </>
        )}
      </div>
    </article>
  );
}

function AverageOrderTable({
  globalStats,
  shopStats
}: {
  globalStats: PeriodOrderStatistics;
  shopStats: ShopPeriodStatistics[];
}) {
  return (
    <table className="min-w-full text-left text-sm">
      <thead className="bg-mist text-xs uppercase tracking-normal text-ink/55">
        <tr>
          <th className="px-4 py-3">Boutique</th>
          <th className="px-4 py-3">Commandes</th>
          <th className="px-4 py-3">CA brut</th>
          <th className="px-4 py-3">Panier moyen</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-sage">
        {shopStats.map((shop) => (
          <tr key={shop.shopId}>
            <td className="px-4 py-4 font-medium">{shop.shopName}</td>
            <td className="px-4 py-4">{shop.ordersCount}</td>
            <td className="px-4 py-4">{formatCurrency(shop.grossRevenue)}</td>
            <td className="px-4 py-4">{formatCurrency(shop.averageOrderValue)}</td>
          </tr>
        ))}
        <tr className="bg-mist font-semibold">
          <td className="px-4 py-4">Toutes les boutiques</td>
          <td className="px-4 py-4">{globalStats.ordersCount}</td>
          <td className="px-4 py-4">{formatCurrency(globalStats.grossRevenue)}</td>
          <td className="px-4 py-4">{formatCurrency(globalStats.averageOrderValue)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function AverageProfitTable({
  globalStats,
  shopStats
}: {
  globalStats: PeriodOrderStatistics;
  shopStats: ShopPeriodStatistics[];
}) {
  return (
    <table className="min-w-full text-left text-sm">
      <thead className="bg-mist text-xs uppercase tracking-normal text-ink/55">
        <tr>
          <th className="px-4 py-3">Boutique</th>
          <th className="px-4 py-3">Commandes</th>
          <th className="px-4 py-3">CA brut</th>
          <th className="px-4 py-3">Benefice total</th>
          <th className="px-4 py-3">Benefice moyen</th>
          <th className="px-4 py-3">Marge</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-sage">
        {shopStats.map((shop) => (
          <tr key={shop.shopId}>
            <td className="px-4 py-4 font-medium">{shop.shopName}</td>
            <td className="px-4 py-4">{shop.ordersCount}</td>
            <td className="px-4 py-4">{formatCurrency(shop.grossRevenue)}</td>
            <td className="px-4 py-4">{formatCurrency(shop.totalProfit)}</td>
            <td className="px-4 py-4">{formatCurrency(shop.averageProfitPerOrder)}</td>
            <td className="px-4 py-4">{formatPercent(shop.margin)}</td>
          </tr>
        ))}
        <tr className="bg-mist font-semibold">
          <td className="px-4 py-4">Toutes les boutiques</td>
          <td className="px-4 py-4">{globalStats.ordersCount}</td>
          <td className="px-4 py-4">{formatCurrency(globalStats.grossRevenue)}</td>
          <td className="px-4 py-4">{formatCurrency(globalStats.totalProfit)}</td>
          <td className="px-4 py-4">{formatCurrency(globalStats.averageProfitPerOrder)}</td>
          <td className="px-4 py-4">{formatPercent(globalStats.margin)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function RefundTable({ shopStats }: { shopStats: ShopPeriodStatistics[] }) {
  return (
    <table className="min-w-full text-left text-sm">
      <thead className="bg-mist text-xs uppercase tracking-normal text-ink/55">
        <tr>
          <th className="px-4 py-3">Boutique</th>
          <th className="px-4 py-3">Commandes</th>
          <th className="px-4 py-3">Remboursees</th>
          <th className="px-4 py-3">Taux</th>
          <th className="px-4 py-3">Montant rembourse</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-sage">
        {shopStats.map((shop) => (
          <tr key={shop.shopId}>
            <td className="px-4 py-4 font-medium">{shop.shopName}</td>
            <td className="px-4 py-4">{shop.ordersCount}</td>
            <td className="px-4 py-4">{shop.refundedOrdersCount}</td>
            <td className="px-4 py-4">{formatPercent(shop.refundRate)}</td>
            <td className="px-4 py-4">{formatCurrency(shop.refundAmount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DailyRevenueDetail({
  date,
  shops,
  stats,
  transactions,
  onClose
}: {
  date: string;
  shops: Shop[];
  stats: ReturnType<typeof aggregateDailyStats>;
  transactions: Transaction[];
  onClose: () => void;
}) {
  const shopNameById = useMemo(
    () => new Map(shops.map((shop) => [shop.id, shop.name])),
    [shops]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/55 p-0 sm:items-center sm:justify-center sm:p-4">
      <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-soft sm:max-w-5xl sm:rounded-lg">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-sage bg-white p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-normal text-ink/55">{date}</p>
            <h2 className="text-xl font-semibold">Detail du CA du jour</h2>
          </div>
          <button
            type="button"
            className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-sage text-ink/70"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-4">
          <MetricGrid>
            <KpiCard label="Commandes du jour" value={String(stats.orders)} icon={PackageCheck} />
            <KpiCard label="Total CA brut" value={formatCurrency(stats.grossRevenue)} icon={Receipt} />
            <KpiCard label="Total rembourse" value={formatCurrency(stats.refunds)} icon={Receipt} />
            <KpiCard label="Total CA net" value={formatCurrency(stats.netRevenue)} icon={BadgeEuro} />
            <KpiCard
              label="Total benefice"
              value={formatCurrency(stats.netProfit)}
              icon={TrendingUp}
              tone={stats.netProfit >= 0 ? "positive" : "negative"}
            />
          </MetricGrid>

          {transactions.length === 0 ? (
            <div className="rounded-lg border border-sage bg-mist p-4 text-sm text-ink/65">
              Aucune transaction trouvee pour cette date.
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {transactions.map((transaction) => (
                  <DailyRevenueCard
                    key={transaction.id}
                    transaction={transaction}
                    shopName={shopNameById.get(transaction.shopId) ?? "-"}
                  />
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-lg border border-sage md:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-mist text-xs uppercase tracking-normal text-ink/55">
                    <tr>
                      <th className="px-4 py-3">Commande</th>
                      <th className="px-4 py-3">Boutique</th>
                      <th className="px-4 py-3">CA brut</th>
                      <th className="px-4 py-3">Remb.</th>
                      <th className="px-4 py-3">CA net</th>
                      <th className="px-4 py-3">Benefice</th>
                      <th className="px-4 py-3">Frais Etsy</th>
                      <th className="px-4 py-3">Cout produit</th>
                      <th className="px-4 py-3">Marge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-4 py-4 font-medium">
                          {transaction.orderNumber || "-"}
                        </td>
                        <td className="px-4 py-4">
                          {shopNameById.get(transaction.shopId) ?? "-"}
                        </td>
                        <td className="px-4 py-4">{formatCurrency(transaction.grossRevenue)}</td>
                        <td className="px-4 py-4">{formatCurrency(transaction.refundAmount)}</td>
                        <td className="px-4 py-4">{formatCurrency(transaction.netRevenue)}</td>
                        <td className="px-4 py-4">{formatCurrency(transaction.netProfit)}</td>
                        <td className="px-4 py-4">{formatCurrency(transaction.etsyFees)}</td>
                        <td className="px-4 py-4">{formatCurrency(transaction.productCost)}</td>
                        <td className="px-4 py-4">{formatPercent(transaction.margin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <button
            type="button"
            className="focus-ring h-11 rounded-lg bg-moss px-4 text-sm font-semibold text-white sm:w-fit"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      </section>
    </div>
  );
}

function DailyRevenueCard({
  transaction,
  shopName
}: {
  transaction: Transaction;
  shopName: string;
}) {
  return (
    <article className="rounded-lg border border-sage bg-white p-4 shadow-soft">
      <h3 className="font-semibold">Commande #{transaction.orderNumber || "-"}</h3>
      <div className="mt-3 grid gap-2 text-sm">
        <DetailRow label="Boutique" value={shopName} />
        <DetailRow label="CA brut" value={formatCurrency(transaction.grossRevenue)} />
        <DetailRow label="Remboursement" value={formatCurrency(transaction.refundAmount)} />
        <DetailRow label="CA net" value={formatCurrency(transaction.netRevenue)} />
        <DetailRow label="Benefice" value={formatCurrency(transaction.netProfit)} />
        <DetailRow label="Frais Etsy" value={formatCurrency(transaction.etsyFees)} />
        <DetailRow label="Cout produit" value={formatCurrency(transaction.productCost)} />
        <DetailRow label="Marge" value={formatPercent(transaction.margin)} />
      </div>
    </article>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink/60">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
