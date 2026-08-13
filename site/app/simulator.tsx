"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type PresetName,
  type SystemState,
  perturbState,
  presetByName,
  separation,
  step,
  totalEnergy,
} from "./physics";

const PRESET_COPY: Record<PresetName, { label: string; short: string; note: string }> = {
  "figure-eight": {
    label: "Figure-eight",
    short: "Three equal masses chase one figure-eight curve.",
    note: "Analytically proven linearly stable (Simo 2001; Roberts 2007) — the only one of the three special solutions with that property.",
  },
  lagrange: {
    label: "Lagrange equilateral",
    short: "Equal masses at a rigidly rotating triangle.",
    note: "Analytically linearly UNSTABLE for equal masses (Routh's criterion requires one mass to dominate ~25:1).",
  },
  euler: {
    label: "Euler collinear",
    short: "Equal masses on a rigidly rotating line.",
    note: "Analytically linearly unstable for every mass ratio — a classical, general result.",
  },
  random: {
    label: "Generic scattered",
    short: "A seeded, bounded, non-special configuration.",
    note: "No special structure; included as a comparison baseline, matching the Python sweep's generic_a/b/c configurations.",
  },
};

const TRAIL_LENGTH = 400;
const SUBSTEPS_PER_FRAME = 6;
const DT = 0.004;

type Trail = { x: number; y: number }[];

