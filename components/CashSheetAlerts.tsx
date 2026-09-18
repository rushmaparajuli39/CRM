import Link from "next/link";
import { formatPeriodLabel } from "@/lib/period";

export interface MissingCashSheetItem {
  entity_id: string;
  entity_name: string;
}

export function MissingCashSheetsAlert({
  items,
  period,
}: {
  items: MissingCashSheetItem[];
  period: string;
}) {
  const label = formatPeriodLabel(period);

  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">Every entity has a cash sheet on file for {label}.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
      {items.map((item) => (
        <li key={item.entity_id} className="flex items-center justify-between gap-4 px-4 py-3">
          <Link
            href={`/entities/${item.entity_id}`}
            className="truncate text-sm font-medium text-zinc-900 hover:underline"
          >
            {item.entity_name}
          </Link>
          <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            Missing {label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export interface RecentCashSheetItem {
  id: string;
  entity_id: string;
  entity_name: string;
  period: string;
  created_at: string;
}

export function RecentCashSheetsAlert({ items }: { items: RecentCashSheetItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">No cash sheets uploaded in the last 14 days.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <Link
              href={`/entities/${item.entity_id}`}
              className="truncate text-sm font-medium text-zinc-900 hover:underline"
            >
              {item.entity_name}
            </Link>
            <p className="truncate text-sm text-zinc-500">{formatPeriodLabel(item.period)}</p>
          </div>
          <span className="shrink-0 text-xs text-zinc-400">
            {new Date(item.created_at).toLocaleDateString()}
          </span>
        </li>
      ))}
    </ul>
  );
}
