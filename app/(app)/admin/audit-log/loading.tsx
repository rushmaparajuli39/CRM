import Skeleton from "@/components/ui/Skeleton";

export default function AuditLogLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-96" />
    </div>
  );
}
