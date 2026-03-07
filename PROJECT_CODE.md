# UniTask - 全ファイルコードスナップショット

最終更新: Phase 1〜4完了時点（PWA + Web Push通知）

## ファイル一覧
1. `app/layout.tsx`
2. `lib/supabase.ts`
3. `lib/webpush.ts`
4. `app/login/page.tsx`
5. `app/page.tsx`（ダッシュボード）
6. `app/courses/page.tsx`（授業管理）
7. `app/api/push/subscribe/route.ts`
8. `app/api/push/send/route.ts`
9. `app/api/cron/notify/route.ts`
10. `public/sw.js`（Service Worker）
11. `public/manifest.json`
12. `vercel.json`

---

## 1. app/layout.tsx

```tsx
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UniTask - 単位を守る、大学生のタスク管理",
  description: "出席コードや課題提出の期限を管理して、単位の取りこぼしを防ぐWebアプリ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UniTask",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className={geist.variable + " antialiased"}>{children}</body>
    </html>
  );
}
```

---

## 2. lib/supabase.ts

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

---

## 3. lib/webpush.ts

```ts
import webpush from "web-push";

const VAPID_EMAIL = process.env.VAPID_EMAIL ?? "mailto:admin@example.com";

webpush.setVapidDetails(
  VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export { webpush };

export type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};
```

---

## 4. app/login/page.tsx

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const supabase = createClient();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("確認メールを送信しました。メールを確認してください。");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError("メールアドレスまたはパスワードが正しくありません");
      else window.location.href = "/";
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">UniTask</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">単位を守る、大学生のタスク管理</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">
            {isSignUp ? "新規登録" : "ログイン"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="example@univ.ac.jp" required
              className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignUp ? "8文字以上" : "パスワード"} required minLength={isSignUp ? 8 : undefined}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base" />
            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-lg">{error}</p>}
            {message && <p className="text-sm text-green-600 bg-green-50 dark:bg-green-950/50 px-3 py-2 rounded-lg">{message}</p>}
            <button type="submit" disabled={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors text-base">
              {loading ? "処理中..." : isSignUp ? "アカウントを作成" : "ログイン"}
            </button>
          </form>
        </div>
        <p className="text-center mt-5 text-sm text-gray-500 dark:text-gray-400">
          {isSignUp ? "すでにアカウントをお持ちですか？" : "アカウントをお持ちでないですか？"}{" "}
          <button onClick={() => { setIsSignUp(!isSignUp); setError(""); setMessage(""); }}
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
            {isSignUp ? "ログイン" : "新規登録"}
          </button>
        </p>
      </div>
    </div>
  );
}
```

---

## 5. app/page.tsx（ダッシュボード）484行 — 要点のみ記載

主要な型・定数:
- `Task` — id, title, course_name, due_date, task_type, is_completed
- `NewTask` — フォーム入力用
- `TYPE_CONFIG` — assignment/attendance/exam のラベルと色
- `getRelativeTime(dueDate)` — "期限切れ" | "まもなく" | "X時間後" | "X日後"
- `formatDateTime(dueDate)` — 日本語ロケール（月/日(曜) HH:MM）
- `urlBase64ToUint8Array(str)` — VAPID公開鍵をUint8Array<ArrayBuffer>に変換

主要な state:
- tasks, showForm, showCompleted, isDark
- `notifPermission: NotificationPermission` — "default" | "granted" | "denied"

主要な処理:
- `loadTasks()` — Supabase から due_date ASC で取得
- `enableNotifications()` — 権限リクエスト → SW ready → pushManager.subscribe → /api/push/subscribe に POST
- `addTask()` / `toggleComplete()` / `deleteTask()` — Supabase CRUD
- `useEffect`: auth チェック・SW登録(`navigator.serviceWorker.register('/sw.js')`)・通知権限状態取得

ヘッダーの通知ボタン:
```tsx
{notifPermission !== "granted" && notifPermission !== "denied" && (
  <button onClick={enableNotifications} className="text-xs px-2.5 py-1 rounded-lg ...">
    🔔 通知ON
  </button>
)}
{notifPermission === "granted" && (
  <span className="text-xs text-emerald-500">🔔</span>
)}
```

派生値:
- overdueTasks / todayTasks / upcomingTasks / completedTasks
- urgentCount = overdueTasks.length + todayTasks.length

コンポーネント（同ファイル内）:
- `SectionHeader` — セクション見出し + 件数バッジ
- `TaskCard` — 左ボーダー色分け・チェック・削除・相対時間表示
- `BottomNav` — ダッシュボード/授業管理の切替ナビ（FABは bottom-20 に配置）

---

## 6. app/courses/page.tsx（授業管理）608行 — 要点のみ記載

主要な型・定数:
- `Course` — id, name, day_of_week(0=月〜4=金), period(1〜6), room, teacher, max_absences
- `Attendance` — id, course_id, date(DATE文字列), status("present"|"absent"|"late")
- `CourseForm` — フォーム入力用
- `DAYS = ["月","火","水","木","金"]` / `PERIODS = [1..6]`
- `CELL_COLORS / BAR_COLORS` — 8色のカラーパレット（授業ごとに割当）

主要な処理:
- `loadCourses()` — order by day_of_week, period
- `loadAttendances()` — order by date DESC
- `openAddForm(day?, period?)` — 時間割マス目からプリセット可
- `saveCourse()` — INSERT or UPDATE
- `deleteCourse(id)` — window.confirm → cascade削除
- `recordAttendance(courseId, status)` — 今日のレコードをupsert
- `todayDow = new Date().getDay() - 1` — 今日の列ハイライト

画面構成:
1. 固定ヘッダー（「授業管理」+ 「+ 授業を追加」ボタン）
2. 時間割グリッド（table-fixed, 5列×6行）
3. 授業一覧カード（カラーストライプ・欠席バー・クイック出席ボタン）
4. 追加/編集ボトムシート（曜日5列・時限6列・スライダー）
5. 授業詳細ボトムシート（欠席サマリー・出席履歴・編集・削除）
6. BottomNav（courses をアクティブ）


---

## 7. app/api/push/subscribe/route.ts

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscription = await req.json();
  if (!subscription?.endpoint || !subscription?.keys) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await admin
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint: subscription.endpoint, subscription },
      { onConflict: "user_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

---

## 8. app/api/push/send/route.ts

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { webpush } from "@/lib/webpush";
import type { PushSubscriptionJSON } from "@/lib/webpush";

// POST body: { user_id?: string, title: string, body: string, url?: string }
// Authorization: Bearer <CRON_SECRET>
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== "Bearer " + process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user_id, title, body, url = "/" } = await req.json();
  if (!title || !body) return NextResponse.json({ error: "title and body are required" }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = admin.from("push_subscriptions").select("user_id, endpoint, subscription");
  if (user_id) query = query.eq("user_id", user_id);
  const { data: subs, error } = await query;
  if (error || !subs || subs.length === 0) return NextResponse.json({ sent: 0 });

  const payload = JSON.stringify({ title, body, url });
  const staleEndpoints: string[] = [];
  let sent = 0;

  await Promise.allSettled(
    subs.map(async (row: { user_id: string; endpoint: string; subscription: PushSubscriptionJSON }) => {
      try {
        await webpush.sendNotification(row.subscription as Parameters<typeof webpush.sendNotification>[0], payload);
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
```

