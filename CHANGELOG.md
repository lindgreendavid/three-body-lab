# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
[Semantic Versioning](https://semver.org/).

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
