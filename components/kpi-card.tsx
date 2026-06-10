import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  tone = "neutral",
  onClick,
  ariaLabel
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  tone?: "neutral" | "positive" | "negative";
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const toneClass =
    tone === "positive" ? "text-moss" : tone === "negative" ? "text-clay" : "text-ink";
  const className = `rounded-lg border border-sage bg-white p-4 text-left shadow-soft ${
    onClick ? "focus-ring cursor-pointer transition hover:-translate-y-0.5 hover:border-moss" : ""
  }`;
  const content = (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink/65">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-mist text-moss">
          <Icon size={18} />
        </span>
      </div>
      <p className={`text-2xl font-semibold tracking-normal ${toneClass}`}>{value}</p>
      {trend ? <p className="mt-2 text-xs font-medium text-ink/55">{trend}</p> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick} aria-label={ariaLabel ?? label}>
        {content}
      </button>
    );
  }

  return (
    <article className={className}>
      {content}
    </article>
  );
}
