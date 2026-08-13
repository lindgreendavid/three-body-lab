# Research protocol

Frozen before generating or interpreting any v0.1.0 result.

## Status

This protocol is fixed before running `scripts/generate_registry.py` or looking at the
resulting registry. It describes the hypotheses, the numerical method, the sweep grid, the
Lyapunov-exponent estimation method, and the analysis plan. Any deviation from this document
discovered after results exist will be recorded as an amendment in
[`research-report.md`](research-report.md), not silently applied.

## Research question

In the planar gravitational three-body problem, where does trajectory behavior cross from
quasi-periodic/stable to chaotic, as measured by empirically estimated maximal Lyapunov
exponents, across a systematic sweep of (a) initial-condition perturbation magnitude and (b)
mass ratio? Do the known special periodic solutions — the figure-eight orbit
(Chenciner–Montgomery), the Lagrange equilateral-triangle solution, and the Euler collinear
solution — sit at measurable stability boundaries in this map, or deep inside stable basins?

## What this project is not

The general three-body problem has no closed-form solution (Poincaré, 1890; Bruns, 1887) and
this project never claims to provide one, solve it, or predict real solar-system trajectories.
This is a bounded, falsifiable computational experiment: an empirically estimated map of
sensitive dependence on initial conditions for a specific, documented set of configurations,
integrators, and tolerances. It reports what this map shows, not a general theory of
three-body chaos.

## Scope boundaries (declared before results)

1. **Planar only.** All bodies move in a fixed 2D plane. Out-of-plane (3D) perturbations,
   which are known to introduce additional instability channels, are out of scope.
2. **Exactly three bodies**, not general N-body dynamics.
3. **Newtonian point-mass gravity**, `G = 1`, no relativistic corrections, no extended bodies,
   no collisions modeled beyond a small softening length (below) that prevents literal
   singularities but slightly modifies the force law at very small separations.
4. **Finite integration time.** Every Lyapunov estimate is over a finite time window. A
   positive estimated exponent over that window is evidence of measured sensitive dependence
   within the window, not a proof of unbounded chaos, and a near-zero estimate does not prove
   long-term stability beyond the window.
5. **The chaos/stable classification threshold is an arbitrary, disclosed convention**, stated
   in full below — not a physical law.

## Falsifiable hypotheses

1. **H1 — perturbation-magnitude sweep separates configurations.** Across the six base
   configurations (three special solutions plus three generic scattered configurations, see
   below), the estimated maximal Lyapunov exponent differs by more than one order of magnitude
   between at least one pair of configurations at matched perturbation magnitude and
   integration window. Falsified if all six configurations produce estimated exponents within
   the same order of magnitude at every tested perturbation magnitude.
2. **H2 — the special solutions are locally stable relative to generic configurations.** The
   figure-eight, Lagrange, and Euler collinear solutions each show a smaller estimated maximal
   Lyapunov exponent than the median of the three generic scattered configurations, at matched
   perturbation magnitude. Falsified for any special solution whose estimated exponent is not
   smaller than that median.
3. **H3 — the Lagrange equilateral family degrades away from equal masses.** In the mass-ratio
   sweep (equal-mass Lagrange triangle perturbed toward unequal masses while holding the
   perturbation magnitude fixed), the estimated maximal Lyapunov exponent is monotonically
   non-decreasing in `|mass_ratio − 1|` on average across replications. Falsified if the
   exponent does not trend upward as the mass ratio moves away from 1.
4. **H4 — no clean universal threshold.** This is a preregistered null-hypothesis-style check
   on our own method: the report states explicitly whether a single scalar threshold on the
   estimated exponent cleanly separates configurations that look qualitatively periodic
   (bounded, closed-looking trajectories over the integration window) from configurations that
   visibly scramble. If it does not cleanly separate them, that is reported as a real finding
   about the limits of a single-threshold classification, not hidden.

