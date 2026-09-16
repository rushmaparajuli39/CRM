import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { EinRecordCard, LicenseCard, InsuranceCard } from "@/components/RecordCard";
import { AddEinForm, AddLicenseForm, AddInsuranceForm } from "@/components/AddRecordForms";
import type { Entity, EinRecord, License, InsurancePolicy } from "@/lib/database.types";

const TYPE_LABEL: Record<Entity["business_type"], string> = {
  vape_shop: "Vape Shop",
  insurance_ops: "Insurance Ops",
  parlor: "Parlor",
};

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

  const [{ data: entity }, { data: einRecords }, { data: licenses }, { data: policies }] =
    await Promise.all([
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
    ]);

  // RLS makes this table return null rather than an error when the row is
  // inaccessible or doesn't exist — either way, show a 404.
  if (!entity) notFound();

  return (
    <div className="flex flex-col gap-10">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900">{entity.name}</h1>
          {entity.status === "closed" && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
              Closed
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {TYPE_LABEL[entity.business_type]}
          {entity.address ? ` · ${entity.address}` : ""}
        </p>
        {entity.notes && <p className="mt-2 text-sm text-zinc-600">{entity.notes}</p>}
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
    </div>
  );
}
