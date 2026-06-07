import { Trash2 } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { Shop, Transaction } from "@/lib/types";

export function TransactionsTable({
  transactions,
  shops,
  compact = false,
  onDelete
}: {
  transactions: Transaction[];
  shops: Shop[];
  compact?: boolean;
  onDelete?: (transactionId: string) => void | Promise<void>;
}) {
  const shopName = (shopId: string) => shops.find((shop) => shop.id === shopId)?.name ?? "Boutique";

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-sage bg-white p-8 text-center text-sm text-ink/60">
        Aucune transaction pour cette selection.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-sage bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-sage text-left text-sm">
          <thead className="bg-mist text-xs uppercase tracking-normal text-ink/55">
            <tr>
              {!compact ? <th className="px-4 py-3">Date</th> : null}
              <th className="px-4 py-3">Boutique</th>
              <th className="px-4 py-3">Commande</th>
              <th className="px-4 py-3">CA brut</th>
              <th className="px-4 py-3">CA net</th>
              <th className="px-4 py-3">Benefice</th>
              <th className="px-4 py-3">Marge</th>
              {onDelete ? <th className="px-4 py-3 text-right">Action</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-sage">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-mist/70">
                {!compact ? <td className="px-4 py-4">{transaction.date}</td> : null}
                <td className="px-4 py-4 font-medium">{shopName(transaction.shopId)}</td>
                <td className="px-4 py-4 text-ink/65">{transaction.orderNumber || "-"}</td>
                <td className="px-4 py-4">{formatCurrency(transaction.grossRevenue)}</td>
                <td className="px-4 py-4">{formatCurrency(transaction.netRevenue)}</td>
                <td className="px-4 py-4 font-semibold text-moss">
                  {formatCurrency(transaction.netProfit)}
                </td>
                <td className="px-4 py-4">{formatPercent(transaction.margin)}</td>
                {onDelete ? (
                  <td className="px-4 py-4 text-right">
                    <button
                      className="focus-ring inline-grid h-9 w-9 place-items-center rounded-lg border border-sage text-clay hover:bg-mist"
                      onClick={() => onDelete(transaction.id)}
                      title="Supprimer la transaction"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
