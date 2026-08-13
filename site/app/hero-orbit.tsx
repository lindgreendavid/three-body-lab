"use client";

import { useEffect, useRef } from "react";
import { figureEightPreset, perturbState, step, type SystemState } from "./physics";

// Simo (2001) refined period of the figure-eight orbit, in the same time units as the
// integrator. Looping the animation after exactly one period makes the loop seamless —
// the orbit returns to (very nearly) its starting state, so there is no visible jump cut.
const PERIOD = 6.32591398;
const DT = 0.004;
const SUBSTEPS_PER_FRAME = 4;
const FRAME_ADVANCE = DT * SUBSTEPS_PER_FRAME;
const FRAMES_PER_LOOP = Math.round(PERIOD / FRAME_ADVANCE);
const TRAIL_LENGTH = 140;
// A deliberately visible perturbation (much larger than the twin-separation demo in the
// live simulator below) so a first-time visitor can see two curves peel apart within a
// single ~6-second loop, without needing to touch any controls.
const TWIN_PERTURBATION = 4e-2;

type Trail = { x: number; y: number }[];

function readPalette(): [string, string, string] {
  if (typeof window === "undefined") return ["#00708f", "#8874c3", "#f6c655"];
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return [read("--blue", "#00708f"), read("--coral", "#8874c3"), read("--acid", "#f6c655")];
}

/**
 * Small, autoplaying, looping canvas animation for the hero section: the real figure-eight
 * orbit (reusing the exact same physics as the live simulator below) tracing itself, plus a
 * faintly perturbed twin so the divergence phenomenon is visible before a visitor does
 * anything. Purely decorative — aria-hidden, and the hero text above already carries the
 * accessible description of what the page is about.
 */
export default function HeroOrbit() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const scale = Math.min(width, height) / 2.6;
    const cx = width / 2;
    const cy = height / 2;
    const toScreen = (x: number, y: number) => ({ x: cx + x * scale, y: cy - y * scale });
    const colors = readPalette();

    const reduced =
      typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      // Static frame: draw the full analytic loop once, no animation. Visitors who asked
      // for reduced motion get the shape without the movement.
      let reference: SystemState = figureEightPreset();
      const trails: [Trail, Trail, Trail] = [[], [], []];
      const steps = FRAMES_PER_LOOP * SUBSTEPS_PER_FRAME;
      for (let i = 0; i < steps; i += 1) {
        reference = step(reference, DT);
        reference.bodies.forEach((body, index) => {
          trails[index].push({ x: body.position.x, y: body.position.y });
        });
      }
      ctx.fillStyle = "#0b0e18";
      ctx.fillRect(0, 0, width, height);
      trails.forEach((trail, index) => {
        ctx.strokeStyle = colors[index];
        ctx.globalAlpha = 0.75;
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
      return;
    }

    let reference: SystemState = figureEightPreset();
    let twin: SystemState = perturbState(reference, TWIN_PERTURBATION, 11);
    let trails: [Trail, Trail, Trail] = [[], [], []];
    let twinTrails: [Trail, Trail, Trail] = [[], [], []];
    let frame = 0;
    let frameId: number | null = null;

    const resetLoop = () => {
      reference = figureEightPreset();
      twin = perturbState(reference, TWIN_PERTURBATION, 11);
      trails = [[], [], []];
      twinTrails = [[], [], []];
      frame = 0;
    };

    const draw = () => {
      for (let i = 0; i < SUBSTEPS_PER_FRAME; i += 1) {
        reference = step(reference, DT);
        twin = step(twin, DT);
      }
      reference.bodies.forEach((body, index) => {
        const trail = trails[index];
        trail.push({ x: body.position.x, y: body.position.y });
        if (trail.length > TRAIL_LENGTH) trail.shift();
      });
      twin.bodies.forEach((body, index) => {
        const trail = twinTrails[index];
        trail.push({ x: body.position.x, y: body.position.y });
        if (trail.length > TRAIL_LENGTH) trail.shift();
      });
      frame += 1;
      if (frame >= FRAMES_PER_LOOP) resetLoop();

      ctx.fillStyle = "rgba(11, 14, 24, 0.4)";
      ctx.fillRect(0, 0, width, height);

      twinTrails.forEach((trail, index) => {
        if (trail.length < 2) return;
        ctx.save();
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = colors[index];
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        ctx.beginPath();
        trail.forEach((point, i) => {
          const p = toScreen(point.x, point.y);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.restore();
      });

      trails.forEach((trail, index) => {
        if (trail.length < 2) return;
        const segments = trail.length - 1;
        for (let i = 0; i < segments; i += 1) {
          const t = i / segments;
          const a = toScreen(trail[i].x, trail[i].y);
          const b = toScreen(trail[i + 1].x, trail[i + 1].y);
          ctx.strokeStyle = colors[index];
          ctx.globalAlpha = 0.85 * t ** 1.5;
          ctx.lineWidth = 0.6 + t * 2;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;

      reference.bodies.forEach((body, index) => {
        const p = toScreen(body.position.x, body.position.y);
        ctx.fillStyle = colors[index];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={280}
      className="hero-orbit"
      aria-hidden="true"
    />
  );
}
