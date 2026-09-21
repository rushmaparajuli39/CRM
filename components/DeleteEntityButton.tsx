"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { deleteEntity } from "@/lib/actions/admin";

type ActionState = { error: string } | null;

export default function DeleteEntityButton({
  entityId,
  entityName,
}: {
  entityId: string;
  entityName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => {
      try {
        await deleteEntity(entityId, String(formData.get("confirm_name") ?? ""));
        router.push("/dashboard");
        return null;
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Failed to delete entity." };
      }
    },
    null
  );

  if (!confirming) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-red-900">
          <AlertTriangle className="h-4 w-4" /> Danger zone
        </p>
        <p className="mt-1 text-sm text-red-700">
          Permanently delete this entity and everything under it.
        </p>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Delete this entity
        </button>
      </div>
    );
  }

  const matches = typed.length > 0 && typed === entityName;

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-red-900">
        <AlertTriangle className="h-4 w-4" /> Danger zone
      </p>
      <p className="mt-1 text-sm text-red-800">
        This permanently deletes <span className="font-medium">{entityName}</span> — its EIN
        record, every license, every insurance policy, and every uploaded document. This cannot
        be undone.
      </p>
      <form action={formAction} className="mt-3 flex flex-col gap-2">
        <label className="text-xs font-medium text-red-900">
          Type <span className="font-mono">{entityName}</span> to confirm
        </label>
        <input
          name="confirm_name"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoFocus
          className="w-full max-w-sm rounded-md border border-red-300 px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none"
        />
        <div className="mt-1 flex items-center gap-2">
          <button
            type="submit"
            disabled={!matches || pending}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Deleting…" : "Delete permanently"}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              setTyped("");
            }}
            disabled={pending}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
        {state?.error && <p className="text-xs text-red-700">{state.error}</p>}
      </form>
    </div>
  );
}
