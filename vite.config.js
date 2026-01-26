import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  base: "./", // 拡張機能では必須：パスを相対形式にする
  build: {
    rollupOptions: {
      input: {
        // パネル本体（Svelteの画面）
        main: "index.html",
        // バックグラウンド処理（必要なら）
        background: "src/background.js",
      },
      output: {
        // ファイル名を固定することで manifest.json から読み込みやすくする
        entryFileNames: "[name].js",
      },
    },
  },
});