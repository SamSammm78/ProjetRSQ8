export function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2
  }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    maximumFractionDigits: 1
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}
