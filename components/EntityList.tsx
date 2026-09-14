import Link from "next/link";
import type { Entity } from "@/lib/database.types";

const TYPE_LABEL: Record<Entity["business_type"], string> = {
  vape_shop: "Vape Shop",
  insurance_ops: "Insurance Ops",
  parlor: "Parlor",
};

export default function EntityList({ entities }: { entities: Entity[] }) {
  if (entities.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No entities are visible to your account yet. Ask an admin to grant access.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {entities.map((entity) => (
        <Link
          key={entity.id}
          href={`/entities/${entity.id}`}
          className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-400 hover:shadow"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-zinc-900">{entity.name}</h3>
            {entity.status === "closed" && (
              <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                Closed
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-500">{TYPE_LABEL[entity.business_type]}</p>
          {entity.address && (
            <p className="mt-2 text-xs text-zinc-400">{entity.address}</p>
          )}
        </Link>
      ))}
    </div>
  );
}
