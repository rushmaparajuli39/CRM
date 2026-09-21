import Link from "next/link";
import { LayoutDashboard, ShieldCheck, History, LogOut, FileStack } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import type { Profile } from "@/lib/database.types";

export default function Navbar({ profile }: { profile: Profile | null }) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <FileStack className="h-5 w-5 text-zinc-700" />
            Entity Document CRM
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900"
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
          {profile?.role === "admin" && (
            <>
              <Link
                href="/admin"
                className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900"
              >
                <ShieldCheck className="h-4 w-4" /> Admin
              </Link>
              <Link
                href="/admin/audit-log"
                className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900"
              >
                <History className="h-4 w-4" /> Audit Log
              </Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-3">
          {profile?.full_name && (
            <span className="text-sm text-zinc-500">{profile.full_name}</span>
          )}
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 capitalize">
            {profile?.role ?? "viewer"}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
