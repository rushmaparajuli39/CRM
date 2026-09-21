import type { LucideIcon } from "lucide-react";

export default function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 px-4 py-8 text-center">
      <Icon className="h-6 w-6 text-zinc-300" />
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}
