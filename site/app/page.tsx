import HeroOrbit from "./hero-orbit";
import LyapunovMap from "./lyapunov-map";
import Simulator from "./simulator";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <main id="main-content">
        <nav className="nav" aria-label="Primary navigation">
          <a className="brand" href="#top" aria-label="Three Body Lab home">
            <span className="brand__mark">3B</span>
            <span>Three Body Lab</span>
          </a>
          <div className="nav__links">
            <a href="#simulator">Simulator</a>
            <a href="#map">Chaos map</a>
            <a href="#method">Method</a>
            <a href="#evidence">Evidence</a>
            <a href="https://github.com/lindgreendavid/three-body-lab">GitHub</a>
          </div>
        </nav>

        <section className="hero" id="top">
          <div className="eyebrow">
            <span>Verified interactive research release</span>
            <span>Product v1.0.0 · frozen v0.1 study</span>
          </div>
          <h1>
            Two nearly identical starts.
            <br />
            <em>One diverges. Watch it happen.</em>
          </h1>
          <p className="hero__lead">
            The planar three-body problem has no general closed-form solution — but it does have
            a measurable chaos boundary. This laboratory integrates a reference trajectory and an
            almost-identical perturbed twin, watches them diverge, and estimates a maximal
            Lyapunov exponent from the divergence rate. A frozen, preregistered sweep places the
            figure-eight orbit, the Lagrange equilateral triangle, and the Euler collinear
            solution on that map — and the honest result is more interesting than a clean
            stable/chaotic split.
          </p>
          <div className="hero__demo">
            <HeroOrbit />
            <p className="hero__demo-caption">
              The figure-eight orbit tracing itself, with a barely-perturbed twin (dashed)
              already visibly peeling away — the phenomenon this lab measures, looping live.
            </p>
          </div>
          <div className="hero__actions">
            <a className="button button--primary" href="#simulator">
              Run the simulator
            </a>
            <a className="button button--ghost" href="#map">
              Read the chaos map
            </a>
            <a
              className="button button--ghost"
              href="https://github.com/lindgreendavid/three-body-lab/blob/main/docs/research-report.md"
            >
              Read the findings
            </a>
          </div>
          <div className="hero__principles" aria-label="Research principles">
            <span>Preregistered protocol</span>
            <span>DOP853, 1e-9 conservation</span>
            <span>Benettin two-trajectory method</span>
            <span>Frozen, byte-checked registry</span>
            <span>No general 3-body solution claimed</span>
          </div>
        </section>

        <Simulator />

        <LyapunovMap />

        <section className="method" id="method">
          <header className="section-heading section-heading--light">
            <div>
              <span className="section-index">05</span>
              <p>Scientific method</p>
            </div>
            <h2>
              See exactly what
              <br />
              the estimate knows.
            </h2>
          </header>
          <div className="causal-chain" aria-label="Lyapunov estimation causal chain">
            <div>
              <span>1</span>
              <strong>Generate</strong>
              <p>Fix a base configuration: a special solution or a seeded generic scatter.</p>
            </div>
            <i>→</i>
            <div>
              <span>2</span>
              <strong>Integrate</strong>
              <p>DOP853, adaptive 8th-order, rtol 1e-11, atol 1e-12.</p>
            </div>
            <i>→</i>
            <div>
              <span>3</span>
              <strong>Perturb</strong>
              <p>Displace a twin by a fixed magnitude in a seeded random direction.</p>
            </div>
            <i>→</i>
            <div>
              <span>4</span>
              <strong>Renormalize</strong>
              <p>Every 1.0 time unit, measure and rescale the twin&apos;s separation.</p>
            </div>
            <i>→</i>
            <div>
              <span>5</span>
              <strong>Classify</strong>
              <p>Average the log-growth rate; apply the disclosed threshold.</p>
            </div>
          </div>
          <div className="equation-card">
            <div>
              <span>Equations of motion (G = 1, softened)</span>
              <code>d²rᵢ/dt² = Σⱼ≠ᵢ G·mⱼ·(rⱼ − rᵢ) / (|rⱼ − rᵢ|² + ε²)^1.5</code>
              <code>λ̂ = (1 / N·Δt) · Σ ln(dₖ / δ₀)</code>
            </div>
            <p>
              The softening length ε = 1×10⁻⁹ only prevents a literal division by zero; at every
              separation reached in this study it changes the force by a negligible amount
              relative to integrator tolerance. λ̂ is the Benettin et al. (1980) two-trajectory
              estimator: the mean log-growth rate of the twin&apos;s separation, renormalized every
              Δt = 1.0 time unit.
            </p>
          </div>
          <div className="interpretation-ladder">
            <article>
              <span>Observation</span>
              <h3>The twin separated by X after N renormalizations.</h3>
              <p>A numerical statement about one specific run, seed, and window.</p>
            </article>
            <article>
              <span>Supported inference</span>
              <h3>This configuration shows measured sensitive dependence within this window.</h3>
              <p>A reproducible statement bounded by the declared integrator and parameters.</p>
            </article>
            <article>
              <span>Unsupported leap</span>
              <h3>&ldquo;This solves the three-body problem&rdquo; or &ldquo;this proves asymptotic chaos.&rdquo;</h3>
              <p>Not established by a finite-window, single-threshold numerical sweep.</p>
            </article>
          </div>
        </section>

        <section className="evidence" id="evidence">
          <header className="section-heading">
            <div>
              <span className="section-index">06</span>
              <p>Research trail</p>
            </div>
            <h2>
              Built on arguments
              <br />
              you can inspect.
            </h2>
          </header>
          <div className="source-list">
            <a
              href="https://www.ams.org/journals/notices/200105/fea-montgomery.pdf"
              target="_blank"
              rel="noreferrer"
            >
              <span>Annals of Math · 2000</span>
              <strong>A remarkable periodic solution of the three-body problem in the case of equal masses</strong>
              <p>Chenciner &amp; Montgomery prove existence of the figure-eight orbit.</p>
              <b>↗</b>
            </a>
            <a href="http://www.maia.ub.edu/dsg/2001/index.html" target="_blank" rel="noreferrer">
              <span>Proc. 3rd ECM (Birkhäuser) · 2001</span>
              <strong>Periodic orbits of the planar N-body problem with equal masses and all bodies on the same path</strong>
              <p>Simo numerically refines the figure-eight initial conditions and finds it linearly stable.</p>
              <b>↗</b>
            </a>
            <a href="https://doi.org/10.1017/S0143385707000284" target="_blank" rel="noreferrer">
              <span>Ergodic Theory Dynam. Systems · 2007</span>
              <strong>Linear stability analysis of the figure-eight orbit in the three-body problem</strong>
              <p>Roberts gives a rigorous, computer-assisted proof of linear stability.</p>
              <b>↗</b>
            </a>
            <a href="https://doi.org/10.1112/plms/s1-6.1.86" target="_blank" rel="noreferrer">
              <span>Proc. LMS · 1875</span>
              <strong>On Laplace&apos;s three particles, with a supplement on the stability of steady motion</strong>
              <p>Routh derives the mass-ratio stability criterion for the Lagrange equilateral solution.</p>
              <b>↗</b>
            </a>
            <a href="https://doi.org/10.1007/BF02128236" target="_blank" rel="noreferrer">
              <span>Meccanica · 1980</span>
              <strong>Lyapunov characteristic exponents for smooth dynamical systems and for Hamiltonian systems; a method for computing all of them, Part 1: Theory</strong>
              <p>Benettin, Galgani, Giorgilli &amp; Strelcyn establish the two-trajectory renormalization method used here.</p>
              <b>↗</b>
            </a>
            <a
              href="https://projecteuclid.org/journals/acta-mathematica/volume-13/issue-1-2"
              target="_blank"
              rel="noreferrer"
            >
              <span>Acta Mathematica, vol. 13 · 1890</span>
              <strong>Sur le probleme des trois corps et les equations de la dynamique</strong>
              <p>Poincare&apos;s prize memoir, the origin of chaos theory and the non-integrability result this project never claims to overturn.</p>
              <b>↗</b>
            </a>
          </div>
        </section>

        <footer>
          <div>
            <span className="brand__mark">3B</span>
            <strong>Three Body Lab</strong>
          </div>
          <p>Research software by David Lindgreen · MIT License · Classical Newtonian mechanics only</p>
          <div>
            <a href="https://github.com/lindgreendavid/three-body-lab">Source code</a>
            <a href="https://github.com/lindgreendavid/three-body-lab/blob/main/docs/research-protocol.md">
              Protocol
            </a>
            <a href="https://github.com/lindgreendavid/three-body-lab/blob/main/ACCESSIBILITY.md">
              Accessibility
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}
