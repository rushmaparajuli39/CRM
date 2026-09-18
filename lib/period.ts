// A monthly_cash_sheets "period" is always stored as the 1st of a month
// (e.g. "2026-08-01" for August 2026) — these helpers convert to/from
// that shape. Plain functions with no server-only imports, so both
// Server and Client Components can use them.

export function formatPeriodLabel(period: string): string {
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// The previous calendar month's period, as "YYYY-MM-01".
export function previousMonthPeriod(from = new Date()): string {
  const prev = new Date(from.getFullYear(), from.getMonth() - 1, 1);
  const mm = String(prev.getMonth() + 1).padStart(2, "0");
  return `${prev.getFullYear()}-${mm}-01`;
}
