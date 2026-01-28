<script lang="ts">
  import JSONTree from 'svelte-json-tree'; // 追加
  
  // --- 1. 状態管理 ($state) ---
  // $state を使うことで、変数の値が変わると画面が自動更新されます
  let apis = $state([]);         // 通信リストの配列
  let selected = $state(null);   // 現在選択中の通信データ
  let cookieString = $state(""); // 表示用のクッキー文字列

  // --- 2. Chrome API による通信監視 ---
  if (typeof chrome !== 'undefined' && chrome.devtools) {
    // ネットワークリクエストが完了したときに発火
    chrome.devtools.network.onRequestFinished.addListener((request) => {
      const currentUrl = request.request.url;
      const mimeType = request.response.content.mimeType || "";

      // 【フィルタリング】特定の拡張子を持つ静的ファイルを除外
      const ignoreExtensions = [".woff2", ".woff", ".ttf", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".js"];
      if (ignoreExtensions.some(ext => currentUrl.toLowerCase().split('?')[0].endsWith(ext))) return;

      // 【API判定】JSONデータ または 特定のURLパターンのみに絞り込む
      const isJson = mimeType.includes('json');
      const isApiCall = currentUrl.includes('/api/') || currentUrl.includes('handler=') || currentUrl.includes('localhost'); 
      if (!isJson && !isApiCall) return;

      // 表示用のデータオブジェクトを作成
      const newEntry = {
        id: crypto.randomUUID(),
        url: currentUrl,
        method: request.request.method,
        status: request.response.status,
        mimeType: mimeType,
        time: Math.round(request.time),
        requestBody: request.request.postData ? request.request.postData.text : null,
        body: null 
      };

      // リクエストBodyがJSONならオブジェクトに変換
      if (newEntry.requestBody) {
        try { newEntry.requestBody = JSON.parse(newEntry.requestBody); } catch (e) {}
      }

      // レスポンスBodyを取得
      request.getContent((content) => {
        if (!content) return;

        let finalData = content;
        
        try {
          // 1回目のパース
          finalData = JSON.parse(content);
          
          // 【ここが重要】もしパース結果がまだ「文字列」で、かつJSONっぽいなら、もう一度パースする
          if (typeof finalData === 'string') {
            const trimmed = finalData.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              finalData = JSON.parse(trimmed);
            }
          }
        } catch (e) {
          // パース失敗時は元のコンテンツのまま
          finalData = content;
        }

        // 状態を更新
        apis = apis.map(api => 
          api.id === newEntry.id ? { ...api, body: finalData } : api
        );
        if (selected && selected.id === newEntry.id) {
          selected = { ...selected, body: finalData };
        }
      });

      // 【状態更新】配列の先頭に追加。Svelteがこれを検知してリストを再描画
      apis = [newEntry, ...apis];
      if (apis.length > 100) apis = apis.slice(0, 100); // 100件制限
    });
  }

  // --- 3. 補助関数 ---
  // URLからファイル名やエンドポイント名を抽出
  function getApiName(url) {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(p => p);
      return parts.length > 0 ? parts[parts.length - 1] : urlObj.hostname;
    } catch { return url; }
  }

  // 詳細画面を表示し、そのURLに関連するクッキーを取得
  function showDetail(api) {
    selected = api;
    chrome.cookies.getAll({ url: api.url }, (cookies) => {
      cookieString = cookies.map(c => `${c.name}=${c.value}`).join("; ");
    });
  }
</script>

