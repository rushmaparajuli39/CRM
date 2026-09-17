"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/current-user";
import type { BusinessType, ProfileRole } from "@/lib/database.types";

export async function createEntity(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const name = String(formData.get("name") || "").trim();
  const business_type = String(formData.get("business_type") || "") as BusinessType;
  const address = String(formData.get("address") || "").trim() || null;

  if (!name || !business_type) throw new Error("Name and business type are required.");

  const { error } = await supabase.from("entities").insert({ name, business_type, address });
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

// Permanently deletes an entity and everything under it. ein_records/
// licenses/insurance_policies/user_entity_access all reference entities
// with `on delete cascade` (schema.sql), so the database rows go away on
// their own — but their attached documents are files in Storage, which
// no foreign key touches, so those are collected and removed explicitly
// first. Admin-only both here and at the database (entities_write and
// documents_delete in schema.sql/storage.sql only grant admins), and
// gated on typing the entity's exact current name so a slip of the
// mouse can't take out an entity's entire history.
export async function deleteEntity(entityId: string, confirmName: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: entity, error: fetchError } = await supabase
    .from("entities")
    .select("id, name")
    .eq("id", entityId)
    .single();
  if (fetchError || !entity) throw new Error("Entity not found.");

  if (confirmName !== entity.name) {
    throw new Error("The name you typed doesn't match this entity. Nothing was deleted.");
  }

  const [{ data: einRecords }, { data: licenses }, { data: policies }] = await Promise.all([
    supabase.from("ein_records").select("document_url").eq("entity_id", entityId),
    supabase.from("licenses").select("document_url").eq("entity_id", entityId),
    supabase.from("insurance_policies").select("document_url").eq("entity_id", entityId),
  ]);

  const documentPaths = [...(einRecords ?? []), ...(licenses ?? []), ...(policies ?? [])]
    .map((record) => record.document_url)
    .filter((url): url is string => Boolean(url));

  if (documentPaths.length > 0) {
    // Best-effort: an object that's already missing shouldn't block
    // deleting the entity.
    await supabase.storage.from("documents").remove(documentPaths);
  }

  const { error: deleteError } = await supabase.from("entities").delete().eq("id", entityId);
  if (deleteError) throw new Error(deleteError.message);

  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

export async function setUserRole(userId: string, role: ProfileRole) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function grantEntityAccess(userId: string, entityId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("user_entity_access")
    .insert({ user_id: userId, entity_id: entityId });
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function revokeEntityAccess(userId: string, entityId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("user_entity_access")
    .delete()
    .eq("user_id", userId)
    .eq("entity_id", entityId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

// Permanently removes a staff login. profiles and user_entity_access
// both reference auth.users(id) with `on delete cascade` (schema.sql),
// and audit_log.user_id uses `on delete set null` deliberately (a
// deleted user's past actions stay in the log, just unattributed) — so
// deleting the auth user here is the only step needed; nothing else to
// clean up by hand. Requires the service role key, same as creating a
// user. Blocks deleting your own account — that's very unlikely to be
// what was intended, and it's not reversible from inside the app.
export async function deleteStaffUser(userId: string) {
  const current = await requireAdmin();
  if (current.user.id === userId) {
    throw new Error("You can't delete your own account.");
  }

  const admin = await createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

// Creates a login for a new staff member. Requires the service role key
// (admin API), since regular sign-up is for self-service and we want
// admins to provision accounts directly. The new-user trigger in
// supabase/triggers.sql gives them a 'viewer' profile automatically.
export async function inviteStaffUser(formData: FormData) {
  await requireAdmin();

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const full_name = String(formData.get("full_name") || "").trim() || null;

  if (!email || !password) throw new Error("Email and a temporary password are required.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  const admin = await createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (error) throw new Error(error.message);

  if (full_name && data.user) {
    await admin.from("profiles").update({ full_name }).eq("id", data.user.id);
  }

  revalidatePath("/admin");
}
