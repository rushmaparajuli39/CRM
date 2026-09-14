import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import RecordCard from "@/components/RecordCard";
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
  const isAdmin = current?.profile?.role === "admin";

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
            <RecordCard
              key={rec.id}
              entityId={id}
              table="ein_records"
              recordId={rec.id}
              title={rec.ein_number}
              subtitle={rec.legal_name}
              fields={[{ label: "Issued", value: rec.issued_date }]}
              documentUrl={rec.document_url}
              canEdit={isAdmin}
            />
          ))}
          {(!einRecords || einRecords.length === 0) && (
            <p className="text-sm text-zinc-500">No EIN records yet.</p>
          )}
        </div>
        {isAdmin && <AddEinForm entityId={id} />}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900">Licenses</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(licenses as License[] | null)?.map((lic) => (
            <RecordCard
              key={lic.id}
              entityId={id}
              table="licenses"
              recordId={lic.id}
              title={lic.license_type}
              subtitle={lic.license_number}
              fields={[
                { label: "Authority", value: lic.issuing_authority },
                { label: "Issued", value: lic.issue_date },
                { label: "Expires", value: lic.expiration_date },
                { label: "Status", value: lic.status },
              ]}
              expirationDate={lic.expiration_date}
              documentUrl={lic.document_url}
              canEdit={isAdmin}
            />
          ))}
          {(!licenses || licenses.length === 0) && (
            <p className="text-sm text-zinc-500">No licenses yet.</p>
          )}
        </div>
        {isAdmin && <AddLicenseForm entityId={id} />}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900">Insurance policies</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(policies as InsurancePolicy[] | null)?.map((pol) => (
            <RecordCard
              key={pol.id}
              entityId={id}
              table="insurance_policies"
              recordId={pol.id}
              title={pol.policy_type}
              subtitle={pol.carrier}
              fields={[
                { label: "Policy #", value: pol.policy_number },
                { label: "Coverage", value: pol.coverage_amount },
                { label: "Effective", value: pol.effective_date },
                { label: "Expires", value: pol.expiration_date },
              ]}
              expirationDate={pol.expiration_date}
              documentUrl={pol.document_url}
              canEdit={isAdmin}
            />
          ))}
          {(!policies || policies.length === 0) && (
            <p className="text-sm text-zinc-500">No insurance policies yet.</p>
          )}
        </div>
        {isAdmin && <AddInsuranceForm entityId={id} />}
      </section>
    </div>
  );
}
