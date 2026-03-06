# UniTask - プロジェクト設計書

## 概要
大学生向けの授業タスク管理Webアプリ。出席コードの入力期限や課題提出の期限を管理し、リマインド通知で単位の取りこぼしを防ぐ。

## 開発者情報
- GitHubリポジトリ: https://github.com/Haru-Togashi/unitask
- Supabase Project URL: `.env.local` に記載
- 開発環境: Windows / VSCode / PowerShell

## 技術スタック
- **フロントエンド**: Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **バックエンド**: Supabase (PostgreSQL + Auth + Edge Functions)
- **デプロイ**: Vercel（予定）

## 現在のファイル構成
```
unitask/
├── src/
│   ├── app/
│   │   ├── login/
│   │   │   └── page.tsx        # ログイン・新規登録ページ
│   │   ├── page.tsx            # ダッシュボード（メイン画面）
│   │   ├── layout.tsx          # レイアウト
│   │   └── globals.css         # グローバルCSS
│   └── lib/
│       ├── supabase.ts         # Supabaseクライアント設定
│       └── utils.ts            # ユーティリティ
├── .env.local                  # 環境変数（Supabase URLとAnon Key）
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## 完成済みの機能
1. ✅ ユーザー登録・ログイン（Supabase Auth / Email認証）
2. ✅ タスクの追加（タスク名、授業名、期限、種類）
3. ✅ タスクの一覧表示（期限切れ / 今日 / 今後の予定に分類）
4. ✅ タスクの完了チェック・削除
5. ✅ 日本時間（JST）での正しい日時表示

## データベース構成（Supabase）

### tasksテーブル
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

### RLSポリシー（設定済み）
- Users can view own tasks (SELECT)
- Users can insert own tasks (INSERT)
- Users can update own tasks (UPDATE)
- Users can delete own tasks (DELETE)

## 今後の開発タスク（優先度順）

### Phase 1: UI改善とスマホ対応
- [ ] レスポンシブデザイン（モバイルファーストに改善）
- [ ] ヘッダーにナビゲーションメニュー追加
- [ ] タスクの編集機能
- [ ] 完了済みタスクの表示/非表示切り替え
- [ ] ダークモード対応

### Phase 2: 授業管理機能
- [ ] coursesテーブルの作成
```sql
CREATE TABLE courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,  -- 0=月 1=火 ... 6=日
  period INTEGER NOT NULL,       -- 1限, 2限, ...
  room TEXT,
  teacher TEXT,
  max_absences INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
- [ ] attendancesテーブルの作成
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
- [ ] 授業の登録・一覧画面
- [ ] 時間割表示
- [ ] 出席回数の記録と「あと何回休めるか」の可視化

### Phase 3: 通知・リマインド機能
- [ ] Service Worker + Web Push API でブラウザ通知
- [ ] 課題提出の24時間前に通知
- [ ] 出席コード入力の1時間前に通知
- [ ] Vercel Cron Jobsで定期実行
- [ ] LINE Messaging API連携（オプション）

### Phase 4: PWA化とデプロイ
- [ ] PWA対応（manifest.json, Service Worker）
- [ ] ホーム画面に追加できるようにする
- [ ] Vercelにデプロイ
- [ ] 独自ドメイン設定（オプション）

### Phase 5: ソーシャル機能
- [ ] 同じ授業を取っている人と課題情報を共有
- [ ] GPA・単位数シミュレーション

## ブラウザ操作が必要な作業（Claude Codeでは不可）
以下はClaude Codeでは実行できず、手動でブラウザ操作が必要：
- Supabaseダッシュボードでのテーブル作成（SQL Editor）
- Supabaseの認証設定変更
- GitHubリポジトリの作成・設定
- Vercelのデプロイ設定
- LINE Developers Consoleでの設定

## Claude Codeへの指示例
- 「Phase 1のレスポンシブデザイン対応をやって」
- 「coursesテーブルを使った授業管理ページを作って」
- 「通知機能のService Workerを実装して」
- 「PWA化してmanifest.jsonを追加して」

## 注意事項
- Windows環境のためターミナルはPowerShellを使用
- `src/app/` 以下がApp Routerのページ構成
- Supabaseの接続情報は `.env.local` に記載（GitHubにはpushしない）
- タイムゾーンはJST（UTC+9）で表示すること
