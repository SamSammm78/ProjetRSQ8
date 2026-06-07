"use client";

import { useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { useClientData } from "@/components/client-data";
import { parseEtsyCsv } from "@/lib/csv";
import type { CsvImportRow, TransactionInput } from "@/lib/types";

export function ImportDataPanel() {
  const { addTransactions, error, shops, transactions } = useClientData();
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState<CsvImportRow[]>([]);
  const [shopId, setShopId] = useState("");

  async function handleFile(file: File | null) {
    if (!file) {
      return;
    }

    const parsedRows = await parseEtsyCsv(file);
    setRows(parsedRows);
    setMessage(`${parsedRows.length} lignes pretes a importer.`);
  }

  async function importRows() {
    const selectedShopId = shopId || shops[0]?.id;
    if (!selectedShopId) {
      setMessage("Ajoute d'abord une boutique.");
      return;
    }

    const existingKeys = new Set(
      transactions.map((transaction) => `${transaction.shopId}:${transaction.orderNumber}`)
    );
    const newTransactions: TransactionInput[] = rows
      .filter((row) => !existingKeys.has(`${selectedShopId}:${row.orderNumber}`))
      .map((row) => ({
        shopId: selectedShopId,
        date: row.date,
        month: `${row.date.slice(0, 7)}-01`,
        orderNumber: row.orderNumber,
        status: row.status,
        grossRevenue: row.grossRevenue,
        refunds: row.refunds,
        etsyFees: row.etsyFees,
        etsyAds: row.etsyAds,
        productCost: row.productCost,
        shippingPaid: row.shippingPaid,
        otherFees: row.otherFees,
        notes: row.notes
      }));

    const importedCount = await addTransactions(newTransactions);
    setMessage(`${importedCount} transactions importees. Les doublons ont ete ignores.`);
  }

  return (
    <section className="grid gap-4 rounded-lg border border-sage bg-white p-5 shadow-soft">
      <div>
        <h2 className="font-semibold">Importation des donnees</h2>
        <p className="mt-1 text-sm text-ink/60">
          Imports CSV Etsy, commandes, donnees historiques et futurs imports.
        </p>
      </div>

      <label className="grid gap-2 text-sm font-medium text-ink/70">
        Boutique associee
        <select
          className="focus-ring h-12 rounded-lg border border-sage bg-mist px-3"
          value={shopId}
          onChange={(event) => setShopId(event.target.value)}
        >
          <option value="">Choisir une boutique</option>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}
            </option>
          ))}
        </select>
      </label>

      <label className="focus-ring flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-moss bg-mist p-8 text-center">
        <FileSpreadsheet className="text-moss" size={34} />
        <span className="font-semibold">Deposer ou choisir un fichier CSV Etsy</span>
        <input
          className="sr-only"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        />
      </label>

      {message ? <p className="text-sm font-medium text-moss">{message}</p> : null}
      {error ? <p className="text-sm font-medium text-clay">{error}</p> : null}

      <button
        className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-moss px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        onClick={importRows}
        disabled={rows.length === 0}
      >
        <Upload size={18} />
        Importer les lignes
      </button>

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-sage">
          <table className="min-w-full divide-y divide-sage text-left text-sm">
            <thead className="bg-mist text-xs uppercase tracking-normal text-ink/55">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Commande</th>
                <th className="px-4 py-3">CA brut</th>
                <th className="px-4 py-3">Frais Etsy</th>
                <th className="px-4 py-3">Cout produit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage bg-white">
              {rows.slice(0, 10).map((row, index) => (
                <tr key={`${row.orderNumber}-${index}`}>
                  <td className="px-4 py-4">{row.date}</td>
                  <td className="px-4 py-4">{row.orderNumber || "-"}</td>
                  <td className="px-4 py-4">{row.grossRevenue}</td>
                  <td className="px-4 py-4">{row.etsyFees}</td>
                  <td className="px-4 py-4">{row.productCost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
