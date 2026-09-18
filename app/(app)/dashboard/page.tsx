import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import EntityList from "@/components/EntityList";
import ExpirationAlerts, { type ExpiringItem } from "@/components/ExpirationAlerts";
import {
  MissingCashSheetsAlert,
  RecentCashSheetsAlert,
  type MissingCashSheetItem,
  type RecentCashSheetItem,
} from "@/components/CashSheetAlerts";
import { previousMonthPeriod } from "@/lib/period";
import type { Entity } from "@/lib/database.types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const current = await getCurrentUser();
  const isAdmin = current?.profile?.role === "admin";

  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 60);
  const horizonStr = horizon.toISOString().slice(0, 10);

  const cashSheetPeriod = previousMonthPeriod();
  const recentSince = new Date();
  recentSince.setDate(recentSince.getDate() - 14);

  const [{ data: entities }, { data: licenses }, { data: policies }, { data: coveredSheets }, { data: recentSheets }] =
    await Promise.all([
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
      isAdmin
        ? supabase.from("monthly_cash_sheets").select("entity_id").eq("period", cashSheetPeriod)
        : Promise.resolve({ data: null }),
      isAdmin
        ? supabase
            .from("monthly_cash_sheets")
            .select("id, entity_id, period, created_at")
            .gte("created_at", recentSince.toISOString())
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: null }),
    ]);

  const entityNameById = new Map((entities ?? []).map((e) => [e.id, e.name]));

  const coveredEntityIds = new Set((coveredSheets ?? []).map((s) => s.entity_id));
  const missingCashSheets: MissingCashSheetItem[] = (entities ?? [])
    .filter((e) => !coveredEntityIds.has(e.id))
    .map((e) => ({ entity_id: e.id, entity_name: e.name }));

  const recentCashSheets: RecentCashSheetItem[] = (recentSheets ?? []).map((s) => ({
    id: s.id,
    entity_id: s.entity_id,
    entity_name: entityNameById.get(s.entity_id) ?? "Unknown entity",
    period: s.period,
    created_at: s.created_at,
  }));

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

      {isAdmin && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-900">Missing cash sheets</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Entities without a monthly cash sheet on file for last month.
          </p>
          <div className="mt-4">
            <MissingCashSheetsAlert items={missingCashSheets} period={cashSheetPeriod} />
          </div>
        </section>
      )}

      {isAdmin && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-900">Recently uploaded cash sheets</h2>
          <p className="mt-1 text-sm text-zinc-500">Uploaded in the last 14 days.</p>
          <div className="mt-4">
            <RecentCashSheetsAlert items={recentCashSheets} />
          </div>
        </section>
      )}

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
