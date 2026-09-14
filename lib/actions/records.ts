"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function num(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  return v === null ? null : Number(v);
}

export async function createEinRecord(entityId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("ein_records").insert({
    entity_id: entityId,
    ein_number: str(formData, "ein_number") ?? "",
    legal_name: str(formData, "legal_name"),
    issued_date: str(formData, "issued_date"),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/entities/${entityId}`);
}

export async function createLicense(entityId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("licenses").insert({
    entity_id: entityId,
    license_type: str(formData, "license_type") ?? "",
    license_number: str(formData, "license_number"),
    issuing_authority: str(formData, "issuing_authority"),
    issue_date: str(formData, "issue_date"),
    expiration_date: str(formData, "expiration_date"),
    status: str(formData, "status") ?? "active",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/entities/${entityId}`);
}

export async function createInsurancePolicy(entityId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("insurance_policies").insert({
    entity_id: entityId,
    policy_type: str(formData, "policy_type") ?? "",
    carrier: str(formData, "carrier"),
    policy_number: str(formData, "policy_number"),
    coverage_amount: num(formData, "coverage_amount"),
    effective_date: str(formData, "effective_date"),
    expiration_date: str(formData, "expiration_date"),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/entities/${entityId}`);
}
