(function() {
  'use strict';

  let styleElement = null;
  let currentSettings = null;
  let readingGuideEl = null;
  let readingMaskEl = null;
  let screenReaderActive = false;

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupAll);
    } else {
      setupAll();
    }
  }

  function setupAll() {
    try {
      injectWidget();
      setupReadingGuide();
      setupReadingMask();
      setupReadingGuideListener();
      setupReadingMaskListener();
      setupScreenReader();
      setupBigCursor();
      loadAndApplySettings();
    } catch (err) {
      console.error('[Accessibility Suite] Setup error:', err);
    }
  }

  function injectWidget() {
    console.log('[Accessibility Suite] injectWidget called');
    const widgetCSS = document.createElement('link');
    widgetCSS.rel = 'stylesheet';
    widgetCSS.href = chrome.runtime.getURL('widget.css');
    document.head.appendChild(widgetCSS);
    console.log('[Accessibility Suite] Widget CSS injected');
    const widgetURL = chrome.runtime.getURL('widget.html');
    console.log('[Accessibility Suite] Fetching widget from:', widgetURL);
    fetch(widgetURL)
      .then(response => {
        console.log('[Accessibility Suite] Widget fetch response:', response.status);
        return response.text();
      })
      .then(html => {
        console.log('[Accessibility Suite] Widget HTML received');
        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container);
        
        console.log('[Accessibility Suite] Widget HTML injected into DOM');
        setTimeout(() => {
          console.log('[Accessibility Suite] Calling setupWidgetHandlers after delay');
          setupWidgetHandlers();
        }, 100);
      })
      .catch(err => console.error('[Accessibility Suite] Widget injection error:', err));
  }

  function setupWidgetHandlers() {
    const button = document.getElementById('acc-widget-button');
    const panel = document.getElementById('acc-widget-panel');
    const closeBtn = document.getElementById('acc-close-btn');
    
    if (!button || !panel) {
      console.error('[Accessibility Suite] Widget elements not found - button:', !!button, 'panel:', !!panel);
      return;
    }

    const togglePanel = () => {
      const isOpen = panel.getAttribute('data-open') === 'true';
      panel.setAttribute('data-open', !isOpen);
      panel.style.display = isOpen ? 'none' : 'block';
    };
    button.addEventListener('click', togglePanel);
    button.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePanel();
      }
    });
    closeBtn.addEventListener('click', () => {
      panel.setAttribute('data-open', 'false');
      panel.style.display = 'none';
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.getAttribute('data-open') === 'true') {
        panel.setAttribute('data-open', 'false');
        panel.style.display = 'none';
      }
    });
    setupControlHandlers();
  }

  function setupControlHandlers() {
    console.log('[Accessibility Suite] Setting up widget control handlers');
    
    const textSizeButtons = Array.from(document.querySelectorAll('#acc-text-size-buttons .size-btn'));
    const lineHeightButtons = Array.from(document.querySelectorAll('#acc-line-height-buttons .option-btn'));
    const letterSpacingButtons = Array.from(document.querySelectorAll('#acc-letter-spacing-buttons .option-btn'));
    const textAlignButtons = Array.from(document.querySelectorAll('#acc-text-align-buttons .option-btn'));

    const controls = {
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
      backgroundColor: document.getElementById('acc-bg-color')
    };

    const missingControls = Object.keys(controls).filter(key => !controls[key]);
    if (missingControls.length > 0) {
      console.error('[Accessibility Suite] Missing widget controls:', missingControls);
      return;
    }
    if (textSizeButtons.length === 0 || lineHeightButtons.length === 0 || letterSpacingButtons.length === 0 || textAlignButtons.length === 0) {
      console.error('[Accessibility Suite] Missing widget controls: textSizeButtons/lineHeightButtons/letterSpacingButtons/textAlignButtons');
      return;
    }
    console.log('[Accessibility Suite] All widget controls found successfully');

    const displays = {
      textSizeValue: document.getElementById('acc-text-size-val'),
      lineHeightValue: document.getElementById('acc-line-height-val'),
      textAlignValue: document.getElementById('acc-text-align-val'),
      letterSpacingValue: document.getElementById('acc-letter-spacing-val'),
      customContrastSection: document.getElementById('acc-custom-contrast-section')
    };

    const TEXT_SIZES = [1.0, 1.1, 1.15, 1.2];
    const LINE_HEIGHTS = ["", 1, 1.5, 1.75, 2];
    const LETTER_SPACINGS = [0, 1, 2, 3];
    const TEXT_ALIGNMENTS = ["", 'left', 'right', 'center', 'justify'];
    function pickNearestTextSize(val) {
      const n = Number(val);
      if (!Number.isFinite(n)) return 1.0;
      return TEXT_SIZES.reduce((best, cur) => (Math.abs(cur - n) < Math.abs(best - n) ? cur : best), 1.0);
    }

    function getActiveTextSize() {
      const activeBtn = textSizeButtons.find((b) => b.classList.contains('active'));
      return pickNearestTextSize(activeBtn?.dataset.size ?? 1.0);
    }

    function setActiveTextSizeButton(size) {
      const s = pickNearestTextSize(size);
      textSizeButtons.forEach((btn) => {
        btn.classList.toggle('active', Number(btn.dataset.size) === s);
      });
      if (displays.textSizeValue) {
        displays.textSizeValue.textContent = s === 1.0 ? "Default" : Math.round(s * 100) + '%';
      }
      updateSegments('acc-text-size-buttons', s);
      return s;
    }

    function pickNearestLineHeight(val) {
      if (val === "" || val === undefined || val === null) return "";
      const n = Number(val);
      if (!Number.isFinite(n)) return "";
      const numericOptions = LINE_HEIGHTS.filter(h => h !== "");
      return numericOptions.reduce((best, cur) => (Math.abs(cur - n) < Math.abs(best - n) ? cur : best), "");
    }

    function pickNearestLetterSpacing(val) {
      const n = Number(val);
      if (!Number.isFinite(n)) return 0;
      return LETTER_SPACINGS.reduce((best, cur) => (Math.abs(cur - n) < Math.abs(best - n) ? cur : best), 0);
    }

    function pickValidAlignment(val) {
      if (val === "" || val === undefined || val === null) return "";
      return TEXT_ALIGNMENTS.includes(val) ? val : "";
    }

    function setActiveLineHeightButton(value) {
      const v = pickNearestLineHeight(value);
      lineHeightButtons.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.value === String(v));
      });
      if (displays.lineHeightValue) {
        displays.lineHeightValue.textContent = v === "" ? "Original" : `${v}x`;
      }
      updateSegments('acc-line-height-buttons', v);
      return v;
    }

    function setActiveLetterSpacingButton(value) {
      const v = pickNearestLetterSpacing(value);
      letterSpacingButtons.forEach((btn) => {
        btn.classList.toggle('active', Number(btn.dataset.value) === v);
      });
      if (displays.letterSpacingValue) {
        displays.letterSpacingValue.textContent = v === 0 ? "None" : `${v}px`;
      }
      updateSegments('acc-letter-spacing-buttons', v);
      return v;
    }

    function getActiveLineHeight() {
      const activeBtn = lineHeightButtons.find((b) => b.classList.contains('active'));
      return pickNearestLineHeight(activeBtn?.dataset.value ?? "");
    }

    function getActiveLetterSpacing() {
      const activeBtn = letterSpacingButtons.find((b) => b.classList.contains('active'));
      return pickNearestLetterSpacing(activeBtn?.dataset.value ?? 0);
    }

    function setActiveTextAlignButton(value) {
      const v = pickValidAlignment(value);
      textAlignButtons.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.value === String(v));
      });
      if (displays.textAlignValue) {
        displays.textAlignValue.textContent = v === "" ? "Original" : v.charAt(0).toUpperCase() + v.slice(1);
      }
      updateSegments('acc-text-align-buttons', v);
      return v;
    }

    function getActiveTextAlign() {
      const activeBtn = textAlignButtons.find((b) => b.classList.contains('active'));
      return pickValidAlignment(activeBtn?.dataset.value ?? "");
    }

    function updateSegments(groupId, value) {
      const group = document.getElementById(groupId);
      if (!group) return;
      const segments = group.nextElementSibling?.classList.contains('segmented-line')
        ? group.nextElementSibling.querySelectorAll('.segment')
        : [];
      if (!segments.length) return;
      const buttons = Array.from(group.querySelectorAll('button'));
      const index = buttons.findIndex((btn) => {
        const btnVal = btn.dataset.value ?? btn.dataset.size;
        return btnVal === String(value) || (value !== "" && Number(btnVal) === Number(value));
      });
      segments.forEach((seg, i) => seg.classList.toggle('active', i === index));
    }

    chrome.storage.sync.get(null, (settings) => {
      Object.keys(controls).forEach(key => {
        if (!controls[key]) return;
        
        const value = settings[key];
        
        if (controls[key].type === 'checkbox') {
          controls[key].checked = value !== undefined ? value : false;
        } else {
          if (value !== undefined) {
            if (controls[key].tagName === 'SELECT') {
              const options = Array.from(controls[key].options).map(opt => opt.value);
              if (options.includes(value)) {
                controls[key].value = value;
              } else {
                if (key === 'contrastMode') controls[key].value = 'off';
                else if (key === 'textAlignment') controls[key].value = "";
                else if (key === 'colorBlindFilter') controls[key].value = 'off';
                else controls[key].selectedIndex = 0;
              }
            } else {
              controls[key].value = value;
            }
          } else {
            if (key === 'textSize') controls[key].value = 1.0;
            else if (key === 'lineHeight') controls[key].value = "";
            else if (key === 'letterSpacing') controls[key].value = 0;
            else if (key === 'contrastMode') controls[key].value = 'off';
            else if (key === 'textAlignment') controls[key].value = "";
            else if (key === 'colorBlindFilter') controls[key].value = 'off';
            else if (key === 'textColor') controls[key].value = '#000000';
            else if (key === 'backgroundColor') controls[key].value = '#ffffff';
          }
        }
      });
      setActiveTextSizeButton(settings.textSize ?? 1.0);
      setActiveLineHeightButton(settings.lineHeight ?? "");
      setActiveLetterSpacingButton(settings.letterSpacing ?? 0);
      setActiveTextAlignButton(settings.textAlignment ?? "");
      updateDisplays();
    });

    function updateDisplays() {
      if (displays.letterSpacingValue) {
        displays.letterSpacingValue.textContent = `${getActiveLetterSpacing()}px`;
      }
      if (displays.lineHeightValue) {
        displays.lineHeightValue.textContent = `${pickNearestLineHeight(getActiveLineHeight())}x`;
      }
      if (displays.textAlignValue) {
        const v = pickValidAlignment(getActiveTextAlign());
        displays.textAlignValue.textContent = v.charAt(0).toUpperCase() + v.slice(1);
      }
      if (displays.textSizeValue) {
        displays.textSizeValue.textContent = Math.round(getActiveTextSize() * 100) + '%';
      }
      if (displays.customContrastSection && controls.contrastMode) {
        const isCustom = controls.contrastMode.value === 'custom';
        displays.customContrastSection.style.setProperty('display', isCustom ? 'block' : 'none', 'important');
        console.log('[Accessibility Suite] Custom contrast section visibility:', isCustom ? 'visible' : 'hidden');
      }
    }

    function saveAndApply() {
      const newSettings = {};
      Object.keys(controls).forEach(key => {
        if (!controls[key]) return;
        if (controls[key].type === 'checkbox') {
          newSettings[key] = controls[key].checked;
        } else if (controls[key].type === 'range') {
          newSettings[key] = parseFloat(controls[key].value);
        } else {
          newSettings[key] = controls[key].value;
        }
      });
      newSettings.textSize = getActiveTextSize();
      newSettings.lineHeight = getActiveLineHeight();
      newSettings.letterSpacing = getActiveLetterSpacing();
      newSettings.textAlignment = getActiveTextAlign();
      
      console.log('[Accessibility Suite] Widget saving settings:', newSettings);
      chrome.storage.sync.set(newSettings);
      applyStyles(newSettings);
      updateDisplays();
    }

    Object.keys(controls).forEach(key => {
      if (!controls[key]) return;
      let eventType = 'change';
      if (controls[key].type === 'range' || controls[key].type === 'color') {
        eventType = 'input';
      } else if (controls[key].tagName === 'SELECT') {
        eventType = 'change';
      }
      controls[key].addEventListener(eventType, () => {
        console.log('[Accessibility Suite] Widget control changed:', key, controls[key].type === 'checkbox' ? controls[key].checked : controls[key].value);
        saveAndApply();
      });
    });

    textSizeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        setActiveTextSizeButton(btn.dataset.size);
        console.log('[Accessibility Suite] Widget control changed: textSize', btn.dataset.size);
        saveAndApply();
      });
    });

    letterSpacingButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        setActiveLetterSpacingButton(btn.dataset.value);
        console.log('[Accessibility Suite] Widget control changed: letterSpacing', btn.dataset.value);
        saveAndApply();
      });
    });

    lineHeightButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        setActiveLineHeightButton(btn.dataset.value);
        console.log('[Accessibility Suite] Widget control changed: lineHeight', btn.dataset.value);
        saveAndApply();
      });
    });

    textAlignButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        setActiveTextAlignButton(btn.dataset.value);
        console.log('[Accessibility Suite] Widget control changed: textAlignment', btn.dataset.value);
        saveAndApply();
      });
    });
    
    console.log('[Accessibility Suite] Event listeners added to', Object.keys(controls).length, 'widget controls');

    const resetBtn = document.getElementById('acc-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const defaults = {
          textSize: 1.0,
          contrastMode: 'off',
          dyslexiaFont: false,
          highlightLinks: false,
          highlightHeaders: false,
          bigCursor: false,
          colorBlindFilter: 'off',
          screenReader: false,
          readingGuide: false,
          readingMask: false,
          stopAnimations: false,
          lineHeight: "",
          letterSpacing: 0,
          textAlignment: ""
        };
        
          setActiveTextSizeButton(defaults.textSize);
          setActiveLineHeightButton(defaults.lineHeight);
          setActiveLetterSpacingButton(defaults.letterSpacing);
          setActiveTextAlignButton(defaults.textAlignment);
        Object.keys(controls).forEach(key => {
          if (!controls[key]) return;
          if (controls[key].type === 'checkbox') {
            controls[key].checked = defaults[key] || false;
    } else {
            controls[key].value = defaults[key] || controls[key].defaultValue;
          }
        });
        
        chrome.storage.sync.set(defaults);
        applyStyles(defaults);
        updateDisplays();
      });
    }
  }

  function setupReadingGuide() {
    try {
      if (readingGuideEl) return;
      
      readingGuideEl = document.createElement('div');
      readingGuideEl.id = 'acc-reading-guide';
      readingGuideEl.style.cssText = `
        position: fixed;
        left: 0;
        right: 0;
        height: 2px;
        background: red;
        z-index: 999996;
        pointer-events: none;
        display: none;
        box-shadow: 0 0 5px rgba(0,0,0,0.5);
      `;
      if (document.body) {
        document.body.appendChild(readingGuideEl);
        console.log('[Accessibility Suite] Reading guide created');
      }
    } catch (err) {
      console.error('[Accessibility Suite] Reading guide setup error:', err);
    }
  }

  function setupReadingGuideListener() {
    window.addEventListener('mousemove', (e) => {
      if (readingGuideEl && readingGuideEl.style.display === 'block') {
        readingGuideEl.style.top = e.clientY + 'px';
      }
    });
  }

  function setupReadingMask() {
    try {
      if (readingMaskEl) return;
      
      readingMaskEl = document.createElement('div');
      readingMaskEl.id = 'acc-reading-mask';
      readingMaskEl.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.7);
        z-index: 999996;
        pointer-events: none;
        display: none;
        clip-path: polygon(0% 0%, 100% 0%, 100% 45%, 0% 45%, 0% 55%, 100% 55%, 100% 100%, 0% 100%);
      `;
      if (document.body) {
        document.body.appendChild(readingMaskEl);
        console.log('[Accessibility Suite] Reading mask created');
      }
    } catch (err) {
      console.error('[Accessibility Suite] Reading mask setup error:', err);
    }
  }

  function setupReadingMaskListener() {
    window.addEventListener('mousemove', (e) => {
      if (readingMaskEl && readingMaskEl.style.display === 'block') {
        const y = e.clientY;
        const height = 100;
        const top = y - height / 2;
        const bottom = y + height / 2;
        const vh = window.innerHeight;
        
        const topPct = (top / vh) * 100;
        const bottomPct = (bottom / vh) * 100;
        
        readingMaskEl.style.clipPath = `polygon(
          0% 0%, 100% 0%, 
          100% ${topPct}%, 0% ${topPct}%, 
          0% ${bottomPct}%, 100% ${bottomPct}%, 
          100% 100%, 0% 100%
        )`;
      }
    });
  }

  function setupScreenReader() {
    window.addEventListener('mouseover', (e) => {
      if (!currentSettings?.screenReader) return;
      
      const target = e.target;
      if (target.innerText && target.innerText.trim().length > 0) {
        if (target.dataset.lastRead === target.innerText) return;
        
        speak(target.innerText);
        target.dataset.lastRead = target.innerText;
      }
    });
  }

  function speak(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  function setupBigCursor() {
  }

  function applyStyles(settings) {
    try {
    currentSettings = settings;
    if (!settings || typeof settings !== 'object') {
        console.log('[Accessibility Suite] No settings to apply');
        return;
      }

      if (!styleElement && document.head) {
      styleElement = document.createElement('style');
      styleElement.id = 'accessibility-enhancer-styles';
      document.head.appendChild(styleElement);
    }
    if (!styleElement) {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => applyStyles(settings), { once: true });
        }
        return;
    }

    let css = '';
    console.log('[Accessibility Suite] Applying settings:', settings);
    if (!readingGuideEl && settings.readingGuide) {
      setupReadingGuide();
    }
    if (!readingMaskEl && settings.readingMask) {
      setupReadingMask();
    }
    if (readingGuideEl) readingGuideEl.style.display = settings.readingGuide ? 'block' : 'none';
    if (readingMaskEl) readingMaskEl.style.display = settings.readingMask ? 'block' : 'none';
    if (settings.bigCursor) {
      css += `
        *:not(#acc-widget-button):not(#acc-widget-button *) { 
          cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" style="fill:black;stroke:white;stroke-width:2px"><path d="M0 0 L0 45 L15 30 L35 30 Z"/></svg>'), auto !important; 
        }
        a, button:not(#acc-widget-button), 
        input[type="button"], input[type="submit"] { 
          cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" style="fill:black;stroke:white;stroke-width:2px"><path d="M0 0 L0 45 L15 30 L35 30 Z"/></svg>'), pointer !important; 
        }
      `;
    }
    if (settings.textSize && settings.textSize !== 1.0) {
      css += `
        html { font-size: ${settings.textSize * 16}px !important; }
        body:not(#acc-widget-panel):not(#acc-widget-panel *) { font-size: ${settings.textSize}rem !important; }
        p:not(#acc-widget-panel *), span:not(#acc-widget-panel *), div:not(#acc-widget-panel):not(#acc-widget-panel *):not(#acc-widget-button), h1:not(#acc-widget-panel *), h2:not(#acc-widget-panel *), h3:not(#acc-widget-panel *), h4:not(#acc-widget-panel *), h5:not(#acc-widget-panel *), h6:not(#acc-widget-panel *),
        li:not(#acc-widget-panel *), td:not(#acc-widget-panel *), th:not(#acc-widget-panel *), label:not(#acc-widget-panel *), a:not(#acc-widget-panel *), button:not(#acc-widget-panel *):not(#acc-widget-button),
        input:not(#acc-widget-panel *), textarea:not(#acc-widget-panel *), select:not(#acc-widget-panel *) {
          font-size: ${settings.textSize}rem !important;
        }
      `;
    }
    if (settings.lineHeight) {
      css += `*:not(#acc-widget-panel):not(#acc-widget-panel *):not(#acc-widget-button):not(#acc-widget-button *) { line-height: ${settings.lineHeight} !important; }`;
    }
    if (settings.letterSpacing !== undefined) {
      css += `*:not(#acc-widget-panel):not(#acc-widget-panel *):not(#acc-widget-button):not(#acc-widget-button *) { letter-spacing: ${settings.letterSpacing}px !important; }`;
    }
    if (settings.textAlignment) {
      css += `*:not(#acc-widget-panel):not(#acc-widget-panel *):not(#acc-widget-button):not(#acc-widget-button *) { text-align: ${settings.textAlignment} !important; }`;
    }
    css += `
      #acc-widget-panel, #acc-widget-panel * {
        line-height: normal !important;
        letter-spacing: normal !important;
        text-align: left !important;
      }
    `;
    if (settings.dyslexiaFont) {
      css += `
        @font-face {
          font-family: 'OpenDyslexic';
          src: url('https://cdn.jsdelivr.net/npm/opendyslexic@1.0.3/OpenDyslexic-Regular.otf');
        }
        *:not(#acc-widget-panel):not(#acc-widget-panel *):not(#acc-widget-button):not(#acc-widget-button *) { 
          font-family: 'OpenDyslexic', 'Comic Sans MS', sans-serif !important; 
        }
      `;
    }
    if (settings.highlightLinks) {
      css += `
        a { 
          outline: 3px solid #FFD700 !important; 
          background-color: rgba(255, 215, 0, 0.3) !important;
          text-decoration: underline !important;
          font-weight: bold !important;
          padding: 2px 4px !important;
          border-radius: 2px !important;
        }
        a:not([style*="color"]) {
          color: #0066cc !important;
        }
      `;
    }
    if (settings.highlightHeaders) {
      css += `
        h1, h2, h3, h4, h5, h6 { 
          border-left: 8px solid #004D6E !important;
          padding-left: 10px !important;
          background-color: rgba(33, 150, 243, 0.1) !important;
        }
      `;
    }
    if (settings.contrastMode && settings.contrastMode !== 'off') {
      if (settings.contrastMode === 'invert') {
        css += `
          html { filter: invert(1) hue-rotate(180deg) !important; } 
          img, video, iframe { filter: invert(1) hue-rotate(180deg) !important; }
          #acc-widget-button, #acc-widget-button * { filter: none !important; }
        `;
      } else if (settings.contrastMode === 'dark') {
        css += `
          body, div, section, article, header, footer, main, nav, aside { 
            background-color: #121212 !important; 
            color: #e0e0e0 !important; 
          }
          p, span, h1, h2, h3, h4, h5, h6, li, a { 
            color: #e0e0e0 !important; 
          }
          a { color: #bb86fc !important; }
          select, input[type="range"] { 
            background-color: #2a2a2a !important; 
            color: #e0e0e0 !important; 
          }
          label, #acc-widget-panel span, #acc-widget-panel h2, #acc-widget-panel h3, #acc-widget-panel h1, #acc-widget-panel p { 
            color: #e0e0e0 !important; 
          }
          #acc-widget-panel, #acc-widget-panel * {
            color: #e0e0e0 !important;
          }
          #acc-widget-panel select, #acc-widget-panel input {
            color: #e0e0e0 !important;
            border-color: #444 !important;
          }
          #acc-widget-panel select option {
            background-color: white !important;
            color: #333 !important;
          }
          #acc-widget-panel .acc-panel-header {
            background-color: #121212 !important;
            border-bottom-color: #444 !important;
          }
          #acc-widget-panel .acc-btn-reset {
            background-color: #2a2a2a !important;
            color: #e0e0e0 !important;
            border-color: #444 !important;
          }
          #acc-widget-button { filter: brightness(0.9) !important; }
          #acc-widget-panel .acc-category { 
            background-color: #2a2a2a !important; 
            border-color: #444 !important; 
          }
          #acc-widget-panel select[id="acc-contrast"] { color: black !important; }
        `;
      } else if (settings.contrastMode === 'high') {
        css += `
          * { 
            background-color: black !important; 
            color: yellow !important; 
            border-color: yellow !important; 
          }
          a { 
            color: cyan !important; 
            text-decoration: underline !important; 
          }
          button, select, input { 
            background-color: black !important; 
            color: yellow !important; 
            border: 2px solid yellow !important; 
          }
          #acc-widget-panel select option {
            background-color: black !important;
            color: yellow !important;
          }
          label, p, span, h1, h2, h3, h4, h5, h6 {
            color: yellow !important;
          }
          #acc-widget-panel label, #acc-widget-panel span, #acc-widget-panel h2, #acc-widget-panel h3 {
            color: yellow !important;
          }
          input[type="checkbox"] + .acc-switch {
            background-color: #333 !important;
            border: 2px solid yellow !important;
          }
          input[type="checkbox"]:checked + .acc-switch {
            background-color: yellow !important;
          }
          input[type="checkbox"] + .acc-switch:before {
            background-color: white !important;
          }
          #acc-widget-button { 
            background-color: yellow !important; 
            border-color: black !important; 
          }
          #acc-widget-button svg { background-color: yellow !important; fill: black !important; border-radius: 50% !important; }
          #acc-widget-panel { 
            background-color: black !important; 
            border-color: yellow !important; 
          }
          #acc-widget-panel .acc-category { 
            background-color: black !important; 
            border-color: yellow !important; 
          }
          #acc-widget-panel .acc-panel-header {
            background-color: black !important;
            color: yellow !important;
            border-bottom-color: yellow !important;
          }
          #acc-widget-panel .acc-btn-reset {
            background-color: black !important;
            color: yellow !important;
            border: 2px solid yellow !important;
          }
        `;
      } else if (settings.contrastMode === 'monochrome') {
        css += `
          html { filter: grayscale(100%) !important; }
        `;
      } else if (settings.contrastMode === 'custom') {
        const textColor = settings.textColor || '#000000';
        const bgColor = settings.backgroundColor || '#ffffff';
        css += `
          * { 
            background-color: ${bgColor} !important; 
            color: ${textColor} !important; 
          }
          img, video { opacity: 0.8; }
          select, input[type="range"] { 
            background-color: ${bgColor} !important; 
          color: ${textColor} !important;
          border-color: ${textColor} !important;
        }
        `;
      }
    }
    if (settings.stopAnimations) {
      css += `
        *:not(#acc-widget-panel):not(#acc-widget-button):not(#acc-widget-button *) {
          animation-play-state: paused !important;
          transition: none !important;
        }
        img[src$=".gif"], img[src*=".gif?"] {
          visibility: hidden !important;
        }
      `;
    }
    if (settings.colorBlindFilter && settings.colorBlindFilter !== 'off') {
      injectColorBlindFilter(settings.colorBlindFilter);
      let filterValue = settings.colorBlindFilter === 'achromatopsia' ? 'grayscale(100%)' : 'url(#colorblind-filter)';
      css += `
        html { filter: ${filterValue} !important; }
        #acc-widget-button, #acc-widget-button * {
          filter: none !important;
        }
      `;
    } else {
      removeColorBlindFilter();
    }

    styleElement.textContent = css;
      console.log('[Accessibility Suite] Styles applied successfully');
    } catch (err) {
      console.error('[Accessibility Suite] Error applying styles:', err);
    }
  }

  function injectColorBlindFilter(filterType) {
    if (filterType === 'achromatopsia') return;
    removeColorBlindFilter();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'colorblind-filter-svg';
    svg.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden;';
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.id = 'colorblind-filter';
    const colorMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
    colorMatrix.setAttribute('type', 'matrix');
    colorMatrix.setAttribute('values', getColorBlindMatrix(filterType));
    filter.appendChild(colorMatrix);
    defs.appendChild(filter);
    svg.appendChild(defs);
    if (document.body) {
      document.body.appendChild(svg);
    }
  }

  function getColorBlindMatrix(type) {
    const matrices = {
      protanopia: '0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0',
      deuteranopia: '0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0',
      tritanopia: '0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0'
    };
    return matrices[type] || '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0';
  }

  function removeColorBlindFilter() {
    const el = document.getElementById('colorblind-filter-svg');
    if (el) el.remove();
  }

  function loadAndApplySettings() {
    try {
      chrome.storage.sync.get(null, (settings) => {
        if (settings && Object.keys(settings).length > 0) {
        applyStyles(settings);
      }
    });
    } catch (err) {
      console.error('[Accessibility Suite] Load settings error:', err);
    }
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
    if (request.action === 'applySettings') {
        console.log('[Accessibility Suite] Received settings from popup');
      applyStyles(request.settings);
      sendResponse({ success: true });
      }
    } catch (err) {
      console.error('[Accessibility Suite] Message handler error:', err);
      sendResponse({ success: false, error: err.message });
    }
    return true;
  });
  chrome.storage.onChanged.addListener((changes, areaName) => {
    try {
      if (areaName === 'sync') {
        console.log('[Accessibility Suite] Settings changed in storage');
        loadAndApplySettings();
      }
    } catch (err) {
      console.error('[Accessibility Suite] Storage listener error:', err);
    }
  });

  console.log('[Accessibility Suite] Content script loaded');
  init();
})();
