/** Service worker: default sync keys on install; command toggles widgetHidden + pings tabs. */
importScripts('settings-model.js');

(function () {
  'use strict';

  var S = self.AccessifySettings;

  function initMissingDefaults() {
    chrome.storage.sync.get(null, function (existing) {
      if (chrome.runtime.lastError) {
        return;
      }
      var patch = {};
      var keys = S.SETTING_KEYS;
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (!Object.prototype.hasOwnProperty.call(existing, k)) {
          patch[k] = S.DEFAULT_SETTINGS[k];
        }
      }
      if (Object.keys(patch).length) {
        chrome.storage.sync.set(patch);
      }
    });
  }

  chrome.runtime.onInstalled.addListener(function () {
    initMissingDefaults();
  });

  function notifyTabsToApply() {
    chrome.tabs.query({}, function (tabs) {
      if (chrome.runtime.lastError || !tabs || !tabs.length) {
        return;
      }
      for (var i = 0; i < tabs.length; i++) {
        var tid = tabs[i].id;
        if (tid == null) {
          continue;
        }
        chrome.tabs.sendMessage(tid, { action: 'applySettings' }, function () {
          void chrome.runtime.lastError; // tab may have no content script (e.g. chrome://)
        });
      }
    });
  }

  chrome.commands.onCommand.addListener(function (command) {
    if (command !== 'toggle-widget-visibility') {
      return;
    }
    chrome.storage.sync.get(['widgetHidden'], function (data) {
      if (chrome.runtime.lastError) {
        return;
      }
      var curHidden = data.widgetHidden === true;
      var next = !curHidden;
      chrome.storage.sync.set({ widgetHidden: next }, function () {
        if (chrome.runtime.lastError) {
          return;
        }
        notifyTabsToApply();
      });
    });
  });
})();
