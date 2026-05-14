/** Hover TTS: sentence queue, mark highlights; rebuild text model after unwrap so offsets match DOM. */
(function () {
  'use strict';

  var A = globalThis.__ACCESSIFY__;
  var hoverTimer = null;
  var MAX_CHARS = 800;
  var DEBOUNCE_MS = 350;
  var sentenceSpansArr = [];
  var sentenceIndex = -1;
  var readRoot = null;
  var chainActive = false; // multi-utterance chain until last sentence ends

  function injectHighlightStyles() {
    if (document.getElementById('acc-tts-highlight-style')) {
      return;
    }
    var style = document.createElement('style');
    style.id = 'acc-tts-highlight-style';
    style.textContent =
      'mark.acc-tts-sentence{' +
      'background-color:rgba(255,235,59,0.55)!important;' +
      'color:inherit!important;' +
      'outline:2px solid #f9a825!important;' +
      'border-radius:2px!important;' +
      'box-decoration-break:clone!important;' +
      '-webkit-box-decoration-break:clone!important;' +
      '}';
    (document.head || document.documentElement).appendChild(style);
  }

  function skipTextNode(textNode) {
    var el = textNode.parentElement;
    if (!el) {
      return true;
    }
    if (el.closest('#acc-widget-panel') || el.closest('#acc-widget-button')) {
      return true;
    }
    return false;
  }

  // Flat index space over text nodes; unwrap <mark.acc-tts-sentence> before each rebuild.
  function buildTextModel(root, maxChars) {
    maxChars =
      typeof maxChars === 'number' && maxChars > 0 ? maxChars : Infinity;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (tn) {
        return skipTextNode(tn) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var parts = [];
    var cum = 0;
    var n;
    while ((n = walker.nextNode())) {
      var val = n.nodeValue;
      var len = val.length;
      if (!len) {
        continue;
      }
      var room = maxChars - cum;
      if (room <= 0) {
        break;
      }
      var take = Math.min(len, room);
      parts.push({
        node: n,
        startGlobal: cum,
        endGlobal: cum + take,
        nodeStart: 0,
        nodeEnd: take
      });
      cum += take;
      if (cum >= maxChars) {
        break;
      }
    }
    var fullText = parts
      .map(function (p) {
        var v = p.node.nodeValue;
        return v.slice(p.nodeStart, p.nodeEnd);
      })
      .join('');
    return { parts: parts, fullText: fullText, length: cum };
  }

  function findPartForOffset(parts, offset) {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (offset >= p.startGlobal && offset < p.endGlobal) {
        return p;
      }
    }
    if (parts.length && offset === parts[parts.length - 1].endGlobal) {
      return parts[parts.length - 1];
    }
    return null;
  }

  function offsetsToRange(parts, start, end) {
    if (!parts.length || start < 0 || end <= start) {
      return null;
    }
    var endIdx = end - 1;
    var sp = findPartForOffset(parts, start);
    var ep = findPartForOffset(parts, endIdx);
    if (!sp || !ep) {
      return null;
    }
    var range = document.createRange();
    var startInNode = start - sp.startGlobal + sp.nodeStart;
    var endInNode = end - ep.startGlobal + ep.nodeStart;
    range.setStart(sp.node, startInNode);
    range.setEnd(ep.node, endInNode);
    return range;
  }

  function sentenceSpans(fullText) {
    var t = fullText;
    if (!t || !t.trim()) {
      return [];
    }
    var out = [];
    try {
      if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        var seg = new Intl.Segmenter(undefined, { granularity: 'sentence' });
        var iter = seg.segment(t);
        var x;
        for (x of iter) {
          var raw = x.segment;
          var st = x.index;
          var en = st + raw.length;
          var speech = raw.trim();
          if (speech.length) {
            out.push({ start: st, end: en, speech: speech });
          }
        }
        if (out.length) {
          return out;
        }
      }
    } catch (e) {
      /* fall through */
    }
    var re = /[^.!?]*(?:[.!?]+|$)/g;
    var m;
    while ((m = re.exec(t)) !== null) {
      var chunk = m[0];
      var st = m.index;
      var en = st + chunk.length;
      var speech = chunk.trim();
      if (speech.length) {
        out.push({ start: st, end: en, speech: speech });
      }
    }
    return out;
  }

  function clearSentenceMarks() {
    var marks = document.querySelectorAll('mark.acc-tts-sentence[data-acc-tts]');
    marks.forEach(function (mark) {
      var p = mark.parentNode;
      if (!p) {
        return;
      }
      while (mark.firstChild) {
        p.insertBefore(mark.firstChild, mark);
      }
      p.removeChild(mark);
      if (p.normalize) {
        p.normalize();
      }
    });
  }

  function wrapRangeInMark(range) {
    if (!range || range.collapsed) {
      return null;
    }
    var mark = document.createElement('mark');
    mark.className = 'acc-tts-sentence';
    mark.setAttribute('data-acc-tts', '1');
    try {
      range.surroundContents(mark);
      return mark;
    } catch (e1) {
      try {
        var frag = range.extractContents();
        mark.appendChild(frag);
        range.insertNode(mark);
        return mark;
      } catch (e2) {
        return null;
      }
    }
  }

  function highlightSentenceAt(root, span) {
    clearSentenceMarks();
    if (!root || !span || !root.isConnected) {
      return;
    }
    var model = buildTextModel(root, MAX_CHARS);
    if (!model.parts.length) {
      return;
    }
    var range = offsetsToRange(model.parts, span.start, span.end);
    if (!range) {
      return;
    }
    wrapRangeInMark(range);
  }

  function speakSentenceChain(spans, rootEl) {
    window.speechSynthesis.cancel();
    sentenceSpansArr = spans.slice();
    sentenceIndex = -1;
    readRoot = rootEl;

    if (!sentenceSpansArr.length) {
      clearSentenceMarks();
      readRoot = null;
      chainActive = false;
      return;
    }

    chainActive = true;

    function speakNext() {
      sentenceIndex++;
      if (sentenceIndex >= sentenceSpansArr.length) {
        clearSentenceMarks();
        readRoot = null;
        chainActive = false;
        return;
      }
      var span = sentenceSpansArr[sentenceIndex];
      var u = new SpeechSynthesisUtterance(span.speech);
      u.rate = 1.0;

      function applyHighlight() {
        if (readRoot && readRoot.isConnected) {
          highlightSentenceAt(readRoot, span);
        }
      }

      u.addEventListener('start', applyHighlight);
      applyHighlight();

      u.addEventListener('end', speakNext);
      u.addEventListener('error', speakNext);
      window.speechSynthesis.speak(u);
    }

    speakNext();
  }

  function onHoverMaybeRead(e) {
    if (!A.currentSettings || !A.currentSettings.screenReader) {
      return;
    }
    var rawTarget = e.target;
    var el =
      rawTarget.nodeType === Node.TEXT_NODE ? rawTarget.parentElement : rawTarget;
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    if (el.closest('#acc-widget-panel') || el.closest('#acc-widget-button')) {
      return;
    }

    // Avoid restarting chain on every nested mouseover within the same read root.
    if (chainActive && readRoot && readRoot.isConnected) {
      if (el === readRoot || readRoot.contains(el) || (el.contains && el.contains(readRoot))) {
        return;
      }
    }

    var model = buildTextModel(el, MAX_CHARS);
    var fullText = model.fullText;
    if (!fullText.trim().length) {
      return;
    }

    var spans = sentenceSpans(fullText);
    if (!spans.length) {
      return;
    }

    if (hoverTimer) {
      clearTimeout(hoverTimer);
    }
    hoverTimer = setTimeout(function () {
      hoverTimer = null;
      injectHighlightStyles();
      speakSentenceChain(spans, el);
    }, DEBOUNCE_MS);
  }

  function setupScreenReader() {
    injectHighlightStyles();
    window.addEventListener('mouseover', onHoverMaybeRead);
    window.addEventListener('mouseout', function () {
      if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }
    });
  }

  A.setupScreenReader = setupScreenReader;
  A.cancelTts = function () {
    window.speechSynthesis.cancel();
    sentenceSpansArr = [];
    sentenceIndex = -1;
    readRoot = null;
    chainActive = false;
    clearSentenceMarks();
  };
})();
