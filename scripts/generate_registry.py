#!/usr/bin/env python3
"""Generate the frozen v0.1 Lyapunov-exponent registry deterministically.

Usage: python scripts/generate_registry.py --output reports/v0.1-lyapunov-registry.json

This regenerates byte-identically given the fixed constants in
``three_body_lab.sweep`` and is checked against the committed registry by
``tests/test_registry.py`` and the CI ``research-registry`` job.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from three_body_lab.sweep import run_full_sweep


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    registry = run_full_sweep()
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(registry.as_dict(), indent=2, sort_keys=False) + "\n")
    print(f"wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
