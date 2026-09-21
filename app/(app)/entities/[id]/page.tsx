import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { EinRecordCard, LicenseCard, InsuranceCard } from "@/components/RecordCard";
import { AddEinForm, AddLicenseForm, AddInsuranceForm } from "@/components/AddRecordForms";
import { CashSheetRow, AddCashSheetForm } from "@/components/CashSheets";
import DeleteEntityButton from "@/components/DeleteEntityButton";
import { expiryUrgency } from "@/lib/expiration";
import type {
  Entity,
  EinRecord,
  License,
  InsurancePolicy,
  MonthlyCashSheet,
} from "@/lib/database.types";

export default async function EntityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const current = await getCurrentUser();
  const role = current?.profile?.role;
  // Reaching this page at all already means RLS granted access to this
  // entity (admin, or a viewer/editor with a grant) — so whether this
  // user can write here comes down to their role alone.
  const canWrite = role === "admin" || role === "editor";
  // Deleting the entity itself (not just records within it) is admin-only
  // — editors are scoped to records on entities they're granted, never the
  // entity's own lifecycle.
  const isAdmin = role === "admin";

  const [
    { data: entity },
    { data: einRecords },
    { data: licenses },
    { data: policies },
    { data: cashSheets },
  ] = await Promise.all([
    supabase.from("entities").select("*").eq("id", id).single<Entity>(),
    supabase
      .from("ein_records")
      .select("*")
      .eq("entity_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("licenses")
      .select("*")
      .eq("entity_id", id)
      .order("expiration_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("insurance_policies")
      .select("*")
      .eq("entity_id", id)
      .order("expiration_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("monthly_cash_sheets")
      .select("*")
      .eq("entity_id", id)
      .order("period", { ascending: false }),
  ]);

  // RLS makes this table return null rather than an error when the row is
  // inaccessible or doesn't exist — either way, show a 404.
  if (!entity) notFound();

  // "Uploaded by" needs to show whoever uploaded each sheet, not just the
  // current viewer — profiles_select only lets a non-admin read their own
  // row, so resolving other people's names here goes through the admin
  // client (display-name lookup only, no secret ever reaches the client).
  const sheets = (cashSheets as MonthlyCashSheet[] | null) ?? [];
  const uploaderIds = [...new Set(sheets.map((s) => s.uploaded_by).filter((v): v is string => Boolean(v)))];
  let uploaderNameById = new Map<string, string>();
  if (uploaderIds.length > 0) {
    const admin = await createAdminClient();
    const { data: uploaders } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", uploaderIds);
    uploaderNameById = new Map((uploaders ?? []).map((u) => [u.id, u.full_name ?? "Staff member"]));
  }

  const einCount = einRecords?.length ?? 0;
  const licenseCount = licenses?.length ?? 0;
  const policyCount = policies?.length ?? 0;
  const expiringCount = [...(licenses ?? []), ...(policies ?? [])].filter(
    (r) => expiryUrgency(r.expiration_date) !== null
  ).length;
  const hasCashSheetThisMonth = sheets.some(
    (s) => s.period.slice(0, 7) === new Date().toISOString().slice(0, 7)
  );

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Back to dashboard
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900">{entity.name}</h1>
          {entity.status === "closed" && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
              Closed
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {entity.business_type}
          {entity.address ? ` · ${entity.address}` : ""}
        </p>
        {entity.notes && <p className="mt-2 text-sm text-zinc-600">{entity.notes}</p>}

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-zinc-100 px-2 py-1 font-medium text-zinc-600">
            {einCount} EIN {einCount === 1 ? "record" : "records"}
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-1 font-medium text-zinc-600">
            {licenseCount} {licenseCount === 1 ? "license" : "licenses"}
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-1 font-medium text-zinc-600">
            {policyCount} insurance {policyCount === 1 ? "policy" : "policies"}
          </span>
          {expiringCount > 0 && (
            <span className="rounded-full bg-orange-100 px-2 py-1 font-medium text-orange-800">
              {expiringCount} expiring soon
            </span>
          )}
          <span
            className={`rounded-full px-2 py-1 font-medium ${
              hasCashSheetThisMonth
                ? "bg-green-100 text-green-800"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {hasCashSheetThisMonth ? "Cash sheet on file this month" : "No cash sheet this month yet"}
          </span>
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900">EIN records</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(einRecords as EinRecord[] | null)?.map((rec) => (
            <EinRecordCard key={rec.id} entityId={id} record={rec} canEdit={canWrite} />
          ))}
          {(!einRecords || einRecords.length === 0) && (
            <p className="text-sm text-zinc-500">No EIN records yet.</p>
          )}
        </div>
        {canWrite && <AddEinForm entityId={id} />}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900">Licenses</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(licenses as License[] | null)?.map((lic) => (
            <LicenseCard key={lic.id} entityId={id} record={lic} canEdit={canWrite} />
          ))}
          {(!licenses || licenses.length === 0) && (
            <p className="text-sm text-zinc-500">No licenses yet.</p>
          )}
        </div>
        {canWrite && <AddLicenseForm entityId={id} />}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900">Insurance policies</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(policies as InsurancePolicy[] | null)?.map((pol) => (
            <InsuranceCard key={pol.id} entityId={id} record={pol} canEdit={canWrite} />
          ))}
          {(!policies || policies.length === 0) && (
            <p className="text-sm text-zinc-500">No insurance policies yet.</p>
          )}
        </div>
        {canWrite && <AddInsuranceForm entityId={id} />}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900">Monthly cash sheets</h2>
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {sheets.map((sheet) => (
            <CashSheetRow
              key={sheet.id}
              entityId={id}
              sheet={sheet}
              uploaderName={
                sheet.uploaded_by ? uploaderNameById.get(sheet.uploaded_by) ?? "Staff member" : "Unknown"
              }
              canDelete={isAdmin}
            />
          ))}
          {sheets.length === 0 && (
            <li className="px-4 py-3 text-sm text-zinc-500">No cash sheets uploaded yet.</li>
          )}
        </ul>
        {canWrite && <AddCashSheetForm entityId={id} />}
      </section>

      {isAdmin && (
        <section>
          <DeleteEntityButton entityId={id} entityName={entity.name} />
        </section>
      )}
    </div>
  );
}
