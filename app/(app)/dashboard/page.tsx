import type { Metadata } from "next";
import { Building2, AlertTriangle, FileWarning, FileCheck2, Users } from "lucide-react";
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
import StatCard from "@/components/ui/StatCard";
import SectionHeader from "@/components/ui/SectionHeader";
import { previousMonthPeriod } from "@/lib/period";
import type { Entity } from "@/lib/database.types";

export const metadata: Metadata = { title: "Dashboard" };

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

  const [
    { data: entities },
    { data: licenses },
    { data: policies },
    { data: coveredSheets },
    { data: recentSheets },
    { count: staffCount },
  ] = await Promise.all([
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
    isAdmin
      ? supabase.from("profiles").select("id", { count: "exact", head: true })
      : Promise.resolve({ count: null }),
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Building2} label="Entities" value={entities?.length ?? 0} />
        <StatCard
          icon={AlertTriangle}
          label="Expiring soon"
          value={expiringItems.length}
          tone={expiringItems.length > 0 ? "warning" : "default"}
        />
        {isAdmin && (
          <>
            <StatCard
              icon={FileWarning}
              label="Missing cash sheets"
              value={missingCashSheets.length}
              tone={missingCashSheets.length > 0 ? "warning" : "default"}
            />
            <StatCard icon={Users} label="Staff accounts" value={staffCount ?? 0} />
          </>
        )}
      </div>

      <section>
        <SectionHeader
          icon={AlertTriangle}
          title="Expiring soon"
          subtitle="Licenses and insurance policies expiring within 60 days."
        />
        <div className="mt-4">
          <ExpirationAlerts items={expiringItems} />
        </div>
      </section>

      {isAdmin && (
        <section>
          <SectionHeader
            icon={FileWarning}
            title="Missing cash sheets"
            subtitle="Entities without a monthly cash sheet on file for last month."
          />
          <div className="mt-4">
            <MissingCashSheetsAlert items={missingCashSheets} period={cashSheetPeriod} />
          </div>
        </section>
      )}

      {isAdmin && (
        <section>
          <SectionHeader
            icon={FileCheck2}
            title="Recently uploaded cash sheets"
            subtitle="Uploaded in the last 14 days."
          />
          <div className="mt-4">
            <RecentCashSheetsAlert items={recentCashSheets} />
          </div>
        </section>
      )}

      <section>
        <SectionHeader icon={Building2} title="Entities" subtitle="Businesses you have access to." />
        <div className="mt-4">
          <EntityList entities={(entities ?? []) as Entity[]} />
        </div>
      </section>
    </div>
  );
}
