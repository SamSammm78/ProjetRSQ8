"use client";

import { Download, RefreshCcw, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useClientData } from "@/components/client-data";
import { DEMO_USER_EMAIL } from "@/data/seed";

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

export default function SettingsPage() {
  const { transactions, resetDemo } = useClientData();

  function downloadCsv() {
    const csv = toCsv(transactions as unknown as Record<string, unknown>[]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "etsy-transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageShell eyebrow="Compte" title="Parametres">
      <section className="grid gap-4 rounded-lg border border-sage bg-white p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-mist text-moss">
            <ShieldCheck size={21} />
          </span>
          <div>
            <h2 className="font-semibold">Compte demo</h2>
            <p className="mt-1 text-sm text-ink/60">{DEMO_USER_EMAIL}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Preference label="Devise" value="EUR" />
          <Preference label="Dates" value="ISO YYYY-MM-DD" />
          <Preference label="Paiement SaaS" value="Stripe prevu" />
        </div>
      </section>

      <section className="grid gap-3 rounded-lg border border-sage bg-white p-5 shadow-soft sm:grid-cols-2">
        <button
          className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-sage px-4 font-semibold"
          onClick={downloadCsv}
        >
          <Download size={18} />
          Export CSV
        </button>
        <button
          className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-sage px-4 font-semibold text-clay"
          onClick={resetDemo}
        >
          <RefreshCcw size={18} />
          Reinitialiser la demo
        </button>
      </section>

      <section className="rounded-lg border border-sage bg-white p-5 shadow-soft">
        <h2 className="font-semibold">Securite des donnees</h2>
        <p className="mt-2 text-sm leading-6 text-ink/65">
          En production, chaque requete filtre par utilisateur et les policies Supabase RLS
          empechent l&apos;acces aux boutiques et transactions d&apos;un autre compte.
        </p>
      </section>
    </PageShell>
  );
}

function Preference({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-mist p-4">
      <p className="text-xs font-medium uppercase tracking-normal text-ink/55">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
