<script lang="ts">
  // --- 状態管理 (Svelte 5 Runes) ---
  let apis = $state([]);
  let selected = $state(null);
  let cookieString = $state("");

  // --- 通信の監視 ---
  if (typeof chrome !== 'undefined' && chrome.devtools) {
    chrome.devtools.network.onRequestFinished.addListener((request) => {
      const currentUrl = request.request.url;
      const mimeType = request.response.content.mimeType || "";

      // 1. ノイズ（フォント、画像、スタイルシートなど）を完全に除外
      const ignoreExtensions = [".woff2", ".woff", ".ttf", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".js"];
      if (ignoreExtensions.some(ext => currentUrl.toLowerCase().split('?')[0].endsWith(ext))) return;

      // 2. レスポンスがJSONである、またはURLに 'api' が含まれる通信のみに限定
      // ※ バックエンドの通信は通常 application/json です
      const isJson = mimeType.includes('json');
      const isApiCall = currentUrl.includes('/api/') || currentUrl.includes('handler='); 

      if (!isJson && !isApiCall) return;

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

      // ... (以下、requestBodyのパースやgetContentの処理はそのまま)

      // リクエストBodyがJSONならパース
      if (newEntry.requestBody) {
        try {
          newEntry.requestBody = JSON.parse(newEntry.requestBody);
        } catch (e) { /* そのままテキスト */ }
      }

      // レスポンスBodyを取得
      request.getContent((content) => {
        if (content) {
          if (newEntry.mimeType.includes('json')) {
            try { newEntry.body = JSON.parse(content); } catch { newEntry.body = content; }
          } else { newEntry.body = content; }
        }
      });

      apis = [newEntry, ...apis];
      if (apis.length > 100) apis = apis.slice(0, 100);
    });
  }

  function getApiName(url) {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(p => p);
      return parts.length > 0 ? parts[parts.length - 1] : urlObj.hostname;
    } catch { return url; }
  }

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
        <div class="list-head">
          <div class="col-method">METHOD</div>
          <div class="col-main">NAME / URL</div>
          <div class="col-status">STATUS</div>
        </div>
        
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

          {#if selected.method !== 'GET'}
          <section>
            <div class="label" style="color: #2196f3; border-left-color: #2196f3;">REQUEST BODY</div>
            <div class="code-container">
              {#if selected.requestBody}
                <pre><code style="color: #61afef;">{typeof selected.requestBody === 'object' ? JSON.stringify(selected.requestBody, null, 2) : selected.requestBody}</code></pre>
              {:else}
                <div class="no-data">No request payload.</div>
              {/if}
            </div>
          </section>
          {/if}

          <section>
            <div class="label" style="color: #4caf50; border-left-color: #4caf50;">RESPONSE BODY</div>
            <div class="code-container">
              {#if selected.body}
                <pre><code style="color: #dcdcaa;">{typeof selected.body === 'object' ? JSON.stringify(selected.body, null, 2) : selected.body}</code></pre>
              {:else}
                <div class="no-data">Loading or no response data...</div>
              {/if}
            </div>
          </section>

          <section>
            <div class="label">COOKIES</div>
            <div class="cookie-list">
              {#if cookieString}
                {#each cookieString.split(';') as cookie}
                  <div class="cookie-item">{cookie.trim()}</div>
                {/each}
              {:else}
                <div class="no-data">No cookies found.</div>
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
</style>