"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/current-user";
import { notifyAdminsOfCashSheetUpload } from "@/lib/notifications";

// Unlike EIN/license/insurance records, a cash sheet is meaningless
// without its file — so this is a single combined create+upload rather
// than the create-first-then-attach-document pattern those use. The
// caller (AddCashSheetForm) uploads to Storage client-side first (so RLS
// on storage.objects runs as the actual logged-in user), generating this
// same `id` up front via crypto.randomUUID() so the storage path can be
// built before the row exists.
export async function createCashSheet(
  id: string,
  entityId: string,
  period: string, // "YYYY-MM" from an <input type="month">
  documentPath: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("monthly_cash_sheets").insert({
    id,
    entity_id: entityId,
    period: `${period}-01`,
    document_url: documentPath,
    uploaded_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/entities/${entityId}`);
  revalidatePath("/dashboard");

  // Best-effort: a failed notification email shouldn't fail the upload
  // itself, and the admin dashboard's "recently uploaded" section covers
  // the same information in-app regardless of whether this succeeds.
  try {
    await notifyAdminsOfCashSheetUpload(entityId, period);
  } catch (e) {
    console.error("Failed to send cash sheet upload notification:", e);
  }
}

// Admin-only — same reasoning as deleteEntity: requireAdmin() here is
// defense-in-depth on top of the cash_sheets_delete RLS policy, which is
// the actual enforcement.
export async function deleteCashSheet(
  sheetId: string,
  entityId: string,
  documentUrl: string | null
) {
  await requireAdmin();
  const supabase = await createClient();

  if (documentUrl) {
    // Best-effort: an object that's already missing shouldn't block
    // deleting the row.
    await supabase.storage.from("documents").remove([documentUrl]);
  }

  const { error } = await supabase.from("monthly_cash_sheets").delete().eq("id", sheetId);
  if (error) throw new Error(error.message);

  revalidatePath(`/entities/${entityId}`);
  revalidatePath("/dashboard");
}
