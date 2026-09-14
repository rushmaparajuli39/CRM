"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type RecordTable = "ein_records" | "licenses" | "insurance_policies";

// Points a record's document_url column at a storage object path.
// The upload itself happens client-side (see DocumentUploader) so RLS on
// storage.objects is enforced against the actual logged-in user's session;
// this just persists the resulting path. Still RLS-protected: a non-admin
// caller's update is rejected at the database regardless of this action.
export async function attachDocument(
  table: RecordTable,
  recordId: string,
  entityId: string,
  storagePath: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(table)
    .update({ document_url: storagePath })
    .eq("id", recordId);

  if (error) throw new Error(error.message);

  revalidatePath(`/entities/${entityId}`);
}

// Bucket is private, so viewing a document means minting a short-lived
// signed URL rather than linking straight to it.
export async function getSignedDocumentUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 60);

  if (error) throw new Error(error.message);
  return data.signedUrl;
}
