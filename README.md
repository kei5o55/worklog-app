## Worklog Timer

創作活動向けの作業記録アプリ。
プロジェクト単位でタイマー計測・コミット記録を行う。

## 🚀 技術スタック
- React
- TypeScript
- Vite
- React Router
状態管理は現状 React Context のみ。
永続化は一部 localStorage（sessions / commits）。

## 🧩 機能一覧（現時点）

**1. プロジェクト管理**

- 新規プロジェクト作成（モーダル）
  - 名前（必須）
  - 納期（任意）
  - メモ（任意）
- 一覧表示
- 削除（confirmあり）
- Contextでアプリ全体共有
- ※永続化なし（リロードで消える）
  
**2. タイマー機能**
- Start / Pause / Resume / Stop
- 画面離脱時自動Pause
- タブ非表示時自動Pause
- 経過時間表示（HH:MM:SS）
3. セッション管理
- セッション一覧表示
- 状態表示（RUNNING / PAUSED / DONE）
- localStorage に保存
  
**4. コミット機能**
- Stop時にモーダル表示
- コミット確定
- projectId単位で保存
- 保存後 projects一覧へ遷移

## 🗂 ディレクトリ構成（簡易）
src/
 ├─ components/
 │   ├─ CommitModal.tsx
 │   └─ CreateProjectModal.tsx
 │
 ├─ contexts/
 │   └─ ProjectsContext.tsx
 │
 ├─ pages/
 │   ├─ ProjectsPage.tsx
 │   ├─ ProjectDetailPage.tsx
 │   └─ TimerPage.tsx
 │
 ├─ App.tsx
 └─ main.tsx
 
## 🧠 状態設計方針
URLを正本とする

/projects/:projectId/timer
→ projectId を useParams で取得
→ Context の projects から検索

Projects は Context管理

アプリ全体で共有

永続化は未実装

Sessions / Commits は localStorage管理

今後 DB 化想定

## 🔮 今後の予定

- プロジェクト永続化（localStorage → DB）
- プロジェクト詳細ページ強化
- コミット回数の project単位集計
- 作業ログ画像添付
- GIF生成（タイムラプス）
- SNS共有機能

## 🏗 開発方針

- MVPで小さく作る
- UI → データ → 永続化の順で拡張
- 責務分離（Context / Page / Modal）
- URLを状態の正本にする
