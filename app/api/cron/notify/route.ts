import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { webpush } from "@/lib/webpush";
import type { PushSubscriptionJSON } from "@/lib/webpush";

// Vercel Cron から呼ばれるエンドポイント。CRON_SECRET で保護。
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== "Bearer " + process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();

  // ── 課題: 24時間前 (window: 23.5h〜24.5h) ──────────────────
  const assign24hFrom = new Date(now.getTime() + 23.5 * 60 * 60 * 1000).toISOString();
  const assign24hTo   = new Date(now.getTime() + 24.5 * 60 * 60 * 1000).toISOString();

  // ── 出席: 1時間前 (window: 30min〜90min) ──────────────────
  const attend1hFrom  = new Date(now.getTime() + 30  * 60 * 1000).toISOString();
  const attend1hTo    = new Date(now.getTime() + 90  * 60 * 1000).toISOString();

  // 通知対象タスクを取得
  const { data: tasks, error: taskErr } = await admin
    .from("tasks")
    .select("id, user_id, title, course_name, due_date, task_type")
    .eq("is_completed", false)
    .or(
      "and(task_type.eq.assignment,due_date.gte." + assign24hFrom + ",due_date.lte." + assign24hTo + ")," +
      "and(task_type.eq.attendance,due_date.gte." + attend1hFrom  + ",due_date.lte." + attend1hTo  + ")," +
      "and(task_type.eq.exam,due_date.gte."        + assign24hFrom + ",due_date.lte." + assign24hTo + ")"
    );

  if (taskErr || !tasks || tasks.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // 対象ユーザーの購読情報を取得
  const userIds = [...new Set(tasks.map((t: { user_id: string }) => t.user_id))];
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id, subscription")
    .in("user_id", userIds);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const subMap = new Map<string, PushSubscriptionJSON>(
    subs.map((s: { user_id: string; subscription: PushSubscriptionJSON }) => [s.user_id, s.subscription])
  );

  // 通知送信
  let sent = 0;
  const staleEndpoints: string[] = [];

  for (const task of tasks as { id: string; user_id: string; title: string; course_name: string; due_date: string; task_type: string }[]) {
    const sub = subMap.get(task.user_id);
    if (!sub) continue;

    const isAttendance = task.task_type === "attendance";
    const timeLabel = isAttendance ? "1時間後" : "24時間後";
    const typeLabel =
      task.task_type === "assignment" ? "課題" :
      task.task_type === "attendance" ? "出席コード" : "テスト";

    const payload = JSON.stringify({
      title: "UniTask: " + typeLabel + "のリマインド",
      body:  task.title + "（" + task.course_name + "）\nあと" + timeLabel + "が期限です",
      url:   "/",
    });

    try {
      await webpush.sendNotification(sub as Parameters<typeof webpush.sendNotification>[0], payload);
      sent++;
    } catch (err: unknown) {
      // 410 Gone = 無効な購読 → 削除
      if (typeof err === "object" && err !== null && "statusCode" in err && err.statusCode === 410) {
        staleEndpoints.push(sub.endpoint);
      }
    }
  }

  // 無効な購読を削除
  if (staleEndpoints.length > 0) {
    await admin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", staleEndpoints);
  }

  return NextResponse.json({ sent, tasks: tasks.length });
}
