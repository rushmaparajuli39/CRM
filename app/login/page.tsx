import Link from "next/link";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Entity Document CRM</h1>
        <p className="mt-1 text-sm text-zinc-500">Sign in with your staff account.</p>
        <div className="mt-6">
          <LoginForm next={next ?? "/dashboard"} />
        </div>
        <p className="mt-4 text-sm text-zinc-500">
          <Link href="/forgot-password" className="font-medium text-zinc-700 hover:underline">
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
}
