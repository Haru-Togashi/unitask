# UniTask - 全ファイルコードスナップショット

最終更新: Phase 2完了時点

## ファイル一覧
- `app/layout.tsx`
- `lib/supabase.ts`
- `app/login/page.tsx`
- `app/page.tsx`
- `app/courses/page.tsx`

---

## app/layout.tsx

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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
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

## lib/supabase.ts

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

## .env.local の構造

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## package.json 主要依存

| パッケージ | バージョン |
|---|---|
| next | ^16 |
| react | ^19 |
| @supabase/ssr | latest |
| tailwindcss | v4 |


---

## app/login/page.tsx

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const supabase = createClient();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setSuccess("確認メールを送信しました。メールを確認してください。");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("メールアドレスまたはパスワードが正しくありません");
      } else {
        window.location.href = "/";
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">UniTask</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">単位を守る、大学生のタスク管理</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
            {isSignUp ? "アカウント作成" : "ログイン"}
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-xl bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900">
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
            <input
              type="password"
              placeholder="パスワード（6文字以上）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors text-base"
            >
              {loading ? "処理中..." : isSignUp ? "アカウントを作成" : "ログイン"}
            </button>
          </form>

          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccess(""); }}
            className="mt-4 w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-center py-2"
          >
            {isSignUp ? "すでにアカウントをお持ちの方はこちら" : "アカウントをお持ちでない方はこちら"}
          </button>
        </div>
      </div>
    </div>
  );
}
```


---

## app/page.tsx (ダッシュボード)

コード全文: `app/page.tsx` (432行)

主要な型・定数:
- `Task` — id, title, course_name, due_date, task_type, is_completed
- `NewTask` — 入力フォーム用
- `TYPE_CONFIG` — assignment/attendance/exam のラベルと色
- `getRelativeTime(dueDate)` — "期限切れ" | "まもなく" | "X時間後" | "X日後"
- `formatDateTime(dueDate)` — 日本語ロケール（月/日(曜) HH:MM）

主要な機能:
- Supabase auth check → 未ログインなら /login へ
- tasks を due_date ASC でフェッチ
- overdue / today / upcoming / completed に分類
- urgentCount バッジ（ヘッダー）+ 赤アラートバナー
- FAB (fixed bottom-20 right-4) → ボトムシートフォーム
- タスク種別ボタン（3列グリッド）
- SectionHeader / TaskCard コンポーネント（同ファイル内）
- BottomNav コンポーネント（同ファイル内）
- ダークモード: toggleDark → localStorage + .dark クラス


---

## app/courses/page.tsx (授業管理)

コード全文: `app/courses/page.tsx` (608行)

主要な型・定数:
- `Course` — id, name, day_of_week(0=月〜4=金), period(1〜6), room, teacher, max_absences
- `Attendance` — id, course_id, date(DATE文字列), status("present"|"absent"|"late")
- `CourseForm` — フォーム入力用
- `DAYS = ["月","火","水","木","金"]`
- `PERIODS = [1,2,3,4,5,6]`
- `CELL_COLORS` — 8色（青/緑/紫/橙/ピンク/ティール/黄/赤）
- `STATUS_LABEL / STATUS_COLOR` — 出席/欠席/遅刻の表示設定

主要な機能:
- `loadCourses()` — order by day_of_week, period
- `loadAttendances()` — order by date DESC
- `openAddForm(day?, period?)` — 時間割マス目からも呼べる
- `openEditForm(course)` — 編集フォームを開く
- `saveCourse()` — INSERT or UPDATE
- `deleteCourse(id)` — window.confirm → カスケード削除
- `recordAttendance(courseId, status)` — 今日のレコードをupsert
- `getCourseColor / getBarColor` — courses配列インデックスで色割当
- `todayDow = new Date().getDay() - 1` — 今日の列ハイライト用

画面構成:
1. 固定ヘッダー（「授業管理」タイトル + 「+ 授業を追加」ボタン）
2. 時間割グリッド（table-fixed, 5列×6行）
   - 授業あり: 色付きボタン → 詳細シート
   - 授業なし: 点線 + ボタン → 追加フォーム（曜日/時限プリセット）
3. 授業一覧カード
   - カラーストライプ（h-1）
   - 欠席プログレスバー（残り1回以下で赤）
   - 今日の出席クイックボタン（出席/欠席/遅刻）
4. 追加/編集ボトムシート
   - 曜日ボタン5列 + 時限ボタン6列
   - 教室・教員名テキスト入力
   - 最大欠席回数スライダー（1〜15）
5. 授業詳細ボトムシート
   - 欠席サマリーカード（状態で色変化）
   - 出席履歴リスト
   - 編集・削除ボタン
6. BottomNav（coursesページをアクティブ）

