# Three Body Lab

<p><a href="https://github.com/lindgreendavid/lindgreendavid/tree/main/brand"><img src="https://raw.githubusercontent.com/lindgreendavid/lindgreendavid/main/brand/lab-notes-mark.svg" width="52" align="right" alt="Lab Notes research-cycle mark"></a></p>

**Part of the [Lab Notes Research Portfolio](https://blog-interactive.lindgreendavid.workers.dev/)** · Computational physics · Question → evidence → finding → boundary

A reproducible laboratory mapping where the planar gravitational three-body problem crosses
from stable/quasi-periodic to chaotic, as measured by empirically estimated maximal Lyapunov
exponents.

**[Open the live interactive laboratory](https://three-body-lab-interactive.lindgreendavid.workers.dev)** · **[Read the plain-language write-up](https://blog-interactive.lindgreendavid.workers.dev/posts/three-body-lab-chaos-boundary)**

**Stable product release:** [v1.0.0](https://github.com/lindgreendavid/three-body-lab/releases/tag/v1.0.0) · **Study:** unchanged frozen v0.1 registry.

**Research question:** across a systematic sweep of initial-condition perturbations and mass
ratios, where does trajectory behavior cross from stable to chaotic — and do the classical
special solutions (the figure-eight orbit, the Lagrange equilateral triangle, the Euler
collinear configuration) sit at that boundary, or well inside a stable or chaotic basin?

This is **not** a claim to solve the three-body problem — no general closed-form solution
exists (Poincaré, 1890), and this project never implies otherwise. It is a bounded, falsifiable
computational experiment with a preregistered protocol, a validated numerical integrator, and a
frozen, reproducible result registry.

**Headline finding (v0.1.0):** every one of the 42 cells in the frozen registry classified as
"chaotic" by the preregistered threshold — including the Lagrange equilateral and Euler
collinear relative equilibria, which are analytically *linearly unstable* at the equal masses
tested here (a real, citable fact, not a bug). Only the figure-eight orbit — the one special
solution proven linearly stable in the literature — showed the smallest measured divergence of
the six base configurations, though it too exceeded this study's short-window "chaotic" cutoff.
Full reasoning, every hypothesis's disposition, and the limitations that qualify this: see
[`docs/research-report.md`](docs/research-report.md).

## What this contributes

- A concrete, empirically measured answer to a specific question, not a restatement of the (unsolved, and never-claimed-solved) three-body problem: within this disclosed method's window, where does chaos actually show up, and are the "special" solutions actually more stable? (Answer: not the way textbook intuition suggests — see below.)
- A result grounded in classical celestial mechanics: the equal-mass Lagrange equilateral and
  Euler collinear solutions show greater finite-window divergence than the generic comparison
  configurations. This is consistent with their known linear instability, but the short-window,
  unconstrained perturbation estimator is not a numerical proof of the Gascheau–Routh criterion.
- An interactive way to *see* sensitive dependence on initial conditions happen, in real time, rather than just being told chaos exists.
- Two preregistered hypotheses reported as falsified rather than quietly reframed after the fact — see [`docs/research-report.md`](docs/research-report.md).
- What it does **not** contribute: a solution to the three-body problem, a general theory of the chaos boundary, or any claim beyond this specific grid, integrator, and threshold.

## What's here

| Path | What it is |
| --- | --- |
| [`docs/research-protocol.md`](docs/research-protocol.md) | The preregistered hypotheses, numerical method, sweep grid, and classification threshold — written and committed before any result existed. |
| [`docs/research-report.md`](docs/research-report.md) | What the frozen registry actually shows, hypothesis by hypothesis, with limitations stated explicitly. |
| [`src/three_body_lab/`](src/three_body_lab/) | The Python package: DOP853 integrator, special-solution generators, Benettin two-trajectory Lyapunov estimator, and the sweep. |
| [`tests/`](tests/) | Conservation/periodicity regression tests against the three known special solutions, and a byte-comparison test against the frozen registry. |
| [`reports/v0.1-lyapunov-registry.json`](reports/v0.1-lyapunov-registry.json) | The frozen, deterministic sweep output. |
| [`site/`](site/) | An interactive Next.js (vinext) laboratory: an autoplaying hero animation of the real figure-eight orbit, a live simulator with fading-trail rendering, a downloadable video export of a run, a twin-trajectory divergence view, and the chaos map, built for Cloudflare Workers. |

## Run the simulator locally

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'

# Integrate a preset special solution and report conservation drift:
three-body-lab integrate figure-eight
three-body-lab integrate lagrange
three-body-lab integrate euler
```

## Reproduce the registry

```bash
source .venv/bin/activate
python scripts/generate_registry.py --output /tmp/v0.1-lyapunov-registry.json
cmp reports/v0.1-lyapunov-registry.json /tmp/v0.1-lyapunov-registry.json  # should be silent
```

This takes roughly one minute and is fully deterministic (fixed seeds throughout); CI runs the
same comparison on every push.

## Run the interactive site locally

```bash
cd site
pnpm install
pnpm run dev      # local development server
pnpm run build    # production build (Cloudflare Workers target)
pnpm run test     # build + node --test
pnpm run lint     # eslint
```

`site/wrangler.jsonc` is configured for deployment to Cloudflare Workers as
`three-body-lab-interactive`. This repository does not run `wrangler deploy` — that is a
manual step the maintainer runs after reviewing a build.

## Quality gates

```bash
ruff check .
ruff format --check .
mypy src
pytest                      # includes a 95% coverage gate
python -m build

cd site && pnpm run lint && pnpm run build && pnpm run test
```

## Scope and limitations (short version — full version in the report)

Planar only (no out-of-plane motion), exactly three bodies, Newtonian point-mass gravity with a
negligible softening length, finite integration windows (not asymptotic chaos proofs), and an
explicitly arbitrary classification threshold. See
[`docs/research-protocol.md`](docs/research-protocol.md#scope-boundaries-declared-before-results)
and [`docs/research-report.md`](docs/research-report.md#limitations) for the complete,
disclosed list.

## License

MIT. See [`LICENSE`](LICENSE).

## Citation

See [`CITATION.cff`](CITATION.cff).
