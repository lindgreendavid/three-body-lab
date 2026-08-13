"""The frozen, deterministic Lyapunov-exponent sweep described in docs/research-protocol.md.

Two sweeps are generated:

- The **perturbation-magnitude sweep**: 6 base configurations (the 3 special solutions plus 3
  generic scattered configurations) x 6 log-spaced perturbation magnitudes x 3 direction seeds.
- The **mass-ratio sweep**: the Lagrange equilateral family x 6 mass ratios x 3 direction seeds,
  at a fixed reference perturbation magnitude.

Both sweeps are pure functions of fixed, documented constants below, so re-running
``run_full_sweep`` always reproduces the same registry (see ``scripts/generate_registry.py``
and ``tests/test_registry.py`` for the byte-reproducibility guarantee).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

import numpy as np
from numpy.typing import NDArray

from three_body_lab.dynamics import angular_momentum, total_energy
from three_body_lab.integrator import integrate_trajectory
from three_body_lab.lyapunov import estimate_lyapunov_exponent
from three_body_lab.special_solutions import all_base_configurations, lagrange_equilateral

PERTURBATION_MAGNITUDES: tuple[float, ...] = tuple(np.geomspace(1e-8, 1e-2, num=6).tolist())
MASS_RATIOS: tuple[float, ...] = (0.5, 0.75, 1.0, 1.5, 2.0, 3.0)
DIRECTION_SEEDS: tuple[int, ...] = (1_000, 2_000, 3_000)

PERTURBATION_SWEEP_T_MAX: float = 20.0
MASS_RATIO_SWEEP_T_MAX: float = 15.0
RENORM_INTERVAL: float = 1.0
MASS_RATIO_REFERENCE_PERTURBATION: float = 1e-6

STABLE_THRESHOLD: float = 0.02
CHAOTIC_THRESHOLD: float = 0.10

Classification = Literal["stable", "borderline", "chaotic"]


def classify(mean_exponent: float) -> Classification:
    """Apply the disclosed, arbitrary classification threshold from the protocol."""
    if mean_exponent < STABLE_THRESHOLD:
        return "stable"
    if mean_exponent < CHAOTIC_THRESHOLD:
        return "borderline"
    return "chaotic"


@dataclass(frozen=True, slots=True)
class SweepCell:
    """One cell of a sweep: a fixed configuration/parameter combination and its estimate."""

    exponents: tuple[float, ...]
    mean_exponent: float
    std_exponent: float
    classification: Classification
    energy_relative_drift: float
    angular_momentum_relative_drift: float
    parameters: dict[str, float | str] = field(default_factory=dict)

    def as_dict(self) -> dict[str, object]:
        return {
            "parameters": self.parameters,
            "exponents": [round(value, 12) for value in self.exponents],
            "mean_exponent": round(self.mean_exponent, 12),
            "std_exponent": round(self.std_exponent, 12),
            "classification": self.classification,
            "energy_relative_drift": round(self.energy_relative_drift, 12),
            "angular_momentum_relative_drift": round(self.angular_momentum_relative_drift, 12),
        }


def _cell_from_estimates(
    estimates: list[float],
    parameters: dict[str, float | str],
    final_state: NDArray[np.float64],
    initial_state: NDArray[np.float64],
    masses: NDArray[np.float64],
) -> SweepCell:
    mean_exponent = float(np.mean(estimates))
    std_exponent = float(np.std(estimates, ddof=0))
    e0 = total_energy(initial_state, masses)
    e1 = total_energy(final_state, masses)
    l0 = angular_momentum(initial_state, masses)
    l1 = angular_momentum(final_state, masses)
    energy_drift = abs(e1 - e0) / abs(e0) if e0 != 0 else abs(e1 - e0)
    momentum_drift = abs(l1 - l0) / abs(l0) if l0 != 0 else abs(l1 - l0)
    return SweepCell(
        exponents=tuple(estimates),
        mean_exponent=mean_exponent,
        std_exponent=std_exponent,
        classification=classify(mean_exponent),
        energy_relative_drift=energy_drift,
        angular_momentum_relative_drift=momentum_drift,
        parameters=parameters,
    )


def run_perturbation_sweep() -> list[SweepCell]:
    """Run the perturbation-magnitude sweep over the 6 base configurations."""
    cells: list[SweepCell] = []
    for configuration in all_base_configurations():
        for magnitude in PERTURBATION_MAGNITUDES:
            estimates = []
            for seed in DIRECTION_SEEDS:
                estimate = estimate_lyapunov_exponent(
                    configuration.state,
                    configuration.masses,
                    t_max=PERTURBATION_SWEEP_T_MAX,
                    renorm_interval=RENORM_INTERVAL,
                    perturbation_magnitude=magnitude,
                    seed=seed,
                )
                estimates.append(estimate.exponent)
            # Reference-only trajectory for conservation diagnostics at this configuration.
            reference_result = integrate_trajectory(
                configuration.state,
                configuration.masses,
                (0.0, PERTURBATION_SWEEP_T_MAX),
            )
            cells.append(
                _cell_from_estimates(
                    estimates,
                    {
                        "sweep": "perturbation_magnitude",
                        "configuration": configuration.name,
                        "perturbation_magnitude": magnitude,
                    },
                    reference_result.final_state,
                    configuration.state,
                    configuration.masses,
                )
            )
    return cells


def run_mass_ratio_sweep() -> list[SweepCell]:
    """Run the mass-ratio sweep over the Lagrange equilateral family."""
    cells: list[SweepCell] = []
    for ratio in MASS_RATIOS:
        masses = np.array([1.0, ratio, 1.0])
        configuration = lagrange_equilateral(masses=masses)
        estimates = []
        for seed in DIRECTION_SEEDS:
            estimate = estimate_lyapunov_exponent(
                configuration.state,
                configuration.masses,
                t_max=MASS_RATIO_SWEEP_T_MAX,
                renorm_interval=RENORM_INTERVAL,
                perturbation_magnitude=MASS_RATIO_REFERENCE_PERTURBATION,
                seed=seed,
            )
            estimates.append(estimate.exponent)
        reference_result = integrate_trajectory(
            configuration.state, configuration.masses, (0.0, MASS_RATIO_SWEEP_T_MAX)
        )
        cells.append(
            _cell_from_estimates(
                estimates,
                {
                    "sweep": "mass_ratio",
                    "configuration": "lagrange_equilateral",
                    "mass_ratio": ratio,
                },
                reference_result.final_state,
                configuration.state,
                configuration.masses,
            )
        )
    return cells


@dataclass(frozen=True, slots=True)
class Registry:
    """The complete frozen registry: both sweeps plus generation metadata."""

    perturbation_sweep: list[SweepCell]
    mass_ratio_sweep: list[SweepCell]

    def as_dict(self) -> dict[str, object]:
        return {
            "schema_version": 1,
            "package_version": "0.1.0",
            "constants": {
                "perturbation_magnitudes": list(PERTURBATION_MAGNITUDES),
                "mass_ratios": list(MASS_RATIOS),
                "direction_seeds": list(DIRECTION_SEEDS),
                "perturbation_sweep_t_max": PERTURBATION_SWEEP_T_MAX,
                "mass_ratio_sweep_t_max": MASS_RATIO_SWEEP_T_MAX,
                "renorm_interval": RENORM_INTERVAL,
                "mass_ratio_reference_perturbation": MASS_RATIO_REFERENCE_PERTURBATION,
                "stable_threshold": STABLE_THRESHOLD,
                "chaotic_threshold": CHAOTIC_THRESHOLD,
            },
            "perturbation_sweep": [cell.as_dict() for cell in self.perturbation_sweep],
            "mass_ratio_sweep": [cell.as_dict() for cell in self.mass_ratio_sweep],
        }


def run_full_sweep() -> Registry:
    """Run both sweeps and return the complete, deterministic registry."""
    return Registry(
        perturbation_sweep=run_perturbation_sweep(),
        mass_ratio_sweep=run_mass_ratio_sweep(),
    )
