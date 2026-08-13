/**
 * Client-side reimplementation of the planar three-body equations of motion.
 *
 * This is the interactive-browser counterpart to the authoritative Python package
 * (`three_body_lab`, integrated with `scipy.integrate.solve_ivp`/DOP853). For real-time
 * responsiveness in the browser this uses a fixed-step velocity-Verlet (leapfrog) integrator
 * instead — symplectic, cheap per step, and visually stable for an interactive demo — rather
 * than an adaptive high-order method. The Python package, validated against 1e-9 conservation
 * tolerances in `tests/test_integrator.py`, is the authoritative reproducible implementation;
 * this module is for immediate visual feedback only.
 */

export type Vec2 = { x: number; y: number };
export type Body = { position: Vec2; velocity: Vec2; mass: number };
export type SystemState = { bodies: [Body, Body, Body] };

const G = 1.0;
const SOFTENING_SQUARED = 1e-6;

export function accelerations(bodies: [Body, Body, Body]): [Vec2, Vec2, Vec2] {
  const result: Vec2[] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      if (i === j) continue;
      const dx = bodies[j].position.x - bodies[i].position.x;
      const dy = bodies[j].position.y - bodies[i].position.y;
      const distanceSquared = dx * dx + dy * dy + SOFTENING_SQUARED;
      const inverseCube = distanceSquared ** -1.5;
      const factor = G * bodies[j].mass * inverseCube;
      result[i].x += factor * dx;
      result[i].y += factor * dy;
    }
  }
  return result as [Vec2, Vec2, Vec2];
}

/** One velocity-Verlet (leapfrog) step: symplectic and stable for interactive playback. */
export function step(state: SystemState, dt: number): SystemState {
  const bodies = state.bodies;
  const a0 = accelerations(bodies);
  const halfStepped = bodies.map((body, index) => ({
    mass: body.mass,
    position: {
      x: body.position.x + body.velocity.x * dt + 0.5 * a0[index].x * dt * dt,
      y: body.position.y + body.velocity.y * dt + 0.5 * a0[index].y * dt * dt,
    },
    velocity: body.velocity,
  })) as [Body, Body, Body];
  const a1 = accelerations(halfStepped);
  const next = halfStepped.map((body, index) => ({
    mass: body.mass,
    position: body.position,
    velocity: {
      x: body.velocity.x + 0.5 * (a0[index].x + a1[index].x) * dt,
      y: body.velocity.y + 0.5 * (a0[index].y + a1[index].y) * dt,
    },
  })) as [Body, Body, Body];
  return { bodies: next };
}

export function totalEnergy(bodies: [Body, Body, Body]): number {
  let kinetic = 0;
  for (const body of bodies) {
    kinetic += 0.5 * body.mass * (body.velocity.x ** 2 + body.velocity.y ** 2);
  }
  let potential = 0;
  for (let i = 0; i < 3; i += 1) {
    for (let j = i + 1; j < 3; j += 1) {
      const dx = bodies[j].position.x - bodies[i].position.x;
      const dy = bodies[j].position.y - bodies[i].position.y;
      const distance = Math.sqrt(dx * dx + dy * dy + SOFTENING_SQUARED);
      potential -= (G * bodies[i].mass * bodies[j].mass) / distance;
    }
  }
  return kinetic + potential;
}

export type PresetName = "figure-eight" | "lagrange" | "euler" | "random";

/** Figure-eight orbit initial conditions (Chenciner-Montgomery; Simo 2001 constants). */
export function figureEightPreset(): SystemState {
  const v = { x: 0.466203685, y: 0.43236573 };
  return {
    bodies: [
      { position: { x: 0.9700436, y: -0.24308753 }, velocity: v, mass: 1 },
      { position: { x: -0.9700436, y: 0.24308753 }, velocity: v, mass: 1 },
      { position: { x: 0, y: 0 }, velocity: { x: -2 * v.x, y: -2 * v.y }, mass: 1 },
    ],
  };
}

/** Lagrange equilateral-triangle preset; masses default to equal but can be overridden. */
export function lagrangePreset(m1 = 1, m2 = 1, m3 = 1): SystemState {
  const side = 1;
  const circumradius = side / Math.sqrt(3);
  const angles = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3];
  const vertices = angles.map((angle) => ({
    x: circumradius * Math.cos(angle),
    y: circumradius * Math.sin(angle),
  }));
  const masses = [m1, m2, m3];
  const totalMass = m1 + m2 + m3;
  const comX = vertices.reduce((sum, v, i) => sum + v.x * masses[i], 0) / totalMass;
  const comY = vertices.reduce((sum, v, i) => sum + v.y * masses[i], 0) / totalMass;
  const positions = vertices.map((v) => ({ x: v.x - comX, y: v.y - comY }));
  const omega = Math.sqrt((G * totalMass) / side ** 3);
  const bodies = positions.map((p, i) => ({
    position: p,
    velocity: { x: -omega * p.y, y: omega * p.x },
    mass: masses[i],
  })) as [Body, Body, Body];
  return { bodies };
}

