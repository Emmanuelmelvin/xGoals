# Contributing to XGoals

Thank you for helping make XGoals better. Contributions can include bug reports, product and design feedback, documentation, tests, accessibility improvements, security reviews, and code.

## Before you begin

- Search the existing [issues](https://github.com/Emmanuelmelvin/xGoals/issues) and pull requests before opening a duplicate.
- Open an issue before investing in a large feature, schema change, new dependency, or major interface redesign so the approach can be discussed.
- Keep security vulnerabilities private. Do not include exploit details in a public issue; contact Emmanuel Chidi privately through the repository owner’s GitHub profile.
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md) in all project spaces.

## Local setup

XGoals requires Node.js 22.12 or newer and pnpm.

1. Fork and clone the repository.
2. Run `pnpm install`.
3. Copy `.env.example` to `.env` when the local integration configuration is available.
4. Add local credentials without committing secrets.
5. Run `pnpm dev` and open `http://localhost:3000`.

See [README.md](README.md) for the product direction, architecture, and available development commands.

## Making a change

- Create a focused branch from the current default branch.
- Keep each pull request limited to one clear problem or feature.
- Keep the goal-centric workflow intact; avoid turning isolated actions into disconnected product surfaces.
- Enforce permissions and input validation on the server, even when the interface hides an action.
- Keep X client secrets, access tokens, and service credentials out of the browser and repository.
- Treat drafts, approvals, and published posts as distinct states.
- Add meaningful tests for security boundaries, persistent behavior, and regressions as the relevant infrastructure becomes available.
- Preserve accessibility: keyboard use, visible focus, useful labels, semantic elements, and reduced-motion behavior.
- Do not fabricate user experiences, copy other people’s posts, or add features that encourage spam or mass engagement.

## Checks

Run these before submitting a pull request:

```sh
pnpm typecheck
pnpm build
```

If a change needs a database, X API access, or another external service, explain how you verified it and which configuration the reviewer needs. Do not include credentials in logs, screenshots, test fixtures, or commits.

## Pull requests

Describe the concrete problem and resulting behavior. Include screenshots or a short recording for visible interface changes, migration notes for schema changes, and the checks you ran. Link the relevant issue when one exists.

Reviews focus on user impact, security, data access, maintainability, authenticity, accessibility, and performance. Maintainers may request changes, close work that does not fit the project, or ask to split an oversized pull request.

## License

By submitting a contribution, you agree that it may be distributed under the repository’s [GNU Affero General Public License version 3](LICENSE), identified by SPDX as `AGPL-3.0-only`. You confirm that you have the right to submit the contribution under that license.
