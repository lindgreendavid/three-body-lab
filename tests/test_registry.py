"""The committed registry must match a fresh deterministic run.

Mirrors the reproducibility-gate pattern used across this project's sibling laboratories: the
frozen JSON file committed under ``reports/`` is not just "a" result, it is *the* result, and
CI fails on structural or scientifically meaningful numeric differences.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from three_body_lab.sweep import Registry

REGISTRY_PATH = Path(__file__).resolve().parent.parent / "reports" / "v0.1-lyapunov-registry.json"


def test_committed_registry_matches_fresh_deterministic_run(full_sweep_registry: Registry) -> None:
    assert REGISTRY_PATH.exists(), (
        f"{REGISTRY_PATH} is missing; run scripts/generate_registry.py --output "
        f"{REGISTRY_PATH} to create it."
    )
    fresh = full_sweep_registry.as_dict()
    fresh_path = Path("/tmp/three-body-registry-check.json")
    fresh_path.write_text(json.dumps(fresh, indent=2) + "\n")
    comparison = subprocess.run(
        [
            sys.executable,
            str(REGISTRY_PATH.parent.parent / "scripts" / "compare_registry.py"),
            str(REGISTRY_PATH),
            str(fresh_path),
        ],
        cwd=REGISTRY_PATH.parent.parent,
        capture_output=True,
        text=True,
        check=True,
    )
    assert comparison.returncode == 0
