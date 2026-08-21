/* Komandio Web SDK. This file is injected into extension WebView overlays. */
(function () {
  "use strict";
  class WebBridge {
    constructor() {
      this.messageId = 0;
      this.pending = new Map();
      this.commandHandlers = new Map();
      window.addEventListener("message", this.handleMessage.bind(this));
      if (window.chrome && window.chrome.webview) {
        window.chrome.webview.addEventListener("message", (event) => this.handleMessage({ data: event.data }));
      }
    }
    handleMessage(event) {
      const message = event.data;
      if (message.intent === "overlay.update" && message.command === "SERVICE_RESPONSE") {
        const { requestId, result, error } = message.payload;
        const pending = this.pending.get(requestId);
        if (pending) {
          error ? pending.reject(new Error(error)) : pending.resolve(result);
          this.pending.delete(requestId);
        }
        return;
      }
      if (message.intent === "overlay.update" && message.command) {
        const handlers = this.commandHandlers.get(message.command);
        if (handlers) handlers.forEach((handler) => handler(message.payload));
      }
    }
    onCommand(command, handler) {
      if (!this.commandHandlers.has(command)) this.commandHandlers.set(command, []);
      this.commandHandlers.get(command).push(handler);
    }
    callService(command, payload) {
      const requestId = String(++this.messageId);
      return new Promise((resolve, reject) => {
        this.pending.set(requestId, { resolve, reject });
        if (window.chrome && window.chrome.webview) {
          window.chrome.webview.postMessage({ type: "interaction", payload: { action: "CALL_SERVICE", requestId, command, payload } });
        } else {
          this.pending.delete(requestId);
          reject(new Error("Not running in Komandio WebView context."));
        }
      });
    }
    openSettings(extensionId) {
      if (window.chrome && window.chrome.webview) {
        window.chrome.webview.postMessage({ type: "interaction", payload: { action: "OPEN_SETTINGS", extensionId } });
      }
    }
    reportReady() {
      if (window.chrome && window.chrome.webview) {
        window.chrome.webview.postMessage({ type: "interaction", payload: { action: "READY" } });
      }
    }
  }
  const bridge = new WebBridge();
  window.Komandio = {
    service: {
      call: (command, payload) => bridge.callService(command, payload),
      getProxy: () => new Proxy({}, { get: (_, property) => (payload) => bridge.callService(String(property), payload) })
    },
    ui: { onCommand: (command, handler) => bridge.onCommand(command, handler) },
    os: {
      openSettings: (extensionId) => bridge.openSettings(extensionId),
      reportReady: () => bridge.reportReady()
    }
  };
})();
