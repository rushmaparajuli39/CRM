import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { previousMonthPeriod } from "@/lib/period";
import { notifyAdminsOfMissingCashSheets } from "@/lib/notifications";

// Vercel Cron (see vercel.json) hits this on a schedule and automatically
// sends `Authorization: Bearer ${CRON_SECRET}` when that env var is set —
// this checks it so the route can't be triggered by anyone else.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await createAdminClient();
  const period = previousMonthPeriod();

  const [{ data: entities }, { data: sheets }] = await Promise.all([
    admin.from("entities").select("id, name"),
    admin.from("monthly_cash_sheets").select("entity_id").eq("period", period),
  ]);

  const coveredIds = new Set((sheets ?? []).map((s) => s.entity_id));
  const missing = (entities ?? [])
    .filter((e) => !coveredIds.has(e.id))
    .map((e) => ({ entityId: e.id, entityName: e.name }));

  await notifyAdminsOfMissingCashSheets(missing, period);

  return NextResponse.json({ period, missingCount: missing.length });
}
