import DocumentLink from "@/components/DocumentLink";
import DocumentUploader from "@/components/DocumentUploader";
import { expiryUrgency, expiryLabel, expiryBadgeClasses } from "@/lib/expiration";

type RecordTable = "ein_records" | "licenses" | "insurance_policies";

export default function RecordCard({
  entityId,
  table,
  recordId,
  title,
  subtitle,
  fields,
  expirationDate,
  documentUrl,
  canEdit,
}: {
  entityId: string;
  table: RecordTable;
  recordId: string;
  title: string;
  subtitle?: string | null;
  fields: { label: string; value: string | number | null }[];
  expirationDate?: string | null;
  documentUrl: string | null;
  canEdit: boolean;
}) {
  const urgency = expirationDate ? expiryUrgency(expirationDate) : null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
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

      <div className="mt-3 flex items-center gap-3">
        {documentUrl && <DocumentLink path={documentUrl} />}
        {canEdit && (
          <DocumentUploader entityId={entityId} table={table} recordId={recordId} />
        )}
      </div>
    </div>
  );
}
