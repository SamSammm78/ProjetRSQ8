"use client";

import { useEffect, useState } from "react";
import { PackagePlus, Save, UserPlus } from "lucide-react";
import {
  getSupplierAccounts,
  getSupplierProducts,
  getSupplierSettings,
  saveSupplierAccount,
  saveSupplierProduct,
  saveSupplierSettings
} from "@/lib/order-workflow";
import { alertSupabaseError } from "@/lib/supabase-error";
import type { SupplierAccount, SupplierProduct, SupplierSettings } from "@/lib/types";

const DEFAULT_SETTINGS: SupplierSettings = { supplierOrderAlertHours: 12, supplierShippingAlertDays: 5, deliveryLateAlertDays: 0 };

export function SupplierManagement() {
  const [accounts, setAccounts] = useState<SupplierAccount[]>([]);
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [account, setAccount] = useState({ name: "", email: "", cardLabel: "", notes: "" });
  const [product, setProduct] = useState({ internalName: "", supplierUrl: "", usualCost: "", supplierName: "AliExpress", notes: "" });
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    try {
      const [nextAccounts, nextProducts, nextSettings] = await Promise.all([getSupplierAccounts(), getSupplierProducts(), getSupplierSettings()]);
      setAccounts(nextAccounts);
      setProducts(nextProducts);
      setSettings(nextSettings);
    } catch (error) {
      alertSupabaseError(error);
    }
  }

  useEffect(() => { load(); }, []);

  async function run(action: () => Promise<void>) {
    setIsSaving(true);
    try { await action(); await load(); } catch (error) { alertSupabaseError(error); } finally { setIsSaving(false); }
  }

  return <>
    <section className="grid gap-4 rounded-lg border border-sage bg-white p-5 shadow-soft">
      <div><h2 className="font-semibold">Comptes AliExpress</h2><p className="mt-1 text-sm text-ink/60">Enregistre uniquement un nom interne, un email et un libelle de carte. Aucun mot de passe ni donnee bancaire sensible.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Field label="Nom du compte" value={account.name} onChange={(value) => setAccount({ ...account, name: value })} /><Field label="Email" type="email" value={account.email} onChange={(value) => setAccount({ ...account, email: value })} /><Field label="Carte utilisee" value={account.cardLabel} onChange={(value) => setAccount({ ...account, cardLabel: value })} /><Field label="Notes" value={account.notes} onChange={(value) => setAccount({ ...account, notes: value })} /></div>
      <button className="focus-ring inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isSaving || !account.name.trim()} onClick={() => run(async () => { await saveSupplierAccount({ ...account, platform: "aliexpress", isActive: true }); setAccount({ name: "", email: "", cardLabel: "", notes: "" }); })}><UserPlus size={17} /> Ajouter le compte</button>
      <div className="grid gap-2 sm:grid-cols-2">{accounts.map((item) => <div key={item.id} className="rounded-lg bg-mist p-3"><p className="font-semibold">{item.name}</p><p className="text-sm text-ink/60">{item.email || "Email non renseigne"} · {item.cardLabel || "Carte non renseignee"}</p></div>)}</div>
    </section>

    <section className="grid gap-4 rounded-lg border border-sage bg-white p-5 shadow-soft">
      <div><h2 className="font-semibold">Produits fournisseurs</h2><p className="mt-1 text-sm text-ink/60">Bibliotheque facultative utilisee uniquement lors de la commande AliExpress.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Field label="Nom interne" value={product.internalName} onChange={(value) => setProduct({ ...product, internalName: value })} /><Field label="Lien AliExpress" value={product.supplierUrl} onChange={(value) => setProduct({ ...product, supplierUrl: value })} /><Field label="Cout habituel" inputMode="decimal" value={product.usualCost} onChange={(value) => setProduct({ ...product, usualCost: value })} /><Field label="Notes" value={product.notes} onChange={(value) => setProduct({ ...product, notes: value })} /></div>
      <button className="focus-ring inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isSaving || !product.internalName.trim() || !product.supplierUrl.trim()} onClick={() => run(async () => { await saveSupplierProduct({ internalName: product.internalName, supplierUrl: product.supplierUrl, usualCost: product.usualCost ? Number(product.usualCost.replace(',', '.')) : null, supplierName: product.supplierName, notes: product.notes, shopId: null, isActive: true }); setProduct({ internalName: "", supplierUrl: "", usualCost: "", supplierName: "AliExpress", notes: "" }); })}><PackagePlus size={17} /> Ajouter le produit</button>
      <div className="grid gap-2 sm:grid-cols-2">{products.map((item) => <div key={item.id} className="rounded-lg bg-mist p-3"><p className="font-semibold">{item.internalName}</p><p className="text-sm text-ink/60">{item.usualCost === null ? "Cout libre" : `${item.usualCost.toFixed(2).replace('.', ',')} EUR`}</p></div>)}</div>
    </section>

    <section className="grid gap-4 rounded-lg border border-sage bg-white p-5 shadow-soft">
      <div><h2 className="font-semibold">Alertes fournisseur</h2><p className="mt-1 text-sm text-ink/60">Seuils calcules lors de l&apos;ouverture du suivi des commandes.</p></div>
      <div className="grid gap-3 sm:grid-cols-3"><NumberField label="Vente non commandee (heures)" value={settings.supplierOrderAlertHours} onChange={(value) => setSettings({ ...settings, supplierOrderAlertHours: value })} /><NumberField label="Commande non expediee (jours)" value={settings.supplierShippingAlertDays} onChange={(value) => setSettings({ ...settings, supplierShippingAlertDays: value })} /><NumberField label="Retard de livraison (jours)" value={settings.deliveryLateAlertDays} onChange={(value) => setSettings({ ...settings, deliveryLateAlertDays: value })} /></div>
      <button className="focus-ring inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isSaving} onClick={() => run(() => saveSupplierSettings(settings))}><Save size={17} /> Enregistrer les seuils</button>
    </section>
  </>;
}

function Field({ inputMode, label, onChange, type = "text", value }: { inputMode?: "decimal"; label: string; onChange: (value: string) => void; type?: string; value: string }) { return <label className="grid min-w-0 gap-2 text-sm font-medium text-ink/70">{label}<input className="focus-ring h-12 min-w-0 w-full rounded-lg border border-sage bg-mist px-3 text-base" inputMode={inputMode} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function NumberField({ label, onChange, value }: { label: string; onChange: (value: number) => void; value: number }) { return <label className="grid min-w-0 gap-2 text-sm font-medium text-ink/70">{label}<input className="focus-ring h-12 min-w-0 rounded-lg border border-sage bg-mist px-3 text-base" min="0" type="number" value={value} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} /></label>; }
