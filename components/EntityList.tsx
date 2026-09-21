"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Entity } from "@/lib/database.types";

export default function EntityList({ entities }: { entities: Entity[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entities;
    return entities.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.business_type.toLowerCase().includes(q) ||
        (e.address ?? "").toLowerCase().includes(q)
    );
  }, [entities, query]);

  if (entities.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No entities are visible to your account yet. Ask an admin to grant access.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {entities.length > 5 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entities by name, type, or address…"
          className="w-full max-w-sm rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
        />
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">No entities match &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entity) => (
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
              <p className="mt-1 text-sm text-zinc-500">{entity.business_type}</p>
              {entity.address && (
                <p className="mt-2 text-xs text-zinc-400">{entity.address}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
