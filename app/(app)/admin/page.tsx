import { requireAdmin } from "@/lib/current-user";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { CreateEntityForm, InviteStaffForm } from "@/components/AdminForms";
import UserAccessRow from "@/components/UserAccessRow";
import type { Entity, Profile, UserEntityAccess } from "@/lib/database.types";

export default async function AdminPage() {
  await requireAdmin();

  const supabase = await createClient();
  const admin = await createAdminClient();

  const [{ data: entities }, { data: profiles }, { data: access }, { data: authUsers }] =
    await Promise.all([
      supabase.from("entities").select("*").order("name"),
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("user_entity_access").select("*"),
      admin.auth.admin.listUsers(),
    ]);

  const emailById = new Map(authUsers?.users.map((u) => [u.id, u.email ?? "(no email)"]));
  const accessByUser = new Map<string, string[]>();
  for (const row of (access as UserEntityAccess[] | null) ?? []) {
    const list = accessByUser.get(row.user_id) ?? [];
    list.push(row.entity_id);
    accessByUser.set(row.user_id, list);
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Admin</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage entities, staff accounts, and who can see what.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900">Entities</h2>
        <CreateEntityForm />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900">Create a staff login</h2>
        <InviteStaffForm />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900">Users &amp; access</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-medium uppercase text-zinc-400">
                <th className="pb-2 pr-4">User</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2">Entity access</th>
              </tr>
            </thead>
            <tbody>
              {((profiles as Profile[] | null) ?? []).map((profile) => (
                <UserAccessRow
                  key={profile.id}
                  userId={profile.id}
                  email={emailById.get(profile.id) ?? "(no email)"}
                  fullName={profile.full_name}
                  role={profile.role}
                  entities={(entities as Entity[] | null) ?? []}
                  accessEntityIds={accessByUser.get(profile.id) ?? []}
                />
              ))}
            </tbody>
          </table>
          {(!profiles || profiles.length === 0) && (
            <p className="py-4 text-sm text-zinc-500">No users yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
