document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Accessibility Suite] Popup loaded');
  
  const textSizeButtons = Array.from(document.querySelectorAll('#textSizeButtons .size-btn'));
  const lineHeightButtons = Array.from(document.querySelectorAll('#lineHeightButtons .option-btn'));
  const letterSpacingButtons = Array.from(document.querySelectorAll('#letterSpacingButtons .option-btn'));
  const textAlignButtons = Array.from(document.querySelectorAll('#textAlignButtons .option-btn'));
  const textSizeValueEl = document.getElementById('textSizeValue');
  const lineHeightValueEl = document.getElementById('lineHeightValue');
  const letterSpacingValueEl = document.getElementById('letterSpacingValue');
  const textAlignValueEl = document.getElementById('textAlignValue');

  const controls = {
    contrastMode: document.getElementById('contrastMode'),
    textColor: document.getElementById('textColor'),
    backgroundColor: document.getElementById('backgroundColor'),
    dyslexiaFont: document.getElementById('dyslexiaFont'),
    highlightLinks: document.getElementById('highlightLinks'),
    highlightHeaders: document.getElementById('highlightHeaders'),
    bigCursor: document.getElementById('bigCursor'),
    colorBlindFilter: document.getElementById('colorBlindFilter'),
    screenReader: document.getElementById('screenReader'),
    readingGuide: document.getElementById('readingGuide'),
    readingMask: document.getElementById('readingMask'),
    stopAnimations: document.getElementById('stopAnimations')
  };

  const missingControls = Object.keys(controls).filter(key => !controls[key]);
  if (missingControls.length > 0) {
    console.error('[Accessibility Suite] Missing controls:', missingControls);
  }

  const displays = {
    textSizeValue: document.getElementById('textSizeValue'),
    lineHeightValue: document.getElementById('lineHeightValue'),
    letterSpacingValue: document.getElementById('letterSpacingValue'),
    customContrastSection: document.getElementById('customContrastSection')
  };

  const resetBtn = document.getElementById('resetBtn');

  const settings = await chrome.storage.sync.get(null);

  const TEXT_SIZES = [1.0, 1.1, 1.15, 1.2];
  const LINE_HEIGHTS = ["", 1, 1.5, 1.75, 2];
  const LETTER_SPACINGS = [0, 1, 2, 3];
  const TEXT_ALIGNMENTS = ["", 'left', 'right', 'center', 'justify'];
  function pickNearestTextSize(val) {
    const n = Number(val);
    if (!Number.isFinite(n)) return 1.0;
    return TEXT_SIZES.reduce((best, cur) => (Math.abs(cur - n) < Math.abs(best - n) ? cur : best), 1.0);
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

  function setActiveTextSizeButton(size) {
    const s = pickNearestTextSize(size);
    textSizeButtons.forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.size) === s);
    });
    if (textSizeValueEl) {
      textSizeValueEl.textContent = s === 1.0 ? "Default" : Math.round(s * 100) + '%';
    }
    updateSegments('textSizeButtons', s);
    return s;
  }

  function setActiveLineHeightButton(value) {
    const v = pickNearestLineHeight(value);
    lineHeightButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.value === String(v));
    });
    if (lineHeightValueEl) {
      lineHeightValueEl.textContent = v === "" ? "Original" : `${v}x`;
    }
    updateSegments('lineHeightButtons', v);
    return v;
  }

  function setActiveLetterSpacingButton(value) {
    const v = pickNearestLetterSpacing(value);
    letterSpacingButtons.forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.value) === v);
    });
    if (letterSpacingValueEl) {
      letterSpacingValueEl.textContent = v === 0 ? "None" : `${v}px`;
    }
    updateSegments('letterSpacingButtons', v);
    return v;
  }

  function setActiveTextAlignButton(value) {
    const v = pickValidAlignment(value);
    textAlignButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.value === String(v));
    });
    if (textAlignValueEl) {
      textAlignValueEl.textContent = v === "" ? "Original" : v.charAt(0).toUpperCase() + v.slice(1);
    }
    updateSegments('textAlignButtons', v);
    return v;
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
  
  function initUI() {
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

    if (textSizeButtons.length > 0) {
      setActiveTextSizeButton(settings.textSize ?? 1.0);
    }
    if (lineHeightButtons.length > 0) {
      setActiveLineHeightButton(settings.lineHeight ?? "");
    }
    if (textAlignButtons.length > 0) {
      setActiveTextAlignButton(settings.textAlignment ?? "");
    }

    updateDisplayValues();
    toggleCustomContrast(controls.contrastMode.value);
  }

  function updateDisplayValues() {
  }

  function toggleCustomContrast(mode) {
    if (displays.customContrastSection) {
      displays.customContrastSection.style.setProperty('display', mode === 'custom' ? 'block' : 'none', 'important');
    }
  }

  async function saveAndApply() {
    try {
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
      newSettings.textSize = setActiveTextSizeButton(
        textSizeButtons.find((b) => b.classList.contains('active'))?.dataset.size ?? 1.0
      );
      newSettings.lineHeight = setActiveLineHeightButton(
        lineHeightButtons.find((b) => b.classList.contains('active'))?.dataset.value ?? ""
      );
      newSettings.textAlignment = setActiveTextAlignButton(
        textAlignButtons.find((b) => b.classList.contains('active'))?.dataset.value ?? ""
      );
      newSettings.letterSpacing = setActiveLetterSpacingButton(
        letterSpacingButtons.find((b) => b.classList.contains('active'))?.dataset.value ?? 0
      );

      console.log('[Accessibility Suite] Saving settings:', newSettings);
      await chrome.storage.sync.set(newSettings);
      console.log('[Accessibility Suite] Settings saved to storage');

      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log('[Accessibility Suite] Current tab:', tab);
        if (tab && tab.id) {
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'applySettings', settings: newSettings });
          console.log('[Accessibility Suite] Message sent, response:', response);
        }
      } catch (err) {
        console.log('[Accessibility Suite] Message sending failed, will use storage listener:', err);
      }
    } catch (err) {
      console.error('[Accessibility Suite] Error in saveAndApply:', err);
    }
  }

  Object.keys(controls).forEach(key => {
    let eventType = 'change';
    if (controls[key].type === 'range' || controls[key].type === 'color') {
      eventType = 'input';
    } else if (controls[key].tagName === 'SELECT') {
      eventType = 'change';
    }
    
    controls[key].addEventListener(eventType, () => {
      if (key === 'contrastMode') toggleCustomContrast(controls[key].value);
      updateDisplayValues();
      saveAndApply();
    });
  });

  if (textSizeButtons.length > 0) {
    const initialTextSize = setActiveTextSizeButton(settings.textSize ?? 1.0);
    textSizeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        setActiveTextSizeButton(btn.dataset.size);
        saveAndApply();
      });
    });
    if (settings.textSize !== initialTextSize) {
      await chrome.storage.sync.set({ textSize: initialTextSize });
    }
  }

  if (lineHeightButtons.length > 0) {
    const initialLineHeight = setActiveLineHeightButton(settings.lineHeight ?? "");
    lineHeightButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        setActiveLineHeightButton(btn.dataset.value);
        saveAndApply();
      });
    });
    if (settings.lineHeight !== initialLineHeight) {
      await chrome.storage.sync.set({ lineHeight: initialLineHeight });
    }
  }

  if (letterSpacingButtons.length > 0) {
    const initialLetterSpacing = setActiveLetterSpacingButton(settings.letterSpacing ?? 0);
    letterSpacingButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        setActiveLetterSpacingButton(btn.dataset.value);
        saveAndApply();
      });
    });
    if (settings.letterSpacing !== initialLetterSpacing) {
      await chrome.storage.sync.set({ letterSpacing: initialLetterSpacing });
    }
  }

  if (textAlignButtons.length > 0) {
    const initialTextAlign = setActiveTextAlignButton(settings.textAlignment ?? "");
    textAlignButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        setActiveTextAlignButton(btn.dataset.value);
        saveAndApply();
      });
    });
    if (settings.textAlignment !== initialTextAlign) {
      await chrome.storage.sync.set({ textAlignment: initialTextAlign });
    }
  }

  resetBtn.addEventListener('click', async () => {
    const defaults = {
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
      lineHeight: "",
      letterSpacing: 0,
      textAlignment: ""
    };

    await chrome.storage.sync.clear();
    await chrome.storage.sync.set(defaults);
    Object.assign(settings, defaults);
    initUI();
    saveAndApply();
  });

  initUI();
});