export default function Simulator() {
  const [preset, setPreset] = useState<PresetName>("figure-eight");
  const [perturbationExponent, setPerturbationExponent] = useState(-2); // 10^-2
  const [running, setRunning] = useState(true);
  const [resetToken, setResetToken] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [energyDrift, setEnergyDrift] = useState(0);
  const [currentSeparation, setCurrentSeparation] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const separationCanvasRef = useRef<SVGPolylineElement | null>(null);

  const perturbationMagnitude = 10 ** perturbationExponent;

  const initialReference = useMemo(() => presetByName(preset), [preset]);
  const referenceRef = useRef<SystemState>(initialReference);
  const twinRef = useRef<SystemState>(
    perturbState(initialReference, perturbationMagnitude, 7),
  );
  const initialEnergyRef = useRef(totalEnergy(initialReference.bodies));
  const trailsRef = useRef<[Trail, Trail, Trail]>([[], [], []]);
  const twinTrailsRef = useRef<[Trail, Trail, Trail]>([[], [], []]);
  const separationHistoryRef = useRef<number[]>([]);
  const timeRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  const resetSystem = useCallback(() => {
    const fresh = presetByName(preset, 42);
    referenceRef.current = fresh;
    twinRef.current = perturbState(fresh, perturbationMagnitude, 7);
    initialEnergyRef.current = totalEnergy(fresh.bodies);
    trailsRef.current = [[], [], []];
    twinTrailsRef.current = [[], [], []];
    separationHistoryRef.current = [];
    timeRef.current = 0;
    setElapsedTime(0);
    setEnergyDrift(0);
    setCurrentSeparation(separation(fresh, twinRef.current));
    setResetToken((token) => token + 1);
  }, [preset, perturbationMagnitude]);

  // Reset whenever preset or perturbation magnitude changes. This synchronizes the mutable
  // animation-loop refs (not used for rendering) with the user's control choices; it is not
  // derivable render state, so it belongs in an effect rather than during render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetSystem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, perturbationExponent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastUiUpdate = 0;

    const draw = (timestamp: number) => {
      if (running) {
        for (let i = 0; i < SUBSTEPS_PER_FRAME; i += 1) {
          referenceRef.current = step(referenceRef.current, DT);
          twinRef.current = step(twinRef.current, DT);
          timeRef.current += DT;
        }
        referenceRef.current.bodies.forEach((body, index) => {
          const trail = trailsRef.current[index];
          trail.push({ x: body.position.x, y: body.position.y });
          if (trail.length > TRAIL_LENGTH) trail.shift();
        });
        twinRef.current.bodies.forEach((body, index) => {
          const trail = twinTrailsRef.current[index];
          trail.push({ x: body.position.x, y: body.position.y });
          if (trail.length > TRAIL_LENGTH) trail.shift();
        });
        const currentSep = separation(referenceRef.current, twinRef.current);
        separationHistoryRef.current.push(currentSep);
        if (separationHistoryRef.current.length > 300) separationHistoryRef.current.shift();
      }

      const width = canvas.width;
      const height = canvas.height;
      ctx.fillStyle = "#0b0e18";
      ctx.fillRect(0, 0, width, height);

      const scale = Math.min(width, height) / 5.2;
      const cx = width / 2;
      const cy = height / 2;
      const toScreen = (x: number, y: number) => ({ x: cx + x * scale, y: cy - y * scale });

      const colors = ["#3b4ad8", "#f4756c", "#7ef0c2"];
      trailsRef.current.forEach((trail, index) => {
        if (trail.length < 2) return;
        ctx.strokeStyle = colors[index];
        ctx.globalAlpha = 0.65;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        trail.forEach((point, i) => {
          const p = toScreen(point.x, point.y);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      referenceRef.current.bodies.forEach((body, index) => {
        const p = toScreen(body.position.x, body.position.y);
        ctx.fillStyle = colors[index];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      twinTrailsRef.current.forEach((trail, index) => {
        if (trail.length < 2) return;
        ctx.strokeStyle = colors[index];
        ctx.globalAlpha = 0.35;
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        trail.forEach((point, i) => {
          const p = toScreen(point.x, point.y);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      });
      ctx.globalAlpha = 1;
      twinRef.current.bodies.forEach((body, index) => {
        const p = toScreen(body.position.x, body.position.y);
        ctx.strokeStyle = colors[index];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.stroke();
      });

      if (separationCanvasRef.current) {
        const history = separationHistoryRef.current;
        const maxSep = Math.max(...history, perturbationMagnitude * 10, 1e-6);
        const points = history
          .map((value, index) => {
            const px = (index / Math.max(1, 299)) * 600;
            const py = 140 - (Math.min(value, maxSep) / maxSep) * 130;
            return `${px.toFixed(2)},${py.toFixed(2)}`;
          })
          .join(" ");
        separationCanvasRef.current.setAttribute("points", points);
      }

      if (running && timestamp - lastUiUpdate > 200) {
        lastUiUpdate = timestamp;
        const e0 = initialEnergyRef.current;
        const e1 = totalEnergy(referenceRef.current.bodies);
        setElapsedTime(timeRef.current);
        setEnergyDrift(e0 !== 0 ? Math.abs((e1 - e0) / e0) : Math.abs(e1 - e0));
        setCurrentSeparation(separation(referenceRef.current, twinRef.current));
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [running, resetToken, perturbationMagnitude]);

  const copy = useMemo(() => PRESET_COPY[preset], [preset]);

  return (
    <section className="lab" id="simulator" aria-labelledby="simulator-heading">
      <header className="section-heading">
        <div>
          <span className="section-index">01</span>
          <p>Live simulator</p>
        </div>
        <h2 id="simulator-heading">
          Watch two nearly
          <br />
          identical starts diverge.
        </h2>
      </header>

      <fieldset className="scenario-tabs">
        <legend className="sr-only">Base configuration preset</legend>
        {(Object.keys(PRESET_COPY) as PresetName[]).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setPreset(name)}
            className={preset === name ? "is-active" : ""}
            aria-pressed={preset === name}
          >
            <span>{PRESET_COPY[name].label}</span>
            <small>{PRESET_COPY[name].short}</small>
          </button>
        ))}
      </fieldset>

      <div className="lab-grid">
        <aside className="controls" aria-label="Simulator controls">
          <div className="control">
            <label htmlFor="perturbation">
              <span>Twin perturbation magnitude</span>
              <output htmlFor="perturbation">{perturbationMagnitude.toExponential(1)}</output>
            </label>
            <input
              id="perturbation"
              type="range"
              min={-8}
              max={-1}
              step={1}
              value={perturbationExponent}
              onChange={(event) => setPerturbationExponent(Number(event.target.value))}
            />
            <div className="range-labels">
              <span>10⁻⁸ (near-identical)</span>
              <span>10⁻¹ (large)</span>
            </div>
          </div>
          <div className="playback-controls">
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              aria-pressed={running}
            >
              {running ? "Pause" : "Play"}
            </button>
            <button type="button" onClick={resetSystem}>
              Reset
            </button>
          </div>
          <div className="mechanism-note">
            <span>Analytic status</span>
            <strong>{copy.label}</strong>
            <small>{copy.note}</small>
          </div>
        </aside>

        <div className="simulator-panel">
          <div className="panel-title">
            <div>
              <span>Reference (solid) vs. perturbed twin (dashed)</span>
              <strong>{PRESET_COPY[preset].label} trajectory</strong>
            </div>
            <span className="live-chip">
              <i /> live simulation, browser-side leapfrog integrator
            </span>
          </div>
          <div className="orbit-canvas-wrap">
            <canvas
              ref={canvasRef}
              width={720}
              height={480}
              role="img"
              aria-label={`Live animated trajectory of the ${PRESET_COPY[preset].label} configuration and a perturbed twin, elapsed simulated time ${elapsedTime.toFixed(1)} time units, current twin separation ${currentSeparation.toExponential(2)}.`}
            />
          </div>
          <div className="orbit-legend">
            <span>
              <i className="body1-dot" /> Body 1
            </span>
            <span>
              <i className="body2-dot" /> Body 2
            </span>
            <span>
              <i className="body3-dot" /> Body 3
            </span>
            <span>
              <i className="twin-dot" /> Perturbed twin (dashed trail)
            </span>
          </div>
          <div className="simulator-stats">
            <div>
              <span>Elapsed simulated time</span>
              <strong>{elapsedTime.toFixed(1)}</strong>
            </div>
            <div>
              <span>Twin separation (state-space)</span>
              <strong>{currentSeparation.toExponential(2)}</strong>
            </div>
            <div>
              <span>Energy drift since start</span>
              <strong>{energyDrift.toExponential(2)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="separation-chart-wrap">
        <div className="panel-title" style={{ marginBottom: 12 }}>
          <div>
            <span>Twin trajectory view</span>
            <strong>Separation distance vs. time</strong>
          </div>
        </div>
        <svg viewBox="0 0 600 150" role="img" aria-labelledby="sep-title sep-desc">
          <title id="sep-title">Separation between reference and perturbed twin over time</title>
          <desc id="sep-desc">
            A rising curve means the twin trajectory is diverging from the reference; a flat or
            oscillating curve means it is staying close. The vertical scale rescales to the
            largest separation seen so far.
          </desc>
          <line className="chart-grid" x1={0} x2={600} y1={140} y2={140} />
          <line className="chart-grid" x1={0} x2={0} y1={10} y2={140} />
          <polyline ref={separationCanvasRef} className="chart-line chart-line--separation" points="" />
        </svg>
        <p className="uncertainty-note">
          This browser view uses a fixed-step leapfrog integrator for real-time responsiveness,
          not the DOP853 adaptive integrator validated to 1e-9 conservation tolerance in the
          Python package. Treat it as illustrative, not as a source of the frozen registry
          numbers below — those come only from <code>scripts/generate_registry.py</code>.
        </p>
      </div>
    </section>
  );
}
