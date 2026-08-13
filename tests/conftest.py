"""Shared pytest fixtures.

The full Lyapunov sweep takes on the order of a minute to compute, so it is run at most once
per test session and shared between tests that need it (structural checks and the frozen-
registry byte comparison), rather than being recomputed independently by each test.
"""

from __future__ import annotations

import pytest

from three_body_lab.sweep import Registry, run_full_sweep


@pytest.fixture(scope="session")
def full_sweep_registry() -> Registry:
    return run_full_sweep()
