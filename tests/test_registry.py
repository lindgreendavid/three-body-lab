"""Byte-comparison test: the committed registry must match a fresh deterministic run.

Mirrors the reproducibility-gate pattern used across this project's sibling laboratories: the
frozen JSON file committed under ``reports/`` is not just "a" result, it is *the* result, and
CI fails if a fresh run produces anything different.
"""

from __future__ import annotations

import json
from pathlib import Path

from three_body_lab.sweep import Registry

REGISTRY_PATH = Path(__file__).resolve().parent.parent / "reports" / "v0.1-lyapunov-registry.json"


def test_committed_registry_matches_fresh_deterministic_run(full_sweep_registry: Registry) -> None:
    assert REGISTRY_PATH.exists(), (
        f"{REGISTRY_PATH} is missing; run scripts/generate_registry.py --output "
        f"{REGISTRY_PATH} to create it."
    )
    committed = json.loads(REGISTRY_PATH.read_text())
    fresh = full_sweep_registry.as_dict()
    assert fresh == committed
