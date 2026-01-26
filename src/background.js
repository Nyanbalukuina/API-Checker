// @ts-nocheck
/// <reference types="chrome" />

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    chrome.storage.local.set({
      ["req_" + details.requestId]: {
        url: details.url,
        method: details.method,
        requestHeaders: details.requestHeaders
      }
    });

    return undefined;
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);

chrome.webRequest.onCompleted.addListener(
  (details) => {
    const key = "req_" + details.requestId;

    chrome.storage.local.get(key, (req) => {
      const data = /** @type {any} */ (req[key]);
      if (!data) return;

      const apiData = {
        url: data.url,
        method: data.method,
        status: details.statusCode,
        requestHeaders: data.requestHeaders
      };

      chrome.storage.local.set({
        ["api_" + details.requestId]: apiData
      });
    });

    return undefined;
  },
  { urls: ["<all_urls>"] }
);