/** Equal-mass Euler collinear preset. */
export function eulerPreset(): SystemState {
  const omega = Math.sqrt((5 * G) / 4);
  const positions = [
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ];
  const bodies = positions.map((p) => ({
    position: p,
    velocity: { x: -omega * p.y, y: omega * p.x },
    mass: 1,
  })) as [Body, Body, Body];
  return { bodies };
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic seeded generic configuration, mirroring the Python sweep's construction. */
export function randomPreset(seed = 42): SystemState {
  const random = mulberry32(seed);
  const positions: Vec2[] = [];
  for (let i = 0; i < 3; i += 1) {
    positions.push({ x: (random() - 0.5) * 2, y: (random() - 0.5) * 2 });
  }
  const masses: [number, number, number] = [1, 1, 1];
  let velocities: Vec2[] = [];
  for (let i = 0; i < 3; i += 1) {
    velocities.push({ x: (random() - 0.5) * 0.6, y: (random() - 0.5) * 0.6 });
  }
  const totalMass = masses.reduce((a, b) => a + b, 0);
  const px = velocities.reduce((sum, v, i) => sum + v.x * masses[i], 0) / totalMass;
  const py = velocities.reduce((sum, v, i) => sum + v.y * masses[i], 0) / totalMass;
  velocities = velocities.map((v) => ({ x: v.x - px, y: v.y - py }));

  const zeroVelBodies = positions.map((p, i) => ({
    position: p,
    velocity: { x: 0, y: 0 },
    mass: masses[i],
  })) as [Body, Body, Body];
  const potentialEnergy = totalEnergy(zeroVelBodies);
  let kinetic = 0;
  velocities.forEach((v, i) => {
    kinetic += 0.5 * masses[i] * (v.x ** 2 + v.y ** 2);
  });
  const targetKinetic = 0.35 * Math.abs(potentialEnergy);
  const scale = kinetic > 0 ? Math.sqrt(targetKinetic / kinetic) : 1;
  velocities = velocities.map((v) => ({ x: v.x * scale, y: v.y * scale }));

  const bodies = positions.map((p, i) => ({
    position: p,
    velocity: velocities[i],
    mass: masses[i],
  })) as [Body, Body, Body];
  return { bodies };
}

export function presetByName(name: PresetName, seed = 42): SystemState {
  switch (name) {
    case "figure-eight":
      return figureEightPreset();
    case "lagrange":
      return lagrangePreset();
    case "euler":
      return eulerPreset();
    case "random":
      return randomPreset(seed);
    default:
      return figureEightPreset();
  }
}

/** Displace every state component by a fixed-magnitude perturbation in a seeded direction. */
export function perturbState(state: SystemState, magnitude: number, seed: number): SystemState {
  const random = mulberry32(seed);
  const raw: number[] = [];
  for (let i = 0; i < 12; i += 1) raw.push(random() * 2 - 1);
  const norm = Math.sqrt(raw.reduce((sum, v) => sum + v * v, 0)) || 1;
  const direction = raw.map((v) => v / norm);
  const bodies = state.bodies.map((body, index) => {
    const base = index * 4;
    return {
      mass: body.mass,
      position: {
        x: body.position.x + magnitude * direction[base + 0],
        y: body.position.y + magnitude * direction[base + 1],
      },
      velocity: {
        x: body.velocity.x + magnitude * direction[base + 2],
        y: body.velocity.y + magnitude * direction[base + 3],
      },
    };
  }) as [Body, Body, Body];
  return { bodies };
}

export function separation(a: SystemState, b: SystemState): number {
  let sumSquares = 0;
  for (let i = 0; i < 3; i += 1) {
    sumSquares += (a.bodies[i].position.x - b.bodies[i].position.x) ** 2;
    sumSquares += (a.bodies[i].position.y - b.bodies[i].position.y) ** 2;
    sumSquares += (a.bodies[i].velocity.x - b.bodies[i].velocity.x) ** 2;
    sumSquares += (a.bodies[i].velocity.y - b.bodies[i].velocity.y) ** 2;
  }
  return Math.sqrt(sumSquares);
}
