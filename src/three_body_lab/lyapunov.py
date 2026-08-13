"""Maximal Lyapunov exponent estimation via the two-trajectory divergence method.

Implements the standard Benettin et al. (1980) renormalization algorithm. See
``docs/research-protocol.md`` for the disclosed, preregistered parameters (perturbation
magnitude, renormalization interval, integration window) used in the frozen sweep.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from three_body_lab.dynamics import STATE_DIM
from three_body_lab.integrator import integrate_trajectory


@dataclass(frozen=True, slots=True)
class LyapunovEstimate:
    """The result of estimating a maximal Lyapunov exponent for one configuration/seed."""

    exponent: float
    n_steps: int
    renorm_interval: float
    perturbation_magnitude: float
    log_growth_rates: NDArray[np.float64]
    """Per-interval ``ln(d_k / delta_0)`` values whose mean (divided by renorm_interval) gives
    ``exponent``. Useful for diagnosing whether the estimate has converged/stabilized."""


def _random_unit_perturbation(dimension: int, seed: int) -> NDArray[np.float64]:
    rng = np.random.default_rng(seed)
    vector = rng.normal(size=dimension)
    norm = float(np.linalg.norm(vector))
    if norm == 0.0:  # pragma: no cover - astronomically unlikely with a Gaussian draw
        vector[0] = 1.0
        norm = 1.0
    return vector / norm


def estimate_lyapunov_exponent(
    initial_state: NDArray[np.float64],
    masses: NDArray[np.float64],
    *,
    t_max: float,
    renorm_interval: float = 1.0,
    perturbation_magnitude: float = 1e-6,
    seed: int = 0,
) -> LyapunovEstimate:
    """Estimate the maximal Lyapunov exponent of a trajectory starting at ``initial_state``.

    Integrates a reference trajectory and a perturbed twin trajectory, periodically
    renormalizing their separation back to ``perturbation_magnitude`` and accumulating the
    log-growth rate of the separation, exactly as specified in
    ``docs/research-protocol.md``.
    """
    if t_max <= 0:
        raise ValueError("t_max must be positive")
    if renorm_interval <= 0:
        raise ValueError("renorm_interval must be positive")
    if perturbation_magnitude <= 0:
        raise ValueError("perturbation_magnitude must be positive")

    n_steps = max(1, round(t_max / renorm_interval))
    initial_state = np.asarray(initial_state, dtype=np.float64)

    direction = _random_unit_perturbation(STATE_DIM, seed)
    reference_state = initial_state.copy()
    perturbed_state = initial_state + perturbation_magnitude * direction

    log_growth_rates = np.empty(n_steps, dtype=np.float64)
    time = 0.0
    for step in range(n_steps):
        span = (time, time + renorm_interval)
        reference_result = integrate_trajectory(reference_state, masses, span)
        perturbed_result = integrate_trajectory(perturbed_state, masses, span)
        reference_state = reference_result.final_state
        perturbed_state = perturbed_result.final_state

        separation = perturbed_state - reference_state
        distance = float(np.linalg.norm(separation))
        if distance == 0.0 or not math.isfinite(distance):  # pragma: no cover - degenerate
            distance = perturbation_magnitude
            separation = perturbation_magnitude * direction
        log_growth_rates[step] = math.log(distance / perturbation_magnitude)

        # Renormalize: rescale the separation back to perturbation_magnitude, same direction.
        perturbed_state = reference_state + separation * (perturbation_magnitude / distance)
        time += renorm_interval

    exponent = float(np.sum(log_growth_rates) / (n_steps * renorm_interval))
    return LyapunovEstimate(
        exponent=exponent,
        n_steps=n_steps,
        renorm_interval=renorm_interval,
        perturbation_magnitude=perturbation_magnitude,
        log_growth_rates=log_growth_rates,
    )
