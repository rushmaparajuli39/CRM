"use client";

import { useActionState, useState, useTransition } from "react";
import DocumentLink from "@/components/DocumentLink";
import DocumentUploader from "@/components/DocumentUploader";
import { expiryUrgency, expiryLabel, expiryBadgeClasses } from "@/lib/expiration";
import {
  updateEinRecord,
  updateLicense,
  updateInsurancePolicy,
  deleteEinRecord,
  deleteLicense,
  deleteInsurancePolicy,
} from "@/lib/actions/records";
import type { EinRecord, License, InsurancePolicy } from "@/lib/database.types";

type ActionState = { error: string } | null;

const inputClass =
  "rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none";
const labelClass = "flex flex-col gap-1 text-xs font-medium text-zinc-600";

function ErrorBanner({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return <p className="w-full text-xs text-red-600">{error}</p>;
}

function CardShell({
  title,
  subtitle,
  urgency,
  children,
}: {
  title: string;
  subtitle?: string | null;
  urgency?: ReturnType<typeof expiryUrgency>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-medium text-zinc-900">{title}</h4>
          {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
        </div>
        {urgency && (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${expiryBadgeClasses(urgency)}`}
          >
            {expiryLabel(urgency)}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function FieldList({ fields }: { fields: { label: string; value: string | number | null }[] }) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {fields
        .filter((f) => f.value !== null && f.value !== "")
        .map((f) => (
          <div key={f.label} className="contents">
            <dt className="text-zinc-400">{f.label}</dt>
            <dd className="text-zinc-700">{f.value}</dd>
          </div>
        ))}
    </dl>
  );
}

function ViewActions({
  documentUrl,
  canEdit,
  entityId,
  table,
  recordId,
  onEdit,
  onDelete,
  deleting,
}: {
  documentUrl: string | null;
  canEdit: boolean;
  entityId: string;
  table: "ein_records" | "licenses" | "insurance_policies";
  recordId: string;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      {documentUrl && <DocumentLink path={documentUrl} />}
      {canEdit && <DocumentUploader entityId={entityId} table={table} recordId={recordId} />}
      {canEdit && (
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onEdit}
            className="text-xs font-medium text-zinc-600 hover:underline"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}

function useDelete(
  deleteFn: (recordId: string, entityId: string, documentUrl: string | null) => Promise<void>,
  recordId: string,
  entityId: string,
  documentUrl: string | null,
  confirmLabel: string
) {
  const [deleting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const onDelete = () => {
    if (!window.confirm(`Delete ${confirmLabel}? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteFn(recordId, entityId, documentUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete.");
      }
    });
  };
  return { deleting, error, onDelete };
}

export function EinRecordCard({
  entityId,
  record,
  canEdit,
}: {
  entityId: string;
  record: EinRecord;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const { deleting, error: deleteError, onDelete } = useDelete(
    deleteEinRecord,
    record.id,
    entityId,
    record.document_url,
    `EIN record "${record.ein_number}"`
  );
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => {
      try {
        await updateEinRecord(record.id, entityId, formData);
        setEditing(false);
        return null;
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Failed to save." };
      }
    },
    null
  );

  if (editing) {
    return (
      <CardShell title={record.ein_number} subtitle={record.legal_name}>
        <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
          <label className={labelClass}>
            EIN number
            <input name="ein_number" required defaultValue={record.ein_number} className={inputClass} />
          </label>
          <label className={labelClass}>
            Legal name
            <input name="legal_name" defaultValue={record.legal_name ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Issued date
            <input
              name="issued_date"
              type="date"
              defaultValue={record.issued_date ?? ""}
              className={inputClass}
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
          <ErrorBanner error={state?.error} />
        </form>
        <div className="mt-3 flex items-center gap-3">
          {record.document_url && <DocumentLink path={record.document_url} />}
          <DocumentUploader entityId={entityId} table="ein_records" recordId={record.id} />
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell title={record.ein_number} subtitle={record.legal_name}>
      <FieldList fields={[{ label: "Issued", value: record.issued_date }]} />
      <ViewActions
        documentUrl={record.document_url}
        canEdit={canEdit}
        entityId={entityId}
        table="ein_records"
        recordId={record.id}
        onEdit={() => setEditing(true)}
        onDelete={onDelete}
        deleting={deleting}
      />
      <ErrorBanner error={deleteError} />
    </CardShell>
  );
}

export function LicenseCard({
  entityId,
  record,
  canEdit,
}: {
  entityId: string;
  record: License;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const { deleting, error: deleteError, onDelete } = useDelete(
    deleteLicense,
    record.id,
    entityId,
    record.document_url,
    `license "${record.license_type}"`
  );
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => {
      try {
        await updateLicense(record.id, entityId, formData);
        setEditing(false);
        return null;
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Failed to save." };
      }
    },
    null
  );

  const urgency = record.expiration_date ? expiryUrgency(record.expiration_date) : null;

  if (editing) {
    return (
      <CardShell title={record.license_type} subtitle={record.license_number}>
        <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
          <label className={labelClass}>
            License type
            <input
              name="license_type"
              required
              defaultValue={record.license_type}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            License number
            <input
              name="license_number"
              defaultValue={record.license_number ?? ""}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Issuing authority
            <input
              name="issuing_authority"
              defaultValue={record.issuing_authority ?? ""}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Issue date
            <input
              name="issue_date"
              type="date"
              defaultValue={record.issue_date ?? ""}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Expiration date
            <input
              name="expiration_date"
              type="date"
              defaultValue={record.expiration_date ?? ""}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Status
            <input name="status" defaultValue={record.status ?? "active"} className={inputClass} />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
          <ErrorBanner error={state?.error} />
        </form>
        <div className="mt-3 flex items-center gap-3">
          {record.document_url && <DocumentLink path={record.document_url} />}
          <DocumentUploader entityId={entityId} table="licenses" recordId={record.id} />
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell title={record.license_type} subtitle={record.license_number} urgency={urgency}>
      <FieldList
        fields={[
          { label: "Authority", value: record.issuing_authority },
          { label: "Issued", value: record.issue_date },
          { label: "Expires", value: record.expiration_date },
          { label: "Status", value: record.status },
        ]}
      />
      <ViewActions
        documentUrl={record.document_url}
        canEdit={canEdit}
        entityId={entityId}
        table="licenses"
        recordId={record.id}
        onEdit={() => setEditing(true)}
        onDelete={onDelete}
        deleting={deleting}
      />
      <ErrorBanner error={deleteError} />
    </CardShell>
  );
}

export function InsuranceCard({
  entityId,
  record,
  canEdit,
}: {
  entityId: string;
  record: InsurancePolicy;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const { deleting, error: deleteError, onDelete } = useDelete(
    deleteInsurancePolicy,
    record.id,
    entityId,
    record.document_url,
    `insurance policy "${record.policy_type}"`
  );
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => {
      try {
        await updateInsurancePolicy(record.id, entityId, formData);
        setEditing(false);
        return null;
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Failed to save." };
      }
    },
    null
  );

  const urgency = record.expiration_date ? expiryUrgency(record.expiration_date) : null;

  if (editing) {
    return (
      <CardShell title={record.policy_type} subtitle={record.carrier}>
        <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
          <label className={labelClass}>
            Policy type
            <input name="policy_type" required defaultValue={record.policy_type} className={inputClass} />
          </label>
          <label className={labelClass}>
            Carrier
            <input name="carrier" defaultValue={record.carrier ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Policy number
            <input
              name="policy_number"
              defaultValue={record.policy_number ?? ""}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Coverage amount
            <input
              name="coverage_amount"
              type="number"
              step="0.01"
              defaultValue={record.coverage_amount ?? ""}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Effective date
            <input
              name="effective_date"
              type="date"
              defaultValue={record.effective_date ?? ""}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Expiration date
            <input
              name="expiration_date"
              type="date"
              defaultValue={record.expiration_date ?? ""}
              className={inputClass}
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
          <ErrorBanner error={state?.error} />
        </form>
        <div className="mt-3 flex items-center gap-3">
          {record.document_url && <DocumentLink path={record.document_url} />}
          <DocumentUploader entityId={entityId} table="insurance_policies" recordId={record.id} />
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell title={record.policy_type} subtitle={record.carrier} urgency={urgency}>
      <FieldList
        fields={[
          { label: "Policy #", value: record.policy_number },
          { label: "Coverage", value: record.coverage_amount },
          { label: "Effective", value: record.effective_date },
          { label: "Expires", value: record.expiration_date },
        ]}
      />
      <ViewActions
        documentUrl={record.document_url}
        canEdit={canEdit}
        entityId={entityId}
        table="insurance_policies"
        recordId={record.id}
        onEdit={() => setEditing(true)}
        onDelete={onDelete}
        deleting={deleting}
      />
      <ErrorBanner error={deleteError} />
    </CardShell>
  );
}
