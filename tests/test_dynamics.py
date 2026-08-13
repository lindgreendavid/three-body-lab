import numpy as np
import pytest

from three_body_lab.dynamics import (
    angular_momentum,
    center_of_mass,
    equations_of_motion,
    pack_state,
    positions,
    total_energy,
    velocities,
)


def test_pack_and_unpack_round_trip() -> None:
    pos = np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]])
    vel = np.array([[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]])
    state = pack_state(pos, vel)
    assert state.shape == (12,)
    np.testing.assert_allclose(positions(state), pos)
    np.testing.assert_allclose(velocities(state), vel)


def test_equations_of_motion_shape() -> None:
    state = pack_state(
        np.array([[1.0, 0.0], [-1.0, 0.0], [0.0, 1.0]]),
        np.zeros((3, 2)),
    )
    masses = np.array([1.0, 1.0, 1.0])
    derivative = equations_of_motion(0.0, state, masses)
    assert derivative.shape == (12,)
    # dpos/dt equals velocity, which is zero here.
    np.testing.assert_allclose(positions(derivative), np.zeros((3, 2)))


def test_equations_of_motion_symmetry_two_equal_masses_attract_inward() -> None:
    # Two bodies on the x-axis, one heavy body far away contributes negligibly;
    # check the near-body pair accelerates toward each other.
    state = pack_state(
        np.array([[-1.0, 0.0], [1.0, 0.0], [1000.0, 1000.0]]),
        np.zeros((3, 2)),
    )
    masses = np.array([1.0, 1.0, 1e-12])
    derivative = equations_of_motion(0.0, state, masses)
    accelerations = velocities(derivative)
    assert accelerations[0, 0] > 0  # body 1 pulled toward +x (toward body 2)
    assert accelerations[1, 0] < 0  # body 2 pulled toward -x (toward body 1)


def test_total_energy_matches_hand_computation_for_static_pair() -> None:
    state = pack_state(np.array([[-1.0, 0.0], [1.0, 0.0], [0.0, 100.0]]), np.zeros((3, 2)))
    masses = np.array([1.0, 1.0, 1e-9])
    energy = total_energy(state, masses)
    # Kinetic energy is zero (all velocities zero); potential dominated by the close pair.
    expected_close_pair_potential = -1.0 * 1.0 / 2.0
    assert energy == pytest.approx(expected_close_pair_potential, rel=1e-3)


def test_angular_momentum_zero_for_radial_motion() -> None:
    # Two bodies moving directly along their separation vector carry zero angular momentum.
    state = pack_state(
        np.array([[-1.0, 0.0], [1.0, 0.0], [0.0, 5.0]]),
        np.array([[-0.5, 0.0], [0.5, 0.0], [0.0, 0.0]]),
    )
    masses = np.array([1.0, 1.0, 1.0])
    assert angular_momentum(state, masses) == pytest.approx(0.0, abs=1e-12)


def test_center_of_mass_of_symmetric_equal_masses_is_origin() -> None:
    state = pack_state(
        np.array([[1.0, 0.0], [-0.5, np.sqrt(3) / 2], [-0.5, -np.sqrt(3) / 2]]),
        np.zeros((3, 2)),
    )
    masses = np.array([1.0, 1.0, 1.0])
    np.testing.assert_allclose(center_of_mass(state, masses), [0.0, 0.0], atol=1e-12)
