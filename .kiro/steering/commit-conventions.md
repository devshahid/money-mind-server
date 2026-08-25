# Commit Conventions & Semantic Versioning

This project uses **semantic-release** with the conventional-commits preset. The commit message (which, for squash-merged PRs, is the **PR title**) determines the next version. Always choose the commit type deliberately.

## How the type maps to the version bump

Given a current version `MAJOR.MINOR.PATCH`:

| Commit type | Example | Release |
| --- | --- | --- |
| `fix:` | `fix: reject duplicate ledger entry link` | **patch** (x.y.Z+1) |
| `perf:` | `perf: index ledger entries by clientId` | **patch** |
| `feat:` | `feat: add ledger sync endpoint` | **minor** (x.Y+1.0) |
| `feat!:` / `fix!:` / any `!` | `feat!: change ledger entry response schema` | **major** (X+1.0.0) |
| `BREAKING CHANGE:` footer | (see below) | **major** |
| `docs:` `chore:` `style:` `refactor:` `test:` `ci:` `build:` `revert:` | `chore: bump deps` | **no release** |

Note: `refactor:` and `style:` do NOT trigger a release under the default preset. If a refactor changes API behavior, it is really a `fix:` or `feat:`.


> **Note:** semantic-release uses the `conventionalcommits` preset (configured in `.releaserc.json`), so the `!` marker (e.g. `feat!:`, `fix(scope)!:`) triggers a **major** release on its own. The `BREAKING CHANGE:` footer is still supported and recommended for describing the migration.

## Breaking changes — how to flag

A breaking change bumps the **major** version. Signal it in EITHER (preferably both) of these ways:
1. Add `!` after the type/scope: `feat!: ...` or `feat(ledger)!: ...`
2. Add a footer:
   ```
   BREAKING CHANGE: <what broke and how to migrate>
   ```

## What counts as a breaking change in THIS repo (backend REST API)

Treat as breaking (major) when a change would break API clients or existing data:
- **API contract changes**: removing/renaming an endpoint, changing its HTTP method/path, removing or renaming a response field, changing a response field's type, or making a previously optional request field required.
- **Auth changes**: changing how authentication works (e.g., the `accessToken` header contract) or tightening required roles on an existing endpoint.
- **Database schema changes that are not backward-compatible**: dropping/renaming a field or collection, or adding a constraint/unique index that existing data violates and that requires a data migration to deploy safely (e.g., the ledger `(ledgerId, transactionId)` unique index). If a deploy REQUIRES running a migration script first, treat it as breaking and document the migration in the `BREAKING CHANGE:` footer.
- **Changing the meaning/units of an existing field** (e.g., amount from string to number) in an incompatible way.

NOT breaking (these are `feat`/`fix`/etc. without `!`):
- Adding a new endpoint, or adding an OPTIONAL request/response field.
- Additive, backward-compatible schema fields.
- Internal refactors, logging, or test changes with no API/data-contract impact.

## How Kiro should decide the commit message

When asked to commit, Kiro will:
1. Review the actual diff.
2. Pick the single most significant conventional type (`feat` if a new API capability/endpoint was added; `fix` if it corrects a bug; otherwise the fitting non-releasing type).
3. Assess breaking-change criteria above. If met, use `!` AND include a `BREAKING CHANGE:` footer describing the migration (including any required migration script).
4. Use an imperative, lowercase subject (the PR-title lint requires lowercase subject start).
5. Remember: for squash-merged PRs the **PR title** is what semantic-release analyzes — so the same rules apply to the PR title, not just local commits.

## Examples

- `feat(ledger): add settle-free duplicate-prevention on entry linking` → minor
- `fix(ledger): scope duplicate check to ledger clientId` → patch
- `feat(ledger)!: enforce unique (ledgerId, transactionId) index` + `BREAKING CHANGE: existing duplicate/settlement rows must be removed first via src/scripts/migrate-remove-ledger-settlement.ts before deploy` → major
- `chore(ci): run CI on pull requests` → no release