These hypotheses are prospective. Version 0.1.0 is the first and only preregistered run; there
is no result-dependent re-running of the sweep with different parameters after inspecting
output. [`research-report.md`](research-report.md) records each hypothesis's disposition —
confirmed, falsified, or inconclusive — without suppressing adverse or null results.

## Numerical method

### Integrator choice

The simulator integrates Newton's equations of motion for three point masses in the plane
using `scipy.integrate.solve_ivp` with the **DOP853** method: an explicit, adaptive-step,
eighth-order embedded Runge–Kutta scheme (Dormand & Prince / Hairer, Nørsett & Wanner). This is
chosen over a hand-rolled symplectic leapfrog/Yoshida integrator for three reasons, stated
honestly alongside the trade-off it accepts:

- The chaos/Lyapunov estimation in this study needs a very accurate instantaneous state at
  each renormalization point over comparatively short integration windows (tens to low
  hundreds of time units), not provably bounded energy error over astronomical timescales.
  High-order adaptive RK gives tight local error control (`rtol=1e-11`, `atol=1e-12`) directly.
- A correctly implemented symplectic integrator guarantees bounded (oscillating, not drifting)
  energy error over long integrations even at low order, which is valuable for century-scale
  solar-system integration — not the regime this study operates in.
- `solve_ivp`/DOP853 is a widely validated, independently tested implementation, which lowers
  the risk of a self-introduced integrator bug relative to a hand-rolled symplectic scheme,
  and it is directly reusable for the interactive site.

**Accepted trade-off:** DOP853 is not symplectic, so energy and angular momentum are not
guaranteed bounded indefinitely; they can drift secularly over very long runs even with tight
tolerances. Every integration in this study is validated against explicit conservation
tolerances (below) over the actual windows used, and the report states the measured drift
rather than assuming it.

### Equations of motion

For bodies `i = 1, 2, 3` with mass `m_i`, position `r_i ∈ ℝ²`, and velocity `v_i`:

```
dr_i/dt = v_i
dv_i/dt = Σ_{j≠i} G m_j (r_j − r_i) / (|r_j − r_i|² + ε²)^{3/2}
```

with `G = 1` and a softening length `ε = 1×10⁻⁹` (in the same length units as the initial
conditions). The softening exists solely to keep the right-hand side finite if two bodies pass
through exact coincidence during numerical search; at the separations reached by every
configuration in this study it changes the computed force by a negligible amount relative to
integrator tolerance. Energy and angular momentum diagnostics are computed with the same
softened potential for consistency.

### Conservation validation

Before any sweep result is trusted, the integrator is validated by:

1. Integrating each of the three special solutions for at least 5 periods (or 50 time units if
   no closed period is expected) and confirming:
   - Relative total-energy drift `|E(t) − E(0)| / |E(0)|` stays below `1×10⁻⁹` at every
     recorded sample.
   - Relative total-angular-momentum drift `|L(t) − L(0)| / |L(0)|` stays below `1×10⁻⁹` at
     every recorded sample.
2. Confirming each special solution returns within a documented position tolerance of its
   initial configuration after one published period (figure-eight, Lagrange, Euler collinear
   all have known closed-form or numerically well-established periods), demonstrating the
   simulator reproduces their known periodicity rather than merely conserving energy while
   drifting off the orbit.

These checks are implemented as exact regression tests in `tests/test_integrator.py` and
`tests/test_special_solutions.py` and are part of the CI gate — a failing conservation or
periodicity check blocks every downstream result.

## Special solutions used

All three use `G = 1` and equal unit masses (`m₁ = m₂ = m₃ = 1`) at their canonical
configuration:

- **Figure-eight orbit** (Chenciner & Montgomery, 2000; numerically refined initial conditions
  from Simó, 2001). Published initial positions and velocities; period ≈ `6.3259` time units.
- **Lagrange equilateral triangle.** Three equal masses at the vertices of an equilateral
  triangle of side `1`, rotating rigidly about the common center of mass at angular velocity
  `ω = √(G·M_total / a³)`. This configuration is a relative equilibrium for *any* mass ratio at
  a given side length — the triangle shape does not depend on the masses, only the position of
  the (mass-weighted) center of mass does. Period `T = 2π/ω`.
