import Link from "next/link";
import { requireAdmin } from "@/lib/current-user";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { AuditLog, Entity } from "@/lib/database.types";

const PAGE_SIZE = 25;

const TABLE_LABEL: Record<string, string> = {
  entities: "Entity",
  ein_records: "EIN record",
  licenses: "License",
  insurance_policies: "Insurance policy",
};

const ACTION_CLASSES: Record<AuditLog["action"], string> = {
  create: "bg-green-50 text-green-700 border-green-200",
  update: "bg-blue-50 text-blue-700 border-blue-200",
  delete: "bg-red-50 text-red-700 border-red-200",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const admin = await createAdminClient();

  // Fetch one extra row so we know whether a next page exists, without
  // a separate (and on a growing log, slower) COUNT(*) query.
  const { data: rows } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE);

  const allRows = (rows as AuditLog[] | null) ?? [];
  const hasNext = allRows.length > PAGE_SIZE;
  const entries = allRows.slice(0, PAGE_SIZE);

  const entityIds = [...new Set(entries.map((e) => e.entity_id).filter((id): id is string => !!id))];
  const userIds = [...new Set(entries.map((e) => e.user_id).filter((id): id is string => !!id))];

  const [{ data: entities }, { data: profiles }, { data: authUsers }] = await Promise.all([
    entityIds.length > 0
      ? supabase.from("entities").select("id, name").in("id", entityIds)
      : Promise.resolve({ data: [] as Pick<Entity, "id" | "name">[] }),
    userIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    admin.auth.admin.listUsers(),
  ]);

  const entityNameById = new Map((entities ?? []).map((e) => [e.id, e.name]));
  const fullNameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const emailById = new Map(authUsers?.users.map((u) => [u.id, u.email ?? null]));

  function entityLabel(entry: AuditLog): string {
    if (!entry.entity_id) return "—";
    const liveName = entityNameById.get(entry.entity_id);
    if (liveName) return liveName;
    // The entity itself is gone (deleted). If this is the entity's own
    // delete event, the trigger captured its name in changed_fields —
    // use that instead of just an id.
    const nameFromDiff = entry.changed_fields?.name?.before;
    if (typeof nameFromDiff === "string") return `${nameFromDiff} (deleted)`;
    return "Deleted entity";
  }

  function actorLabel(entry: AuditLog): string {
    if (!entry.user_id) return "Unknown user";
    return fullNameById.get(entry.user_id) || emailById.get(entry.user_id) || "Unknown user";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900">Audit log</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Every create, edit, and delete across entities, EIN records, licenses, and insurance
          policies — recorded automatically at the database, newest first.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs font-medium uppercase text-zinc-400">
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Who</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Table</th>
              <th className="px-4 py-2">Entity</th>
              <th className="px-4 py-2">Changes</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-zinc-100 align-top last:border-0">
                <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                  {new Date(entry.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-zinc-700">{actorLabel(entry)}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${ACTION_CLASSES[entry.action]}`}
                  >
                    {entry.action}
                  </span>
                </td>
                <td className="px-4 py-2 text-zinc-700">
                  {TABLE_LABEL[entry.table_name] ?? entry.table_name}
                </td>
                <td className="px-4 py-2 text-zinc-700">
                  {entry.entity_id ? (
                    <Link href={`/entities/${entry.entity_id}`} className="hover:underline">
                      {entityLabel(entry)}
                    </Link>
                  ) : (
                    entityLabel(entry)
                  )}
                </td>
                <td className="px-4 py-2">
                  {Object.keys(entry.changed_fields ?? {}).length > 0 ? (
                    <details>
                      <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700">
                        {Object.keys(entry.changed_fields).length} field
                        {Object.keys(entry.changed_fields).length === 1 ? "" : "s"} changed
                      </summary>
                      <pre className="mt-1 max-w-xs overflow-x-auto rounded bg-zinc-50 p-2 text-xs text-zinc-600">
                        {JSON.stringify(entry.changed_fields, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <p className="px-4 py-6 text-sm text-zinc-500">No activity recorded yet.</p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        {page > 1 ? (
          <Link
            href={`/admin/audit-log?page=${page - 1}`}
            className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50"
          >
            ← Newer
          </Link>
        ) : (
          <span />
        )}
        <span className="text-zinc-400">Page {page}</span>
        {hasNext ? (
          <Link
            href={`/admin/audit-log?page=${page + 1}`}
            className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Older →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
