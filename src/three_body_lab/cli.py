"""Command-line entry point for Three Body Lab."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from three_body_lab.dynamics import angular_momentum, total_energy
from three_body_lab.integrator import integrate_trajectory
from three_body_lab.special_solutions import (
    euler_collinear,
    figure_eight,
    lagrange_equilateral,
)
from three_body_lab.sweep import run_full_sweep

_PRESETS = {
    "figure-eight": figure_eight,
    "lagrange": lagrange_equilateral,
    "euler": euler_collinear,
}


def _cmd_integrate(args: argparse.Namespace) -> int:
    configuration = _PRESETS[args.preset]()
    t_max = args.t_max if args.t_max is not None else (configuration.period or 10.0)
    result = integrate_trajectory(configuration.state, configuration.masses, (0.0, t_max))
    e0 = total_energy(configuration.state, configuration.masses)
    e1 = total_energy(result.final_state, configuration.masses)
    l0 = angular_momentum(configuration.state, configuration.masses)
    l1 = angular_momentum(result.final_state, configuration.masses)
    payload = {
        "preset": args.preset,
        "t_max": t_max,
        "final_state": result.final_state.tolist(),
        "energy_relative_drift": abs(e1 - e0) / abs(e0) if e0 else abs(e1 - e0),
        "angular_momentum_relative_drift": abs(l1 - l0) / abs(l0) if l0 else abs(l1 - l0),
    }
    json.dump(payload, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


def _cmd_generate_registry(args: argparse.Namespace) -> int:
    registry = run_full_sweep()
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(registry.as_dict(), indent=2, sort_keys=False) + "\n")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="three-body-lab")
    subparsers = parser.add_subparsers(dest="command", required=True)

    integrate_parser = subparsers.add_parser(
        "integrate", help="Integrate a preset special-solution configuration and report drift."
    )
    integrate_parser.add_argument("preset", choices=sorted(_PRESETS))
    integrate_parser.add_argument("--t-max", type=float, default=None)
    integrate_parser.set_defaults(func=_cmd_integrate)

    registry_parser = subparsers.add_parser(
        "generate-registry", help="Run the frozen Lyapunov-exponent sweep and write the registry."
    )
    registry_parser.add_argument("--output", required=True)
    registry_parser.set_defaults(func=_cmd_generate_registry)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    result: int = args.func(args)
    return result


if __name__ == "__main__":
    raise SystemExit(main())
