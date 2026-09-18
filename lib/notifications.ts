import { createAdminClient } from "@/lib/supabase/server";
import { sendMail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import { formatPeriodLabel } from "@/lib/period";

// Resolves every admin's email via the auth admin API — profiles has no
// email column of its own (that lives on auth.users), same lookup the
// Admin panel already does to show staff emails.
export async function getAdminEmails(): Promise<string[]> {
  const admin = await createAdminClient();
  const [{ data: admins }, { data: authUsers }] = await Promise.all([
    admin.from("profiles").select("id").eq("role", "admin"),
    admin.auth.admin.listUsers(),
  ]);

  const adminIds = new Set((admins ?? []).map((a) => a.id));
  return (authUsers?.users ?? [])
    .filter((u) => adminIds.has(u.id) && u.email)
    .map((u) => u.email as string);
}

// Fired right after a cash sheet is uploaded, so admins know one came in
// without having to go check each entity manually. Best-effort — the
// caller doesn't let a failed email fail the upload itself.
export async function notifyAdminsOfCashSheetUpload(entityId: string, period: string) {
  const admin = await createAdminClient();
  const [{ data: entity }, emails] = await Promise.all([
    admin.from("entities").select("name").eq("id", entityId).single(),
    getAdminEmails(),
  ]);
  if (emails.length === 0) return;

  const siteUrl = await getSiteUrl();
  const label = formatPeriodLabel(period);
  const entityName = entity?.name ?? "an entity";

  await sendMail({
    to: emails,
    subject: `Cash sheet uploaded — ${entityName} (${label})`,
    text: `A monthly cash sheet was just uploaded for ${entityName}, period ${label}.\n\nView it: ${siteUrl}/entities/${entityId}`,
  });
}

// Fired by the monthly cron job (see app/api/cron/missing-cash-sheets).
export async function notifyAdminsOfMissingCashSheets(
  missing: { entityId: string; entityName: string }[],
  period: string
) {
  if (missing.length === 0) return;
  const emails = await getAdminEmails();
  if (emails.length === 0) return;

  const siteUrl = await getSiteUrl();
  const label = formatPeriodLabel(period);
  const list = missing.map((m) => `- ${m.entityName}: ${siteUrl}/entities/${m.entityId}`).join("\n");

  await sendMail({
    to: emails,
    subject: `Missing cash sheets for ${label} (${missing.length} ${missing.length === 1 ? "entity" : "entities"})`,
    text: `The following entities are missing their cash sheet for ${label}:\n\n${list}`,
  });
}
