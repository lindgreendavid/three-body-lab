"""Three Body Lab: a reproducible laboratory for the planar gravitational three-body problem.

See ``docs/research-protocol.md`` in the repository root for the preregistered research
question, hypotheses, numerical method, and sweep design this package implements.
"""

from three_body_lab.dynamics import angular_momentum, total_energy
from three_body_lab.integrator import IntegrationResult, integrate_trajectory
from three_body_lab.lyapunov import LyapunovEstimate, estimate_lyapunov_exponent

__all__ = [
    "IntegrationResult",
    "LyapunovEstimate",
    "angular_momentum",
    "estimate_lyapunov_exponent",
    "integrate_trajectory",
    "total_energy",
]

__version__ = "0.1.0"
