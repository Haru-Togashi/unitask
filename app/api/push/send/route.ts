import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWebPush } from "@/lib/webpush";
import type { PushSubscriptionJSON } from "@/lib/webpush";

// 特定ユーザーまたは全ユーザーへの通知送信 API
// POST body: { user_id?: string, title: string, body: string, url?: string }
// CRON_SECRET で保護（管理者・テスト用途）
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== "Bearer " + process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user_id, title, body, url = "/" } = await req.json();
  if (!title || !body) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 対象の購読情報を取得
  let query = admin.from("push_subscriptions").select("user_id, endpoint, subscription");
  if (user_id) {
    query = query.eq("user_id", user_id);
  }
  const { data: subs, error } = await query;
  if (error || !subs || subs.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const webpush = getWebPush();
  const payload = JSON.stringify({ title, body, url });
  const staleEndpoints: string[] = [];
  let sent = 0;

  await Promise.allSettled(
    subs.map(async (row: { user_id: string; endpoint: string; subscription: PushSubscriptionJSON }) => {
      try {
        await webpush.sendNotification(
          row.subscription as Parameters<typeof webpush.sendNotification>[0],
          payload
        );
        sent++;
      } catch (err: unknown) {
        if (typeof err === "object" && err !== null && "statusCode" in err && err.statusCode === 410) {
          staleEndpoints.push(row.endpoint);
        }
      }
    })
  );

  if (staleEndpoints.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
  }

  return NextResponse.json({ sent, total: subs.length });
}
