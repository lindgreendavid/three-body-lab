# Contributing

Three Body Lab welcomes small, evidence-backed changes.

1. Open an issue for new research scope or a change to what a metric measures.
2. Create a focused branch.
3. Add or update tests and documentation with the implementation.
4. Run `pytest`, `ruff check .`, `ruff format --check .`, `mypy src`, `python -m build`, the
   registry generator with a byte comparison against the committed registry, and the complete
   web lint/build/test suite in `site/`.
5. Use English Conventional Commits and submit a draft pull request.

Never commit personal data, secrets, transient generated reports, or claims unsupported by the
implemented experiment. The frozen release registry
(`reports/v0.1-lyapunov-registry.json`) is a reviewed exception and may change only alongside
its versioned protocol, generator, tests, and report. Scientific changes must state
assumptions, provenance, uncertainty, limitations, and the difference between evidence and
interpretation — see `docs/research-protocol.md` for the standard this project holds itself to.
