# UniTask - プロジェクト設計書

## 概要
大学生向けの授業タスク管理Webアプリ。出席コードの入力期限や課題提出の期限を管理し、リマインド通知で単位の取りこぼしを防ぐ。

## 開発者情報
- GitHubリポジトリ: https://github.com/Haru-Togashi/unitask
- Supabase Project URL: `.env.local` に記載
- 開発環境: Windows / VSCode / PowerShell

## 技術スタック
- **フロントエンド**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui
- **バックエンド**: Supabase (PostgreSQL + Auth + Edge Functions)
- **デプロイ**: Vercel（予定）

## 現在のファイル構成
```
unitask/
├── app/
│   ├── courses/
│   │   └── page.tsx        # 授業管理ページ（時間割・出席記録）
│   ├── login/
│   │   └── page.tsx        # ログイン・新規登録ページ
│   ├── page.tsx            # ダッシュボード（メイン画面）
│   ├── layout.tsx          # レイアウト（ダークモード初期化・メタデータ）
│   └── globals.css         # グローバルCSS（Tailwind v4 + shadcn変数）
├── lib/
│   └── supabase.ts         # Supabaseクライアント設定（ブラウザ用）
├── public/                 # 静的ファイル
├── .env.local              # 環境変数（Supabase URLとAnon Key）
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── UNITASK_PROJECT.md      # このファイル（プロジェクト設計書）
└── PROJECT_CODE.md         # 主要ファイルのコード一覧
```

## 完成済みの機能
1. ✅ ユーザー登録・ログイン（Supabase Auth / Email認証）
2. ✅ タスクの追加（タスク名、授業名、期限、種類）
3. ✅ タスクの一覧表示（期限切れ / 今日 / 今後の予定に分類）
4. ✅ タスクの完了チェック・削除
5. ✅ 日本時間（JST）での正しい日時表示
6. ✅ **モバイルファーストUI（Phase 1完了）**
   - レスポンシブデザイン（max-w-2xl で PC でも見やすく）
   - 固定ヘッダー（UniTask ロゴ + 未対応件数バッジ + ログアウト）
   - 緊急アラートバナー（期限切れ・今日締切を画面上部で強調）
   - タスクカードの左ボーダー色分け（赤=期限切れ / オレンジ=今日 / 青=今後）
   - 相対時間表示（「3時間後」「2日後」など）
   - 完了済みタスクの表示/非表示切り替え（▼ボタン）
   - FAB（右下の浮いた + ボタン）でタスク追加
   - ボトムシート（下から滑り上がるフォーム）
   - タスク種別をボタンで選択（課題 / 出席 / テスト）
7. ✅ **ダークモード対応（Phase 1完了）**
   - ヘッダーの🌙/☀️ボタンで切替
   - `localStorage` に保存（リロードしても維持）
   - システム設定を初期値として使用（FOUC防止スクリプト付き）
8. ✅ **授業管理機能（Phase 2完了）**
   - 授業の登録・編集・削除（/courses）
   - 時間割を表形式で表示（月〜金 × 1〜6限）
   - 今日の曜日列をハイライト表示
   - 時間割のマス目タップで授業追加フォームが開く（曜日・時限が自動入力）
   - 出席記録の登録（出席 / 欠席 / 遅刻）/ 今日の記録を即時切替
   - 欠席回数の可視化（プログレスバー・「あと○回休めます」表示）
   - 欠席が上限に近づくと赤色で警告
   - 授業詳細シート（出席履歴・削除・編集）
   - ダッシュボードと授業管理のボトムナビゲーション

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

### coursesテーブル
```sql
CREATE TABLE courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,  -- 0=月 1=火 ... 4=金
  period INTEGER NOT NULL,       -- 1限, 2限, ...
  room TEXT,
  teacher TEXT,
  max_absences INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### attendancesテーブル
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

### RLSポリシー（設定済み）
- Users can view/insert/update/delete own tasks
- Users can view/insert/update/delete own courses
- Users can view/insert/update/delete own attendances

## 今後の開発タスク（優先度順）

### Phase 1: UI改善とスマホ対応 ✅ 完了
- [x] レスポンシブデザイン（モバイルファーストに改善）
- [x] ヘッダーにダークモードトグルとログアウト
- [x] 完了済みタスクの表示/非表示切り替え
- [x] ダークモード対応
- [ ] タスクの編集機能（未実装）

### Phase 2: 授業管理機能 ✅ 完了
- [x] coursesテーブルの作成
- [x] attendancesテーブルの作成
- [x] 授業の登録・編集・削除ページ（/courses）
- [x] 時間割表示（月〜金 × 1〜6限）
- [x] 出席回数の記録と「あと何回休めるか」の可視化
- [x] ダッシュボードから授業管理ページへのナビゲーション

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
- 「タスクの編集機能を追加して」
- 「Phase 3の通知機能のService Workerを実装して」
- 「PWA化してmanifest.jsonを追加して」
- 「Vercelにデプロイする設定をして」

## 注意事項
- Windows環境のためターミナルはPowerShellを使用
- `app/` 以下がApp Routerのページ構成（srcディレクトリなし）
- Supabaseの接続情報は `.env.local` に記載（GitHubにはpushしない）
- タイムゾーンはJST（UTC+9）で表示すること
- ダークモードは `.dark` クラスをhtmlタグに付与する方式（Tailwind v4対応）
- ファイル書き込みにはcat heredocを使用（Windowsのパスに日本語を含むため）
