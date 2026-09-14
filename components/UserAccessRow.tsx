"use client";

import { useState, useTransition } from "react";
import { setUserRole, grantEntityAccess, revokeEntityAccess } from "@/lib/actions/admin";
import type { Entity, ProfileRole } from "@/lib/database.types";

export default function UserAccessRow({
  userId,
  email,
  fullName,
  role,
  entities,
  accessEntityIds,
}: {
  userId: string;
  email: string;
  fullName: string | null;
  role: ProfileRole;
  entities: Entity[];
  accessEntityIds: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [access, setAccess] = useState(new Set(accessEntityIds));
  const [currentRole, setCurrentRole] = useState(role);

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
