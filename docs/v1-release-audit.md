# v1.0.0 release audit

Audit date: 2026-08-13. Scientific baseline: `a132d57955f77cb3789ea7b904d44232c4075cfc`.
The exact product-release commit is the commit resolved by annotated tag `v1.0.0`.

## Evidence checked

- The frozen v0.1 protocol, numerical integrator, conservation diagnostics, Lyapunov estimator,
  tolerances and the research report were compared with the machine-readable registry.
- The registry has 42 predeclared cells: 36 perturbation cells and six mass-ratio cells, with the
  fixed seeds, integration horizons, renormalization interval and classification thresholds
  recorded under `constants`.
- Deterministic regeneration plus the tolerance-aware comparator is the release gate; the
  historical registry is not rewritten for the product release.

## Integrity

SHA-256 of `reports/v0.1-lyapunov-registry.json`:
`9ecf0b7442eafc8ac4b6686fa53f1223f114f561ecb1e698f8197c814a35d882`.

## Boundary

v1.0.0 is a stable research product around the unchanged v0.1 numerical study. Finite-time
empirical Lyapunov classifications depend on the declared integrator, horizon and thresholds;
they are not a general solution of the three-body problem.
