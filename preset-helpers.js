/** Shared preset math + segment strip sync (popup + widget). */
(function (g) {
  'use strict';

  var TEXT_SIZES = [1.0, 1.1, 1.15, 1.2];
  var LINE_HEIGHTS = ['', 1, 1.5, 1.75, 2];
  var LETTER_SPACINGS = [0, 1, 2, 3];
  var TEXT_ALIGNMENTS = ['', 'left', 'right', 'center', 'justify'];

  function pickNearestTextSize(val) {
    var n = Number(val);
    if (!Number.isFinite(n)) {
      return 1.0;
    }
    return TEXT_SIZES.reduce(function (best, cur) {
      return Math.abs(cur - n) < Math.abs(best - n) ? cur : best;
    }, 1.0);
  }

  function pickNearestLineHeight(val) {
    if (val === '' || val === undefined || val === null) {
      return '';
    }
    var n = Number(val);
    if (!Number.isFinite(n)) {
      return '';
    }
    var numericOptions = LINE_HEIGHTS.filter(function (h) {
      return h !== '';
    });
    return numericOptions.reduce(function (best, cur) {
      return Math.abs(cur - n) < Math.abs(best - n) ? cur : best;
    }, '');
  }

  function pickNearestLetterSpacing(val) {
    var n = Number(val);
    if (!Number.isFinite(n)) {
      return 0;
    }
    return LETTER_SPACINGS.reduce(function (best, cur) {
      return Math.abs(cur - n) < Math.abs(best - n) ? cur : best;
    }, 0);
  }

  function pickValidAlignment(val) {
    if (val === '' || val === undefined || val === null) {
      return '';
    }
    return TEXT_ALIGNMENTS.indexOf(val) >= 0 ? val : '';
  }

  function updateSegments(groupId, value) {
    var group = document.getElementById(groupId);
    if (!group) {
      return;
    }
    var segWrap = group.nextElementSibling;
    var segments =
      segWrap && segWrap.classList && segWrap.classList.contains('segmented-line')
        ? segWrap.querySelectorAll('.segment')
        : [];
    if (!segments.length) {
      return;
    }
    var buttons = Array.from(group.querySelectorAll('button'));
    var index = -1;
    for (var bi = 0; bi < buttons.length; bi++) {
      var btn = buttons[bi];
      var btnVal = btn.dataset.value !== undefined ? btn.dataset.value : btn.dataset.size;
      if (
        btnVal === String(value) ||
        (value !== '' && Number(btnVal) === Number(value))
      ) {
        index = bi;
        break;
      }
    }
    segments.forEach(function (seg, i) {
      seg.classList.toggle('active', i === index);
    });
  }

  g.AccessifyPresets = {
    TEXT_SIZES: TEXT_SIZES,
    LINE_HEIGHTS: LINE_HEIGHTS,
    LETTER_SPACINGS: LETTER_SPACINGS,
    TEXT_ALIGNMENTS: TEXT_ALIGNMENTS,
    pickNearestTextSize: pickNearestTextSize,
    pickNearestLineHeight: pickNearestLineHeight,
    pickNearestLetterSpacing: pickNearestLetterSpacing,
    pickValidAlignment: pickValidAlignment,
    updateSegments: updateSegments
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
