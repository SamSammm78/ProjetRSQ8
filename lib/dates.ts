const APP_TIME_ZONE = "Europe/Paris";

function getDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "1970",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    day: parts.find((part) => part.type === "day")?.value ?? "01"
  };
}

export function getTodayIsoDate() {
  const { year, month, day } = getDateParts(new Date());
  return `${year}-${month}-${day}`;
}

export function getMonthStartIsoDate(date = new Date()) {
  const { year, month } = getDateParts(date);
  return `${year}-${month}-01`;
}
