import registry from "../../reports/v0.1-lyapunov-registry.json";

type Classification = "stable" | "borderline" | "chaotic";

type PerturbationCell = {
  parameters: { sweep: string; configuration: string; perturbation_magnitude: number };
  exponents: number[];
  mean_exponent: number;
  std_exponent: number;
  classification: Classification;
  energy_relative_drift: number;
  angular_momentum_relative_drift: number;
};

type MassRatioCell = {
  parameters: { sweep: string; configuration: string; mass_ratio: number };
  exponents: number[];
  mean_exponent: number;
  std_exponent: number;
  classification: Classification;
  energy_relative_drift: number;
  angular_momentum_relative_drift: number;
};

const perturbationSweep = registry.perturbation_sweep as unknown as PerturbationCell[];
const massRatioSweep = registry.mass_ratio_sweep as unknown as MassRatioCell[];

const SPECIAL_CONFIGURATIONS = new Set(["figure_eight", "lagrange_equilateral", "euler_collinear"]);

const CONFIGURATION_LABELS: Record<string, string> = {
  figure_eight: "Figure-eight",
  lagrange_equilateral: "Lagrange equilateral",
  euler_collinear: "Euler collinear",
  generic_a: "Generic A",
  generic_b: "Generic B",
  generic_c: "Generic C",
};

function classTag(classification: Classification) {
  return <span className={`map-tag map-tag--${classification}`}>{classification}</span>;
}

function formatExponent(value: number) {
  return value.toFixed(4);
}