<div class="api-checker-root">
  <header class="header">
    <div class="header-left">
      <span class="title">API CHECKER</span>
      <span class="count">{apis.length} items</span>
    </div>
    <button class="clear-btn" onclick={() => {apis = []; selected = null;}}>Clear All</button>
  </header>

  <main class="content">
    {#if !selected}
      <div class="list-container">
        <div class="list-head">...</div>
        <div class="list-body">
          {#each apis as api (api.id)}
            <button class="row" onclick={() => showDetail(api)}>
              <div class="col-method">
                <span class="method-tag {api.method}">{api.method}</span>
              </div>
              <div class="col-main">
                <div class="primary-text">{getApiName(api.url)}</div>
                <div class="secondary-text">{api.url}</div>
              </div>
              <div class="col-status">
                <span class="status-num" data-status={api.status}>{api.status}</span>
                <span class="time-text">{api.time}ms</span>
              </div>
            </button>
          {:else}
            <div class="empty-msg">No activity. Please reload the page.</div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="detail-view">
        <div class="detail-toolbar">
          <button class="back-btn" onclick={() => (selected = null)}>← BACK TO LIST</button>
        </div>

        <div class="detail-scroll">
          <section>
            <div class="label">ENDPOINT</div>
            <div class="url-display">{selected.url}</div>
          </section>

          <section>
            <div class="label" style="color: #4caf50; border-left-color: #4caf50;">RESPONSE BODY</div>
            <div class="code-container tree-mode">
              {#if selected.body}
                {@const displayData = (typeof selected.body === 'string' && (selected.body.trim().startsWith('{') || selected.body.trim().startsWith('['))) 
                  ? JSON.parse(selected.body) 
                  : selected.body}

                <span style="font-size: 10px; color: #444; margin-bottom: 5px; display: block;">
                  Detected Type: {Array.isArray(displayData) ? 'Array' : typeof displayData}
                </span>

                {#if typeof displayData === 'object' && displayData !== null}
                  <JSONTree value={displayData} defaultExpandedLevel={1} />
                {:else}
                  <pre><code style="color: #dcdcaa;">{displayData}</code></pre>
                {/if}
              {:else}
                <div class="no-data">Loading or no response data...</div>
              {/if}
            </div>
          </section>

          <section>
            <div class="label">COOKIES</div>
            <div class="cookie-list">
              {#if cookieString}
                {#each cookieString.split('; ') as cookie}
                  <div class="cookie-item">{cookie}</div>
                {/each}
              {:else}
                <div class="no-data">No cookies found for this domain.</div>
              {/if}
            </div>
          </section>
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  /* スタイルは変更なし（そのまま維持） */
  /* --- グローバルリセット --- */
  :global(html, body) {
    margin: 0 !important;
    padding: 0 !important;
    background-color: #000000 !important;
    color: #ffffff !important;
    font-family: 'Consolas', 'Monaco', monospace;
    overflow: hidden;
    text-align: left !important;
  }

  .api-checker-root { display: flex; flex-direction: column; height: 100vh; width: 100vw; background: #000; }
  .header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #111; border-bottom: 1px solid #333; }
  .title { font-weight: bold; color: #fff; font-size: 14px; margin-right: 12px; }
  .count { color: #666; font-size: 11px; }
  .clear-btn { background: transparent; border: 1px solid #444; color: #ccc; font-size: 10px; padding: 4px 8px; cursor: pointer; }
  .clear-btn:hover { background: #cc0000; color: white; border-color: #cc0000; }
  .content { flex: 1; overflow: hidden; display: flex; flex-direction: column; width: 100%; }
  .list-container { display: flex; flex-direction: column; height: 100%; width: 100%; }
  .list-head { display: flex; background: #1a1a1a; color: #888; font-size: 11px; padding: 8px 12px; border-bottom: 1px solid #333; }
  .list-body { flex: 1; overflow-y: auto; }
  .row { display: flex; width: 100%; background: transparent; border: none; border-bottom: 1px solid #222; padding: 10px 12px; text-align: left; cursor: pointer; align-items: center; color: #fff; }
  .row:hover { background: #111; }
  .col-method { width: 70px; flex-shrink: 0; }
  .col-main { flex: 1; min-width: 0; padding-right: 10px; }
  .col-status { width: 90px; text-align: right; flex-shrink: 0; }
  .method-tag { font-size: 10px; font-weight: bold; padding: 2px 5px; border-radius: 2px; }
  .GET { color: #4caf50; border: 1px solid #4caf50; }
  .POST { color: #2196f3; border: 1px solid #2196f3; }
  .primary-text { font-weight: bold; font-size: 13px; color: #eee; margin-bottom: 3px; }
  .secondary-text { font-size: 11px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .status-num { font-weight: bold; font-size: 12px; margin-right: 8px; }
  .status-num[data-status^="2"] { color: #4caf50; }
  .status-num[data-status^="4"], .status-num[data-status^="5"] { color: #f44336; }
  .time-text { color: #444; font-size: 10px; }
  .detail-view { display: flex; flex-direction: column; height: 100%; background: #000; }
  .detail-toolbar { padding: 10px; border-bottom: 1px solid #333; }
  .back-btn { background: #222; border: 1px solid #444; color: #fff; padding: 6px 12px; cursor: pointer; font-size: 11px; }
  .detail-scroll { flex: 1; overflow-y: auto; padding: 15px; }
  section { margin-bottom: 25px; }
  .label { font-size: 11px; color: #666; font-weight: bold; margin-bottom: 8px; border-left: 3px solid #333; padding-left: 8px; }
  .url-display { font-size: 12px; color: #2196f3; word-break: break-all; }
  .code-container pre { background: #0a0a0a; border: 1px solid #222; padding: 12px; border-radius: 4px; overflow-x: auto; margin: 0; }
  code { font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; }
  .cookie-list { display: flex; flex-direction: column; gap: 5px; }
  .cookie-item { background: #111; padding: 6px 10px; border-radius: 3px; font-size: 11px; color: #ccc; border: 1px solid #222; word-break: break-all; }
  .empty-msg, .no-data { padding: 40px; text-align: left; color: #444; font-size: 12px; }
  /* JSONツリーをモノトーン基調に設定 */
  .code-container.tree-mode {
    background: #0a0a0a;
    padding: 12px;
    border: 1px solid #222;
    border-radius: 4px;
    
    --json-tree-font-family: 'Consolas', monospace;
    --json-tree-font-size: 13px;
    --json-tree-bg: transparent;

    /* --- 配色のカスタマイズ（モノトーン＋α） --- */
    --json-tree-label-color: #666666;      /* 矢印や記号（控えめなグレー） */
    --json-tree-property-color: #ffffff;   /* キー名 (白：一番目立たせる) */
    
    /* 値は少しトーンを落として、キー名と区別をつける */
    --json-tree-string-color: #aaaaaa;    /* 文字列 (明るいグレー) */
    --json-tree-number-color: #aaaaaa;    /* 数値 (グレー) */
    --json-tree-boolean-color: #aaaaaa;   /* 真偽値 (グレー) */
    --json-tree-null-color: #666666;      /* null (暗めのグレー) */
    --json-tree-undefined-color: #666666; /* undefined */
  }

  /* 選択中の行をわずかに浮かび上がらせる */
  :global(.json-tree-pair:hover) {
    background-color: rgba(255, 255, 255, 0.03) !important;
  }
</style>