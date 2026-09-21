"use server";

import { redirect } from "next/navigation";
import { createClient, createPasswordResetClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export async function signIn(_prevState: { error: string } | null, formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");

  if (!email || !password) {
    return { error: "Enter both an email and a password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Sends a password-reset email to whatever address is given. Supabase's
// resetPasswordForEmail already reports success regardless of whether the
// address has an account (so this can't be used to find out who's a real
// staff email and who isn't) — real failures (rate limiting, a Supabase
// outage) still throw normally.
export async function sendPasswordResetEmail(email: string) {
  const supabase = await createPasswordResetClient();
  const siteUrl = await getSiteUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/reset-password`,
  });
  if (error) throw new Error(error.message);
}

// Form-compatible wrapper for the public /forgot-password page.
export async function requestPasswordReset(
  _prevState: { error: string } | { success: true } | null,
  formData: FormData
) {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "Enter your email address." };

  try {
    await sendPasswordResetEmail(email);
    return { success: true as const };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send reset email." };
  }
}
