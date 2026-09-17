import { headers } from "next/headers";

// Best-effort site origin for building links that go out in emails (e.g.
// the password-reset redirect). Vercel sets x-forwarded-host/-proto
// correctly on every request, so this works out of the box with no new
// env var — NEXT_PUBLIC_SITE_URL overrides it if you ever need to.
export async function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}
