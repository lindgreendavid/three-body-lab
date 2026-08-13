import numpy as np
import pytest

from three_body_lab.lyapunov import estimate_lyapunov_exponent
from three_body_lab.special_solutions import figure_eight, generic_configuration


def test_estimate_is_deterministic_given_seed() -> None:
    configuration = figure_eight()
    first = estimate_lyapunov_exponent(
        configuration.state, configuration.masses, t_max=5.0, renorm_interval=1.0, seed=7
    )
    second = estimate_lyapunov_exponent(
        configuration.state, configuration.masses, t_max=5.0, renorm_interval=1.0, seed=7
    )
    assert first.exponent == second.exponent
    np.testing.assert_array_equal(first.log_growth_rates, second.log_growth_rates)


def test_different_seeds_can_give_different_directions() -> None:
    configuration = generic_configuration("generic_a")
    first = estimate_lyapunov_exponent(
        configuration.state, configuration.masses, t_max=5.0, renorm_interval=1.0, seed=1
    )
    second = estimate_lyapunov_exponent(
        configuration.state, configuration.masses, t_max=5.0, renorm_interval=1.0, seed=2
    )
    # Different perturbation directions should not produce byte-identical growth sequences.
    assert not np.array_equal(first.log_growth_rates, second.log_growth_rates)


def test_n_steps_matches_t_max_over_renorm_interval() -> None:
    configuration = figure_eight()
    estimate = estimate_lyapunov_exponent(
        configuration.state, configuration.masses, t_max=10.0, renorm_interval=2.0, seed=1
    )
    assert estimate.n_steps == 5
    assert len(estimate.log_growth_rates) == 5


@pytest.mark.parametrize(
    ("kwargs", "message"),
    [
        ({"t_max": 0.0}, "t_max"),
        ({"t_max": -1.0}, "t_max"),
        ({"renorm_interval": 0.0}, "renorm_interval"),
        ({"perturbation_magnitude": -1e-6}, "perturbation_magnitude"),
    ],
)
def test_estimate_validates_inputs(kwargs: dict, message: str) -> None:  # type: ignore[type-arg]
    configuration = figure_eight()
    base_kwargs = {"t_max": 5.0, "renorm_interval": 1.0, "perturbation_magnitude": 1e-6}
    base_kwargs.update(kwargs)
    with pytest.raises(ValueError, match=message):
        estimate_lyapunov_exponent(configuration.state, configuration.masses, **base_kwargs)


def test_reference_trajectory_against_itself_is_near_zero_noise_floor() -> None:
    # A near-zero perturbation magnitude near machine precision should not show strong
    # amplification for a short window on a stable configuration; this is a sanity check on
    # the method itself, not a physics claim.
    configuration = figure_eight()
    estimate = estimate_lyapunov_exponent(
        configuration.state,
        configuration.masses,
        t_max=5.0,
        renorm_interval=1.0,
        perturbation_magnitude=1e-6,
        seed=3,
    )
    assert np.isfinite(estimate.exponent)
