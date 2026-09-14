"use client";

import { useActionState, useRef } from "react";
import { createEinRecord, createLicense, createInsurancePolicy } from "@/lib/actions/records";

type ActionState = { error: string } | null;

const inputClass =
  "rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none";
const labelClass = "flex flex-col gap-1 text-xs font-medium text-zinc-600";

function ErrorBanner({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return <p className="text-xs text-red-600">{error}</p>;
}

export function AddEinForm({ entityId }: { entityId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => {
      try {
        await createEinRecord(entityId, formData);
        formRef.current?.reset();
        return null;
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Failed to save." };
      }
    },
    null
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <label className={labelClass}>
        EIN number
        <input name="ein_number" required className={inputClass} />
      </label>
      <label className={labelClass}>
        Legal name
        <input name="legal_name" className={inputClass} />
      </label>
      <label className={labelClass}>
        Issued date
        <input name="issued_date" type="date" className={inputClass} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add EIN record"}
      </button>
      <ErrorBanner error={state?.error} />
    </form>
  );
}

export function AddLicenseForm({ entityId }: { entityId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => {
      try {
        await createLicense(entityId, formData);
        formRef.current?.reset();
        return null;
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Failed to save." };
      }
    },
    null
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <label className={labelClass}>
        License type
        <input name="license_type" required className={inputClass} placeholder="e.g. Tobacco retail" />
      </label>
      <label className={labelClass}>
        License number
        <input name="license_number" className={inputClass} />
      </label>
      <label className={labelClass}>
        Issuing authority
        <input name="issuing_authority" className={inputClass} />
      </label>
      <label className={labelClass}>
        Issue date
        <input name="issue_date" type="date" className={inputClass} />
      </label>
      <label className={labelClass}>
        Expiration date
        <input name="expiration_date" type="date" className={inputClass} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add license"}
      </button>
      <ErrorBanner error={state?.error} />
    </form>
  );
}

export function AddInsuranceForm({ entityId }: { entityId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => {
      try {
        await createInsurancePolicy(entityId, formData);
        formRef.current?.reset();
        return null;
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Failed to save." };
      }
    },
    null
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <label className={labelClass}>
        Policy type
        <input name="policy_type" required className={inputClass} placeholder="e.g. General liability" />
      </label>
      <label className={labelClass}>
        Carrier
        <input name="carrier" className={inputClass} />
      </label>
      <label className={labelClass}>
        Policy number
        <input name="policy_number" className={inputClass} />
      </label>
      <label className={labelClass}>
        Coverage amount
        <input name="coverage_amount" type="number" step="0.01" className={inputClass} />
      </label>
      <label className={labelClass}>
        Effective date
        <input name="effective_date" type="date" className={inputClass} />
      </label>
      <label className={labelClass}>
        Expiration date
        <input name="expiration_date" type="date" className={inputClass} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add insurance policy"}
      </button>
      <ErrorBanner error={state?.error} />
    </form>
  );
}
