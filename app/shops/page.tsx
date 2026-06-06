"use client";

import { useState } from "react";
import { Plus, Power, Trash2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useClientData } from "@/components/client-data";
import { createShop } from "@/lib/api";

export default function ShopsPage() {
  const { shops, transactions, setShops, userId } = useClientData();
  const [name, setName] = useState("");

  function addShop() {
    if (!name.trim()) {
      return;
    }

    setShops([...shops, createShop(userId, { name: name.trim(), active: true })]);
    setName("");
  }

  function toggleShop(shopId: string) {
    setShops(
      shops.map((shop) =>
        shop.id === shopId ? { ...shop, active: !shop.active, updatedAt: new Date().toISOString() } : shop
      )
    );
  }

  function deleteShop(shopId: string) {
    const hasTransactions = transactions.some((transaction) => transaction.shopId === shopId);
    const confirmed =
      !hasTransactions ||
      window.confirm("Cette boutique a des transactions liees. Confirmer la suppression ?");

    if (confirmed) {
      setShops(shops.filter((shop) => shop.id !== shopId));
    }
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
          onClick={addShop}
        >
          <Plus size={18} />
          Ajouter
        </button>
      </div>

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
            </article>
          );
        })}
      </div>
    </PageShell>
  );
}
