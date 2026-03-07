# UniTask - プロジェクト設計書

## 概要
大学生向けの授業タスク管理Webアプリ。出席コードの入力期限や課題提出の期限を管理し、Web Push通知でリマインドして単位の取りこぼしを防ぐ。

## 開発者情報
- GitHubリポジトリ: https://github.com/Haru-Togashi/unitask
- Supabase Project URL: `.env.local` に記載
- 開発環境: Windows / VSCode

## 技術スタック
- **フロントエンド**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **バックエンド**: Supabase (PostgreSQL + Auth) + Next.js API Routes
- **通知**: Web Push API + Service Worker + web-push (npm)
- **デプロイ**: Vercel（Cron Jobs付き）

## 現在のファイル構成

```
unitask/
├── app/
│   ├── api/
│   │   ├── cron/
│   │   │   └── notify/route.ts     # 毎時Cron: 期限前タスクへPush通知
│   │   └── push/
│   │       ├── send/route.ts       # 管理者向け: 任意ユーザーへPush送信
│   │       └── subscribe/route.ts  # ユーザーのPush購読情報を保存
│   ├── courses/
│   │   └── page.tsx                # 授業管理ページ（時間割・出席記録）
│   ├── login/
│   │   └── page.tsx                # ログイン・新規登録ページ
│   ├── page.tsx                    # ダッシュボード（タスク一覧・通知ボタン）
│   ├── layout.tsx                  # レイアウト（manifest・ダークモード・PWA meta）
│   └── globals.css                 # グローバルCSS
├── lib/
│   ├── supabase.ts                 # Supabaseブラウザクライアント
│   ├── utils.ts                    # shadcn utility
│   └── webpush.ts                  # web-push VAPID設定（サーバー用）
├── public/
│   ├── icons/
│   │   ├── icon-192.png            # PWAアイコン 192x192（要差し替え）
│   │   └── icon-512.png            # PWAアイコン 512x512（要差し替え）
│   ├── manifest.json               # PWAマニフェスト
│   └── sw.js                       # Service Worker（オフラインキャッシュ + Push受信）
├── vercel.json                     # Vercel Cron設定（毎時0分）
├── .env.local                      # 環境変数（Gitには含めない）
├── package.json
└── tsconfig.json
```

## 完成済みの機能

### Phase 1: モバイルファーストUI ✅
- ユーザー登録・ログイン（Supabase Auth / Email認証）
- タスクの追加・完了チェック・削除
- タスク一覧（期限切れ / 今日 / 今後の予定に自動分類）
- 相対時間表示（「3時間後」「2日後」など）
- 固定ヘッダー（未対応件数バッジ）
- 緊急アラートバナー（期限切れ・今日締切）
- FAB（右下 + ボタン）+ ボトムシートフォーム
- タスク種別ボタン選択（課題 / 出席 / テスト）
- ダークモード（🌙/☀️ トグル・localStorage保存・FOUC防止）

### Phase 2: 授業管理機能 ✅
- 授業の登録・編集・削除（/courses）
- 時間割グリッド表示（月〜金 × 1〜6限）
- 今日の曜日列をハイライト
- 時間割マス目タップ → 曜日・時限がプリセットされた追加フォーム
- 出席記録（出席 / 欠席 / 遅刻）のクイック登録
- 欠席回数の可視化（プログレスバー・「あと○回休めます」表示）
- 欠席上限に近づくと赤色で警告
- 授業詳細ボトムシート（出席履歴・編集・削除）
- ボトムナビゲーション（ダッシュボード ↔ 授業管理）

### Phase 3: Web Push通知 ✅
- Service Worker（/sw.js）: Push受信 → 通知表示 → タップで画面遷移
- ヘッダーの「🔔 通知ON」ボタン: ブラウザ許可 → Push購読 → Supabaseに保存
- Vercel Cron（毎時0分）: 期限前タスクを検出してPush送信
  - 課題・テスト: 期限24時間前（±30分ウィンドウ）
  - 出席コード: 期限1時間前（±30分ウィンドウ）
- 無効な購読（410 Gone）を自動クリーンアップ
- 管理者向けPush送信API（/api/push/send）

### Phase 4: PWA化 ✅
- manifest.json（名前・テーマカラー青・スタンドアロン表示）
- アイコン（192px・512px プレースホルダー）
- Service Workerによるオフラインキャッシュ（静的アセット・ページ）
- apple-touch-icon・appleWebApp メタデータ（iOS対応）
- themeColor（アドレスバーを青に）

## データベース構成（Supabase）

### tasksテーブル（設定済み）
```sql
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  course_name TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'assignment',  -- 'assignment' | 'attendance' | 'exam'
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### coursesテーブル（設定済み）
```sql
CREATE TABLE courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,  -- 0=月 1=火 2=水 3=木 4=金
  period INTEGER NOT NULL,       -- 1〜6限
  room TEXT,
  teacher TEXT,
  max_absences INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### attendancesテーブル（設定済み）
```sql
CREATE TABLE attendances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',  -- 'present' | 'absent' | 'late'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### push_subscriptionsテーブル（要作成）
```sql
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  endpoint TEXT NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscription" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);
```

## 環境変数（.env.local / Vercel）

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=    # npx web-push generate-vapid-keys で生成
VAPID_PRIVATE_KEY=               # 上記コマンドで生成
VAPID_EMAIL=mailto:your@email.com
SUPABASE_SERVICE_ROLE_KEY=       # Supabase → Settings → API → service_role
CRON_SECRET=                     # openssl rand -hex 32 などで生成
```

## 今後の開発タスク

### 未実装（Phase 1残）
- [ ] タスクの編集機能

### Phase 5: ソーシャル機能（未着手）
- [ ] 同じ授業を取っている人と課題情報を共有
- [ ] GPA・単位数シミュレーション

## ブラウザ操作が必要な作業（Claude Codeでは不可）
- Supabaseダッシュボードでのテーブル作成・RLS設定
- Vercelの環境変数設定・デプロイ確認
- `npx web-push generate-vapid-keys` でのVAPID鍵生成

## 注意事項
- `src/` ディレクトリなし。`app/` と `lib/` はルート直下
- ダークモードは `.dark` クラス方式（Tailwind v4）
- ファイル書き込みには cat heredoc を使用（Windowsのパスに日本語を含むため）
