"use client";

import { Database, Download, RefreshCcw } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useClientData } from "@/components/client-data";

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

export default function SettingsPage() {
  const { transactions, resetData } = useClientData();

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
    <PageShell eyebrow="ProjetRSQ8" title="Parametres">
      <section className="grid gap-4 rounded-lg border border-sage bg-white p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-mist text-moss">
            <Database size={21} />
          </span>
          <div>
            <h2 className="font-semibold">Dashboard prive</h2>
            <p className="mt-1 text-sm text-ink/60">
              Donnees personnelles stockees dans ton espace projet.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Preference label="Devise" value="EUR" />
          <Preference label="Dates" value="ISO YYYY-MM-DD" />
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
          onClick={resetData}
        >
          <RefreshCcw size={18} />
          Reinitialiser les donnees
        </button>
      </section>

      <section className="rounded-lg border border-sage bg-white p-5 shadow-soft">
        <h2 className="font-semibold">Usage prive</h2>
        <p className="mt-2 text-sm leading-6 text-ink/65">
          L&apos;application ne contient plus de systeme de compte. Elle est pensee pour une
          utilisation personnelle avec tes boutiques, tes transactions et tes exports.
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
