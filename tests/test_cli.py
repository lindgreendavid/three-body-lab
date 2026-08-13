import json

import pytest

import three_body_lab.cli as cli_module
from three_body_lab.cli import build_parser, main


def test_integrate_command_prints_json_with_drift_fields(
    capsys: pytest.CaptureFixture[str],
) -> None:
    exit_code = main(["integrate", "lagrange", "--t-max", "2.0"])
    assert exit_code == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["preset"] == "lagrange"
    assert payload["t_max"] == 2.0
    assert len(payload["final_state"]) == 12
    assert "energy_relative_drift" in payload
    assert "angular_momentum_relative_drift" in payload


def test_integrate_command_defaults_t_max_to_known_period(
    capsys: pytest.CaptureFixture[str],
) -> None:
    exit_code = main(["integrate", "figure-eight"])
    assert exit_code == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["t_max"] == pytest.approx(6.32591398)


def test_generate_registry_command_writes_file(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,  # type: ignore[no-untyped-def]
) -> None:
    # The real sweep takes on the order of a minute; this test only needs to verify the CLI
    # plumbing (argument parsing, directory creation, JSON serialization), which is exercised
    # end-to-end against the real sweep already by scripts/generate_registry.py in CI and by
    # tests/test_registry.py. Stub the sweep here to keep this test fast.
    from three_body_lab.sweep import Registry

    monkeypatch.setattr(cli_module, "run_full_sweep", lambda: Registry([], []))
    output = tmp_path / "nested" / "registry.json"
    exit_code = main(["generate-registry", "--output", str(output)])
    assert exit_code == 0
    payload = json.loads(output.read_text())
    assert payload["schema_version"] == 1
    assert payload["perturbation_sweep"] == []


def test_build_parser_requires_a_subcommand() -> None:
    parser = build_parser()
    with pytest.raises(SystemExit):
        parser.parse_args([])
