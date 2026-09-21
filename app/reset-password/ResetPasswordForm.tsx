"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Supabase can deliver a recovery link in more than one shape depending
// on the project's auth settings: a `#access_token=...&type=recovery`
// hash (the classic flow — the browser client picks this up on its own
// the moment it's constructed), or a `?code=...` query param (PKCE —
// has to be exchanged explicitly). It can also redirect here with
// `?error=...&error_description=...` instead of either, when the link
// itself was already used or has expired. This component checks for
// all three up front, before showing the form, instead of only finding
// out something's wrong once the user has typed a password and hit
// submit.
function friendlyLinkError(description: string | null): string {
  if (description) return decodeURIComponent(description.replace(/\+/g, " "));
  return "This reset link is invalid or has expired. Request a new one from the sign-in page.";
}

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function verifyLink() {
      const params = new URLSearchParams(window.location.search);
      const errorDescription = params.get("error_description");
      if (params.get("error")) {
        setError(friendlyLinkError(errorDescription));
        setChecking(false);
        return;
      }

      const supabase = createClient();
      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(friendlyLinkError(exchangeError.message));
          setChecking(false);
          return;
        }
      }

      // Covers the hash-based flow too — detectSessionInUrl already ran
      // when createClient() constructed the browser client above.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError(friendlyLinkError(null));
      } else {
        setReady(true);
      }
      setChecking(false);
    }

    verifyLink();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      // updateUser() leaves the recovery session active — sign out so
      // the user lands on /login and actually authenticates with the
      // new password, rather than being silently carried into the app.
      await supabase.auth.signOut();

      setDone(true);
      setTimeout(() => router.push("/login?reset=success"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update your password.");
    } finally {
      setPending(false);
    }
  }

  if (checking) {
    return <p className="text-sm text-zinc-500">Checking your reset link…</p>;
  }

  if (done) {
    return (
      <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
        Password updated — taking you to sign in…
      </p>
    );
  }

  if (!ready) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        <a href="/forgot-password" className="text-sm font-medium text-zinc-700 hover:underline">
          ← Request a new reset link
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700">
          New password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirm" className="text-sm font-medium text-zinc-700">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
