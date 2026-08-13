import numpy as np
import pytest

from three_body_lab.integrator import integrate_trajectory
from three_body_lab.special_solutions import (
    GENERIC_CONFIGURATION_NAMES,
    all_base_configurations,
    euler_collinear,
    figure_eight,
    generic_configuration,
    lagrange_equilateral,
)


def test_figure_eight_returns_close_to_initial_state_after_one_period() -> None:
    configuration = figure_eight()
    result = integrate_trajectory(
        configuration.state, configuration.masses, (0.0, configuration.period)
    )
    # The commonly published figure-eight constants carry ~8 significant digits, so exact
    # machine-precision recurrence is not expected; this tolerance reflects that documented
    # limitation (see docs/research-protocol.md), not a loose test.
    difference = np.linalg.norm(result.final_state - configuration.state)
    assert difference < 5e-3


@pytest.mark.parametrize("configuration_factory", [lagrange_equilateral, euler_collinear])
def test_analytic_relative_equilibria_return_almost_exactly_after_one_period(
    configuration_factory,  # type: ignore[no-untyped-def]
) -> None:
    configuration = configuration_factory()
    result = integrate_trajectory(
        configuration.state, configuration.masses, (0.0, configuration.period)
    )
    difference = np.linalg.norm(result.final_state - configuration.state)
    assert difference < 1e-6


def test_lagrange_equilateral_triangle_geometry_is_mass_independent() -> None:
    equal = lagrange_equilateral(masses=np.array([1.0, 1.0, 1.0]))
    unequal = lagrange_equilateral(masses=np.array([2.0, 0.5, 3.0]))

    def side_lengths(state: np.ndarray) -> np.ndarray:
        pos = state.reshape(3, 4)[:, 0:2]
        return np.array(
            [
                np.linalg.norm(pos[0] - pos[1]),
                np.linalg.norm(pos[1] - pos[2]),
                np.linalg.norm(pos[2] - pos[0]),
            ]
        )

    np.testing.assert_allclose(side_lengths(equal.state), side_lengths(unequal.state), atol=1e-10)


def test_lagrange_equilateral_rejects_bad_mass_shape() -> None:
    with pytest.raises(ValueError, match="masses"):
        lagrange_equilateral(masses=np.array([1.0, 1.0]))


def test_euler_collinear_bodies_are_colinear_and_symmetric() -> None:
    configuration = euler_collinear()
    pos = configuration.state.reshape(3, 4)[:, 0:2]
    np.testing.assert_allclose(pos[:, 1], 0.0, atol=1e-12)
    np.testing.assert_allclose(pos[0], -pos[2], atol=1e-12)
    np.testing.assert_allclose(pos[1], [0.0, 0.0], atol=1e-12)


def test_generic_configuration_is_deterministic_and_zero_momentum() -> None:
    first = generic_configuration("generic_a")
    second = generic_configuration("generic_a")
    np.testing.assert_array_equal(first.state, second.state)

    velocities = first.state.reshape(3, 4)[:, 2:4]
    momentum = np.sum(velocities * first.masses[:, None], axis=0)
    np.testing.assert_allclose(momentum, [0.0, 0.0], atol=1e-12)
    assert first.period is None


def test_generic_configuration_names_are_distinct() -> None:
    states = [generic_configuration(name).state for name in GENERIC_CONFIGURATION_NAMES]
    for i in range(len(states)):
        for j in range(i + 1, len(states)):
            assert not np.allclose(states[i], states[j])


def test_generic_configuration_rejects_unknown_name() -> None:
    with pytest.raises(ValueError, match="unknown"):
        generic_configuration("not_a_real_configuration")


def test_all_base_configurations_returns_six_named_configurations() -> None:
    configurations = all_base_configurations()
    assert len(configurations) == 6
    names = {c.name for c in configurations}
    assert names == {
        "figure_eight",
        "lagrange_equilateral",
        "euler_collinear",
        *GENERIC_CONFIGURATION_NAMES,
    }
