/**
 * Komandio DevKit — Mock Bridge
 * Injected into the overlay page to replace chrome.webview with a mock
 * that intercepts service calls, logs traffic to the DevKit panel,
 * and dispatches responses from the loaded scenario config.
 */
(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────

  let _config = { scenarios: [], serviceResponses: {} };
  let _activeScenario = null;
  const _webviewListeners = [];

  // ── Logging ────────────────────────────────────────────────────────────────

  function log(direction, data) {
    window.parent.postMessage({ type: '__devkit_log', direction, data }, '*');
  }

  // ── Service response dispatch ──────────────────────────────────────────────

  function dispatchServiceResponse(requestId, command, result, error) {
    const msg = {
      intent: 'overlay.update',
      command: 'SERVICE_RESPONSE',
      payload: { requestId, result: result ?? null, error: error ?? null }
    };
    log('in', msg);
    window.dispatchEvent(new MessageEvent('message', { data: msg }));
  }

  function dispatchOverlayEvent(command, payload) {
    const msg = { intent: 'overlay.update', command, payload: payload ?? {} };
    log('in', msg);

    // Deliver via chrome.webview listener (WebView2 path)
    for (const fn of _webviewListeners) {
      try { fn({ data: msg }); } catch (_) {}
    }

    // Also deliver via window.message (fallback path)
    window.dispatchEvent(new MessageEvent('message', { data: msg }));
  }

  // ── chrome.webview mock ────────────────────────────────────────────────────

  const _chromeMock = {
    webview: {
      postMessage(msg) {
        log('out', msg);

        if (!msg || !msg.payload) return;
        const { action, requestId, command, payload } = msg.payload;

        if (action === 'CALL_SERVICE') {
          // Look for a response in active scenario first, then global serviceResponses
          const responses =
            (_activeScenario && _activeScenario.serviceResponses) ||
            _config.serviceResponses ||
            {};

          const entry = responses[command];

          setTimeout(() => {
            if (!entry) {
              dispatchServiceResponse(requestId, command, null, `No mock response configured for command "${command}"`);
              return;
            }
            if (entry.error) {
              dispatchServiceResponse(requestId, command, null, entry.error);
            } else {
              dispatchServiceResponse(requestId, command, entry.result ?? entry, null);
            }
          }, entry?.__delay ?? 50);
          return;
        }

        if (action === 'READY') {
          log('info', { message: 'Overlay reported READY' });
          window.parent.postMessage({ type: '__devkit_ready' }, '*');
          return;
        }

        if (action === 'OPEN_SETTINGS') {
          log('info', { message: 'Overlay opened settings (no-op in DevKit)' });
          return;
        }
      },

      addEventListener(type, fn) {
        if (type === 'message') _webviewListeners.push(fn);
      },

      removeEventListener(type, fn) {
        if (type !== 'message') return;
        const idx = _webviewListeners.indexOf(fn);
        if (idx !== -1) _webviewListeners.splice(idx, 1);
      }
    }
  };

  // Install mock — preserve existing chrome object if present
  if (!window.chrome) {
    window.chrome = _chromeMock;
  } else if (!window.chrome.webview) {
    window.chrome.webview = _chromeMock.webview;
  }

  // ── Parent → iframe messaging ──────────────────────────────────────────────

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;

    if (msg.type === '__devkit_apply_scenario') {
      _activeScenario = msg.scenario ?? null;
      log('info', { message: `Scenario applied: ${_activeScenario?.name ?? '(none)'}` });
      return;
    }

    if (msg.type === '__devkit_inject_event') {
      dispatchOverlayEvent(msg.command, msg.payload);
      return;
    }

    if (msg.type === '__devkit_set_config') {
      _config = msg.config ?? { scenarios: [], serviceResponses: {} };
      log('info', { message: 'Config loaded' });
      return;
    }
  });

  // ── Ready signal ───────────────────────────────────────────────────────────

  window.parent.postMessage({ type: '__devkit_bridge_ready' }, '*');
  console.log('[DevKit] Mock bridge installed');
})();
