# UniTask — 単位を守る、大学生のタスク管理アプリ

> 「授業に出ていたのに単位を落とした」「課題の締め切りを忘れた」  
> そんな経験から生まれた、大学生のためのタスク管理 PWA です。

**🔗 デモ:** https://unitask-jza1.vercel.app

---

## 開発背景

大学在学中に留年を経験しました。振り返ると、出席日数の不足や課題の締め切り忘れが積み重なった結果でした。「もし期限を可視化して、事前に通知してくれるツールがあれば」という実感から、このアプリを開発しました。

既存のタスク管理アプリは汎用的すぎて、出席管理や授業単位での期限追跡といった大学生特有のニーズに対応していません。UniTask は「単位を守る」ことに特化したツールです。

---

## スクリーンショット

<!-- スクリーンショット -->

---

## 主な機能

| 機能 | 説明 |
|---|---|
| 📋 **タスク管理** | 課題・出席コード・テストを種別で管理。期限切れアラートで見落とし防止 |
| 🗓 **授業管理** | 時間割グリッドで授業を登録。出席記録（出席/欠席/遅刻）と欠席回数を可視化 |
| 🔔 **Push通知** | 課題は24時間前、出席コードは1時間前にブラウザ通知でリマインド |
| 📱 **PWA対応** | ホーム画面に追加してアプリとして使える。オフライン対応 |
| 🌙 **ダークモード** | システム設定に連動 + 手動切り替え。FOUC なし |
| 🔐 **認証** | Supabase Auth によるメール/パスワード認証 |

---

## 使用技術

### フロントエンド
- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** — ユーティリティファーストCSS
- **lucide-react** — アイコン

### バックエンド / インフラ
- **Supabase** — PostgreSQL データベース + 認証 (Auth) + RLS（行レベルセキュリティ）
- **Web Push API** (`web-push`) — ブラウザPush通知
- **Service Worker** — オフラインキャッシュ + Push受信
- **Vercel** — デプロイ + Cron Jobs（日次リマインド配信）

### アーキテクチャ
```
ブラウザ (PWA)
  └─ Next.js App Router (Vercel)
       ├─ /api/push/subscribe   購読情報をSupabaseに保存
       ├─ /api/push/send        手動通知送信（管理用）
       └─ /api/cron/notify      Vercel Cronが毎日実行
                                  └─ 期限が近いタスクを検索
                                       └─ web-push で通知送信
Supabase (PostgreSQL + RLS)
  ├─ tasks              タスク（課題/出席/テスト）
  ├─ courses            授業・時間割
  ├─ attendance_records 出席記録
  └─ push_subscriptions Push購読情報
```

---

## こだわりポイント

### 1. UX — モバイルファーストなUI設計
スマホでの利用を前提に設計。FAB（フローティングボタン）でのタスク追加、ボトムシートのモーダル、ボトムナビゲーションなど、ネイティブアプリに近い操作感を実現。

### 2. Push通知の実装
Web Push API + Service Worker の組み合わせで、ブラウザを閉じていてもバックグラウンドで通知を受信。Vercel Cron Jobs でサーバーサイドから定期的に通知を配信する仕組みを構築。

### 3. ダークモードの FOUC（フラッシュ）対策
`localStorage` の設定をページ描画前に読み込むインラインスクリプトを `<head>` に埋め込み、ダークモード切り替え時の白い点滅を防止。

### 4. PWA 対応
`manifest.json` + Service Worker でインストール可能な PWA として動作。静的アセットはキャッシュファースト、APIリクエストはネットワークファーストのキャッシュ戦略を採用。

---

## 今後の開発予定

- **ソーシャル機能** — 同じ授業を受けている学生同士で課題・シラバスを共有
- **GPA計算** — 成績を入力してGPAを自動算出・目標GPA達成の可否を予測
- **タスク編集** — 登録済みタスクのインライン編集
- **カレンダービュー** — 月次カレンダーで期限を俯瞰

---

## ローカル環境での起動

### 1. リポジトリをクローン
```bash
git clone https://github.com/Haru-Togashi/unitask.git
cd unitask
npm install
```

### 2. 環境変数を設定
```bash
cp .env.example .env.local
# .env.local を編集して各値を設定
```

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# VAPID鍵の生成: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:your@email.com

CRON_SECRET=your_random_secret
```

### 3. Supabase でテーブルを作成

```sql
-- 授業
create table courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  color text not null default '#3b82f6',
  day_of_week int,  -- 0=月 〜 4=金
  period int,       -- 1〜5限
  created_at timestamptz default now()
);

-- タスク
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  course_name text not null default '',
  task_type text not null check (task_type in ('assignment','attendance','exam')),
  due_date timestamptz,
  is_completed boolean not null default false,
  created_at timestamptz default now()
);

-- 出席記録
create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  course_id uuid references courses not null,
  date date not null,
  status text not null check (status in ('present','absent','late')),
  created_at timestamptz default now(),
  unique(user_id, course_id, date)
);

-- Push購読
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  endpoint text not null,
  subscription jsonb not null,
  created_at timestamptz default now()
);

-- RLS有効化
alter table courses enable row level security;
alter table tasks enable row level security;
alter table attendance_records enable row level security;
alter table push_subscriptions enable row level security;

-- RLSポリシー（自分のデータのみ操作可）
create policy "own" on courses for all using (auth.uid() = user_id);
create policy "own" on tasks for all using (auth.uid() = user_id);
create policy "own" on attendance_records for all using (auth.uid() = user_id);
create policy "own" on push_subscriptions for all using (auth.uid() = user_id);
```

### 4. 開発サーバー起動
```bash
npm run dev
```

http://localhost:3000 をブラウザで開く。

---

## ディレクトリ構成

```
unitask/
├── app/
│   ├── page.tsx              # ダッシュボード
│   ├── courses/page.tsx      # 授業管理
│   ├── login/page.tsx        # ログイン・新規登録
│   ├── layout.tsx            # レイアウト（ダークモード初期化）
│   ├── globals.css           # Tailwind v4 + CSS変数
│   └── api/
│       ├── push/subscribe/   # Push購読登録
│       ├── push/send/        # Push通知送信（管理用）
│       └── cron/notify/      # Cronリマインド配信
├── lib/
│   ├── supabase.ts           # Supabaseブラウザクライアント
│   └── webpush.ts            # web-push 遅延初期化ラッパー
├── public/
│   ├── sw.js                 # Service Worker
│   ├── manifest.json         # PWAマニフェスト
│   └── icons/                # アプリアイコン
└── vercel.json               # Vercel Cron設定
```

---

## 作者

**Haru Togashi**  
GitHub: [@Haru-Togashi](https://github.com/Haru-Togashi)

---

*Built with Next.js, Supabase, and a lot of anxiety about deadlines.*
