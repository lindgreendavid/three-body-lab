# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- Hardened the transitive `image-size` parsers against malformed ICNS and ISO-BMFF input,
  added executable security regression probes, and kept the production audit strict for every
  other high-severity advisory.
- Made frozen-registry verification portable across operating systems by comparing floating-point
  values with a narrow numerical tolerance, including an explicitly bounded tolerance for
  chaotic finite-time Lyapunov estimates from the ODE solver (10% relative for individual and
  mean estimates; `0.05` absolute for the three-seed standard deviation), while retaining exact
  checks for classifications, structure, parameters, conservation diagnostics, and all other data.
- Ignored incremental TypeScript build state and aligned the Cloudflare compatibility date with
  the version supported by the pinned runtime.

### Changed

- `site/`: a presentation-quality pass over the interactive laboratory, with no change to
  any physics, integration, or research claim. The live simulator now renders orbital
  trails as fading, long-exposure-style gradients (instead of flat lines) using the site's
  `--acid`/`--coral`/`--blue` palette tokens for the three bodies and the reference-vs-twin
  distinction; a new "Export video clip" control uses the browser's native `MediaRecorder`
  API to download a 5-second WebM clip of a run, so a divergence can be shared as content
  rather than only viewed live; and the hero section replaces the static decorative outline
  with a small autoplaying, looping canvas animation of the real figure-eight orbit (reusing
  the same physics module as the live simulator) alongside a visibly diverging perturbed
  twin. All three respect `prefers-reduced-motion`.

## [0.1.0] - 2026-08-13

### Added

- A preregistered research protocol (`docs/research-protocol.md`) fixing the research
  question, four falsifiable hypotheses, the DOP853 integrator justification, the Benettin
  two-trajectory Lyapunov-exponent estimation method with disclosed parameters, the sweep
  grid, and a disclosed, arbitrary classification threshold — committed before any result
  existed.
- A validated planar three-body simulator (`three_body_lab`): softened Newtonian equations of
  motion, an adaptive DOP853 integrator, and energy/angular-momentum conservation diagnostics,
  regression-tested against the figure-eight, Lagrange equilateral, and Euler collinear special
  solutions to within a 1e-9 relative conservation tolerance over 5 periods.
- A Benettin two-trajectory Lyapunov-exponent estimator with a seeded perturbation direction
  and periodic renormalization.
- A frozen, deterministic, byte-checked registry (`reports/v0.1-lyapunov-registry.json`)
  covering a 6-configuration x 6-magnitude perturbation sweep and a 6-mass-ratio Lagrange-
  family sweep, each with 3 seeded direction replications.
- A research report (`docs/research-report.md`) recording every hypothesis's disposition,
  including the headline finding that all 42 registry cells classified "chaotic" under the
  preregistered threshold, and that the Lagrange and Euler collinear special solutions are
  measurably *less* stable than generic configurations — consistent with, and a numerical
  corroboration of, Routh's classical stability criterion.
- An interactive Next.js (vinext) site (`site/`) for Cloudflare Workers deployment
  (`three-body-lab-interactive`): a live canvas simulator with a perturbed-twin overlay and
  separation chart, a chaos-map view of the frozen registry with full accessible data tables
  and non-color encoding, a scientific-method section, and a cited research trail.
- Repository hygiene: `pyproject.toml` (ruff, mypy strict, pytest with a 95% coverage gate),
  CI (Python quality, registry byte-comparison, site lint/build/test), CodeQL, and the standard
  set of community/governance docs.
