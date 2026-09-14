import Link from "next/link";
import { expiryUrgency, expiryLabel, expiryBadgeClasses } from "@/lib/expiration";

export interface ExpiringItem {
  id: string;
  entity_id: string;
  entity_name: string;
  kind: "License" | "Insurance";
  label: string;
  expiration_date: string;
}

export default function ExpirationAlerts({ items }: { items: ExpiringItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Nothing expiring in the next 60 days.
      </p>
    );
  }

  const sorted = [...items].sort(
    (a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime()
  );

  return (
    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
      {sorted.map((item) => {
        const urgency = expiryUrgency(item.expiration_date);
        return (
          <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <Link
                href={`/entities/${item.entity_id}`}
                className="truncate text-sm font-medium text-zinc-900 hover:underline"
              >
                {item.entity_name}
              </Link>
              <p className="truncate text-sm text-zinc-500">
                {item.kind}: {item.label} &middot; expires{" "}
                {new Date(item.expiration_date).toLocaleDateString()}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${expiryBadgeClasses(urgency)}`}
            >
              {expiryLabel(urgency)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
