# xGoal

Set a goal. Deploy an agent. Stay active in your niche.

xGoal is a goal-driven AI content workspace for people who want to build a consistent, useful presence on X. Instead of asking for isolated posts, users describe an outcome in plain English. The agent then discovers relevant ideas, prepares drafts, suggests conversations, and tracks progress toward that goal.

The user remains in control. Every post is reviewed and approved before it is published.

## Why xGoal

xGoal is not a generic tweet generator, social media scheduler, or autonomous posting bot. The goal is the primary object: the user defines the outcome, and the agent chooses the next useful action.

The product is being developed around these principles:

- Quality and authenticity over volume
- Drafts before publishing
- Transparent agent reasoning and progress
- Least-privilege access to X
- No fabricated personal experiences or unsupported claims
- The user always controls publication

## MVP workflow

1. Sign in with X.
2. Share your niche, audience, expertise, and writing preferences.
3. Describe a goal in plain English.
4. Set its duration and success conditions.
5. Deploy the goal.
6. Review drafts and conversation suggestions in the dashboard.
7. Edit and approve content before publishing it to X.
8. Track progress until the goal is completed, paused, or cancelled.

## Planned capabilities

- Goal creation with structured success conditions
- Goal-centric dashboard and progress tracking
- Agent-generated original insights, technical explanations, and build-in-public updates
- Suggested replies and relevant conversations
- Draft review, editing, regeneration, rejection, and archiving
- Manual approval before publishing to X
- Activity history and goal completion summaries
- Pause, resume, and cancel controls

The repository is in early development. Some integrations described here—especially Supabase persistence, X OAuth/API access, and the separate agent service—are being built alongside the initial web experience.

## Architecture

The TanStack Start application is the user-facing frontend and backend. The agent runs as a separate service and communicates through persistent jobs and results in Supabase.

```text
User
  |
  v
TanStack Start application
  |  goals, dashboard, drafts, approval, publishing
  v
Supabase
  |  auth, PostgreSQL, row-level security, job state
  v
Separate agent service
  |  planning, research, draft generation, progress evaluation
  v
X API
```

## Tech stack

- Frontend and application backend: TanStack Start, React, and TypeScript
- Styling: Tailwind CSS v4
- Persistence and authentication: Supabase Auth and Supabase Postgres
- Agent runtime: a separate service using the configured LLM/agent infrastructure
- Social platform: X OAuth 2.0 and X API
- Database access: Drizzle, where used by the application layer

The agent and X credentials must remain server-side. Access tokens should be encrypted or protected with an equivalent secret-management approach.

## Local setup

Requirements:

- Node.js 22.12 or newer
- pnpm

Install dependencies and start the development server:

```sh
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

When environment configuration and database migrations are available, copy `.env.example` to `.env` and fill in the required values. Never commit credentials, OAuth client secrets, access tokens, or service keys.

## Development commands

```sh
pnpm dev        # Start the Vite development server
pnpm typecheck  # Run TypeScript checks
pnpm build      # Build the application
pnpm start      # Serve the production build
```

## Project structure

```text
src/
├── routes/       # TanStack Router routes and application pages
├── components/   # Reusable and product-specific UI components
├── server/       # Server-only integrations and persistence (as implemented)
├── lib/          # Shared contracts and application utilities
└── types/        # Shared TypeScript types
```

## Security and user control

xGoal must never publish content without explicit authorization. Draft generation, approval, and publication are separate states. User content, preferences, credentials, and drafts should be protected with server-side authorization and row-level security.

If you discover a security vulnerability, do not open a public issue with exploit details. Contact Emmanuel Chidi privately through the repository owner’s GitHub profile so the issue can be handled responsibly.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and follow the [Code of Conduct](CODE_OF_CONDUCT.md) before opening an issue or pull request.

## License

xGoal is free software licensed under the [MIT License](LICENSE), SPDX identifier `MIT`.

Copyright © 2026 Emmanuel Chidi.
