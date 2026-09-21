import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

// For use in Server Components, Server Actions and Route Handlers.
// Respects RLS — runs as the logged-in user via their session cookie.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      // PKCE (the @supabase/ssr default) ties resetPasswordForEmail's
      // link to a code_verifier cookie on whichever browser submitted
      // the request — but a password-reset email is almost always
      // opened on a different device (phone Mail app vs. the desktop
      // browser that asked for it), so PKCE fails there with "code
      // verifier not found in storage". This app has no OAuth or public
      // sign-up (the only other flowType-gated methods), so switching to
      // implicit is safe here and makes the recovery link self-contained
      // — no matching local state required on either end.
      auth: { flowType: "implicit" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — the middleware refreshes
            // the session instead, so this can be safely ignored.
          }
        },
      },
    }
  );
}

// Bypasses RLS entirely. Server-only — never import this from a Client
// Component, and never expose SUPABASE_SECRET_KEY to the browser. Used
// only for admin actions like creating new staff logins.
export async function createAdminClient() {
  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
