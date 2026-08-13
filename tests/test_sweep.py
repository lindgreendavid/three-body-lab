from three_body_lab.sweep import (
    DIRECTION_SEEDS,
    MASS_RATIOS,
    PERTURBATION_MAGNITUDES,
    Registry,
    classify,
)


def test_classify_thresholds() -> None:
    assert classify(0.0) == "stable"
    assert classify(0.019) == "stable"
    assert classify(0.02) == "borderline"
    assert classify(0.099) == "borderline"
    assert classify(0.1) == "chaotic"
    assert classify(5.0) == "chaotic"


def test_full_sweep_cell_counts_and_structure(full_sweep_registry: Registry) -> None:
    # Byte-for-byte reproducibility of the full sweep is validated separately by
    # tests/test_registry.py (comparing against the committed, frozen registry file), which
    # avoids paying the cost of running the entire sweep twice in this test.
    registry = full_sweep_registry
    assert len(registry.perturbation_sweep) == 6 * len(PERTURBATION_MAGNITUDES)
    assert len(registry.mass_ratio_sweep) == len(MASS_RATIOS)
    for cell in registry.perturbation_sweep + registry.mass_ratio_sweep:
        assert len(cell.exponents) == len(DIRECTION_SEEDS)
        assert cell.classification in {"stable", "borderline", "chaotic"}


def test_registry_as_dict_has_expected_top_level_keys(full_sweep_registry: Registry) -> None:
    payload = full_sweep_registry.as_dict()
    assert set(payload) == {
        "schema_version",
        "package_version",
        "constants",
        "perturbation_sweep",
        "mass_ratio_sweep",
    }
    assert payload["schema_version"] == 1
