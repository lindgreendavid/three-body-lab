"""Equations of motion and conserved-quantity diagnostics for the planar three-body problem.

The state vector for three bodies is a flat array of 12 floats, laid out per body as
``[x, y, vx, vy]`` for body 1, then body 2, then body 3::

    state = [x1, y1, vx1, vy1, x2, y2, vx2, vy2, x3, y3, vx3, vy3]

Gravitational constant ``G`` is fixed at ``1.0`` throughout (natural units), matching the
protocol in ``docs/research-protocol.md``.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

G: float = 1.0
"""Gravitational constant in the natural units used throughout this package."""

SOFTENING_LENGTH: float = 1e-9
"""Small softening length added in quadrature to squared separations.

Prevents a literal division by zero if two bodies coincide exactly during numerical search.
At the separations reached by every configuration used in this study it changes the computed
force by a negligible amount relative to integrator tolerance; see
``docs/research-protocol.md`` for the disclosed justification.
"""

N_BODIES: int = 3
STATE_DIM: int = 12


def positions(state: NDArray[np.float64]) -> NDArray[np.float64]:
    """Return the ``(3, 2)`` position array packed inside a flat 12-element state vector."""
    reshaped = np.asarray(state, dtype=np.float64).reshape(N_BODIES, 4)
    return reshaped[:, 0:2]


def velocities(state: NDArray[np.float64]) -> NDArray[np.float64]:
    """Return the ``(3, 2)`` velocity array packed inside a flat 12-element state vector."""
    reshaped = np.asarray(state, dtype=np.float64).reshape(N_BODIES, 4)
    return reshaped[:, 2:4]


def pack_state(
    positions_array: NDArray[np.float64], velocities_array: NDArray[np.float64]
) -> NDArray[np.float64]:
    """Pack ``(3, 2)`` position and velocity arrays into a flat 12-element state vector."""
    positions_array = np.asarray(positions_array, dtype=np.float64).reshape(N_BODIES, 2)
    velocities_array = np.asarray(velocities_array, dtype=np.float64).reshape(N_BODIES, 2)
    state = np.empty(STATE_DIM, dtype=np.float64)
    combined = np.concatenate([positions_array, velocities_array], axis=1)
    state[:] = combined.reshape(-1)
    return state


def equations_of_motion(
    _t: float, state: NDArray[np.float64], masses: NDArray[np.float64]
) -> NDArray[np.float64]:
    """Right-hand side ``dstate/dt`` of Newton's equations for three softened point masses.

    Suitable for ``scipy.integrate.solve_ivp``: takes and returns a flat 12-element state.
    """
    pos = positions(state)
    vel = velocities(state)
    accelerations = np.zeros((N_BODIES, 2), dtype=np.float64)
    for i in range(N_BODIES):
        for j in range(N_BODIES):
            if i == j:
                continue
            delta = pos[j] - pos[i]
            distance_squared = float(np.dot(delta, delta)) + SOFTENING_LENGTH**2
            inverse_cube = distance_squared ** (-1.5)
            accelerations[i] += G * masses[j] * delta * inverse_cube
    return pack_state(vel, accelerations)


def total_energy(state: NDArray[np.float64], masses: NDArray[np.float64]) -> float:
    """Total mechanical energy (kinetic + softened gravitational potential) of the system."""
    pos = positions(state)
    vel = velocities(state)
    kinetic = 0.5 * float(np.sum(masses * np.sum(vel**2, axis=1)))
    potential = 0.0
    for i in range(N_BODIES):
        for j in range(i + 1, N_BODIES):
            delta = pos[j] - pos[i]
            distance = float(np.sqrt(np.dot(delta, delta) + SOFTENING_LENGTH**2))
            potential -= G * masses[i] * masses[j] / distance
    return kinetic + potential


def angular_momentum(state: NDArray[np.float64], masses: NDArray[np.float64]) -> float:
    """Total ``z``-component angular momentum about the origin for the planar system."""
    pos = positions(state)
    vel = velocities(state)
    cross = pos[:, 0] * vel[:, 1] - pos[:, 1] * vel[:, 0]
    return float(np.sum(masses * cross))


def center_of_mass(state: NDArray[np.float64], masses: NDArray[np.float64]) -> NDArray[np.float64]:
    """Mass-weighted center-of-mass position."""
    pos = positions(state)
    total_mass = float(np.sum(masses))
    return np.asarray(np.sum(pos * masses[:, None], axis=0) / total_mass, dtype=np.float64)
