"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ListChecks } from "lucide-react";
import { getOrderAlerts, getOrderProblems, getSupplierSettings } from "@/lib/order-workflow";
import { getAllSupplierOrders } from "@/lib/supplier-orders";
import type { OrderAlert, SupplierOrder, SupplierOrderProblem, SupplierSettings } from "@/lib/types";

const DEFAULT_SETTINGS: SupplierSettings = { supplierOrderAlertHours: 12, supplierShippingAlertDays: 5, deliveryLateAlertDays: 0 };

export function DashboardRequiredActions() {
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [problems, setProblems] = useState<SupplierOrderProblem[]>([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    Promise.all([getAllSupplierOrders(), getOrderProblems(), getSupplierSettings()])
      .then(([nextOrders, nextProblems, nextSettings]) => { setOrders(nextOrders); setProblems(nextProblems); setSettings(nextSettings); })
      .catch(() => undefined);
  }, []);

  const rows = useMemo(() => {
    const counts: Record<OrderAlert["type"], number> = { to_order: 0, shipping_late: 0, delivery_late: 0, problem: 0, reminder: 0 };
    orders.forEach((order) => getOrderAlerts(order, settings, problems.filter((problem) => problem.orderId === order.id)).forEach((alert) => { counts[alert.type] += 1; }));
    return [
      { type: "to_order", count: counts.to_order, text: "ventes a commander sur AliExpress" },
      { type: "shipping_late", count: counts.shipping_late, text: "commandes non expediees en retard" },
      { type: "delivery_late", count: counts.delivery_late, text: "livraisons estimees depassees" },
      { type: "problem", count: counts.problem, text: "problemes a traiter" },
      { type: "reminder", count: counts.reminder, text: "rappels arrives a echeance" }
    ].filter((row) => row.count > 0);
  }, [orders, problems, settings]);

  return <section className="rounded-lg border border-sage bg-white shadow-soft">
    <div className="flex items-center gap-3 border-b border-sage p-4"><span className="grid h-10 w-10 place-items-center rounded-lg bg-mist text-moss"><ListChecks size={20} /></span><div><h2 className="font-semibold">Actions requises</h2><p className="text-sm text-ink/60">Suivi AliExpress prioritaire</p></div></div>
    <div className="divide-y divide-sage">{rows.length === 0 ? <p className="p-4 text-sm text-ink/60">Aucune action urgente.</p> : rows.map((row) => <Link key={row.type} className="focus-ring flex items-center justify-between gap-4 p-4 hover:bg-mist" href={`/commandes?filter=${row.type}`}><span><strong className="text-moss">{row.count}</strong> {row.text}</span><ArrowRight className="shrink-0 text-ink/45" size={18} /></Link>)}</div>
  </section>;
}
