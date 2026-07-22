"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Clipboard, ExternalLink, PackageCheck, Save, TriangleAlert } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { OrderDetailModal } from "@/components/supplier-orders/order-detail-modal";
import { useClientData } from "@/components/client-data";
import { calculateFinalProfit, calculateTransactionMargin } from "@/lib/calculations";
import { getTodayIsoDate } from "@/lib/dates";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  addShipment,
  confirmSupplierOrder,
  getOrderEvents,
  getOrderProblems,
  getSupplierAccounts,
  getSupplierProducts,
  markSupplierOrderDelivered,
  reportSupplierProblem,
  resolveSupplierProblem
} from "@/lib/order-workflow";
import { getSupplierOrder } from "@/lib/supplier-orders";
import { alertSupabaseError } from "@/lib/supabase-error";
import type { LogisticsStatus, OrderEvent, ProblemUrgency, SupplierAccount, SupplierOrder, SupplierOrderProblem, SupplierProduct } from "@/lib/types";

const PROBLEM_TYPES = ["Produit en rupture", "Commande non expediee", "Suivi bloque", "Adresse incorrecte", "Colis en retard", "Colis perdu", "Produit endommage", "Demande client", "Litige AliExpress", "Autre"];

export default function SupplierOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { shops, transactions } = useClientData();
  const [order, setOrder] = useState<SupplierOrder | null>(null);
  const [accounts, setAccounts] = useState<SupplierAccount[]>([]);
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [problems, setProblems] = useState<SupplierOrderProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showImages, setShowImages] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [nextOrder, nextAccounts, nextProducts, nextEvents, nextProblems] = await Promise.all([
        getSupplierOrder(params.id),
        getSupplierAccounts(),
        getSupplierProducts(),
        getOrderEvents(params.id),
        getOrderProblems(params.id)
      ]);
      setOrder(nextOrder);
      setAccounts(nextAccounts);
      setProducts(nextProducts);
      setEvents(nextEvents);
      setProblems(nextProblems);
    } catch (error) {
      alertSupabaseError(error);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const transaction = useMemo(
    () => transactions.find((item) => item.id === order?.transactionId) ?? null,
    [order?.transactionId, transactions]
  );
  const shop = shops.find((item) => item.id === (order?.shopId ?? transaction?.shopId));
  const effectiveTransaction = transaction && order
    ? { ...transaction, actualSupplierCost: order.actualSupplierCost, shippingPaid: order.supplierShipping }
    : transaction;
  const finalProfit = effectiveTransaction ? calculateFinalProfit(effectiveTransaction) : 0;
  const finalMargin = effectiveTransaction
    ? calculateTransactionMargin({ grossRevenue: effectiveTransaction.grossRevenue, netProfit: finalProfit })
    : 0;

  async function run(action: () => Promise<void>) {
    setIsSaving(true);
    try {
      await action();
      await load();
    } catch (error) {
      alertSupabaseError(error);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !order) {
    return <PageShell eyebrow="AliExpress" title="Dossier commande"><p className="text-sm text-ink/60">Chargement du dossier...</p></PageShell>;
  }

  return (
    <PageShell
      eyebrow={order.isStandalone ? "Commande hors vente" : shop?.name ?? "Vente Etsy"}
      title={`Commande #${order.etsyOrderNumber || order.supplierOrderNumber || "-"}`}
      actions={<Link className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg border border-sage bg-white px-4 text-sm font-semibold" href="/commandes"><ArrowLeft size={18} /> Retour aux commandes</Link>}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="grid min-w-0 gap-4">
          <Section title="Vente Etsy">
            <InfoGrid items={[
              ["Boutique", shop?.name ?? "-"],
              ["Numero Etsy", order.etsyOrderNumber || "Commande hors vente"],
              ["Date de vente", formatDate(order.saleDate)],
              ["Montant recu", formatCurrency(transaction?.grossRevenue ?? 0)],
              ["Frais Etsy", formatCurrency(transaction?.etsyFees ?? 0)],
              ["Offsite Ads", formatCurrency(transaction?.etsyAds ?? 0)],
              ["Autres frais", formatCurrency(transaction?.otherFees ?? 0)],
              ["Statut financier", financialLabel(order.financialStatus)]
            ]} />
            {transaction ? <Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-moss underline" href={`/transactions?transaction=${transaction.id}`}>Voir la transaction associee <ExternalLink size={15} /></Link> : null}
          </Section>

          {order.logisticsStatus === "to_order" ? (
            <OrderForm accounts={accounts} isSaving={isSaving} order={order} products={products} onSave={(input) => run(() => confirmSupplierOrder(order.id, input))} />
          ) : (
            <Section title="Commande AliExpress">
              <InfoGrid items={[
                ["Numero AliExpress", order.supplierOrderNumber || "-"],
                ["Compte utilise", (accounts.find((account) => account.id === order.supplierAccountId)?.name ?? order.accountUsed) || "-"],
                ["Cout reel paye", formatCurrency(order.actualSupplierCost ?? 0)],
                ["Devise", order.supplierCurrency],
                ["Date de commande", order.orderedAt ? formatDate(order.orderedAt.slice(0, 10)) : "-"],
                ["Expedition", order.shippedAt ? formatDate(order.shippedAt.slice(0, 10)) : "-"],
                ["Suivi", order.trackingNumber || "-"],
                ["Transporteur", order.carrier || "-"],
                ["Livraison estimee", order.estimatedDeliveryAt ? formatDate(order.estimatedDeliveryAt) : "-"],
                ["Livraison reelle", order.deliveredAt ? formatDate(order.deliveredAt.slice(0, 10)) : "-"]
              ]} />
              {order.supplierUrl ? <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-moss underline" href={order.supplierUrl} target="_blank" rel="noreferrer">Ouvrir AliExpress <ExternalLink size={15} /></a> : null}
            </Section>
          )}

          {order.logisticsStatus === "ordered" ? <ShipmentForm isSaving={isSaving} order={order} onSave={(input) => run(() => addShipment(order.id, input))} /> : null}

          {order.logisticsStatus === "shipped" ? (
            <Section title="Livraison">
              <p className="text-sm text-ink/65">Confirme la reception du colis sans supprimer le dossier.</p>
              <button className="focus-ring mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isSaving} onClick={() => run(() => markSupplierOrderDelivered(order.id, new Date().toISOString()))}><Check size={17} /> Marquer comme livree</button>
            </Section>
          ) : null}

          <FinancialSection order={order} transaction={effectiveTransaction} finalProfit={finalProfit} finalMargin={finalMargin} />
          <ProblemSection isSaving={isSaving} order={order} problems={problems} onReport={(input) => run(() => reportSupplierProblem(order, input))} onResolve={(problemId, status) => run(() => resolveSupplierProblem(problemId, order.id, status))} />
          <Section title="Images et justificatifs">
            <button className="focus-ring h-11 rounded-lg border border-sage px-4 text-sm font-semibold" onClick={() => setShowImages(true)}>Ouvrir la galerie ({order.images.length})</button>
          </Section>
        </main>

        <aside className="min-w-0">
          <section className="rounded-lg border border-sage bg-white shadow-soft xl:sticky xl:top-24">
            <div className="border-b border-sage p-4"><h2 className="font-semibold">Historique</h2></div>
            <div className="divide-y divide-sage">
              {events.length === 0 ? <p className="p-4 text-sm text-ink/60">Aucun evenement.</p> : events.map((event) => <div key={event.id} className="p-4"><p className="font-medium">{event.title}</p>{event.description ? <p className="mt-1 text-sm text-ink/60">{event.description}</p> : null}<p className="mt-2 text-xs text-ink/45">{new Date(event.createdAt).toLocaleString("fr-FR")}</p></div>)}
            </div>
          </section>
        </aside>
      </div>
      {showImages ? <OrderDetailModal order={order} onClose={() => setShowImages(false)} onOrderChange={setOrder} /> : null}
    </PageShell>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) { return <section className="rounded-lg border border-sage bg-white p-4 shadow-soft"><h2 className="font-semibold">{title}</h2><div className="mt-4">{children}</div></section>; }
function InfoGrid({ items }: { items: [string, string][] }) { return <div className="grid gap-3 sm:grid-cols-2">{items.map(([label, value]) => <div key={label} className="min-w-0 rounded-lg bg-mist p-3"><p className="text-xs text-ink/55">{label}</p><p className="mt-1 break-words font-semibold">{value}</p></div>)}</div>; }
function financialLabel(status: SupplierOrder["financialStatus"]) { return ({ paid: "Payee", partially_refunded: "Partiellement remboursee", refunded: "Remboursee", dispute: "Litige en cours" })[status]; }

function OrderForm({ accounts, isSaving, onSave, order, products }: { accounts: SupplierAccount[]; isSaving: boolean; onSave: (input: Parameters<typeof confirmSupplierOrder>[1]) => void; order: SupplierOrder; products: SupplierProduct[] }) {
  const [form, setForm] = useState({ supplierUrl: order.supplierUrl, supplierOrderNumber: order.supplierOrderNumber, supplierAccountId: order.supplierAccountId ?? "", supplierProductId: order.supplierProductId ?? "", actualSupplierCost: order.actualSupplierCost ?? order.estimatedProductCost, supplierCurrency: order.supplierCurrency, orderedAt: `${getTodayIsoDate()}T12:00`, estimatedDeliveryAt: order.estimatedDeliveryAt ?? "", notes: order.notes });
  function selectProduct(id: string) { const product = products.find((item) => item.id === id); setForm((current) => ({ ...current, supplierProductId: id, supplierUrl: product?.supplierUrl ?? current.supplierUrl, actualSupplierCost: product?.usualCost ?? current.actualSupplierCost })); }
  return <Section title="Commander sur AliExpress"><InfoGrid items={[["Commande Etsy", `#${order.etsyOrderNumber}`], ["Montant recu", formatCurrency(order.transaction?.grossRevenue ?? 0)], ["Cout provisoire", formatCurrency(order.estimatedProductCost)]]} /><div className="mt-4 grid gap-3 sm:grid-cols-2"><SelectField label="Produit fournisseur" value={form.supplierProductId} onChange={selectProduct} options={[['', 'Lien libre'], ...products.filter((item) => item.isActive).map((item) => [item.id, item.internalName] as [string, string])]} /><Field label="Lien AliExpress" value={form.supplierUrl} onChange={(value) => setForm({ ...form, supplierUrl: value })} /><Field label="Numero AliExpress" value={form.supplierOrderNumber} onChange={(value) => setForm({ ...form, supplierOrderNumber: value })} /><SelectField label="Compte utilise" value={form.supplierAccountId} onChange={(value) => setForm({ ...form, supplierAccountId: value })} options={[['', 'Selectionner'], ...accounts.filter((item) => item.isActive).map((item) => [item.id, item.name] as [string, string])]} /><Field label="Cout reel paye" inputMode="decimal" value={String(form.actualSupplierCost).replace('.', ',')} onChange={(value) => setForm({ ...form, actualSupplierCost: Number(value.replace(',', '.')) || 0 })} /><Field label="Date de commande" type="datetime-local" value={form.orderedAt} onChange={(value) => setForm({ ...form, orderedAt: value })} /><Field label="Livraison estimee" type="date" value={form.estimatedDeliveryAt} onChange={(value) => setForm({ ...form, estimatedDeliveryAt: value })} /><Field label="Notes" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} /></div><button className="focus-ring mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isSaving || !form.supplierOrderNumber || !form.supplierAccountId} onClick={() => onSave(form)}><Save size={17} /> Confirmer la commande</button></Section>;
}

function ShipmentForm({ isSaving, onSave, order }: { isSaving: boolean; onSave: (input: Parameters<typeof addShipment>[1]) => void; order: SupplierOrder }) { const [form, setForm] = useState({ trackingNumber: order.trackingNumber, carrier: order.carrier, shippedAt: `${getTodayIsoDate()}T12:00`, estimatedDeliveryAt: order.estimatedDeliveryAt ?? "" }); return <Section title="Ajouter le suivi"><div className="grid gap-3 sm:grid-cols-2"><Field label="Numero de suivi" value={form.trackingNumber} onChange={(value) => setForm({ ...form, trackingNumber: value })} /><Field label="Transporteur" value={form.carrier} onChange={(value) => setForm({ ...form, carrier: value })} /><Field label="Date d'expedition" type="datetime-local" value={form.shippedAt} onChange={(value) => setForm({ ...form, shippedAt: value })} /><Field label="Livraison estimee" type="date" value={form.estimatedDeliveryAt} onChange={(value) => setForm({ ...form, estimatedDeliveryAt: value })} /></div><div className="mt-4 flex flex-wrap gap-2"><button className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isSaving || !form.trackingNumber} onClick={() => onSave(form)}><PackageCheck size={17} /> Enregistrer le suivi</button>{order.trackingNumber ? <button className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg border border-sage px-4 text-sm font-semibold" onClick={() => navigator.clipboard.writeText(order.trackingNumber)}><Clipboard size={17} /> Copier</button> : null}</div></Section>; }

function FinancialSection({ finalMargin, finalProfit, order, transaction }: { finalMargin: number; finalProfit: number; order: SupplierOrder; transaction: SupplierOrder["transaction"] }) { const variance = order.estimatedProductCost - (order.actualSupplierCost ?? order.estimatedProductCost); return <Section title="Resultat financier"><InfoGrid items={[["CA brut", formatCurrency(transaction?.grossRevenue ?? 0)], ["Frais Etsy", formatCurrency(transaction?.etsyFees ?? 0)], ["Cout provisoire", formatCurrency(order.estimatedProductCost)], ["Cout AliExpress reel", formatCurrency(order.actualSupplierCost ?? 0)], ["Ecart de cout", `${variance >= 0 ? 'Favorable +' : 'Defavorable '}${formatCurrency(Math.abs(variance))}`], ["Livraison fournisseur", formatCurrency(order.supplierShipping)], ["Remboursement client", formatCurrency(transaction?.refundAmount ?? 0)], ["Remboursement AliExpress", formatCurrency(transaction?.supplierRefundAmount ?? 0)], ["Benefice final", formatCurrency(finalProfit)], ["Marge finale", `${(finalMargin * 100).toFixed(1).replace('.', ',')} %`]]} /></Section>; }

function ProblemSection({ isSaving, onReport, onResolve, order, problems }: { isSaving: boolean; onReport: (input: { type: string; description: string; urgency: ProblemUrgency; nextAction: string; reminderAt: string }) => void; onResolve: (id: string, status: LogisticsStatus) => void; order: SupplierOrder; problems: SupplierOrderProblem[] }) { const active = problems[0]; const [form, setForm] = useState({ type: PROBLEM_TYPES[0], description: '', urgency: 'normal' as ProblemUrgency, nextAction: '', reminderAt: '' }); const [resolution, setResolution] = useState<LogisticsStatus>('ordered'); return <Section title="Problemes">{active ? <div className="rounded-lg border border-clay/40 bg-clay/10 p-4"><p className="flex items-center gap-2 font-semibold text-clay"><TriangleAlert size={18} />{active.type}</p><p className="mt-2 text-sm">{active.description || 'Aucune description'}</p><p className="mt-1 text-sm text-ink/60">Prochaine action : {active.nextAction || '-'}</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><SelectField label="Nouveau statut" value={resolution} onChange={(value) => setResolution(value as LogisticsStatus)} options={['ordered','shipped','delivered','cancelled','lost'].map((status) => [status, status] as [string,string])} /><button className="focus-ring h-11 self-end rounded-lg bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isSaving} onClick={() => onResolve(active.id, resolution)}>Resoudre le probleme</button></div></div> : <div className="grid gap-3 sm:grid-cols-2"><SelectField label="Type" value={form.type} onChange={(value) => setForm({ ...form, type: value })} options={PROBLEM_TYPES.map((type) => [type,type])} /><SelectField label="Urgence" value={form.urgency} onChange={(value) => setForm({ ...form, urgency: value as ProblemUrgency })} options={[["low","Faible"],["normal","Normal"],["urgent","Urgent"]]} /><Field label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} /><Field label="Prochaine action" value={form.nextAction} onChange={(value) => setForm({ ...form, nextAction: value })} /><Field label="Date de rappel" type="datetime-local" value={form.reminderAt} onChange={(value) => setForm({ ...form, reminderAt: value })} /><button className="focus-ring h-11 self-end rounded-lg border border-clay px-4 text-sm font-semibold text-clay disabled:opacity-60" disabled={isSaving} onClick={() => onReport(form)}>Signaler un probleme</button></div>}</Section>; }

function Field({ inputMode, label, onChange, type = 'text', value }: { inputMode?: 'decimal'; label: string; onChange: (value: string) => void; type?: string; value: string }) { return <label className="grid min-w-0 gap-2 text-sm font-medium text-ink/70">{label}<input className="focus-ring h-12 min-w-0 w-full rounded-lg border border-sage bg-mist px-3 text-base" inputMode={inputMode} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function SelectField({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: [string,string][]; value: string }) { return <label className="grid min-w-0 gap-2 text-sm font-medium text-ink/70">{label}<select className="focus-ring h-12 min-w-0 rounded-lg border border-sage bg-mist px-3 text-base" value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label>; }
