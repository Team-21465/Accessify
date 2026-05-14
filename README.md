# Accessify - Chrome Extension
**TSA Software Development 2025-26 Project**

A comprehensive browser extension that removes barriers and increases accessibility for people with vision, hearing, and cognitive disabilities.

---

## Project Overview

Accessify is an extension that provides a variety of accessibility tools that help users with:
- **Vision disabilities**: Text sizing, contrast modes, color blindness filters, dyslexia support
- **Hearing disabilities**: Visual indicators, text highlighting
- **Cognitive disabilities**: Screen reader, reading guides, animation control, ADHD-friendly features

**How settings are stored:** Global defaults live in `chrome.storage.sync`. Per-website overrides and **domain groups** (comma-separated patterns like `*.edu`) live in `chrome.storage.local` and are merged in order documented in `settings-model.js`. The **floating widget** can target **Default (all sites)**, **This site**, or a **saved group**; it may auto-pick a matching group from your patterns until you change the scope dropdown (which locks that choice).

---

## Features Implementation

### Vision Enhancements

#### 1. **Text Resizing**
- Adjustable from 100% to 120% (preset steps)
- Real-time scaling of all text elements
- Preserves page layout integrity

#### 2. **Contrast Modes**
- **Invert Colors**: Flips all page colors for high visibility
- **Dark Mode**: Modern dark theme with optimized colors
- **High Contrast (WCAG AAA)**: Yellow text on black background (7:1 ratio)
- **Monochrome**: Grayscale mode for reduced visual complexity
- **Custom Colors**: User-chosen text and background colors

#### 3. **Dyslexia-Friendly Font**
- Integrates OpenDyslexic font family
- Improves readability for dyslexic users
- Instant toggle on/off

#### 4. **Visual Highlights**
- **Highlight Links**: Yellow outline and light background on links (does not force a single link text color, so contrast stays flexible)
- **Highlight Headers**: Blue border and background on all header elements
- Makes navigation and structure more visible

#### 5. **Big Cursor**
- Large, high-contrast pointer (SVG cursor) with **Small / Medium / Large** presets
- Black fill with white outline for visibility
- Helps users track pointer position

#### 6. **Color Blindness Filters**
- **Protanopia** (Red-blind)
- **Deuteranopia** (Green-blind)
- **Tritanopia** (Blue-blind)
- **Achromatopsia** (Complete color blindness)
- Uses SVG color matrices for accurate simulation

### ADHD & Cognitive Tools

#### 7. **Built-in Screen Reader**
- Text-to-Speech using the **Web Speech API**
- Reads content on hover (debounced); plays sentence-by-sentence with **in-page highlighting** of the current sentence (`mark.acc-tts-sentence`)

#### 8. **Reading Guide**
- Red horizontal line that follows cursor
- Helps maintain focus while reading
- Reduces line-skipping for ADHD users

#### 9. **Reading Mask**
- Darkens entire page except a horizontal band around the cursor
- **Narrow / Medium / Wide** band presets
- Creates a “spotlight” for focused reading

#### 10. **Stop Animations**
- Pauses all CSS animations and transitions
- Hides animated GIFs
- Helpful for users sensitive to motion/flashing

### Text Styling

#### 11. **Line Height Control**
- Adjustable from 1.0x to 2.0x
- Increases white space between lines
- Improves readability for dyslexia and visual processing disorders

#### 12. **Letter Spacing**
- Adjustable from 0px to 3px
- Adds space between characters
- Helps with word/letter tracking

#### 13. **Text Alignment**
- Force left, center, right, or justified alignment
- Overrides website defaults
- Helps users with reading preferences

#### 14. **Floating widget & layout**
- **Corner** placement for the launcher (four corners), optional **hide floating button**, and a **stronger focus ring** on page controls (off by default; toggle in Vision or the toolbar popup)
- **Keyboard:** The extension registers **Toggle floating button visibility**: suggested **Alt+Z** on Windows and Linux, and **Option+Z** on macOS via the manifest `mac` key—Chrome treats these like other extension shortcuts. If the key is not bound after install, open [`chrome://extensions/shortcuts`](chrome://extensions/shortcuts), find Accessify, and assign or change it there. Shortcuts only work while Chrome has focus and not on restricted pages (`chrome://`, the Chrome Web Store, built-in PDF viewer, etc.); test on a normal **https://** page.

---

## Technical Architecture

### Content script pipeline (`manifest.json` order)

```
settings-model.js       # Defaults, merge order, sync vs local domain map
preset-helpers.js       # Shared text-preset math (widget + popup parity)
feature-reading-overlay.js
feature-tts.js          # Hover read-aloud + on-page sentence marks
feature-stylesheet.js   # Injected page CSS from effective settings
widget-controller.js    # In-page widget HTML/CSS injection + controls
content-main.js         # Orchestration, storage listeners, messaging
content.css             # Base content script stylesheet
```

### Other files

```
├── manifest.json         # MV3: action, commands, content_scripts, background
├── popup.html / popup.css / popup.js   # Toolbar UI; sync + message active tab
├── widget.html / widget.css            # Injected floating panel markup + styles
├── background.js       # Service worker: init missing sync keys; command → storage + nudge active tab
├── icon16.png / icon48.png / icon128.png
├── package.json
└── create-icons.html
```

### Key technologies

- **Chrome Extension API**: Manifest V3, `chrome.storage.sync` + `chrome.storage.local`, `chrome.tabs` messaging, declarative **`commands`** (optional user-assigned shortcut in `chrome://extensions/shortcuts`)
- **Web Speech API**: `speechSynthesis` / `SpeechSynthesisUtterance` for read-aloud (not `chrome.tts`)
- **SVG filters**: Color blindness simulation
- **CSS injection**: Dynamic `<style>` built from merged selected settings

---

## Installation

### From the Chrome Web Store

You can install **Accessify** from the [Chrome Web Store](https://chromewebstore.google.com/detail/monmhaijmogmbebdfgblhbjbcnbekndf): open that link and choose **Add to Chrome**, or search the store for **Accessify**.

### From source (developers)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle top-right)
4. Click **Load unpacked**
5. Select the project folder
6. The extension icon appears in the toolbar
7. Visit a normal **https://** page (not `chrome://` or the Web Store). The floating button appears by default in the bottom-left corner. In the widget under **Site & layout**, you can move it around or hide the widget all together. If you hide the button, use the toolbar popup to show it again, or press **Alt+Z** (Windows/Linux) / **Option+Z** (Mac).

---

## Usage

### Floating widget

1. Find the **floating accessibility button** (default: bottom-left; configurable under **Site & layout**).
2. Click it to open the panel; adjust settings — changes apply to the current page.
3. Close with **×** or **Escape**.
4. If the button is hidden, use the toolbar popup to turn **Hide floating button** off, or use **Toggle floating button visibility** (**Alt+Z** on Windows/Linux, **Option+Z** on Mac—confirm or remap in [`chrome://extensions/shortcuts`](chrome://extensions/shortcuts)).

### Toolbar popup

1. Click the **Accessify** icon in the Chrome toolbar
2. Same settings are written to **sync** and applied to the **active tab** when possible

### Quick start examples

- **Low vision**: **Text size** 110–120%, **High contrast**, **Big cursor** (+ size preset)
- **Dyslexia**: **Dyslexia font**, **Line height** 2.0x, **Letter spacing** 3px
- **ADHD**: **Reading mask** (pick band width), **Stop animations**, **Highlight headers**
- **Color blindness**: Choose the matching filter (e.g. **Deuteranopia**)