---

## 9. app/api/cron/notify/route.ts

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { webpush } from "@/lib/webpush";
import type { PushSubscriptionJSON } from "@/lib/webpush";

// Vercel Cron から毎時0分に呼ばれる（vercel.json で設定）
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
  // 課題・テスト: 23.5h〜24.5h 後（1時間ウィンドウ）
  const assign24hFrom = new Date(now.getTime() + 23.5 * 60 * 60 * 1000).toISOString();
  const assign24hTo   = new Date(now.getTime() + 24.5 * 60 * 60 * 1000).toISOString();
  // 出席: 30min〜90min 後
  const attend1hFrom  = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  const attend1hTo    = new Date(now.getTime() + 90 * 60 * 1000).toISOString();

  const { data: tasks, error: taskErr } = await admin
    .from("tasks")
    .select("id, user_id, title, course_name, due_date, task_type")
    .eq("is_completed", false)
    .or(
      "and(task_type.eq.assignment,due_date.gte." + assign24hFrom + ",due_date.lte." + assign24hTo + ")," +
      "and(task_type.eq.attendance,due_date.gte." + attend1hFrom  + ",due_date.lte." + attend1hTo  + ")," +
      "and(task_type.eq.exam,due_date.gte."        + assign24hFrom + ",due_date.lte." + assign24hTo + ")"
    );

  if (taskErr || !tasks || tasks.length === 0) return NextResponse.json({ sent: 0 });

  const userIds = [...new Set(tasks.map((t: { user_id: string }) => t.user_id))];
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id, subscription")
    .in("user_id", userIds);

  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 });

  const subMap = new Map<string, PushSubscriptionJSON>(
    subs.map((s: { user_id: string; subscription: PushSubscriptionJSON }) => [s.user_id, s.subscription])
  );

  let sent = 0;
  const staleEndpoints: string[] = [];

  for (const task of tasks as { id: string; user_id: string; title: string; course_name: string; due_date: string; task_type: string }[]) {
    const sub = subMap.get(task.user_id);
    if (!sub) continue;
    const typeLabel = task.task_type === "assignment" ? "課題" : task.task_type === "attendance" ? "出席コード" : "テスト";
    const timeLabel = task.task_type === "attendance" ? "1時間後" : "24時間後";
    const payload = JSON.stringify({
      title: "UniTask: " + typeLabel + "のリマインド",
      body: task.title + "（" + task.course_name + "）\nあと" + timeLabel + "が期限です",
      url: "/",
    });
    try {
      await webpush.sendNotification(sub as Parameters<typeof webpush.sendNotification>[0], payload);
      sent++;
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "statusCode" in err && err.statusCode === 410) {
        staleEndpoints.push(sub.endpoint);
      }
    }
  }

  if (staleEndpoints.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
  }

  return NextResponse.json({ sent, tasks: tasks.length });
}
```

---

## 10. public/sw.js

```js
const CACHE_NAME = "unitask-v1";
const STATIC_ASSETS = ["/", "/courses", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/") || url.origin !== self.location.origin) {
    event.respondWith(fetch(request).catch(() => new Response("", { status: 503 })));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match("/") ?? new Response("Offline", { status: 503 }));
    })
  );
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(self.registration.showNotification(data.title ?? "UniTask", {
    body: data.body ?? "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [200, 100, 200],
    data: { url: data.url ?? "/" },
    actions: [{ action: "open", title: "開く" }, { action: "close", title: "閉じる" }],
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "close") return;
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
```

---

## 11. public/manifest.json

```json
{
  "name": "UniTask",
  "short_name": "UniTask",
  "description": "単位を守る、大学生のタスク管理",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f9fafb",
  "theme_color": "#2563eb",
  "lang": "ja",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

---

## 12. vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/notify",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## 環境変数一覧（.env.local / Vercel）

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:your@email.com
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```
