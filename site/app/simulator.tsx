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
    note: "Analytically linearly unstable for equal masses. In this (1, r, 1) family, the Gascheau–Routh boundary is r ≈ 50.456.",
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

/** Reads the live palette tokens from `globals.css` so canvas colors stay in sync with the
 * rest of the UI instead of duplicating hex values. Falls back to the known token values if
 * computed styles are unavailable (e.g. during a non-browser test render). */
function readPalette(): [string, string, string] {
  if (typeof window === "undefined") return ["#00708f", "#8874c3", "#f6c655"];
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return [read("--blue", "#00708f"), read("--coral", "#8874c3"), read("--acid", "#f6c655")];
}

/** Draws a trail as a long-exposure-style fading gradient: older points are thinner and
 * more transparent, the most recent segment is fully opaque. Reduces to a single flat,
 * low-alpha stroke when `reduced` is set, so motion-sensitive visitors get a much quieter
 * picture instead of the full comet-tail effect. */
function drawFadingTrail(
  ctx: CanvasRenderingContext2D,
  trail: Trail,
  toScreen: (x: number, y: number) => { x: number; y: number },
  color: string,
  options: { dashed?: boolean; reduced?: boolean; baseAlpha?: number } = {},
) {
  if (trail.length < 2) return;
  const { dashed = false, reduced = false, baseAlpha = 0.85 } = options;

  if (reduced) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = baseAlpha * 0.4;
    ctx.lineWidth = 1.25;
    if (dashed) ctx.setLineDash([3, 4]);
    ctx.beginPath();
    trail.forEach((point, i) => {
      const p = toScreen(point.x, point.y);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.save();
  if (dashed) ctx.setLineDash([3, 4]);
  const segments = trail.length - 1;
  for (let i = 0; i < segments; i += 1) {
    const t = i / segments; // 0 = oldest, 1 = newest
    const a = toScreen(trail[i].x, trail[i].y);
    const b = toScreen(trail[i + 1].x, trail[i + 1].y);
    ctx.strokeStyle = color;
    ctx.globalAlpha = baseAlpha * t ** 1.6;
    ctx.lineWidth = 0.6 + t * (dashed ? 1.2 : 2.1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

export default function Simulator() {
  const [preset, setPreset] = useState<PresetName>("figure-eight");
  const [perturbationExponent, setPerturbationExponent] = useState(-2); // 10^-2
  const [running, setRunning] = useState(true);
  const [resetToken, setResetToken] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [energyDrift, setEnergyDrift] = useState(0);
  const [currentSeparation, setCurrentSeparation] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [exportState, setExportState] = useState<"idle" | "recording" | "unsupported">("idle");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const separationCanvasRef = useRef<SVGPolylineElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

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

  // Track prefers-reduced-motion live so the canvas swaps between the full fading-trail
  // treatment and a quieter static-leaning render if the OS setting changes mid-session.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(query.matches);
    const listener = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

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
      // A slightly translucent fill (instead of a hard clear) leaves the faintest ghost of
      // the previous frame, reinforcing the long-exposure feel without needing to retain
      // more trail history. Skipped under reduced motion, where we want the picture as
      // static as the underlying physics allows.
      ctx.fillStyle = reducedMotion ? "#0b0e18" : "rgba(11, 14, 24, 0.42)";
      ctx.fillRect(0, 0, width, height);

      const scale = Math.min(width, height) / 5.2;
      const cx = width / 2;
      const cy = height / 2;
      const toScreen = (x: number, y: number) => ({ x: cx + x * scale, y: cy - y * scale });

      const colors = readPalette();

      trailsRef.current.forEach((trail, index) => {
        drawFadingTrail(ctx, trail, toScreen, colors[index], {
          reduced: reducedMotion,
          baseAlpha: 0.9,
        });
      });
      referenceRef.current.bodies.forEach((body, index) => {
        const p = toScreen(body.position.x, body.position.y);
        if (!reducedMotion) {
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14);
          glow.addColorStop(0, colors[index]);
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.globalAlpha = 0.55;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = colors[index];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      twinTrailsRef.current.forEach((trail, index) => {
        drawFadingTrail(ctx, trail, toScreen, colors[index], {
          dashed: true,
          reduced: reducedMotion,
          baseAlpha: 0.55,
        });
      });
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
  }, [running, resetToken, perturbationMagnitude, reducedMotion]);

  const copy = useMemo(() => PRESET_COPY[preset], [preset]);

  // Records a short clip of the live canvas via the browser's native MediaRecorder API
  // (no new dependency) and downloads it as a WebM video — a shareable artifact of the
  // divergence this simulator shows, rather than a research instrument only.
  const exportClip = useCallback(() => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      typeof MediaRecorder === "undefined" ||
      typeof canvas.captureStream !== "function"
    ) {
      setExportState("unsupported");
      return;
    }

    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported?.("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `three-body-lab-${preset}-${Date.now()}.webm`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      stream.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      setExportState("idle");
    };

    const wasRunning = running;
    if (!wasRunning) setRunning(true);
    recorderRef.current = recorder;
    setExportState("recording");
    recorder.start();
    window.setTimeout(() => {
      recorder.stop();
      if (!wasRunning) setRunning(false);
    }, 5000);
  }, [preset, running]);

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
          <div className="export-control">
            <button
              type="button"
              onClick={exportClip}
              disabled={exportState === "recording"}
              aria-describedby="export-status"
            >
              {exportState === "recording" ? "Recording…" : "Export video clip"}
            </button>
            <p id="export-status" className="export-status" role="status" aria-live="polite">
              {exportState === "recording" &&
                "Recording a 5-second WebM clip of the live trajectory…"}
              {exportState === "unsupported" &&
                "Video export isn't supported in this browser — try a recent Chrome, Firefox, or Edge."}
              {exportState === "idle" &&
                "Downloads a 5-second WebM video of this trajectory, ready to share."}
            </p>
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
