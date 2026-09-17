"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/actions/auth";

type State = { error: string } | { success: true } | null;

export default function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<State, FormData>(
    requestPasswordReset,
    null
  );

  if (state && "success" in state) {
    return (
      <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
        If that email has a staff account, a reset link is on its way — check your inbox.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
