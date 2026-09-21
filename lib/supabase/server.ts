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

// Used only for resetPasswordForEmail. createClient() above (@supabase/ssr's
// createServerClient) hardcodes `flowType: "pkce"` internally and ignores
// any override passed in — it's spread after the caller's own auth
// options in @supabase/ssr's source, so passing flowType there silently
// does nothing. PKCE ties the emailed link's `?code=` to a code_verifier
// cookie on whichever browser submitted the request, which fails with
// "code verifier not found in storage" the moment the link is opened on
// a different device — the normal case for an emailed link. This call
// needs no cookies or session at all (it's a one-off, unauthenticated
// request), so it bypasses @supabase/ssr entirely for a plain client,
// where flowType is actually respected — implicit is in fact
// @supabase/auth-js's own default, so this is spelled out for clarity
// rather than to override anything.
export async function createPasswordResetClient() {
  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false } }
  );
}
