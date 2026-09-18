"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { createCashSheet, deleteCashSheet } from "@/lib/actions/cash-sheets";
import DocumentLink from "@/components/DocumentLink";
import { formatPeriodLabel } from "@/lib/period";
import type { MonthlyCashSheet } from "@/lib/database.types";

const inputClass =
  "rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none";
const labelClass = "flex flex-col gap-1 text-xs font-medium text-zinc-600";

export function CashSheetRow({
  entityId,
  sheet,
  uploaderName,
  canDelete,
}: {
  entityId: string;
  sheet: MonthlyCashSheet;
  uploaderName: string;
  canDelete: boolean;
}) {
  const [deleting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (
      !window.confirm(
        `Delete the cash sheet for ${formatPeriodLabel(sheet.period)}? This cannot be undone.`
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteCashSheet(sheet.id, entityId, sheet.document_url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete.");
      }
    });
  }

  return (
    <li className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-900">{formatPeriodLabel(sheet.period)}</p>
        <p className="text-xs text-zinc-500">
          Uploaded {new Date(sheet.created_at).toLocaleDateString()} by {uploaderName}
        </p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {sheet.document_url && <DocumentLink path={sheet.document_url} />}
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </li>
  );
}

export function AddCashSheetForm({ entityId }: { entityId: string }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const period = String(formData.get("period") || "");
    const file = formData.get("file") as File | null;
    if (!period || !file || file.size === 0) {
      setError("Pick a month and a file.");
      return;
    }

    setStatus("uploading");
    setError(null);

    try {
      const supabase = createClient();
      const id = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${entityId}/monthly_cash_sheets/${id}-${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      await createCashSheet(id, entityId, period, path);
      formRef.current?.reset();
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <label className={labelClass}>
        Month
        <input name="period" type="month" required className={inputClass} />
      </label>
      <label className={labelClass}>
        File (CSV, PDF, or photo)
        <input
          name="file"
          type="file"
          required
          accept=".csv,text/csv,image/*,application/pdf"
          capture="environment"
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        disabled={status === "uploading"}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {status === "uploading" ? "Uploading…" : "Add cash sheet"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
