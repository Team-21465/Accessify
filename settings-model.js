/** Sync defaults + local domain map; merge: defaults -> first matching group -> host. */
(function (global) {
  'use strict';

  var DOMAIN_STORAGE_KEY = 'accessifyDomainSettings';

  var DEFAULT_SETTINGS = {
    textSize: 1.0,
    contrastMode: 'off',
    textColor: '#000000',
    backgroundColor: '#ffffff',
    dyslexiaFont: false,
    highlightLinks: false,
    highlightHeaders: false,
    bigCursor: false,
    colorBlindFilter: 'off',
    screenReader: false,
    readingGuide: false,
    readingMask: false,
    stopAnimations: false,
    lineHeight: '',
    letterSpacing: 0,
    textAlignment: '',
    widgetCorner: 'bl',
    widgetHidden: false,
    cursorSize: 'md',
    readingMaskBand: 'md',
    prominentFocus: false
  };

  var SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

  function normalizeDomainSettings(raw) {
    if (!raw || typeof raw !== 'object') {
      return { hosts: {}, groups: [] };
    }
    return {
      hosts: typeof raw.hosts === 'object' && raw.hosts !== null ? raw.hosts : {},
      groups: Array.isArray(raw.groups) ? raw.groups : []
    };
  }

  function mergeLayer(base, partial) {
    var out = {};
    var k;
    for (k in base) {
      if (Object.prototype.hasOwnProperty.call(base, k)) {
        out[k] = base[k];
      }
    }
    if (!partial || typeof partial !== 'object') {
      return out;
    }
    for (var i = 0; i < SETTING_KEYS.length; i++) {
      k = SETTING_KEYS[i];
      if (Object.prototype.hasOwnProperty.call(partial, k)) {
        out[k] = partial[k];
      }
    }
    return out;
  }

  function hostnameMatchesPattern(hostname, pattern) {
    var p = String(pattern || '').trim().toLowerCase();
    if (!p) {
      return false;
    }
    var h = String(hostname || '').toLowerCase();
    if (p.indexOf('*.') === 0) {
      return h === p.slice(2) || h.endsWith(p.slice(1));
    }
    return h === p || h.indexOf(p) === 0;
  }

  function matchGroup(hostname, patterns) {
    if (!patterns || !patterns.length) {
      return false;
    }
    for (var i = 0; i < patterns.length; i++) {
      if (hostnameMatchesPattern(hostname, patterns[i])) {
        return true;
      }
    }
    return false;
  }

  function extractDefaultsFromSync(syncObj) {
    var out = mergeLayer(DEFAULT_SETTINGS, {});
    if (!syncObj || typeof syncObj !== 'object') {
      return out;
    }
    for (var i = 0; i < SETTING_KEYS.length; i++) {
      var k = SETTING_KEYS[i];
      if (Object.prototype.hasOwnProperty.call(syncObj, k)) {
        var v = syncObj[k];
        if (k === 'contrastMode' && v === 'auto') {
          v = 'off';
        }
        out[k] = v;
      }
    }
    return out;
  }

  function computeEffectiveSettings(syncDefaults, domainSettings, hostname) {
    var ds = normalizeDomainSettings(domainSettings);
    var eff = mergeLayer(DEFAULT_SETTINGS, syncDefaults);
    var g;
    var i;
    for (i = 0; i < ds.groups.length; i++) {
      g = ds.groups[i];
      if (g && g.patterns && matchGroup(hostname, g.patterns) && g.settings) {
        eff = mergeLayer(eff, g.settings);
      }
    }
    var hostKey = String(hostname || '').toLowerCase();
    if (ds.hosts[hostKey]) {
      eff = mergeLayer(eff, ds.hosts[hostKey]);
    }
    return eff;
  }

  function valuesEqual(a, b) {
    return a === b;
  }

  function diffKeys(effective, reference) {
    var keys = [];
    for (var i = 0; i < SETTING_KEYS.length; i++) {
      var k = SETTING_KEYS[i];
      if (!valuesEqual(effective[k], reference[k])) {
        keys.push(k);
      }
    }
    return keys;
  }

  function stripToPartial(effective, reference) {
    var partial = {};
    for (var i = 0; i < SETTING_KEYS.length; i++) {
      var k = SETTING_KEYS[i];
      if (!valuesEqual(effective[k], reference[k])) {
        partial[k] = effective[k];
      }
    }
    return partial;
  }

  function newGroupId() {
    return 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function findFirstMatchingGroupId(domainSettings, hostname) {
    var ds = normalizeDomainSettings(domainSettings);
    var i;
    for (i = 0; i < ds.groups.length; i++) {
      var g = ds.groups[i];
      if (g && g.id && g.patterns && matchGroup(hostname, g.patterns)) {
        return g.id;
      }
    }
    return null;
  }

  function hasHostOverrides(domainSettings, hostname) {
    var ds = normalizeDomainSettings(domainSettings);
    var hk = ds.hosts[String(hostname || '').toLowerCase()];
    if (!hk || typeof hk !== 'object') {
      return false;
    }
    var k;
    for (k in hk) {
      if (Object.prototype.hasOwnProperty.call(hk, k)) {
        return true;
      }
    }
    return false;
  }

  // Widget dropdown default: host if any host partial, else first matching group, else global.
  function suggestedScopeForPage(domainSettings, hostname) {
    if (hasHostOverrides(domainSettings, hostname)) {
      return 'host';
    }
    var gid = findFirstMatchingGroupId(domainSettings, hostname);
    if (gid) {
      return 'group:' + gid;
    }
    return 'default';
  }

  global.AccessifySettings = {
    DOMAIN_STORAGE_KEY: DOMAIN_STORAGE_KEY,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    SETTING_KEYS: SETTING_KEYS,
    normalizeDomainSettings: normalizeDomainSettings,
    mergeLayer: mergeLayer,
    computeEffectiveSettings: computeEffectiveSettings,
    extractDefaultsFromSync: extractDefaultsFromSync,
    diffKeys: diffKeys,
    stripToPartial: stripToPartial,
    newGroupId: newGroupId,
    matchGroup: matchGroup,
    findFirstMatchingGroupId: findFirstMatchingGroupId,
    hasHostOverrides: hasHostOverrides,
    suggestedScopeForPage: suggestedScopeForPage
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