- **Euler collinear solution.** Three equal masses on a line at positions `(−1, 0)`, `(0, 0)`,
  `(1, 0)`, rotating rigidly about the center of mass. For equal masses the equilibrium spacing
  is exactly symmetric by construction (no root-finding needed); the required angular velocity
  is derived from force balance on the outer bodies: `ω² = 5G/4` at unit spacing here. Period
  `T = 2π/ω`.

**Mass-ratio continuation is implemented only for the Lagrange family in this version.** The
Lagrange equilateral configuration admits a simple closed-form continuation to unequal masses
(the triangle geometry is mass-independent; only the center-of-mass offset changes). The Euler
collinear equilibrium spacing for unequal masses requires numerically solving Euler's quintic
equation for each mass ratio, and the figure-eight orbit has no known continuation to unequal
masses at all. Implementing a general Euler-quintic solver was judged out of scope for v0.1.0
to keep the numerical surface area small and fully tested; this is a deliberate scope
boundary, stated here and in the report, not a silent omission. The Euler collinear and
figure-eight solutions appear only at their canonical equal-mass configuration, in the
perturbation-magnitude sweep.

## Lyapunov exponent estimation method

The maximal Lyapunov exponent is estimated with the standard two-trajectory divergence method
(Benettin et al., 1980):

1. Integrate a **reference trajectory** from the base initial condition for the full window
   `[0, T_max]`.
2. Construct a **perturbed twin trajectory** whose initial state is the reference state plus a
   displacement vector of fixed Euclidean norm `δ₀` (the "perturbation magnitude" swept in this
   study) in a direction drawn from a seeded random unit vector in the full 12-dimensional
   state space (3 bodies × 2 position + 2 velocity components each). The direction is seeded
   per replication (`numpy.random.default_rng(seed)`) so every cell is exactly reproducible.
3. Integrate the twin trajectory forward over a fixed **renormalization interval**
   `Δt_renorm = 1.0` time unit.
4. Measure the Euclidean separation `d_k` between the reference and twin states at the end of
   the interval; accumulate `ln(d_k / δ₀)`.
5. Rescale the twin state back to distance `δ₀` from the reference state, along the current
   separation direction, and repeat from step 3 until `T_max` is reached.
6. The estimated maximal Lyapunov exponent is:

```
λ̂ = (1 / (N · Δt_renorm)) · Σ_{k=1}^{N} ln(d_k / δ₀)
```

where `N = T_max / Δt_renorm` is the number of renormalization steps.

**Disclosed, justified parameters** (these materially affect the estimate and are fixed before
any result is generated, not tuned afterward):

- `δ₀` (perturbation magnitude): swept explicitly from `1×10⁻⁸` to `1×10⁻²` (log-spaced, 8
  values) in the perturbation-magnitude sweep; held at a fixed reference value `1×10⁻⁶` in the
  mass-ratio sweep. `1×10⁻⁶` is chosen as small enough to stay in the locally-linearized
  regime for the stable configurations tested (verified post hoc by checking the estimate is
  not sensitive to halving `δ₀`) while remaining well above double-precision floating-point
  noise (~`1×10⁻¹⁵` relative).
- `Δt_renorm = 1.0` time unit: chosen to be a small fraction of the shortest special-solution
  period (figure-eight period ≈ 6.33) so that renormalization happens several times per orbit,
  while remaining long enough that each interval's integration cost is small relative to the
  sweep's total cost.
