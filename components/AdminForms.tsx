"use client";

import { useActionState, useRef } from "react";
import { createEntity, inviteStaffUser } from "@/lib/actions/admin";

type ActionState = { error: string } | null;

const inputClass =
  "rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none";
const labelClass = "flex flex-col gap-1 text-xs font-medium text-zinc-600";

export function CreateEntityForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => {
      try {
        await createEntity(formData);
        formRef.current?.reset();
        return null;
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Failed to create entity." };
      }
    },
    null
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <label className={labelClass}>
        Name
        <input name="name" required className={inputClass} />
      </label>
      <label className={labelClass}>
        Business type
        <input
          name="business_type"
          required
          placeholder="e.g. Vape Shop"
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Address
        <input name="address" className={inputClass} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add entity"}
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

export function InviteStaffForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => {
      try {
        await inviteStaffUser(formData);
        formRef.current?.reset();
        return null;
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Failed to create user." };
      }
    },
    null
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <label className={labelClass}>
        Full name
        <input name="full_name" className={inputClass} />
      </label>
      <label className={labelClass}>
        Email
        <input name="email" type="email" required className={inputClass} />
      </label>
      <label className={labelClass}>
        Temporary password
        <input name="password" type="text" required minLength={8} className={inputClass} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create login"}
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
