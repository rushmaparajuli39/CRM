import Link from "next/link";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Reset your password</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>
        <div className="mt-6">
          <ForgotPasswordForm />
        </div>
        <p className="mt-4 text-sm text-zinc-500">
          <Link href="/login" className="font-medium text-zinc-700 hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
