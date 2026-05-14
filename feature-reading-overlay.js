/** Fixed reading guide line + mask overlay (pointer-events: none). */
(function () {
  'use strict';

  var A = (globalThis.__ACCESSIFY__ = globalThis.__ACCESSIFY__ || {});

  function setupReadingGuide() {
    try {
      if (A.readingGuideEl) {
        return;
      }
      A.readingGuideEl = document.createElement('div');
      A.readingGuideEl.id = 'acc-reading-guide';
      A.readingGuideEl.style.cssText =
        'position:fixed;left:0;right:0;height:2px;background:red;z-index:999996;' +
        'pointer-events:none;display:none;box-shadow:0 0 5px rgba(0,0,0,0.5);';
      if (document.body) {
        document.body.appendChild(A.readingGuideEl);
      }
    } catch (err) {
      console.error('[Accessify] Reading guide setup error:', err);
    }
  }

  function setupReadingMask() {
    try {
      if (A.readingMaskEl) {
        return;
      }
      A.readingMaskEl = document.createElement('div');
      A.readingMaskEl.id = 'acc-reading-mask';
      // Initial clip-path is overwritten on mousemove (horizontal band height from maskBandPx).
      A.readingMaskEl.style.cssText =
        'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
        'background:rgba(0,0,0,0.7);z-index:999996;pointer-events:none;display:none;' +
        'clip-path:polygon(0% 0%,100% 0%,100% 45%,0% 45%,0% 55%,100% 55%,100% 100%,0% 100%);';
      if (document.body) {
        document.body.appendChild(A.readingMaskEl);
      }
    } catch (err) {
      console.error('[Accessify] Reading mask setup error:', err);
    }
  }

  function maskBandPx(settings) {
    var band = settings && settings.readingMaskBand;
    if (band === 'sm') {
      return 60;
    }
    if (band === 'lg') {
      return 160;
    }
    return 100;
  }

  function setupReadingGuideListener() {
    window.addEventListener('mousemove', function (e) {
      if (A.readingGuideEl && A.readingGuideEl.style.display === 'block') {
        A.readingGuideEl.style.top = e.clientY + 'px';
      }
    });
  }

  function setupReadingMaskListener() {
    window.addEventListener('mousemove', function (e) {
      if (!A.readingMaskEl || A.readingMaskEl.style.display !== 'block') {
        return;
      }
      var settings = A.currentSettings || {};
      var height = maskBandPx(settings);
      var y = e.clientY;
      var top = y - height / 2;
      var bottom = y + height / 2;
      var vh = window.innerHeight;
      var topPct = (top / vh) * 100;
      var bottomPct = (bottom / vh) * 100;
      A.readingMaskEl.style.clipPath =
        'polygon(0% 0%,100% 0%,100% ' +
        topPct +
        '%,0% ' +
        topPct +
        '%,0% ' +
        bottomPct +
        '%,100% ' +
        bottomPct +
        '%,100% 100%,0% 100%)';
    });
  }

  A.setupReadingGuide = setupReadingGuide;
  A.setupReadingMask = setupReadingMask;
  A.setupReadingGuideListener = setupReadingGuideListener;
  A.setupReadingMaskListener = setupReadingMaskListener;
  A.maskBandPx = maskBandPx;
})();
