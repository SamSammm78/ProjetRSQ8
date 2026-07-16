"use client";

import { useState } from "react";
import { Plus, Power, Trash2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useClientData } from "@/components/client-data";

export default function ShopsPage() {
  const { addShop, deleteShop: removeShop, error, isLoading, shops, toggleShop, transactions, updateShop } =
    useClientData();
  const [name, setName] = useState("");

  async function handleAddShop() {
    if (!name.trim()) {
      return;
    }

    await addShop(name.trim());
    setName("");
  }

  async function deleteShop(shopId: string) {
    const hasTransactions = transactions.some((transaction) => transaction.shopId === shopId);
    const confirmed =
      !hasTransactions ||
      window.confirm("Cette boutique a des transactions liees. Confirmer la suppression ?");

    if (confirmed) {
      await removeShop(shopId);
    }
  }

  async function updateFeeSetting(
    shopId: string,
    key: "feeCalculationMode" | "estimatedFeePercentage" | "estimatedFixedFee",
    value: string
  ) {
    const shop = shops.find((currentShop) => currentShop.id === shopId);

    if (!shop) {
      return;
    }

    await updateShop({
      ...shop,
      [key]: key === "feeCalculationMode" ? value : Number(value) || 0
    });
  }

  return (
    <PageShell eyebrow="Gestion" title="Boutiques Etsy">
      <div className="grid gap-3 rounded-lg border border-sage bg-white p-4 shadow-soft sm:grid-cols-[1fr_auto]">
        <input
          className="focus-ring h-12 rounded-lg border border-sage bg-mist px-3"
          placeholder="Nom de la boutique"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-moss px-5 font-semibold text-white"
          onClick={handleAddShop}
        >
          <Plus size={18} />
          Ajouter
        </button>
      </div>

      {isLoading ? <p className="text-sm text-ink/60">Chargement des boutiques...</p> : null}
      {error ? <p className="text-sm font-medium text-clay">{error}</p> : null}

      <div className="grid gap-3">
        {shops.map((shop) => {
          const count = transactions.filter((transaction) => transaction.shopId === shop.id).length;
          return (
            <article key={shop.id} className="rounded-lg border border-sage bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">{shop.name}</h2>
                  <p className="mt-1 text-sm text-ink/60">
                    {count} transaction{count > 1 ? "s" : ""} · {shop.active ? "Active" : "Desactivee"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-sage text-ink/70"
                    onClick={() => toggleShop(shop.id)}
                    title="Activer ou desactiver"
                  >
                    <Power size={17} />
                  </button>
                  <button
                    className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-sage text-clay"
                    onClick={() => deleteShop(shop.id)}
                    title="Supprimer"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 border-t border-sage pt-4 sm:grid-cols-3">
                <label className="grid gap-2 text-sm font-medium text-ink/70">
                  Mode de calcul
                  <select
                    className="focus-ring h-11 rounded-lg border border-sage bg-mist px-3 text-ink"
                    value={shop.feeCalculationMode}
                    onChange={(event) =>
                      updateFeeSetting(shop.id, "feeCalculationMode", event.target.value)
                    }
                  >
                    <option value="automatic">Estimation automatique</option>
                    <option value="manual">Saisie manuelle</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-ink/70">
                  Pourcentage estime
                  <input
                    className="focus-ring h-11 rounded-lg border border-sage bg-mist px-3 text-ink"
                    type="number"
                    step="0.01"
                    value={shop.estimatedFeePercentage}
                    onChange={(event) =>
                      updateFeeSetting(shop.id, "estimatedFeePercentage", event.target.value)
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-ink/70">
                  Frais fixes estimes
                  <input
                    className="focus-ring h-11 rounded-lg border border-sage bg-mist px-3 text-ink"
                    type="number"
                    step="0.01"
                    value={shop.estimatedFixedFee}
                    onChange={(event) =>
                      updateFeeSetting(shop.id, "estimatedFixedFee", event.target.value)
                    }
                  />
                </label>
              </div>
            </article>
          );
        })}
      </div>
    </PageShell>
  );
}
