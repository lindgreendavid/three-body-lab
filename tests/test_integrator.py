import numpy as np
import pytest

from three_body_lab.dynamics import angular_momentum, pack_state, total_energy
from three_body_lab.integrator import integrate_trajectory
from three_body_lab.special_solutions import euler_collinear, figure_eight, lagrange_equilateral

ENERGY_DRIFT_TOLERANCE = 1e-9
ANGULAR_MOMENTUM_DRIFT_TOLERANCE = 1e-9


@pytest.mark.parametrize(
    ("configuration_factory", "n_periods"),
    [
        (figure_eight, 5),
        (lagrange_equilateral, 5),
        (euler_collinear, 5),
    ],
)
def test_conservation_over_several_periods(configuration_factory, n_periods) -> None:  # type: ignore[no-untyped-def]
    configuration = configuration_factory()
    assert configuration.period is not None
    t_eval = np.linspace(0.0, n_periods * configuration.period, 200)
    result = integrate_trajectory(
        configuration.state, configuration.masses, (0.0, t_eval[-1]), t_eval=t_eval
    )

    e0 = total_energy(configuration.state, configuration.masses)
    l0 = angular_momentum(configuration.state, configuration.masses)
    for state in result.states:
        e = total_energy(state, configuration.masses)
        ell = angular_momentum(state, configuration.masses)
        assert abs(e - e0) / abs(e0) < ENERGY_DRIFT_TOLERANCE
        if l0 != 0:
            assert abs(ell - l0) / abs(l0) < ANGULAR_MOMENTUM_DRIFT_TOLERANCE
        else:
            assert abs(ell - l0) < ANGULAR_MOMENTUM_DRIFT_TOLERANCE


def test_integrate_trajectory_rejects_bad_shapes() -> None:
    with pytest.raises(ValueError, match="initial_state"):
        integrate_trajectory(np.zeros(5), np.array([1.0, 1.0, 1.0]), (0.0, 1.0))
    with pytest.raises(ValueError, match="masses"):
        integrate_trajectory(np.zeros(12), np.array([1.0, 1.0]), (0.0, 1.0))
    with pytest.raises(ValueError, match="positive"):
        integrate_trajectory(np.zeros(12), np.array([1.0, -1.0, 1.0]), (0.0, 1.0))


def test_integration_result_helpers() -> None:
    configuration = lagrange_equilateral()
    result = integrate_trajectory(configuration.state, configuration.masses, (0.0, 1.0))
    np.testing.assert_allclose(result.state_at(0), configuration.state)
    np.testing.assert_allclose(result.final_state, result.states[-1])


def test_two_body_analog_conserves_energy_for_negligible_third_mass() -> None:
    # A near two-body Kepler configuration (third mass negligible) should also conserve energy.
    state = pack_state(
        np.array([[-0.5, 0.0], [0.5, 0.0], [50.0, 50.0]]),
        np.array([[0.0, -0.7], [0.0, 0.7], [0.0, 0.0]]),
    )
    masses = np.array([1.0, 1.0, 1e-10])
    result = integrate_trajectory(state, masses, (0.0, 10.0))
    e0 = total_energy(state, masses)
    e1 = total_energy(result.final_state, masses)
    assert abs(e1 - e0) / abs(e0) < 1e-8
