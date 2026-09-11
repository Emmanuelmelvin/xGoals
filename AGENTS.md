# AGENTS.md

Project-specific guidance for AI coding agents.

## Frontend direction

- Use Tailwind CSS v4 directly with the Vite plugin.
- Keep the visual language calm, spacious, expressive, and product-led.
- Follow the xGoal palette: ink black, soft grey, electric blue, and white.
- Use semantic HTML and Tailwind utilities for layout, responsive behavior, and states.
- Prefer a small number of strong compositions over repeated card grids.
- The marketing homepage should feel like a brand page, not an admin dashboard.
- Use large type, generous whitespace, restrained borders, rounded product previews, and clear calls to action.
- Keep motion subtle and respect `prefers-reduced-motion`.
- Do not reintroduce a UI component framework for the frontend.

## Product principles

- The goal is the primary object.
- The user defines the outcome in plain English.
- The agent decides what work is useful.
- Drafts come before publishing.
- The user must approve every post before it reaches X.
- Keep user control, authenticity, relevance, originality, and privacy visible in the interface.

## Server boundary

- Do not add authentication, database access, X API calls, agent service calls, or publishing behavior while working on the static frontend unless explicitly requested.
- Keep the current `/app` page as a frontend placeholder until server work is requested.
- Never expose credentials or access tokens in browser code.

## Verification

Run these checks before finishing frontend work:

```sh
pnpm typecheck
pnpm build
```
