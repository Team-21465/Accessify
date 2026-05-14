/** Content script: wires feature modules, applies merged settings from settings-model on load/storage/messages. */
(function () {
  'use strict';

  var S = globalThis.AccessifySettings;
  var A = globalThis.__ACCESSIFY__;
  A.hostname = location.hostname;

  A.loadAndApplyAll = function () {
    try {
      chrome.storage.sync.get(null, function (syncData) {
        if (chrome.runtime.lastError) {
          return;
        }
        chrome.storage.local.get([S.DOMAIN_STORAGE_KEY], function (loc) {
          if (chrome.runtime.lastError) {
            return;
          }
          var syncDef = S.extractDefaultsFromSync(syncData);
          var domain = S.normalizeDomainSettings(loc[S.DOMAIN_STORAGE_KEY]);
          var eff = S.computeEffectiveSettings(syncDef, domain, A.hostname);
          if (A.applyStyles) {
            A.applyStyles(eff);
          }
        });
      });
    } catch (err) {
      console.error('[Accessify] loadAndApplyAll:', err);
    }
  };

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupAll);
    } else {
      setupAll();
    }
  }

  function setupAll() {
    try {
      if (A.injectWidget) {
        A.injectWidget();
      }
      if (A.setupReadingGuide) {
        A.setupReadingGuide();
      }
      if (A.setupReadingMask) {
        A.setupReadingMask();
      }
      if (A.setupReadingGuideListener) {
        A.setupReadingGuideListener();
      }
      if (A.setupReadingMaskListener) {
        A.setupReadingMaskListener();
      }
      if (A.setupScreenReader) {
        A.setupScreenReader();
      }
      A.loadAndApplyAll();
    } catch (err) {
      console.error('[Accessify] Setup error:', err);
    }
  }

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    try {
      if (request.action === 'applySettings') {
        A.loadAndApplyAll();
        sendResponse({ success: true });
      }
    } catch (err) {
      console.error('[Accessify] Message handler:', err);
      sendResponse({ success: false, error: err.message });
    }
    return true;
  });

  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName === 'sync' || areaName === 'local') {
      A.loadAndApplyAll();
    }
  });

  console.log('[Accessify] Content script loaded');
  init();
})();
