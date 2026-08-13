"""Known special solutions and generic base configurations of the three-body problem.

Every function returns a ``(state, masses, period)`` triple where ``state`` is a packed
12-element vector (see ``three_body_lab.dynamics``), ``masses`` is a length-3 array, and
``period`` is the known or derived period in time units (``None`` for the aperiodic generic
configurations).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from three_body_lab.dynamics import G, pack_state, total_energy

FIGURE_EIGHT_PERIOD: float = 6.32591398


@dataclass(frozen=True, slots=True)
class Configuration:
    """A named, reproducible initial condition for the three-body simulator."""

    name: str
    state: NDArray[np.float64]
    masses: NDArray[np.float64]
    period: float | None
    """Known or derived period in time units, or ``None`` if the configuration is aperiodic."""


def figure_eight() -> Configuration:
    """The Chenciner-Montgomery figure-eight orbit (Simo 2001 numerically refined constants).

    Three equal unit masses chase each other around a single figure-eight-shaped curve.
    Reference: A. Chenciner & R. Montgomery, "A remarkable periodic solution of the three-body
    problem in the case of equal masses", Annals of Mathematics 152 (2000); initial-condition
    constants from C. Simo, "Periodic orbits of the planar N-body problem with equal masses
    and satellite orbits" (2001).
    """
    positions = np.array(
        [
            [0.9700436, -0.24308753],
            [-0.9700436, 0.24308753],
            [0.0, 0.0],
        ]
    )
    v_shared = np.array([0.466203685, 0.43236573])
    velocities = np.array(
        [
            v_shared,
            v_shared,
            -2.0 * v_shared,
        ]
    )
    masses = np.array([1.0, 1.0, 1.0])
    state = pack_state(positions, velocities)
    return Configuration("figure_eight", state, masses, FIGURE_EIGHT_PERIOD)


def lagrange_equilateral(
    masses: NDArray[np.float64] | None = None, side: float = 1.0
) -> Configuration:
    """The Lagrange equilateral-triangle relative equilibrium.

    Valid for *any* positive mass triple: the triangle geometry (side length ``side``) does
    not depend on the mass ratios, only the center-of-mass offset does. Angular velocity
    ``omega = sqrt(G * total_mass / side**3)`` follows from Lagrange's classical result.
    """
    if masses is None:
        masses = np.array([1.0, 1.0, 1.0])
    masses = np.asarray(masses, dtype=np.float64)
    if masses.shape != (3,):
        raise ValueError(f"masses must have shape (3,), got {masses.shape}")

    circumradius = side / np.sqrt(3.0)
    angles = np.array([np.pi / 2, np.pi / 2 + 2 * np.pi / 3, np.pi / 2 + 4 * np.pi / 3])
    vertices = circumradius * np.column_stack([np.cos(angles), np.sin(angles)])

    total_mass = float(np.sum(masses))
    center_of_mass = np.sum(vertices * masses[:, None], axis=0) / total_mass
    positions = vertices - center_of_mass

    omega = float(np.sqrt(G * total_mass / side**3))
    # v = omega x r for planar rotation: (vx, vy) = omega * (-y, x)
    velocities = omega * np.column_stack([-positions[:, 1], positions[:, 0]])

    state = pack_state(positions, velocities)
    period = 2 * np.pi / omega
    return Configuration("lagrange_equilateral", state, masses, period)


def euler_collinear() -> Configuration:
    """The equal-mass Euler collinear relative equilibrium.

    Three equal unit masses on a line at positions (-1, 0), (0, 0), (1, 0), rotating rigidly
    about their common center of mass (the origin, by symmetry). Force balance on an outer
    body gives ``omega**2 = 5 * G / 4`` at unit spacing (see docs/research-protocol.md for the
    derivation). Mass-ratio continuation (Euler's quintic) is out of scope for v0.1.0.
    """
    masses = np.array([1.0, 1.0, 1.0])
    positions = np.array([[-1.0, 0.0], [0.0, 0.0], [1.0, 0.0]])
    omega = float(np.sqrt(5.0 * G / 4.0))
    velocities = omega * np.column_stack([-positions[:, 1], positions[:, 0]])
    state = pack_state(positions, velocities)
    period = 2 * np.pi / omega
    return Configuration("euler_collinear", state, masses, period)


_GENERIC_SEEDS: dict[str, int] = {
    "generic_a": 2024,
    "generic_b": 4048,
    "generic_c": 8096,
}


_GENERIC_MIN_SEPARATION: float = 0.5
_GENERIC_MAX_DRAW_ATTEMPTS: int = 200
_GENERIC_BOUND_FRACTION: float = 0.35
"""Target kinetic energy as a fraction of |initial potential energy|.

Keeps the system on a moderately energetic bound orbit (total energy stays negative), which
avoids two numerically expensive extremes: immediate escape to infinity (very positive total
energy) and an immediate deep close encounter from t=0 (near-zero initial separation). Chaotic
close encounters *during* the integration are not excluded — that is the point of using generic
configurations at all — only pathological starting conditions are avoided.
"""


def generic_configuration(name: str) -> Configuration:
    """A deterministic, seeded, non-special scattered initial configuration.

    Positions are drawn uniformly in a bounded box, rejecting draws with a pairwise separation
    below ``_GENERIC_MIN_SEPARATION`` so the trajectory does not start mid-collision. Velocities
    are drawn from a seeded normal distribution, recentered to zero total linear momentum, and
    then rescaled so the initial kinetic energy is a fixed fraction of the initial potential
    energy magnitude (see ``_GENERIC_BOUND_FRACTION``), keeping the system bound (negative total
    energy) and numerically well-behaved over the sweep's integration window while still
    permitting genuine close encounters during the integration itself.
    """
    if name not in _GENERIC_SEEDS:
        raise ValueError(f"unknown generic configuration name: {name!r}")
    rng = np.random.default_rng(_GENERIC_SEEDS[name])
    masses = np.array([1.0, 1.0, 1.0])

    positions = rng.uniform(-1.0, 1.0, size=(3, 2))
    for _ in range(_GENERIC_MAX_DRAW_ATTEMPTS):
        separations = [
            float(np.linalg.norm(positions[i] - positions[j]))
            for i in range(3)
            for j in range(i + 1, 3)
        ]
        if min(separations) >= _GENERIC_MIN_SEPARATION:
            break
        positions = rng.uniform(-1.0, 1.0, size=(3, 2))

    velocities = rng.normal(scale=0.3, size=(3, 2))
    total_mass = float(np.sum(masses))
    momentum = np.sum(velocities * masses[:, None], axis=0)
    velocities = velocities - momentum / total_mass

    zero_velocity_state = pack_state(positions, np.zeros((3, 2)))
    potential_energy = total_energy(zero_velocity_state, masses)
    current_kinetic_energy = 0.5 * float(np.sum(masses * np.sum(velocities**2, axis=1)))
    target_kinetic_energy = _GENERIC_BOUND_FRACTION * abs(potential_energy)
    if current_kinetic_energy > 0:
        velocities = velocities * np.sqrt(target_kinetic_energy / current_kinetic_energy)

    state = pack_state(positions, velocities)
    return Configuration(name, state, masses, None)


GENERIC_CONFIGURATION_NAMES: tuple[str, ...] = tuple(_GENERIC_SEEDS)


def all_base_configurations() -> list[Configuration]:
    """The six base configurations used by the perturbation-magnitude sweep."""
    return [
        figure_eight(),
        lagrange_equilateral(),
        euler_collinear(),
        *(generic_configuration(name) for name in GENERIC_CONFIGURATION_NAMES),
    ]