- `T_max = 20.0` time units for the perturbation-magnitude sweep (roughly 3 figure-eight
  periods, or 3–4 Lagrange/Euler periods), `T_max = 15.0` for the mass-ratio sweep. Both
  windows were set empirically during implementation: generic scattered configurations can
  enter close encounters that make DOP853's adaptive step size shrink sharply, so a fixed
  wall-clock-tractable window was chosen deliberately short rather than scaled to "many
  periods" the way the conservation-validation windows are. This is disclosed as a real
  limitation, not hidden: these are *short-window* Lyapunov estimates, sufficient to detect
  order-of-magnitude separation between configurations (the falsifiable claim in H1) but not
  sufficient to claim converged asymptotic exponents. The report treats the two sweeps'
  absolute exponent values as not directly comparable across sweeps for this reason (different
  windows) — only within-sweep comparisons are made.
- 3 independent perturbation-direction seeds per cell (`base_seed`, `base_seed + 1`,
  `base_seed + 2`), reported as mean ± sample standard deviation, to distinguish a genuine
  directional/chaotic signal from a single unlucky perturbation direction.

## Sweep grid

### Perturbation-magnitude sweep

- **Base configurations (6):** figure-eight, Lagrange equilateral, Euler collinear (all
  canonical equal-mass), and three generic scattered configurations (`generic_a`, `generic_b`,
  `generic_c`) — fixed, seeded random initial positions and velocities inside a bounded box,
  with total linear momentum and a fixed total energy scale normalized so trajectories neither
  immediately escape to infinity nor immediately collide. Generation is deterministic
  (`numpy.random.default_rng` with a fixed seed per configuration, recorded in
  `three_body_lab/special_solutions.py`).
- **Perturbation magnitudes (6):** log-spaced from `1×10⁻⁸` to `1×10⁻²`.
- **Direction seeds (3)** per (configuration, magnitude) cell.
- Total: `6 × 6 = 36` cells, each with 3 seeded replications.

### Mass-ratio sweep

- **Base configuration:** Lagrange equilateral family only (see scope boundary above), with
  `m₁ = m₃ = 1` fixed and `m₂` swept.
- **Mass ratios (6):** `m₂/m₁ ∈ {0.5, 0.75, 1.0, 1.5, 2.0, 3.0}`.
- **Perturbation magnitude:** fixed reference `δ₀ = 1×10⁻⁶`.
- **Direction seeds (3)** per mass-ratio cell.
- Total: `6` cells, each with 3 seeded replications.

Both sweeps are generated by `scripts/generate_registry.py`, which is deterministic given the
fixed seeds above, and are covered by a CI byte-comparison test against the committed
`reports/v0.1-lyapunov-registry.json`.

## Classification threshold (disclosed as arbitrary)

A cell is classified from its mean estimated exponent `λ̄` across the 3 direction seeds:

- `λ̄ < 0.02` → **stable / quasi-periodic**
- `0.02 ≤ λ̄ < 0.10` → **borderline** (not confidently classified either way)
- `λ̄ ≥ 0.10` → **chaotic**

These cut points are a disclosed convention chosen to be well above the numerical-noise floor
of the method (estimated separately by running the reference trajectory against itself, which
should yield an exponent near zero) and well below the exponents typically produced by visibly
scrambling generic configurations in preliminary exploratory runs. They are not derived from a
physical law, are not validated against an external ground truth, and the "borderline" band is
reported honestly as a zone this method does not resolve — not folded into either neighboring
class.

## Analysis plan

- Publish every planned cell in both sweeps, including borderline and any numerically
  degenerate (e.g. escaped-body, near-collision) cells.
- Report each hypothesis's disposition in `research-report.md` without suppressing adverse
  results.
- Report where each special solution's mean exponent (across its perturbation-magnitude sweep
  row) falls relative to the classification thresholds, and relative to the generic
  configurations at matched perturbation magnitude.
- Never claim a global, physically fundamental chaos boundary from this bounded grid — only
  describe what this specific grid, integrator, and threshold convention show.

## Ethics and responsible framing

This is classical, deterministic Newtonian mechanics; there are no human subjects, no
personal data, and no fairness or safety-sensitive population involved. The main responsible-
communication obligation here is scientific honesty: not overstating what a finite-window,
single-threshold, planar three-body sweep can support about "solving" or fully characterizing
three-body chaos in general.
