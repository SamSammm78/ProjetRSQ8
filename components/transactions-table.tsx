import { Edit3, Eye, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { calculateProfitabilityRatio } from "@/lib/calculations";
import { formatCurrency, formatDate, formatPercent, formatRatio } from "@/lib/format";
import type { Shop, Transaction } from "@/lib/types";

export function TransactionsTable({
  transactions,
  shops,
  compact = false,
  onDelete,
  onEdit,
  onRefund,
  onView
}: {
  transactions: Transaction[];
  shops: Shop[];
  compact?: boolean;
  onDelete?: (transactionId: string) => void | Promise<void>;
  onEdit?: (transaction: Transaction) => void;
  onRefund?: (transaction: Transaction) => void;
  onView?: (transaction: Transaction) => void;
}) {
  const shopName = (shopId: string) => shops.find((shop) => shop.id === shopId)?.name ?? "Boutique";
  const hasActions = Boolean(onDelete || onEdit || onRefund || onView);

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-sage bg-white p-8 text-center text-sm text-ink/60">
        Aucune transaction pour cette selection.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:hidden">
        {transactions.map((transaction) => (
          <article key={transaction.id} className="rounded-lg border border-sage bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-normal text-ink/55">
                  {!compact ? formatDate(transaction.date) : shopName(transaction.shopId)}
                </p>
                <h3 className="mt-1 font-semibold">Commande {transaction.orderNumber || "-"}</h3>
              </div>
              <TransactionActions
                transaction={transaction}
                compact
                onDelete={onDelete}
                onEdit={onEdit}
                onRefund={onRefund}
                onView={onView}
              />
            </div>
            <div className="mt-3 grid gap-2 text-sm">
              {!compact ? <DetailRow label="Boutique" value={shopName(transaction.shopId)} /> : null}
              <DetailRow label="CA brut" value={formatCurrency(transaction.grossRevenue)} />
              {transaction.status === "refunded" ? (
                <DetailRow label="Remboursement" value={formatCurrency(transaction.refundAmount)} />
              ) : null}
              <DetailRow label="CA net" value={formatCurrency(transaction.netRevenue)} />
              <DetailRow label="Resultat" value={formatCurrency(transaction.netProfit)} />
              <DetailRow label="Marge" value={formatPercent(transaction.margin)} />
              <div className="pt-1">
                <StatusBadge transaction={transaction} />
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-sage bg-white shadow-soft md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-sage text-left text-sm">
            <thead className="bg-mist text-xs uppercase tracking-normal text-ink/55">
              <tr>
                {!compact ? <th className="px-4 py-3">Date</th> : null}
                <th className="px-4 py-3">Boutique</th>
                <th className="px-4 py-3">Commande</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">CA brut</th>
                <th className="px-4 py-3">Remb.</th>
                <th className="px-4 py-3">CA net</th>
                <th className="px-4 py-3">Resultat</th>
                <th className="px-4 py-3">Marge</th>
                <th className="px-4 py-3">Ratio renta.</th>
                {hasActions ? <th className="px-4 py-3 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-sage">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-mist/70">
                  {!compact ? <td className="px-4 py-4">{formatDate(transaction.date)}</td> : null}
                  <td className="px-4 py-4 font-medium">{shopName(transaction.shopId)}</td>
                  <td className="px-4 py-4 text-ink/65">{transaction.orderNumber || "-"}</td>
                  <td className="px-4 py-4">
                    <StatusBadge transaction={transaction} />
                    {transaction.refundedAt ? (
                      <p className="mt-1 text-xs text-ink/50">{formatDate(transaction.refundedAt.slice(0, 10))}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">{formatCurrency(transaction.grossRevenue)}</td>
                  <td className="px-4 py-4">{formatCurrency(transaction.refundAmount)}</td>
                  <td className="px-4 py-4">{formatCurrency(transaction.netRevenue)}</td>
                  <td className={`px-4 py-4 font-semibold ${transaction.netProfit >= 0 ? "text-moss" : "text-clay"}`}>
                    {formatCurrency(transaction.netProfit)}
                  </td>
                  <td className="px-4 py-4">{formatPercent(transaction.margin)}</td>
                  <td className="px-4 py-4">
                    {formatRatio(calculateProfitabilityRatio(transaction))}
                  </td>
                  {hasActions ? (
                    <td className="px-4 py-4">
                      <TransactionActions
                        transaction={transaction}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onRefund={onRefund}
                        onView={onView}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TransactionActions({
  transaction,
  compact = false,
  onDelete,
  onEdit,
  onRefund,
  onView
}: {
  transaction: Transaction;
  compact?: boolean;
  onDelete?: (transactionId: string) => void | Promise<void>;
  onEdit?: (transaction: Transaction) => void;
  onRefund?: (transaction: Transaction) => void;
  onView?: (transaction: Transaction) => void;
}) {
  const buttons = (
    <>
      {onView ? (
        <button className="transaction-action" onClick={() => onView(transaction)} title="Voir">
          <Eye size={15} />
          <span>Voir</span>
        </button>
      ) : null}
      {onEdit ? (
        <button className="transaction-action" onClick={() => onEdit(transaction)} title="Modifier">
          <Edit3 size={15} />
          <span>Modifier</span>
        </button>
      ) : null}
      {onRefund ? (
        <button
          className="transaction-action"
          onClick={() => onRefund(transaction)}
          title={transaction.status === "refunded" ? "Corriger le remboursement" : "Rembourser"}
        >
          <RotateCcw size={15} />
          <span>{transaction.status === "refunded" ? "Corriger" : "Rembourser"}</span>
        </button>
      ) : null}
      {onDelete ? (
        <button className="transaction-action text-clay" onClick={() => onDelete(transaction.id)} title="Supprimer">
          <Trash2 size={15} />
          <span>Supprimer</span>
        </button>
      ) : null}
    </>
  );

  if (compact) {
    return (
      <details className="relative">
        <summary className="focus-ring grid h-9 w-9 cursor-pointer list-none place-items-center rounded-lg border border-sage text-ink/70">
          <MoreHorizontal size={17} />
        </summary>
        <div className="absolute right-0 z-10 mt-2 grid min-w-44 gap-1 rounded-lg border border-sage bg-white p-2 shadow-soft">
          {buttons}
        </div>
      </details>
    );
  }

  return <div className="flex justify-end gap-2">{buttons}</div>;
}

function StatusBadge({ transaction }: { transaction: Transaction }) {
  if (transaction.status === "refunded") {
    const label =
      transaction.refundType === "full_product_recovered"
        ? "Remboursee · produit recupere"
        : "Remboursee · produit non recupere";

    return (
      <span className="inline-flex rounded-full bg-clay/10 px-2.5 py-1 text-xs font-semibold text-clay">
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-moss/10 px-2.5 py-1 text-xs font-semibold text-moss">
      Payee
    </span>
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
