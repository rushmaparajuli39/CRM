import type { LucideIcon } from "lucide-react";

export default function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 shrink-0 text-zinc-400" />
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
