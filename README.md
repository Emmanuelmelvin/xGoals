# XGoals

A goal-driven AI agent that helps users maintain consistent presence on X within their niche.

## Overview

XGoals is an AI-powered content workspace where users define goals in plain English, and an agent works toward those goals by discovering relevant ideas, preparing post drafts, suggesting conversations, and tracking progress—all presented in a dashboard for review.

The user remains in control of publishing. The agent prepares the work; the user refines and approves it.

**Core product statement:**

> Set a goal. Deploy an agent. Stay active in your niche.

This is not a generic tweet generator, social media scheduler, or autonomous posting bot. It is a goal-driven content workspace powered by an AI agent.

## Features

- **Goal-centric workflow**: Define objectives in plain English with duration and success conditions
- **AI-powered agent**: Discovers relevant content, generates drafts, suggests conversations
- **Draft-first publishing**: User reviews and approves all content before publishing
- **X integration**: OAuth authentication and publishing via X API
- **Goal tracking**: Monitor progress against success conditions
- **Credits-based billing**: Pay-as-you-go model mapped to X API usage

## Tech Stack

- **Frontend/Backend**: TanStack Start
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth (X OAuth) + Better Auth (email)
- **Agent Framework**: Strands Agents SDK
- **Agent Runtime**: AWS AgentCore
- **LLM**: Amazon Bedrock (Claude, Llama)
- **X Integration**: X MCP (Model Context Protocol)
- **ORM**: Drizzle
- **Styling**: Tailwind v4

## Local Setup

Requires Node.js 22.12+ and pnpm.

1. Run `pnpm install`.
2. Copy `.env.example` to `.env` and configure:
   - `DATABASE_URL` - Supabase PostgreSQL connection string
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_ANON_KEY` - Supabase anonymous key
   - `SUPABASE_SERVICE_KEY` - Supabase service role key
   - `BETTER_AUTH_SECRET` - Generate with `openssl rand -hex 32`
   - `BETTER_AUTH_URL` - Your app URL (e.g., `http://localhost:3000`)
   - `X_CLIENT_ID` - X API client ID
   - `X_CLIENT_SECRET` - X API client secret
   - `AWS_REGION` - AWS region for AgentCore/Bedrock
   - `AWS_ACCESS_KEY_ID` - AWS access key
   - `AWS_SECRET_ACCESS_KEY` - AWS secret key
3. Run `pnpm db:migrate` to apply database migrations.
4. Run `pnpm dev` and open http://localhost:3000.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   USER BROWSER                        │
│  TanStack Start Frontend (React)                     │
└─────────────────────┬────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────┐          ┌─────────────────┐
│   SUPABASE    │          │   AGENTCORE     │
│               │          │                 │
│ - PostgreSQL  │          │ - Strands Agent │
│ - Auth        │          │ - X MCP         │
│ - Realtime    │          │ - Bedrock       │
│ - Storage     │          │                 │
└───────┬───────┘          └────────┬────────┘
        │                           │
        └───────────┬───────────────┘
                    ▼
            ┌──────────────┐
            │   X API      │
            │              │
            │ - OAuth      │
            │ - Publishing │
            └──────────────┘
```

## User Flow

1. **Sign in** - X OAuth or email (Better Auth)
2. **Onboard** - Provide niche, style preferences, example posts
3. **Create goal** - Define objective in plain English
4. **Deploy** - Agent begins working toward goal
5. **Review drafts** - Dashboard shows agent output
6. **Approve & publish** - User controls what goes to X
7. **Track progress** - Monitor success conditions

## Authentication

XGoals supports two authentication methods:

- **X OAuth**: Full access to X content and publishing capabilities
- **Email (Better Auth)**: Read-only access for users who want to browse without X connection

Both methods use Supabase for session management and row-level security.

## Credits System

XGoals uses a credits-based billing model:

- Purchase credits upfront
- Credits map to X API usage + AWS/LLM costs
- Pay only for what you use
- No surprise bills

## Development

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev

# Type check
pnpm typecheck

# Run tests
pnpm test

# Build for production
pnpm build
```

## Project Structure

```
src/
├── routes/              # TanStack Router file-based routes
│   ├── api.*.ts        # API endpoints
│   ├── app.tsx         # App layout
│   └── app.*.tsx       # App pages
├── server/
│   ├── db/
│   │   ├── schema.ts   # Drizzle schema
│   │   └── client.ts   # Database client
│   ├── auth.ts         # Auth configuration
│   ├── x-api.ts        # X API client
│   └── agentcore.ts    # AgentCore client
├── lib/
│   ├── contracts.ts    # Zod validation schemas
│   └── app-state.tsx   # Global state
├── components/
│   ├── app/            # App-specific components
│   └── ui/             # Reusable UI components
└── types/
    └── app.ts          # Shared TypeScript types
```

## Verification

```sh
pnpm typecheck
pnpm test
pnpm build
```

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request and follow the [Code of Conduct](CODE_OF_CONDUCT.md) in project spaces.

## License

XGoals isfree software licensed under the GNU Affero General Public License version 3 (AGPL-3.0-only), SPDX identifier `AGPL-3.0-only`. If you run a modified version over a network, section 13 requires offering its corresponding source to users who interact with it remotely. See [LICENSE](LICENSE) for details.