function ScatterPlot({ cells }: { cells: PerturbationCell[] }) {
  const magnitudes = [...new Set(cells.map((c) => c.parameters.perturbation_magnitude))].sort(
    (a, b) => a - b,
  );
  const configurations = [...new Set(cells.map((c) => c.parameters.configuration))];
  const maxExponent = Math.max(...cells.map((c) => c.mean_exponent), 0.15);
  const width = 640;
  const height = 340;
  const marginLeft = 60;
  const marginBottom = 40;
  const plotWidth = width - marginLeft - 20;
  const plotHeight = height - marginBottom - 20;

  const x = (magnitudeIndex: number) =>
    marginLeft + (magnitudeIndex / Math.max(1, magnitudes.length - 1)) * plotWidth;
  const y = (value: number) => 20 + plotHeight - (value / maxExponent) * plotHeight;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="scatter-title scatter-desc">
      <title id="scatter-title">Perturbation-magnitude sweep scatter plot</title>
      <desc id="scatter-desc">
        Mean estimated Lyapunov exponent for each of the six base configurations across six
        perturbation magnitudes. Special solutions are marked with a filled diamond; generic
        configurations with a filled circle. The complete values follow in a table.
      </desc>
      <rect className="map-plot__frame" x={0} y={0} width={width} height={height} />
      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
        <line
          key={fraction}
          className="chart-grid"
          x1={marginLeft}
          x2={width - 20}
          y1={20 + plotHeight * (1 - fraction)}
          y2={20 + plotHeight * (1 - fraction)}
        />
      ))}
      <text x={4} y={20 + 4}>
        {maxExponent.toFixed(2)}
      </text>
      <text x={4} y={20 + plotHeight}>
        0
      </text>
      <text x={marginLeft} y={height - 6}>
        smallest δ₀
      </text>
      <text x={width - 90} y={height - 6}>
        largest δ₀
      </text>
      <line
        className="map-boundary-line"
        x1={marginLeft}
        x2={width - 20}
        y1={y(0.1)}
        y2={y(0.1)}
      />
      <text x={width - 130} y={y(0.1) - 6}>
        chaotic cutoff (0.10)
      </text>
      {configurations.map((configuration) => {
        const isSpecial = SPECIAL_CONFIGURATIONS.has(configuration);
        const rows = cells
          .filter((c) => c.parameters.configuration === configuration)
          .sort((a, b) => a.parameters.perturbation_magnitude - b.parameters.perturbation_magnitude);
        return (
          <g
            key={configuration}
            className={`map-point ${isSpecial ? "map-point--special" : ""}`}
          >
            {rows.map((cell, index) =>
              isSpecial ? (
                <rect
                  key={cell.parameters.perturbation_magnitude}
                  x={x(index) - 5}
                  y={y(cell.mean_exponent) - 5}
                  width={10}
                  height={10}
                  transform={`rotate(45 ${x(index)} ${y(cell.mean_exponent)})`}
                />
              ) : (
                <circle
                  key={cell.parameters.perturbation_magnitude}
                  cx={x(index)}
                  cy={y(cell.mean_exponent)}
                  r={5}
                />
              ),
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function LyapunovMap() {
  const allCells = [...perturbationSweep, ...massRatioSweep];
  const chaoticCount = allCells.filter((c) => c.classification === "chaotic").length;
  const stableCount = allCells.filter((c) => c.classification === "stable").length;
  const borderlineCount = allCells.filter((c) => c.classification === "borderline").length;

  return (
    <section className="map" id="map" aria-labelledby="map-heading">
      <header className="section-heading">
        <div>
          <span className="section-index">04</span>
          <p>Frozen registry</p>
        </div>
        <h2>
          The chaos map,
          <br />
          exactly as measured.
        </h2>
      </header>

      <div className="limitations-first">
        <h3>Read this before the classification labels below</h3>
        <ul>
          <li>
            The stable / borderline / chaotic labels come from one disclosed, arbitrary threshold
            (λ̄ &lt; 0.02 stable, ≥ 0.10 chaotic) — not a physical law.
          </li>
          <li>
            Every window here is short (3–4 orbital periods). A positive exponent is evidence of
            measured divergence within that window, not proof of unbounded long-term chaos.
          </li>
          <li>
            In this frozen v0.1 registry, <strong>every one of the 42 cells classified as
            &ldquo;chaotic,&rdquo;</strong> including two of the three classical special
            solutions — see the report for why that is a real, explainable finding and not a
            bug.
          </li>
        </ul>
        <p>
          Full reasoning: <a href="https://github.com/lindgreendavid/three-body-lab/blob/main/docs/research-report.md">docs/research-report.md</a>
        </p>
      </div>

      <div className="map-summary">
        <article>
          <span>Cells in registry</span>
          <strong>{allCells.length}</strong>
          <small>36 perturbation-magnitude + 6 mass-ratio</small>
        </article>
        <article>
          <span>Classified chaotic</span>
          <strong>{chaoticCount}</strong>
          <small>λ̄ ≥ 0.10</small>
        </article>
        <article>
          <span>Classified stable</span>
          <strong>{stableCount}</strong>
          <small>λ̄ &lt; 0.02</small>
        </article>
        <article>
          <span>Borderline</span>
          <strong>{borderlineCount}</strong>
          <small>not confidently classified</small>
        </article>
      </div>

      <div className="map-plot">
        <div className="panel-title" style={{ marginBottom: 12 }}>
          <div>
            <span>View 1 of 2</span>
            <strong>Perturbation-magnitude sweep — 6 base configurations × 6 magnitudes</strong>
          </div>
        </div>
        <div className="map-shape-key">
          <span>
            <i className="shape-diamond" aria-hidden="true" /> Special solution (figure-eight,
            Lagrange, Euler collinear)
          </span>
          <span>
            <i className="shape-circle" aria-hidden="true" /> Generic scattered configuration
          </span>
        </div>
        <ScatterPlot cells={perturbationSweep} />
        <details className="data-alternative">
          <summary>Read the complete perturbation-magnitude sweep data</summary>
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
          <div className="table-scroll" role="region" tabIndex={0} aria-label="Scrollable perturbation sweep data table">
            <table>
              <caption>Perturbation-magnitude sweep — mean λ̂ across 3 direction seeds</caption>
              <thead>
                <tr>
                  <th scope="col">Configuration</th>
                  <th scope="col">Perturbation magnitude δ₀</th>
                  <th scope="col">Mean λ̂</th>
                  <th scope="col">Std across seeds</th>
                  <th scope="col">Classification</th>
                  <th scope="col">Energy drift</th>
                </tr>
              </thead>
              <tbody>
                {perturbationSweep.map((cell) => (
                  <tr key={`${cell.parameters.configuration}-${cell.parameters.perturbation_magnitude}`}>
                    <th scope="row">
                      {CONFIGURATION_LABELS[cell.parameters.configuration] ?? cell.parameters.configuration}
                    </th>
                    <td>{cell.parameters.perturbation_magnitude.toExponential(2)}</td>
                    <td>{formatExponent(cell.mean_exponent)}</td>
                    <td>{formatExponent(cell.std_exponent)}</td>
                    <td>{classTag(cell.classification)}</td>
                    <td>{cell.energy_relative_drift.toExponential(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      <div className="map-plot">
        <div className="panel-title" style={{ marginBottom: 12 }}>
          <div>
            <span>View 2 of 2</span>
            <strong>Mass-ratio sweep — Lagrange equilateral family × 6 mass ratios</strong>
          </div>
        </div>
        <details className="data-alternative" open>
          <summary>Read the complete mass-ratio sweep data</summary>
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
          <div className="table-scroll" role="region" tabIndex={0} aria-label="Scrollable mass ratio sweep data table">
            <table>
              <caption>Mass-ratio sweep — Lagrange equilateral family, mean λ̂ across 3 direction seeds</caption>
              <thead>
                <tr>
                  <th scope="col">Mass ratio m₂/m₁</th>
                  <th scope="col">Mean λ̂</th>
                  <th scope="col">Std across seeds</th>
                  <th scope="col">Classification</th>
                  <th scope="col">Energy drift</th>
                </tr>
              </thead>
              <tbody>
                {massRatioSweep.map((cell) => (
                  <tr key={cell.parameters.mass_ratio}>
                    <th scope="row">{cell.parameters.mass_ratio.toFixed(2)}</th>
                    <td>{formatExponent(cell.mean_exponent)}</td>
                    <td>{formatExponent(cell.std_exponent)}</td>
                    <td>{classTag(cell.classification)}</td>
                    <td>{cell.energy_relative_drift.toExponential(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <p className="uncertainty-note" style={{ marginTop: 16 }}>
          All six mass ratios sit deep in the Gascheau&ndash;Routh analytically unstable region
          for the Lagrange equilateral relative equilibrium. In this exact (1, r, 1) family,
          linear stability requires r &gt; 25 + 18&radic;2 &asymp; 50.456&mdash;far outside the
          0.5&ndash;3.0 range tested here. The monotonic
          increase visible in the table describes degrees of instability within one unstable
          regime, not a stability transition.
        </p>
      </div>

      <div className="uncertainty-note" style={{ marginTop: 20 }}>
        <a href="https://github.com/lindgreendavid/three-body-lab/blob/main/reports/v0.1-lyapunov-registry.json">
          Inspect the raw frozen registry ↗
        </a>
      </div>
    </section>
  );
}
