import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  tone = "neutral"
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive" ? "text-moss" : tone === "negative" ? "text-clay" : "text-ink";

  return (
    <article className="rounded-lg border border-sage bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink/65">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-mist text-moss">
          <Icon size={18} />
        </span>
      </div>
      <p className={`text-2xl font-semibold tracking-normal ${toneClass}`}>{value}</p>
      {trend ? <p className="mt-2 text-xs font-medium text-ink/55">{trend}</p> : null}
    </article>
  );
}
