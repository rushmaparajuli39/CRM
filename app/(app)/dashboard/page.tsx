import { createClient } from "@/lib/supabase/server";
import EntityList from "@/components/EntityList";
import ExpirationAlerts, { type ExpiringItem } from "@/components/ExpirationAlerts";
import type { Entity } from "@/lib/database.types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 60);
  const horizonStr = horizon.toISOString().slice(0, 10);

  const [{ data: entities }, { data: licenses }, { data: policies }] = await Promise.all([
    supabase.from("entities").select("*").order("name"),
    supabase
      .from("licenses")
      .select("id, entity_id, license_type, expiration_date")
      .not("expiration_date", "is", null)
      .lte("expiration_date", horizonStr),
    supabase
      .from("insurance_policies")
      .select("id, entity_id, policy_type, expiration_date")
      .not("expiration_date", "is", null)
      .lte("expiration_date", horizonStr),
  ]);

  const entityNameById = new Map((entities ?? []).map((e) => [e.id, e.name]));

  const expiringItems: ExpiringItem[] = [
    ...(licenses ?? []).map((l) => ({
      id: l.id,
      entity_id: l.entity_id,
      entity_name: entityNameById.get(l.entity_id) ?? "Unknown entity",
      kind: "License" as const,
      label: l.license_type,
      expiration_date: l.expiration_date as string,
    })),
    ...(policies ?? []).map((p) => ({
      id: p.id,
      entity_id: p.entity_id,
      entity_name: entityNameById.get(p.entity_id) ?? "Unknown entity",
      kind: "Insurance" as const,
      label: p.policy_type,
      expiration_date: p.expiration_date as string,
    })),
  ];

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Expiring soon</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Licenses and insurance policies expiring within 60 days.
        </p>
        <div className="mt-4">
          <ExpirationAlerts items={expiringItems} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Entities</h2>
        <p className="mt-1 text-sm text-zinc-500">Businesses you have access to.</p>
        <div className="mt-4">
          <EntityList entities={(entities ?? []) as Entity[]} />
        </div>
      </section>
    </div>
  );
}
