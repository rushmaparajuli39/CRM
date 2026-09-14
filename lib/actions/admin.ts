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
