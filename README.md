# Accessify - Chrome Extension
**TSA Software Development 2025-26 Project**

A comprehensive browser extension that removes barriers and increases accessibility for people with vision, hearing, and cognitive disabilities.

---

## Project Overview

Accessify is an extension that provides a variety of accessibility tools that help users with:
- **Vision disabilities**: Text sizing, contrast modes, color blindness filters, dyslexia support
- **Hearing disabilities**: Visual indicators, text highlighting
- **Cognitive disabilities**: Screen reader, reading guides, animation control, ADHD-friendly features

---

## Features Implementation

### Vision Enhancements

#### 1. **Text Resizing**
- Adjustable from 100% to 120%
- Real-time scaling of all text elements
- Preserves page layout integrity

#### 2. **Contrast Modes**
- **Invert Colors**: Flips all page colors for high visibility
- **Dark Mode**: Modern dark theme with optimized colors
- **High Contrast (WCAG AAA)**: Yellow text on black background (7:1 ratio)
- **Monochrome**: Grayscale mode for reduced visual complexity
- **Custom Colors**: User-defined text and background colors

#### 3. **Dyslexia-Friendly Font**
- Integrates OpenDyslexic font family
- Improves readability for dyslexic users
- Instant toggle on/off

#### 4. **Visual Highlights**
- **Highlight Links**: Yellow outline and background on all clickable links
- **Highlight Headers**: Blue border and background on H1-H6 elements
- Makes navigation and structure more visible

#### 5. **Big Cursor**
- Large, high-contrast cursor (3x normal size)
- Black fill with white outline for maximum visibility
- Helps users track pointer position

#### 6. **Color Blindness Filters**
- **Protanopia** (Red-blind)
- **Deuteranopia** (Green-blind)
- **Tritanopia** (Blue-blind)
- **Achromatopsia** (Complete color blindness)
- Uses SVG color matrices for accurate simulation

### ADHD & Cognitive Tools

#### 7. **Built-in Screen Reader**
- Text-to-Speech engine using Web Speech API
- Reads content on hover
- Adjustable speech rate
- Addresses hearing disabilities with audio feedback

#### 8. **Reading Guide**
- Red horizontal line that follows cursor
- Helps maintain focus while reading
- Reduces line-skipping for ADHD users

#### 9. **Reading Mask**
- Darkens entire page except horizontal strip around cursor
- Creates "spotlight effect" for focused reading
- Minimizes visual distractions

#### 10. **Stop Animations**
- Pauses all CSS animations and transitions
- Hides animated GIFs
- Critical for users sensitive to motion/flashing

### Text Styling

#### 11. **Line Height Control**
- Adjustable from 1.0x to 2.0x
- Increases white space between lines
- Improves readability for dyslexia and visual processing disorders

#### 12. **Letter Spacing**
- Adjustable from 0px to 3px
- Adds space between characters
- Helps with tracking and word recognition

#### 13. **Text Alignment**
- Force left, center, right, or justified alignment
- Overrides website defaults
- Helps users with reading preferences

---

## Technical Architecture

### File Structure
```
├── manifest.json         # Extension configuration (Manifest V3)
├── popup.html            # Toolbar popup UI with categorized controls
├── popup.css             # Popup styling
├── popup.js              # Settings management and storage sync
├── content.js            # DOM manipulation, feature injection, widget loader
├── content.css           # Base content script styles
├── widget.html           # Floating accessibility panel (injected into pages)
├── widget.css            # Floating widget styling and layout
├── background.js         # Service worker
├── icon16.png            # Extension icon (16px)
├── icon48.png            # Extension icon (48px)
├── icon128.png           # Extension icon (128px)
├── package.json          # Node dependencies (e.g. for icon generation)
└── create-icons.html     # Helper for creating icon assets
```

### Key Technologies
- **Chrome Extension API**: Manifest V3, Storage API, Messaging
- **Web Speech API**: Text-to-speech for screen reader
- **SVG Filters**: Color blindness simulation
- **CSS Injection**: Dynamic style application
- **MutationObserver**: Real-time DOM monitoring

---

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the project folder
6. Extension icon appears in toolbar
7. Visit any website and the floating widget will appear in the bottom-left corner.

---

## Usage

### Floating Widget
1. **Look in the bottom-left corner** of any webpage
2. **Click the blue floating button** (accessibility icon)
3. **Accessibility panel slides out** with all controls
4. **Toggle switches and sliders** - changes apply instantly
5. **Close with x button** or press Escape

### Alternative: Browser Toolbar
1. **Click the extension icon** in your Chrome toolbar
2. **Opens the traditional popup** (still available)

### Quick Start Examples
- **For Low Vision**: Enable "Text Size" (150%), "High Contrast", "Big Cursor"
- **For Dyslexia**: Enable "Dyslexia Font", "Line Height" (2.0x), "Letter Spacing" (3px)
- **For ADHD**: Enable "Reading Mask", "Stop Animations", "Highlight Headers"
- **For Color Blindness**: Select appropriate filter (e.g., "Deuteranopia")
