"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Supabase can deliver a recovery link in more than one shape:
// - `?token_hash=...&type=recovery` — the preferred shape (see the
//   Supabase email template, which now points here instead of straight
//   to Supabase's own /auth/v1/verify). Verification is held behind an
//   explicit "Continue" click rather than firing the moment this page
//   loads, because email providers' background link-scanning (Gmail
//   included, not just corporate "Safe Links") visits every link in an
//   incoming email within seconds of it arriving — if verifying the
//   single-use token happened automatically on page load, that scan
//   burns it before the recipient ever clicks it themselves. A plain
//   GET from a scanner never fires a click event, so the token stays
//   good until a human actually presses the button.
// - `#access_token=...&type=recovery` (hash) or `?code=...` (PKCE) —
//   kept as fallbacks for links already in an inbox from before the
//   template switched over, or if Supabase's own default template is
//   ever restored. Both verify automatically, same as before, since
//   there's no way to defer verification with those shapes.
// - `?error=...&error_description=...` — the link was already used or
//   has expired.
function friendlyLinkError(description: string | null): string {
  if (description) return decodeURIComponent(description.replace(/\+/g, " "));
  return "This reset link is invalid or has expired. Request a new one from the sign-in page.";
}

type LinkState =
  | { kind: "checking" }
  | { kind: "confirm"; tokenHash: string; type: string }
  | { kind: "verifying" }
  | { kind: "ready" }
  | { kind: "error"; message: string };

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [link, setLink] = useState<LinkState>({ kind: "checking" });

  useEffect(() => {
    async function checkLink() {
      const params = new URLSearchParams(window.location.search);
      const errorDescription = params.get("error_description");
      if (params.get("error")) {
        setLink({ kind: "error", message: friendlyLinkError(errorDescription) });
        return;
      }

      const tokenHash = params.get("token_hash");
      const type = params.get("type");
      if (tokenHash && type) {
        setLink({ kind: "confirm", tokenHash, type });
        return;
      }

      const supabase = createClient();
      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setLink({ kind: "error", message: friendlyLinkError(exchangeError.message) });
          return;
        }
      }

      // Covers the hash-based flow too — detectSessionInUrl already ran
      // when createClient() constructed the browser client above.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setLink(session ? { kind: "ready" } : { kind: "error", message: friendlyLinkError(null) });
    }

    checkLink();
  }, []);

  async function handleConfirm() {
    if (link.kind !== "confirm") return;
    const { tokenHash, type } = link;
    setLink({ kind: "verifying" });

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "recovery",
    });

    if (error) {
      setLink({ kind: "error", message: friendlyLinkError(error.message) });
    } else {
      setLink({ kind: "ready" });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords don't match.");
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
      setFormError(err instanceof Error ? err.message : "Failed to update your password.");
    } finally {
      setPending(false);
    }
  }

  if (link.kind === "checking") {
    return <p className="text-sm text-zinc-500">Checking your reset link…</p>;
  }

  if (link.kind === "confirm") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-zinc-600">Click below to continue resetting your password.</p>
        <button
          type="button"
          onClick={handleConfirm}
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Continue
        </button>
      </div>
    );
  }

  if (link.kind === "verifying") {
    return <p className="text-sm text-zinc-500">Verifying your reset link…</p>;
  }

  if (done) {
    return (
      <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
        Password updated — taking you to sign in…
      </p>
    );
  }

  if (link.kind === "error") {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{link.message}</p>
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

      {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

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
