/** In-page widget: fetch template, scope-aware persist (sync vs local). */
(function () {
  'use strict';

  var S = globalThis.AccessifySettings;
  var A = globalThis.__ACCESSIFY__;

  function injectWidget() {
    var widgetCSS = document.createElement('link');
    widgetCSS.rel = 'stylesheet';
    widgetCSS.href = chrome.runtime.getURL('widget.css');
    document.head.appendChild(widgetCSS);
    fetch(chrome.runtime.getURL('widget.html'))
      .then(function (r) {
        return r.text();
      })
      .then(function (html) {
        var container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container);
        setTimeout(setupWidgetHandlers, 80); // allow parsed widget nodes to attach before querySelector wiring
      })
      .catch(function (err) {
        console.error('[Accessify] Widget injection error:', err);
      });
  }

  function rebuildScopeOptions(domain, hostKey) {
    var sel = document.getElementById('acc-scope-select');
    if (!sel) {
      return;
    }
    var current = sel.value;
    sel.innerHTML = '';
    var oDef = document.createElement('option');
    oDef.value = 'default';
    oDef.textContent = 'Default (all sites)';
    sel.appendChild(oDef);
    var oHost = document.createElement('option');
    oHost.value = 'host';
    oHost.textContent = 'This site (' + hostKey + ')';
    sel.appendChild(oHost);
    var i;
    var g;
    for (i = 0; i < domain.groups.length; i++) {
      g = domain.groups[i];
      if (!g || !g.id) {
        continue;
      }
      var o = document.createElement('option');
      o.value = 'group:' + g.id;
      o.textContent = 'Group: ' + (g.label || (g.patterns || []).join(', '));
      sel.appendChild(o);
    }
    var found = false;
    if (current) {
      for (var j = 0; j < sel.options.length; j++) {
        if (sel.options[j].value === current) {
          found = true;
          break;
        }
      }
    }
    sel.value = found ? current : 'default';
  }

  function collectFromControls(controls, getters) {
    var newSettings = {};
    Object.keys(controls).forEach(function (key) {
      var el = controls[key];
      if (!el) {
        return;
      }
      if (el.type === 'checkbox') {
        newSettings[key] = el.checked;
      } else if (el.type === 'range') {
        newSettings[key] = parseFloat(el.value);
      } else {
        newSettings[key] = el.value;
      }
    });
    newSettings.textSize = getters.getActiveTextSize();
    newSettings.lineHeight = getters.getActiveLineHeight();
    newSettings.letterSpacing = getters.getActiveLetterSpacing();
    newSettings.textAlignment = getters.getActiveTextAlign();
    return newSettings;
  }

  // persistScopeSettings: default -> sync flat keys; host/group -> partial under DOMAIN_STORAGE_KEY in local.
  function persistScopeSettings(newFlat, callback) {
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
        var sel = document.getElementById('acc-scope-select');
        var scope = sel ? sel.value : 'default';
        var hostKey = String(A.hostname || '').toLowerCase();
        var partial = S.stripToPartial(newFlat, syncDef);
        if (scope === 'default') {
          var toSync = {};
          S.SETTING_KEYS.forEach(function (k) {
            if (Object.prototype.hasOwnProperty.call(newFlat, k)) {
              toSync[k] = newFlat[k];
            }
          });
          chrome.storage.sync.set(toSync, callback);
        } else if (scope === 'host') {
          if (Object.keys(partial).length === 0) {
            delete domain.hosts[hostKey];
          } else {
            domain.hosts[hostKey] = partial;
          }
          var pay = {};
          pay[S.DOMAIN_STORAGE_KEY] = domain;
          chrome.storage.local.set(pay, callback);
        } else if (scope.indexOf('group:') === 0) {
          var gid = scope.slice(6);
          for (var i = 0; i < domain.groups.length; i++) {
            if (domain.groups[i].id === gid) {
              domain.groups[i].settings = partial;
              break;
            }
          }
          var pay2 = {};
          pay2[S.DOMAIN_STORAGE_KEY] = domain;
          chrome.storage.local.set(pay2, callback);
        } else if (callback) {
          callback();
        }
      });
    });
  }

  function setupWidgetHandlers() {
    var button = document.getElementById('acc-widget-button');
    var panel = document.getElementById('acc-widget-panel');
    var closeBtn = document.getElementById('acc-close-btn');
    if (!button || !panel || !closeBtn) {
      return;
    }

    function togglePanel() {
      var isOpen = panel.getAttribute('data-open') === 'true';
      panel.setAttribute('data-open', !isOpen);
      panel.style.display = isOpen ? 'none' : 'block';
    }
    button.addEventListener('click', togglePanel);
    button.addEventListener('keypress', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePanel();
      }
    });
    closeBtn.addEventListener('click', function () {
      panel.setAttribute('data-open', 'false');
      panel.style.display = 'none';
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.getAttribute('data-open') === 'true') {
        panel.setAttribute('data-open', 'false');
        panel.style.display = 'none';
      }
    });
    setupControlHandlers();
  }

  function getWidgetButtonGroups() {
    return {
      textSizeButtons: Array.from(
        document.querySelectorAll('#acc-text-size-buttons .size-btn')
      ),
      lineHeightButtons: Array.from(
        document.querySelectorAll('#acc-line-height-buttons .option-btn')
      ),
      letterSpacingButtons: Array.from(
        document.querySelectorAll('#acc-letter-spacing-buttons .option-btn')
      ),
      textAlignButtons: Array.from(
        document.querySelectorAll('#acc-text-align-buttons .option-btn')
      )
    };
  }

  function getWidgetControlElements() {
    return {
      controls: {
        contrastMode: document.getElementById('acc-contrast'),
        dyslexiaFont: document.getElementById('acc-dyslexia'),
        highlightLinks: document.getElementById('acc-highlight-links'),
        highlightHeaders: document.getElementById('acc-highlight-headers'),
        bigCursor: document.getElementById('acc-big-cursor'),
        screenReader: document.getElementById('acc-screen-reader'),
        readingGuide: document.getElementById('acc-reading-guide-toggle'),
        readingMask: document.getElementById('acc-reading-mask-toggle'),
        stopAnimations: document.getElementById('acc-stop-animations'),
        colorBlindFilter: document.getElementById('acc-colorblind'),
        textColor: document.getElementById('acc-text-color'),
        backgroundColor: document.getElementById('acc-bg-color'),
        widgetCorner: document.getElementById('acc-widget-corner'),
        widgetHidden: document.getElementById('acc-widget-hidden'),
        cursorSize: document.getElementById('acc-cursor-size'),
        readingMaskBand: document.getElementById('acc-reading-mask-band'),
        prominentFocus: document.getElementById('acc-prominent-focus')
      },
      displays: {
        textSizeValue: document.getElementById('acc-text-size-val'),
        lineHeightValue: document.getElementById('acc-line-height-val'),
        textAlignValue: document.getElementById('acc-text-align-val'),
        letterSpacingValue: document.getElementById('acc-letter-spacing-val'),
        customContrastSection: document.getElementById('acc-custom-contrast-section')
      }
    };
  }

  function buildWidgetPanelModel(bg, controls, displays) {
    var textSizeButtons = bg.textSizeButtons;
    var lineHeightButtons = bg.lineHeightButtons;
    var letterSpacingButtons = bg.letterSpacingButtons;
    var textAlignButtons = bg.textAlignButtons;
    var P = globalThis.AccessifyPresets;

    function firstWithActiveClass(buttons) {
      for (var fi = 0; fi < buttons.length; fi++) {
        if (buttons[fi].classList.contains('active')) {
          return buttons[fi];
        }
      }
      return null;
    }

    function setActiveTextSizeButton(size) {
      var s = P.pickNearestTextSize(size);
      textSizeButtons.forEach(function (btn) {
        btn.classList.toggle('active', Number(btn.dataset.size) === s);
      });
      if (displays.textSizeValue) {
        displays.textSizeValue.textContent = s === 1.0 ? 'Default' : Math.round(s * 100) + '%';
      }
      P.updateSegments('acc-text-size-buttons', s);
      return s;
    }
    function setActiveLineHeightButton(value) {
      var v = P.pickNearestLineHeight(value);
      lineHeightButtons.forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.value === String(v));
      });
      if (displays.lineHeightValue) {
        displays.lineHeightValue.textContent = v === '' ? 'Original' : v + 'x';
      }
      P.updateSegments('acc-line-height-buttons', v);
      return v;
    }
    function setActiveLetterSpacingButton(value) {
      var v = P.pickNearestLetterSpacing(value);
      letterSpacingButtons.forEach(function (btn) {
        btn.classList.toggle('active', Number(btn.dataset.value) === v);
      });
      if (displays.letterSpacingValue) {
        displays.letterSpacingValue.textContent = v === 0 ? 'None' : v + 'px';
      }
      P.updateSegments('acc-letter-spacing-buttons', v);
      return v;
    }
    function setActiveTextAlignButton(value) {
      var v = P.pickValidAlignment(value);
      textAlignButtons.forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.value === String(v));
      });
      if (displays.textAlignValue) {
        displays.textAlignValue.textContent =
          v === '' ? 'Original' : v.charAt(0).toUpperCase() + v.slice(1);
      }
      P.updateSegments('acc-text-align-buttons', v);
      return v;
    }

    function getActiveTextSize() {
      var activeBtn = firstWithActiveClass(textSizeButtons);
      return P.pickNearestTextSize(
        activeBtn && activeBtn.dataset.size ? activeBtn.dataset.size : 1.0
      );
    }
    function getActiveLineHeight() {
      var activeBtn = firstWithActiveClass(lineHeightButtons);
      return P.pickNearestLineHeight(activeBtn ? activeBtn.dataset.value : '');
    }
    function getActiveLetterSpacing() {
      var activeBtn = firstWithActiveClass(letterSpacingButtons);
      return P.pickNearestLetterSpacing(activeBtn ? activeBtn.dataset.value : 0);
    }
    function getActiveTextAlign() {
      var activeBtn = firstWithActiveClass(textAlignButtons);
      return P.pickValidAlignment(activeBtn ? activeBtn.dataset.value : '');
    }

    var getters = {
      getActiveTextSize: getActiveTextSize,
      getActiveLineHeight: getActiveLineHeight,
      getActiveLetterSpacing: getActiveLetterSpacing,
      getActiveTextAlign: getActiveTextAlign
    };

    function applyObjectToControls(obj) {
      Object.keys(controls).forEach(function (key) {
        var el = controls[key];
        if (!el) {
          return;
        }
        var value = obj[key];
        if (el.type === 'checkbox') {
          el.checked = value !== undefined ? !!value : false;
        } else if (el.tagName === 'SELECT') {
          if (value !== undefined && value !== null) {
            var strVal = String(value);
            var ok = false;
            for (var oi = 0; oi < el.options.length; oi++) {
              if (el.options[oi].value === strVal) {
                ok = true;
                break;
              }
            }
            el.value = ok ? strVal : el.options[0] ? el.options[0].value : strVal;
          }
        } else if (el.tagName === 'INPUT') {
          if (value !== undefined && value !== null) {
            el.value = String(value);
          }
        }
      });
      setActiveTextSizeButton(obj.textSize !== undefined ? obj.textSize : 1.0);
      setActiveLineHeightButton(obj.lineHeight !== undefined ? obj.lineHeight : '');
      setActiveLetterSpacingButton(obj.letterSpacing !== undefined ? obj.letterSpacing : 0);
      setActiveTextAlignButton(obj.textAlignment !== undefined ? obj.textAlignment : '');
      if (displays.customContrastSection && controls.contrastMode) {
        var isCustom = controls.contrastMode.value === 'custom';
        displays.customContrastSection.style.setProperty(
          'display',
          isCustom ? 'block' : 'none',
          'important'
        );
      }
    }

    function updateDiffMarkers(syncDef, eff) {
      var keys = S.diffKeys(eff, syncDef);
      var set = {};
      keys.forEach(function (k) {
        set[k] = true;
      });
      document.querySelectorAll('.acc-control').forEach(function (row) {
        row.classList.remove('acc-row-diff');
      });
      var map = {
        contrastMode: 'acc-contrast',
        textColor: 'acc-text-color',
        backgroundColor: 'acc-bg-color',
        dyslexiaFont: 'acc-dyslexia',
        highlightLinks: 'acc-highlight-links',
        highlightHeaders: 'acc-highlight-headers',
        bigCursor: 'acc-big-cursor',
        screenReader: 'acc-screen-reader',
        readingGuide: 'acc-reading-guide-toggle',
        readingMask: 'acc-reading-mask-toggle',
        stopAnimations: 'acc-stop-animations',
        colorBlindFilter: 'acc-colorblind',
        widgetCorner: 'acc-widget-corner',
        widgetHidden: 'acc-widget-hidden',
        cursorSize: 'acc-cursor-size',
        readingMaskBand: 'acc-reading-mask-band',
        prominentFocus: 'acc-prominent-focus'
      };
      Object.keys(map).forEach(function (k) {
        if (!set[k]) {
          return;
        }
        var id = map[k];
        var el = document.getElementById(id);
        if (el && el.closest) {
          var row = el.closest('.acc-control');
          if (row) {
            row.classList.add('acc-row-diff');
          }
        }
      });
      var tsRow = document.getElementById('acc-text-size-buttons');
      if (set.textSize && tsRow && tsRow.closest) {
        var r = tsRow.closest('.acc-control');
        if (r) {
          r.classList.add('acc-row-diff');
        }
      }
    }

    function refreshWidgetPanel() {
      var hostKey = String(A.hostname || '').toLowerCase();
      chrome.storage.sync.get(null, function (syncData) {
        chrome.storage.local.get([S.DOMAIN_STORAGE_KEY], function (loc) {
          var syncDef = S.extractDefaultsFromSync(syncData);
          var domain = S.normalizeDomainSettings(loc[S.DOMAIN_STORAGE_KEY]);
          rebuildScopeOptions(domain, hostKey);
          var sel = document.getElementById('acc-scope-select');
          // Auto-pick host/group only when scope is still Default and the user has not locked the dropdown.
          if (sel && sel.dataset.userScopeLocked !== '1') {
            var suggested = S.suggestedScopeForPage(domain, hostKey);
            if (suggested !== 'default' && sel.value === 'default') {
              var ok = false;
              var oi;
              for (oi = 0; oi < sel.options.length; oi++) {
                if (sel.options[oi].value === suggested) {
                  ok = true;
                  break;
                }
              }
              if (ok) {
                sel.value = suggested;
              }
            }
          }
          var eff = S.computeEffectiveSettings(syncDef, domain, hostKey);
          var mode = sel ? sel.value : 'default';
          var showObj = eff;
          if (mode === 'default') {
            showObj = syncDef;
          } else if (mode.indexOf('group:') === 0) {
            var gid = mode.slice(6);
            var merged = S.mergeLayer(syncDef, {});
            for (var i = 0; i < domain.groups.length; i++) {
              if (domain.groups[i].id === gid) {
                merged = S.mergeLayer(merged, domain.groups[i].settings || {});
                break;
              }
            }
            showObj = merged;
          }
          applyObjectToControls(showObj);
          var summary = document.getElementById('acc-diff-summary');
          if (summary) {
            var n = S.diffKeys(eff, syncDef).length;
            summary.textContent =
              n === 0
                ? 'Matches your default settings on this site.'
                : n + ' setting(s) on this site differ from default.';
          }
          updateDiffMarkers(syncDef, eff);
          var removeGroupBtn = document.getElementById('acc-remove-group-btn');
          if (removeGroupBtn) {
            var canRemove = sel && sel.value.indexOf('group:') === 0;
            removeGroupBtn.disabled = !canRemove;
            removeGroupBtn.setAttribute('aria-disabled', canRemove ? 'false' : 'true');
          }
          if (A.applyStyles) {
            A.applyStyles(eff);
          }
        });
      });
    }

    function saveAndApply() {
      var newSettings = collectFromControls(controls, getters);
      persistScopeSettings(newSettings, function () {
        if (A.loadAndApplyAll) {
          A.loadAndApplyAll();
        }
        refreshWidgetPanel();
      });
    }

    return {
      getters: getters,
      setActiveTextSizeButton: setActiveTextSizeButton,
      setActiveLineHeightButton: setActiveLineHeightButton,
      setActiveLetterSpacingButton: setActiveLetterSpacingButton,
      setActiveTextAlignButton: setActiveTextAlignButton,
      applyObjectToControls: applyObjectToControls,
      refreshWidgetPanel: refreshWidgetPanel,
      saveAndApply: saveAndApply
    };
  }

  function bindWidgetPanelListeners(model, bg, controls, displays) {
    var textSizeButtons = bg.textSizeButtons;
    var lineHeightButtons = bg.lineHeightButtons;
    var letterSpacingButtons = bg.letterSpacingButtons;
    var textAlignButtons = bg.textAlignButtons;
    var refreshWidgetPanel = model.refreshWidgetPanel;
    var saveAndApply = model.saveAndApply;

    var scopeSel = document.getElementById('acc-scope-select');
    if (scopeSel) {
      scopeSel.addEventListener('change', function () {
        scopeSel.dataset.userScopeLocked = '1';
        refreshWidgetPanel();
      });
    }

    var newGroupBtn = document.getElementById('acc-new-group-btn');
    if (newGroupBtn) {
      newGroupBtn.addEventListener('click', function () {
        var raw = document.getElementById('acc-new-group-patterns').value || '';
        var patterns = raw
          .split(',')
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean);
        if (!patterns.length) {
          return;
        }
        chrome.storage.local.get([S.DOMAIN_STORAGE_KEY], function (loc) {
          var domain = S.normalizeDomainSettings(loc[S.DOMAIN_STORAGE_KEY]);
          var id = S.newGroupId();
          domain.groups.push({
            id: id,
            label: patterns[0],
            patterns: patterns,
            settings: {}
          });
          var pay = {};
          pay[S.DOMAIN_STORAGE_KEY] = domain;
          chrome.storage.local.set(pay, function () {
            var inp = document.getElementById('acc-new-group-patterns');
            if (inp) {
              inp.value = '';
            }
            var sel = document.getElementById('acc-scope-select');
            rebuildScopeOptions(domain, String(A.hostname || '').toLowerCase());
            if (sel) {
              sel.value = 'group:' + id;
            }
            refreshWidgetPanel();
          });
        });
      });
    }

    var removeGroupBtn = document.getElementById('acc-remove-group-btn');
    if (removeGroupBtn) {
      removeGroupBtn.addEventListener('click', function () {
        var sel = document.getElementById('acc-scope-select');
        if (!sel || sel.value.indexOf('group:') !== 0) {
          return;
        }
        var gid = sel.value.slice(6);
        chrome.storage.local.get([S.DOMAIN_STORAGE_KEY], function (loc) {
          if (chrome.runtime.lastError) {
            return;
          }
          var domain = S.normalizeDomainSettings(loc[S.DOMAIN_STORAGE_KEY]);
          domain.groups = domain.groups.filter(function (g) {
            return g && g.id !== gid;
          });
          var pay = {};
          pay[S.DOMAIN_STORAGE_KEY] = domain;
          chrome.storage.local.set(pay, function () {
            if (chrome.runtime.lastError) {
              return;
            }
            sel.value = 'default';
            delete sel.dataset.userScopeLocked;
            refreshWidgetPanel();
            if (A.loadAndApplyAll) {
              A.loadAndApplyAll();
            }
          });
        });
      });
    }

    Object.keys(controls).forEach(function (key) {
      var el = controls[key];
      if (!el) {
        return;
      }
      var eventType =
        el.type === 'range' || el.type === 'color'
          ? 'input'
          : el.tagName === 'SELECT'
            ? 'change'
            : 'change';
      el.addEventListener(eventType, function () {
        if (key === 'contrastMode' && displays.customContrastSection) {
          var isCustom = controls.contrastMode.value === 'custom';
          displays.customContrastSection.style.setProperty(
            'display',
            isCustom ? 'block' : 'none',
            'important'
          );
        }
        saveAndApply();
      });
    });

    textSizeButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        model.setActiveTextSizeButton(btn.dataset.size);
        saveAndApply();
      });
    });
    letterSpacingButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        model.setActiveLetterSpacingButton(btn.dataset.value);
        saveAndApply();
      });
    });
    lineHeightButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        model.setActiveLineHeightButton(btn.dataset.value);
        saveAndApply();
      });
    });
    textAlignButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        model.setActiveTextAlignButton(btn.dataset.value);
        saveAndApply();
      });
    });

    var resetBtn = document.getElementById('acc-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        var sel = document.getElementById('acc-scope-select');
        var scope = sel ? sel.value : 'default';
        var hostKey = String(A.hostname || '').toLowerCase();
        // Reset: default -> full sync defaults; host -> drop host entry; group -> clear that group's partial only.
        if (scope === 'default') {
          var defaults = S.mergeLayer(S.DEFAULT_SETTINGS, {});
          chrome.storage.sync.set(defaults, function () {
            refreshWidgetPanel();
          });
        } else if (scope === 'host') {
          chrome.storage.local.get([S.DOMAIN_STORAGE_KEY], function (loc) {
            var domain = S.normalizeDomainSettings(loc[S.DOMAIN_STORAGE_KEY]);
            delete domain.hosts[hostKey];
            var pay = {};
            pay[S.DOMAIN_STORAGE_KEY] = domain;
            chrome.storage.local.set(pay, function () {
              refreshWidgetPanel();
            });
          });
        } else if (scope.indexOf('group:') === 0) {
          var gid = scope.slice(6);
          chrome.storage.local.get([S.DOMAIN_STORAGE_KEY], function (loc) {
            var domain = S.normalizeDomainSettings(loc[S.DOMAIN_STORAGE_KEY]);
            for (var i = 0; i < domain.groups.length; i++) {
              if (domain.groups[i].id === gid) {
                domain.groups[i].settings = {};
                break;
              }
            }
            var pay2 = {};
            pay2[S.DOMAIN_STORAGE_KEY] = domain;
            chrome.storage.local.set(pay2, function () {
              refreshWidgetPanel();
            });
          });
        }
      });
    }
  }

  function setupControlHandlers() {
    var bg = getWidgetButtonGroups();
    var cd = getWidgetControlElements();
    var model = buildWidgetPanelModel(bg, cd.controls, cd.displays);
    bindWidgetPanelListeners(model, bg, cd.controls, cd.displays);
    model.refreshWidgetPanel();
  }

  A.injectWidget = injectWidget;
})();
