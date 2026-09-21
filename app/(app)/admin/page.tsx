import Link from "next/link";
import type { Metadata } from "next";
import { Building2, UserPlus, Users, History } from "lucide-react";
import { requireAdmin } from "@/lib/current-user";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { CreateEntityForm, InviteStaffForm } from "@/components/AdminForms";
import UserAccessRow from "@/components/UserAccessRow";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import type { Entity, Profile, UserEntityAccess } from "@/lib/database.types";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const { user: currentUser } = await requireAdmin();

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Admin</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage entities, staff accounts, and who can see what.
          </p>
        </div>
        <Link
          href="/admin/audit-log"
          className="flex shrink-0 items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <History className="h-4 w-4" /> View audit log
        </Link>
      </div>

      <section className="flex flex-col gap-4">
        <SectionHeader icon={Building2} title="Entities" />
        <CreateEntityForm />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader icon={UserPlus} title="Create a staff login" />
        <InviteStaffForm />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader icon={Users} title="Users & access" />
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          {!profiles || profiles.length === 0 ? (
            <EmptyState icon={Users} message="No users yet." />
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-medium uppercase text-zinc-400">
                  <th className="pb-2 pr-4">User</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2">Entity access</th>
                </tr>
              </thead>
              <tbody>
                {(profiles as Profile[]).map((profile) => (
                  <UserAccessRow
                    key={profile.id}
                    userId={profile.id}
                    email={emailById.get(profile.id) ?? "(no email)"}
                    fullName={profile.full_name}
                    role={profile.role}
                    entities={(entities as Entity[] | null) ?? []}
                    accessEntityIds={accessByUser.get(profile.id) ?? []}
                    isSelf={profile.id === currentUser.id}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
