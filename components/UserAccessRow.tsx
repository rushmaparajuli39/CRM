"use client";

import { useState, useTransition } from "react";
import {
  setUserRole,
  grantEntityAccess,
  revokeEntityAccess,
  deleteStaffUser,
} from "@/lib/actions/admin";
import { sendPasswordResetEmail } from "@/lib/actions/auth";
import type { Entity, ProfileRole } from "@/lib/database.types";

export default function UserAccessRow({
  userId,
  email,
  fullName,
  role,
  entities,
  accessEntityIds,
  isSelf,
}: {
  userId: string;
  email: string;
  fullName: string | null;
  role: ProfileRole;
  entities: Entity[];
  accessEntityIds: string[];
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [access, setAccess] = useState(new Set(accessEntityIds));
  const [currentRole, setCurrentRole] = useState(role);
  const [resetState, setResetState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resetError, setResetError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDelete() {
    if (
      !window.confirm(
        `Remove ${fullName || email}'s login? They'll no longer be able to sign in, and their entity access grants go with it. This can't be undone.`
      )
    ) {
      return;
    }
    setDeleteError(null);
    setDeleting(true);
    startTransition(async () => {
      try {
        await deleteStaffUser(userId);
      } catch (e) {
        setDeleteError(e instanceof Error ? e.message : "Failed to delete user.");
        setDeleting(false);
      }
    });
  }

  function sendReset() {
    setResetState("sending");
    setResetError(null);
    startTransition(async () => {
      try {
        await sendPasswordResetEmail(email);
        setResetState("sent");
      } catch (e) {
        setResetState("error");
        setResetError(e instanceof Error ? e.message : "Failed to send reset email.");
      }
    });
  }

  function toggleEntity(entityId: string, checked: boolean) {
    setAccess((prev) => {
      const next = new Set(prev);
      if (checked) next.add(entityId);
      else next.delete(entityId);
      return next;
    });
    startTransition(async () => {
      if (checked) await grantEntityAccess(userId, entityId);
      else await revokeEntityAccess(userId, entityId);
    });
  }

  function changeRole(newRole: ProfileRole) {
    setCurrentRole(newRole);
    startTransition(async () => {
      await setUserRole(userId, newRole);
    });
  }

  return (
    <tr className="border-b border-zinc-100 align-top">
      <td className="py-3 pr-4">
        <p className="text-sm font-medium text-zinc-900">{fullName || email}</p>
        <p className="text-xs text-zinc-500">{email}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={sendReset}
            disabled={resetState === "sending"}
            className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
          >
            {resetState === "sending"
              ? "Sending…"
              : resetState === "sent"
                ? "Reset link sent ✓"
                : resetState === "error"
                  ? "Failed — try again"
                  : "Send reset link"}
          </button>
          {isSelf ? (
            <span className="text-xs text-zinc-400">(that&apos;s you)</span>
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete user"}
            </button>
          )}
        </div>
        {resetError && <p className="mt-1 text-xs text-red-600">{resetError}</p>}
        {deleteError && <p className="mt-1 text-xs text-red-600">{deleteError}</p>}
      </td>
      <td className="py-3 pr-4">
        <select
          value={currentRole}
          disabled={pending}
          onChange={(e) => changeRole(e.target.value as ProfileRole)}
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
        >
          <option value="admin">admin</option>
          <option value="editor">editor</option>
          <option value="viewer">viewer</option>
        </select>
      </td>
      <td className="py-3">
        {currentRole === "admin" ? (
          <p className="text-xs text-zinc-400">Admins can see every entity.</p>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {entities.map((entity) => (
              <label key={entity.id} className="flex items-center gap-1.5 text-xs text-zinc-700">
                <input
                  type="checkbox"
                  checked={access.has(entity.id)}
                  disabled={pending}
                  onChange={(e) => toggleEntity(entity.id, e.target.checked)}
                />
                {entity.name}
              </label>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}
