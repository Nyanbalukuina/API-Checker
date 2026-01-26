# API Checker - Chrome DevTools Extension

バックエンドとのAPI通信（JSON）をリアルタイムで監視し、リクエストとレスポンスの中身を素早く確認するためのChrome拡張機能です。

## 🌟 特徴

* **バックエンド特化**: 画像やフォントなどのノイズを除去し、API通信のみをリストアップします。
* **ダークモードUI**: Chrome DevToolsのテーマに馴染む高コントラストな黒背景デザイン。
* **リクエスト/レスポンス確認**: JSONデータを整形（Pretty Print）して表示。送信したPayloadも確認可能。
* **Cookie情報の表示**: 通信に関連するCookieをワンクリックで確認。

## 🛠 開発環境のセットアップ

### 推奨環境

* **Runtime**: Node.js (v18以上推奨)
* **IDE**: [VS Code](https://code.visualstudio.com/) + [Svelte extension](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)

### インストール

```bash
npm install

```

## 🚀 ビルドとインストール方法

このプロジェクトはSvelte 5 + Viteで構成されていますが、拡張機能として動かすにはビルド後のファイルをChromeに読み込ませる必要があります。

### 1. プロジェクトのビルド

```bash
npm run build

```

実行後、プロジェクト内に `dist` フォルダが生成されます。

### 2. Chromeへの読み込み

1. Chromeブラウザで `chrome://extensions/` を開きます。
2. 右上の **「デベロッパー モード」** をONにします。
3. **「展開して読み込む」** をクリックします。
4. このプロジェクトの `dist` フォルダを選択します。

### 3. 使い方

1. 任意のウェブサイトを開きます。
2. **F12**（または右クリック > 検証）でデベロッパーツールを開きます。
3. 上部タブの「🏠」または「API Checker」（隠れている場合は `>>` をクリック）を選択します。
4. ページをリロードすると、通信のキャプチャが開始されます。

## 📂 プロジェクト構造

* `src/App.svelte`: メインのUIと通信監視ロジック（Svelte 5 Runes使用）
* `public/manifest.json`: 拡張機能の設定ファイル
* `devtools.html / devtools.js`: DevToolsにパネルを登録するためのエントリーポイント

---

### 💡 開発のヒント

* **自動更新**: `npm run dev` で開発サーバーが立ち上がりますが、拡張機能の性質上、変更を反映させるには `npm run build` を行い、Chromeの拡張機能画面で「更新（🔄）」ボタンを押すのが最も確実です。
* **フィルタリング**: `App.svelte` 内の `ignoreExtensions` 配列を編集することで、除外するファイル形式をカスタマイズできます。

---