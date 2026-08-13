"""High-order adaptive integration of the planar three-body equations of motion.

Uses ``scipy.integrate.solve_ivp`` with the DOP853 method (explicit, adaptive-step, eighth-
order embedded Runge-Kutta). See ``docs/research-protocol.md`` for the justification of this
choice over a hand-rolled symplectic integrator.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from scipy.integrate import solve_ivp

from three_body_lab.dynamics import STATE_DIM, equations_of_motion

DEFAULT_RTOL: float = 1e-11
DEFAULT_ATOL: float = 1e-12
DEFAULT_METHOD: str = "DOP853"


@dataclass(frozen=True, slots=True)
class IntegrationResult:
    """The result of integrating a three-body trajectory over a time span."""

    times: NDArray[np.float64]
    states: NDArray[np.float64]
    """Shape ``(len(times), 12)``: one packed state vector per sampled time."""

    def state_at(self, index: int) -> NDArray[np.float64]:
        return np.asarray(self.states[index], dtype=np.float64)

    @property
    def final_state(self) -> NDArray[np.float64]:
        return np.asarray(self.states[-1], dtype=np.float64)


def integrate_trajectory(
    initial_state: NDArray[np.float64],
    masses: NDArray[np.float64],
    t_span: tuple[float, float],
    *,
    t_eval: NDArray[np.float64] | None = None,
    rtol: float = DEFAULT_RTOL,
    atol: float = DEFAULT_ATOL,
    method: str = DEFAULT_METHOD,
) -> IntegrationResult:
    """Integrate the three-body system from ``initial_state`` over ``t_span``.

    Raises ``RuntimeError`` if the underlying solver fails to complete the integration.
    """
    initial_state = np.asarray(initial_state, dtype=np.float64)
    if initial_state.shape != (STATE_DIM,):
        raise ValueError(f"initial_state must have shape ({STATE_DIM},), got {initial_state.shape}")
    masses = np.asarray(masses, dtype=np.float64)
    if masses.shape != (3,):
        raise ValueError(f"masses must have shape (3,), got {masses.shape}")
    if np.any(masses <= 0):
        raise ValueError("all masses must be strictly positive")

    solution = solve_ivp(
        equations_of_motion,
        t_span,
        initial_state,
        args=(masses,),
        method=method,
        rtol=rtol,
        atol=atol,
        t_eval=t_eval,
        dense_output=False,
    )
    if not solution.success:
        raise RuntimeError(f"integration failed: {solution.message}")
    return IntegrationResult(times=solution.t, states=solution.y.T.copy())
