## Worklog Timer

作業時間と作業ログを記録するためのアプリ。

主に創作活動を想定しているが、
イラスト制作・音楽制作・プログラミング・勉強など
様々な作業の記録ツールとして利用できる。

## コンセプト

本アプリは「作業の可視化」を目的としたツールです。

タイマーによる作業記録とログ管理を組み合わせることで、
日々の作業量や継続状況を振り返ることができます。

## 開発背景

個人で創作活動を行う中で、
「どれくらい作業したのか」「何に時間を使ったのか」を
振り返る手段が欲しいと感じていた。

特に個人制作では作業ログが残りにくく、
継続のモチベーション管理が難しい。

そのため

- 作業時間を自然に記録できる
- プロジェクト単位で作業履歴を残せる
- 見返した際の達成感を次の活動に活かせる

ツールとして本アプリを開発している。

## 設計思想

本アプリでは「作業ログを自然に蓄積する」ことを重視している。

そのため

- タイマー停止時にコミットを促す
- 作業単位をプロジェクトに紐付ける

など、作業フローを崩さない設計を意識した。

タイマー起動 → 作業 → タイマーストップ（保存）

のように単純な操作でプロジェクトの進行を記録できる

## 技術スタック
- React
- TypeScript
- Vite
- React Router
状態管理は現状 React Context のみ。
永続化は一部 localStorage（sessions / commits）。

## 機能一覧（現時点）

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

## ディレクトリ構成（簡易）
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
 
## 状態設計方針
URLを正本とする

/projects/:projectId/timer
→ projectId を useParams で取得
→ Context の projects から検索

Projects は Context管理

アプリ全体で共有

永続化は未実装

Sessions / Commits は localStorage管理

今後 DB 化想定

## 今後の予定

- プロジェクト永続化（localStorage → DB）
- プロジェクト詳細ページ強化
- コミット回数の project単位集計
- 作業ログ画像添付
- GIF生成（タイムラプス）
- SNS共有機能
- プロジェクト内小目標の実装
- 全体スケジュールカレンダーの実装

## 開発方針

- MVPで小さく作る
- UI → データ → 永続化の順で拡張
- 責務分離（Context / Page / Modal）
- URLを状態の正本にする
