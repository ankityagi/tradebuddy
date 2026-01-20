# Repository Guidelines

This guide helps contributors work efficiently in this repository.

## Project Structure & Module Organization
- Root contains documentation and project configs. Primary entry points live under `src/` (create if missing) and tests under `tests/`.
- Assets (images, fixtures) go in `assets/` or `tests/fixtures/`.
- Example layout:
  - `src/` — application/library code
  - `tests/` — unit/integration tests
  - `README.md` — quick start and usage

## Build, Test, and Development Commands
- `make setup` — install dependencies and set up local environment.
- `make test` — run all tests with coverage.
- `make lint` — run linters/formatters.
- `make run` — start the app locally (or run CLI entry).
- If `make` is unavailable, use the underlying toolchain directly (e.g., `npm test`, `pytest -q`, or `go test ./...`) consistent with the code in `src/`.

## Coding Style & Naming Conventions
- Indentation: 2 spaces for JavaScript/TypeScript; 4 spaces for Python; gofmt for Go.
- Filenames: `kebab-case` for scripts/configs, `snake_case.py` for Python modules, `CamelCase` for classes, `lowerCamelCase` for functions/variables.
- Keep functions small and pure; prefer explicit over implicit. Add docstrings/JSDoc for public APIs.
- Use provided formatters: `prettier` for JS/TS, `black` for Python, `gofmt` for Go. Run via `make lint`.

## Testing Guidelines
- Prefer fast unit tests; add integration tests for critical paths.
- Test naming: mirror source paths (e.g., `tests/test_module_x.py`, `src/__tests__/util.spec.ts`).
- Aim for ≥80% line coverage on changed code. Run `make test` before pushing.
- Include fixtures under `tests/fixtures/` and avoid network calls; mock external I/O.

## Commit & Pull Request Guidelines
- Commit messages: short imperative subject (≤72 chars) + optional body. Example: `fix(api): handle empty payload`.
- Group related changes; avoid noisy reformat-only commits unless isolated.
- PRs must include: clear description, rationale, screenshots or logs when UI/CLI behavior changes, and references to issues (e.g., `Closes #123`).
- Ensure CI passes: build, lint, and tests must be green.

## Security & Configuration Tips
- Never commit secrets. Use environment variables and `.env.example` for placeholders.
- Validate inputs and handle errors explicitly. Prefer least-privilege credentials for local testing.

## Agent-Specific Instructions
- When using automation agents, respect this guide and keep changes minimal and well-scoped. Update docs/tests alongside code. If structure differs from the defaults above, document paths in the PR.

