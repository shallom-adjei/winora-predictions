export function toLocalDateString(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function toISODateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getTodayStr(): string {
  return toISODateString(new Date());
}

export function getTomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toISODateString(d);
}