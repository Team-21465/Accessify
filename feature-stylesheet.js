/** Page CSS from merged settings; widget chrome via data-acc-* on documentElement. */
(function () {
  'use strict';

  var A = globalThis.__ACCESSIFY__;

  function getColorBlindMatrix(type) {
    var matrices = {
      protanopia: '0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0',
      deuteranopia: '0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0',
      tritanopia: '0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0'
    };
    return matrices[type] || '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0';
  }

  function injectColorBlindFilter(filterType) {
    if (filterType === 'achromatopsia') {
      return;
    }
    removeColorBlindFilter();
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'colorblind-filter-svg';
    svg.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden;';
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    var filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.id = 'colorblind-filter';
    var colorMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
    colorMatrix.setAttribute('type', 'matrix');
    colorMatrix.setAttribute('values', getColorBlindMatrix(filterType));
    filter.appendChild(colorMatrix);
    defs.appendChild(filter);
    svg.appendChild(defs);
    if (document.body) {
      document.body.appendChild(svg);
    }
  }

  function removeColorBlindFilter() {
    var el = document.getElementById('colorblind-filter-svg');
    if (el) {
      el.remove();
    }
  }

  function cursorDataUrl(settings) {
    var size = (settings && settings.cursorSize) || 'md';
    var w = 64;
    var h = 64;
    var path = 'M0 0 L0 45 L15 30 L35 30 Z';
    if (size === 'sm') {
      w = 48;
      h = 48;
      path = 'M0 0 L0 34 L11 22 L26 22 Z';
    } else if (size === 'lg') {
      w = 96;
      h = 96;
      path = 'M0 0 L0 68 L22 45 L52 45 Z';
    }
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      w +
      '" height="' +
      h +
      '" style="fill:black;stroke:white;stroke-width:2px"><path d="' +
      path +
      '"/></svg>';
    return (
      "url('data:image/svg+xml;utf8," +
      encodeURIComponent(svg) +
      "'), auto"
    );
  }

  function applyWidgetChrome(settings) {
    var root = document.documentElement;
    if (!root) {
      return;
    }
    var corner = (settings && settings.widgetCorner) || 'bl';
    root.setAttribute('data-acc-corner', corner);
    root.setAttribute(
      'data-acc-widget-hidden',
      settings && settings.widgetHidden ? 'true' : 'false'
    );
  }

  function appendTypographyAndLayoutCss(settings, css) {
    var curUrl = cursorDataUrl(settings);
    var curPointer = curUrl.replace(', auto', ', pointer');
    if (A.readingGuideEl) {
      A.readingGuideEl.style.display = settings.readingGuide ? 'block' : 'none';
    }
    if (A.readingMaskEl) {
      A.readingMaskEl.style.display = settings.readingMask ? 'block' : 'none';
    }

    if (settings.bigCursor) {
      css +=
        '*:not(#acc-widget-button):not(#acc-widget-button *) { cursor: ' +
        curUrl +
        ' !important; }' +
        'a,button:not(#acc-widget-button),input[type="button"],input[type="submit"] { cursor: ' +
        curPointer +
        ' !important; }';
    }

    if (settings.textSize && settings.textSize !== 1.0) {
      css +=
        'html { font-size: ' +
        settings.textSize * 16 +
        'px !important; }' +
        'body:not(#acc-widget-panel):not(#acc-widget-panel *) { font-size: ' +
        settings.textSize +
        'rem !important; }' +
        'p:not(#acc-widget-panel *),span:not(#acc-widget-panel *),div:not(#acc-widget-panel):not(#acc-widget-panel *):not(#acc-widget-button),' +
        'h1:not(#acc-widget-panel *),h2:not(#acc-widget-panel *),h3:not(#acc-widget-panel *),h4:not(#acc-widget-panel *),h5:not(#acc-widget-panel *),h6:not(#acc-widget-panel *),' +
        'li:not(#acc-widget-panel *),td:not(#acc-widget-panel *),th:not(#acc-widget-panel *),label:not(#acc-widget-panel *),a:not(#acc-widget-panel *),' +
        'button:not(#acc-widget-panel *):not(#acc-widget-button),input:not(#acc-widget-panel *),textarea:not(#acc-widget-panel *),select:not(#acc-widget-panel *) { font-size: ' +
        settings.textSize +
        'rem !important; }';
    }
    if (settings.lineHeight) {
      css +=
        '*:not(#acc-widget-panel):not(#acc-widget-panel *):not(#acc-widget-button):not(#acc-widget-button *) { line-height: ' +
        settings.lineHeight +
        ' !important; }';
    }
    if (settings.letterSpacing !== undefined) {
      css +=
        '*:not(#acc-widget-panel):not(#acc-widget-panel *):not(#acc-widget-button):not(#acc-widget-button *) { letter-spacing: ' +
        settings.letterSpacing +
        'px !important; }';
    }
    if (settings.textAlignment) {
      css +=
        '*:not(#acc-widget-panel):not(#acc-widget-panel *):not(#acc-widget-button):not(#acc-widget-button *) { text-align: ' +
        settings.textAlignment +
        ' !important; }';
    }
    // Keep panel text the same so huge page typography does not break widget controls.
    css +=
      '#acc-widget-panel,#acc-widget-panel * { line-height: normal !important; letter-spacing: normal !important; text-align: left !important; }';
    return css;
  }

  function appendVisionFeatureCss(settings, css) {
    if (settings.dyslexiaFont) {
      css +=
        "@font-face { font-family: 'OpenDyslexic'; src: url('https://fonts.cdnfonts.com/s/29616/open-dyslexic.woff'); }" +
        "*:not(#acc-widget-panel):not(#acc-widget-panel *):not(#acc-widget-button):not(#acc-widget-button *) { font-family: 'OpenDyslexic','Comic Sans MS',sans-serif !important; }";
    }
    if (settings.highlightLinks) {
      css +=
        'a { outline: 3px solid #FFD700 !important; background-color: rgba(255,215,0,0.3) !important; text-decoration: underline !important; font-weight: bold !important; padding: 2px 4px !important; border-radius: 2px !important; }';
    }
    if (settings.highlightHeaders) {
      css +=
        'h1,h2,h3,h4,h5,h6 { border-left: 8px solid #004D6E !important; padding-left: 10px !important; background-color: rgba(33,150,243,0.1) !important; }';
    }

    if (settings.prominentFocus) {
      css +=
        '*:not(#acc-widget-panel):not(#acc-widget-panel *):not(#acc-widget-button):not(#acc-widget-button *):focus-visible {' +
        'outline: 3px solid #0b57d0 !important; outline-offset: 3px !important;' +
        'box-shadow: 0 0 0 2px #fff, 0 0 0 6px rgba(11,87,208,0.45) !important; }';
    }
    return css;
  }

  function appendContrastCss(settings, css) {
    if (!settings.contrastMode || settings.contrastMode === 'off') {
      return css;
    }
    if (settings.contrastMode === 'invert') {
      // Page invert only; launcher stays readable (filter:none on widget chrome).
      css +=
        'html { filter: invert(1) hue-rotate(180deg) !important; }' +
        'img,video,iframe { filter: invert(1) hue-rotate(180deg) !important; }' +
        '#acc-widget-button,#acc-widget-button * { filter: none !important; }';
    } else if (settings.contrastMode === 'dark') {
      css +=
        'body,div,section,article,header,footer,main,nav,aside { background-color: #121212 !important; color: #e0e0e0 !important; }' +
        'p,span,h1,h2,h3,h4,h5,h6,li,a { color: #e0e0e0 !important; }' +
        'a { color: #bb86fc !important; }' +
        'select,input[type="range"] { background-color: #2a2a2a !important; color: #e0e0e0 !important; }' +
        'label,#acc-widget-panel span,#acc-widget-panel h2,#acc-widget-panel h3,#acc-widget-panel h1,#acc-widget-panel p { color: #e0e0e0 !important; }' +
        '#acc-widget-panel,#acc-widget-panel * { color: #e0e0e0 !important; }' +
        '#acc-widget-panel select,#acc-widget-panel input { color: #e0e0e0 !important; border-color: #444 !important; }' +
        '#acc-widget-panel select option { background-color: white !important; color: #333 !important; }' +
        '#acc-widget-panel .acc-panel-header { background-color: #121212 !important; border-bottom-color: #444 !important; }' +
        '#acc-widget-panel .acc-btn-reset { background-color: #2a2a2a !important; color: #e0e0e0 !important; border-color: #444 !important; }' +
        '#acc-widget-button { filter: brightness(0.9) !important; }' +
        '#acc-widget-panel .acc-category { background-color: #2a2a2a !important; border-color: #444 !important; }' +
        '#acc-widget-panel select[id="acc-contrast"] { color: black !important; }';
    } else if (settings.contrastMode === 'high') {
      css +=
        '* { background-color: black !important; color: yellow !important; border-color: yellow !important; }' +
        'a { color: cyan !important; text-decoration: underline !important; }' +
        'button,select,input { background-color: black !important; color: yellow !important; border: 2px solid yellow !important; }' +
        '#acc-widget-panel select option { background-color: black !important; color: yellow !important; }' +
        'label,p,span,h1,h2,h3,h4,h5,h6 { color: yellow !important; }' +
        '#acc-widget-panel label,#acc-widget-panel span,#acc-widget-panel h2,#acc-widget-panel h3 { color: yellow !important; }' +
        'input[type="checkbox"] + .acc-switch { background-color: #333 !important; border: 2px solid yellow !important; }' +
        'input[type="checkbox"]:checked + .acc-switch { background-color: yellow !important; }' +
        'input[type="checkbox"] + .acc-switch:before { background-color: white !important; }' +
        '#acc-widget-button { background-color: yellow !important; border-color: black !important; }' +
        '#acc-widget-button svg { background-color: yellow !important; fill: black !important; border-radius: 50% !important; }' +
        '#acc-widget-panel { background-color: black !important; border-color: yellow !important; }' +
        '#acc-widget-panel .acc-category { background-color: black !important; border-color: yellow !important; }' +
        '#acc-widget-panel .acc-panel-header { background-color: black !important; color: yellow !important; border-bottom-color: yellow !important; }' +
        '#acc-widget-panel .acc-btn-reset { background-color: black !important; color: yellow !important; border: 2px solid yellow !important; }';
    } else if (settings.contrastMode === 'monochrome') {
      css += 'html { filter: grayscale(100%) !important; }';
    } else if (settings.contrastMode === 'custom') {
      var textColor = settings.textColor || '#000000';
      var bgColor = settings.backgroundColor || '#ffffff';
      css +=
        '* { background-color: ' +
        bgColor +
        ' !important; color: ' +
        textColor +
        ' !important; }' +
        'img,video { opacity: 0.8; }' +
        'select,input[type="range"] { background-color: ' +
        bgColor +
        ' !important; color: ' +
        textColor +
        ' !important; border-color: ' +
        textColor +
        ' !important; }';
    }
    return css;
  }

  function appendMotionAndColorblindCss(settings, css) {
    if (settings.stopAnimations) {
      css +=
        '*:not(#acc-widget-panel):not(#acc-widget-button):not(#acc-widget-button *) { animation-play-state: paused !important; transition: none !important; }' +
        'img[src$=".gif"],img[src*=".gif?"] { visibility: hidden !important; }';
    }
    if (settings.colorBlindFilter && settings.colorBlindFilter !== 'off') {
      injectColorBlindFilter(settings.colorBlindFilter);
      var filterValue =
        settings.colorBlindFilter === 'achromatopsia'
          ? 'grayscale(100%)'
          : 'url(#colorblind-filter)';
      css +=
        'html { filter: ' +
        filterValue +
        ' !important; }' +
        '#acc-widget-button,#acc-widget-button * { filter: none !important; }';
    } else {
      removeColorBlindFilter();
    }
    return css;
  }

  function applyStyles(settings) {
    try {
      A.currentSettings = settings;
      if (!settings || typeof settings !== 'object') {
        return;
      }

      applyWidgetChrome(settings);

      if (!A.styleElement && document.head) {
        A.styleElement = document.createElement('style');
        A.styleElement.id = 'accessibility-enhancer-styles';
        document.head.appendChild(A.styleElement);
      }
      if (!A.styleElement) {
        if (document.readyState === 'loading') {
          document.addEventListener(
            'DOMContentLoaded',
            function once() {
              applyStyles(settings);
            },
            { once: true }
          );
        }
        return;
      }

      if (!A.readingGuideEl && settings.readingGuide && A.setupReadingGuide) {
        A.setupReadingGuide();
      }
      if (!A.readingMaskEl && settings.readingMask && A.setupReadingMask) {
        A.setupReadingMask();
      }

      var css = '';
      css = appendTypographyAndLayoutCss(settings, css);
      css = appendVisionFeatureCss(settings, css);
      css = appendContrastCss(settings, css);
      css = appendMotionAndColorblindCss(settings, css);

      if (A.cancelTts && !settings.screenReader) {
        A.cancelTts();
      }

      A.styleElement.textContent = css;
    } catch (err) {
      console.error('[Accessify] applyStyles error:', err);
    }
  }

  A.applyStyles = applyStyles;
  A.injectColorBlindFilter = injectColorBlindFilter;
  A.removeColorBlindFilter = removeColorBlindFilter;
})();
