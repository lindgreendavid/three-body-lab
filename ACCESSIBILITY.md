# Accessibility statement

Three Body Lab is designed toward WCAG 2.2 Level AA. Accessibility is treated as a release
requirement, not an optional visual polish step. This statement covers the public interactive
laboratory built from `site/`.

## What is supported

- Semantic landmarks, ordered headings, a skip link, descriptive page title, and visible
  keyboard focus.
- Full keyboard operation for every simulator control (preset selection, perturbation
  magnitude, play/pause/reset); no drag-only custom interaction.
- The live canvas simulator has an `aria-label` that is kept in sync with elapsed time and
  current twin separation, so the animation's meaning is available without perceiving the
  canvas visually; a text-based separation-vs-time chart and full data tables accompany it.
- Text and shape cues in addition to color: the chaos-map scatter plot distinguishes special
  solutions from generic configurations with a filled diamond vs. a filled circle, not color
  alone, and classification labels are always shown as text tags, never color-only.
- Full accessible data tables for both sweeps (perturbation-magnitude and mass-ratio), always
  present in the DOM — not hidden behind a script-only chart with no fallback.
- The chaos-map section states limitations and the arbitrary nature of the classification
  threshold in a visually distinct panel **before** any stable/chaotic label is shown,
  mirroring the reading-order discipline used across this maintainer's other research
  laboratories.
- High-contrast and forced-color mode support; reduced-motion support (the canvas animation
  respects a pause control regardless of motion preference, and page scrolling stops smooth-
  scrolling under `prefers-reduced-motion: reduce`).
- Reflow down to a 320 CSS-pixel viewport and support for 200% text zoom without hiding
  navigation destinations.
- No autoplay of audio/video, no flashing content, no time limits, no authentication walls.

## Verification

Every change passes semantic HTML assertions and `eslint-plugin-jsx-a11y`. The release
checklist also covers keyboard order, focus visibility, non-text alternatives, labels, zoom/
reflow, reduced motion, target size, and color-independent meaning. Automated checks cannot
prove accessibility or compatibility with every assistive-technology combination.

## Known limitations

- The live canvas animation is inherently visual; the accompanying separation-vs-time chart,
  numeric stats panel, and `aria-label` are the non-visual equivalents, but they are a
  summary, not a frame-by-frame equivalent of the animation.
- The chaos-map data tables are long; a labeled, keyboard-focusable scroll region is used for
  the widest tables at narrow viewport widths.
- Mathematical notation is expressed as Unicode and plain text rather than MathML.
- The interface and documentation are currently in English.

## Feedback

Open an accessibility issue at
https://github.com/lindgreendavid/three-body-lab/issues/new and include the page section,
browser, assistive technology, and expected behavior when possible. Security-sensitive reports
should use the private process in [`SECURITY.md`](SECURITY.md).

## Standard

The target is the W3C Web Content Accessibility Guidelines 2.2 Level AA:
https://www.w3.org/TR/WCAG22/. Conformance language is intentionally bounded: this is an
engineering statement and testing record, not a third-party accessibility certification.
