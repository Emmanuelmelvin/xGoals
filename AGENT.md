# xGoal Agent Infrastructure Plan

How the AI agent is built, hosted, and constrained. The web app and the agent
never talk directly — Supabase sits between them: the app reads, the agent
writes, each with its own credentials.

## Architecture

```
User ──► TanStack app ──► Supabase ◄── Agent (AgentCore Runtime)
              (reads)      (queue)      (writes, service loop)
```

- **Web app** (`src/`): goals, workflows, drafts review, approvals, credits
  purchase, notifications bell. Uses the publishable key; sees only the
  signed-in user's rows (RLS).
- **Supabase**: auth, Postgres + RLS, and the job queue (`workflows` +
  `workflow_runs`). Source of truth for everything.
- **Agent** (`agent/`): FastAPI service (Strands SDK) deployed on **Amazon
  Bedrock AgentCore Runtime** (HTTP protocol). Polls for due work, runs it,
  writes results back. No inbound calls from the web app.

## The run lifecycle

1. User deploys a workflow → `workflows.status = 'running'` with a frozen
   `definition` (milestones, skills, permissions snapshot, run window).
2. Poll tick (every `AGENT_POLL_INTERVAL_SEC`, default 60s) or manual
   `POST /invocations` → `claim_next_run()` RPC atomically picks the oldest
   due `running` workflow with no active run and opens a `workflow_runs` row
   (`queued → running`). Due = start passed, window unexpired.
3. Runner executes with the 7 tools (placeholder flow in v1, Strands agent in
   v2 — same tools unchanged).
4. Run closes `succeeded`/`failed` with `result_summary`; drafts, milestones,
   notifications, and credit spend are already written.
5. User reviews in `/app/workflow/<id>/activities`: approve / edit / comment /
   reject per draft. Only `approved` rows may ever publish.

One run = one notification (`draft_ready`) but two timeline rows (run +
draft). The atomic claim (`FOR UPDATE SKIP LOCKED`) means poll ticks and
manual invokes can never double-run a workflow.

## Database pieces (Supabase migrations)

| Migration | What |
|---|---|
| `20260915000008_create_drafts.sql` | Adaptive drafts: 10 kinds (`post`, `reply`, `repost`, `dm`, `article`, `block`, `mute`, `follow`, `like`, `bookmark`), `content` + `payload` jsonb, status `draft → approved/rejected → published/failed`, anti-retarget trigger |
| `20260915000009_workflow_runs_summary.sql` | `result_summary` — the agent's short "why", shown in Activity |
| `20260915000010_agent_writer_role.sql` | Least-privilege role, exactly 5 tables (below) |
| `20260915000011_claim_run.sql` | `claim_next_run()` atomic claim RPC (`SECURITY DEFINER`, `EXECUTE` to `agent_writer` only) |
| `20260915000012_draft_comments.sql` | Owner discussion on drafts (agent never writes here) |
| `20260915000013_agent_feedback_read.sql` | `SELECT` on comments for the agent (feedback loop) |
| `20260915000007_create_notifications.sql` | In-app notifications, server-side `read_at` |

## The `agent_writer` badge

NOLOGIN role, granted **exactly 5 tables** — nothing else, not even
`goals`/`goal_permissions` (context is injected via the job envelope):

- `drafts`: SELECT, INSERT, UPDATE (`status`, `error_message`)
- `notifications`: SELECT, INSERT (never marks read — users do)
- `workflow_runs`: full lifecycle columns only
- `workflows`: SELECT, UPDATE (`status`, `definition`) — can't rename/repoint
- `credit_ledger`: SELECT, INSERT (append-only, no UPDATE/DELETE ever)

Provisioning (once, at deploy): `ALTER ROLE agent_writer WITH LOGIN
PASSWORD '…'` from Secrets Manager; agent connects direct-Postgres
(`AGENT_DATABASE_URL`). Through the shared pooler the username is
`agent_writer.<project-ref>`. Service key stays break-glass admin only.

## The 7 tools (`agent/tools.py`)

The ONLY way the model touches data. IDs come from the trusted `JobContext`
(built by the dispatcher, never the model); every input validated:

1. `load_job_context` — goal, milestones, skills, grants, balance, status
2. `save_draft` — always `status='draft'`; text kinds need words, action kinds need valid handle/post ID
3. `complete_milestone` — run milestones only; goal list untouched
4. `record_run_result` — closes the run with summary (failed → also `error_message`)
5. `send_notification` — informational only; in-app `/…` links or empty
6. `log_credit_spend` — balance-checked ledger append; fails loudly when broke
7. `read_feedback` — recent owner comments; feedback overrides house style

System prompt (`agent/prompt.py`) is feedback-first by default: every run
opens with `read_feedback`, honors notes over defaults, quotes which note it
obeyed. Authenticity rules: no fabricated experiences, no unsupported claims.

## X integration (direct API, no MCP)

X's hosted MCP was evaluated and rejected: single-user bridge auth doesn't
fit a multi-user server, it can't post tweets (our core action), and it
bypasses per-goal permission scoping. Instead:

- **Login**: Supabase X OAuth; per-user tokens encrypted server-side
  (Vault/Secrets Manager), refreshed via `offline.access`, never in browser.
- **Reads**: scoped tools call `api.x.com/2` (search, user lookup) with the
  run owner's token, only for granted scopes.
- **Writes**: triple-locked — agent writes drafts only → user approves →
  publisher sends approved text verbatim via `POST /2/tweets` after re-checking
  the `tweet.write` grant. The model is never in the room when posting happens.

## AgentCore Runtime deployment

- **Protocol**: HTTP (existing FastAPI + `GET /ping` → `{"status":"Healthy"}`).
  Stateless per-request; Supabase holds all state (no Memory service).
- **Container**: ARM64 only, port 8080, stdout logging, SIGTERM handling.
- **Flow**: build → ECR → `create-agent-runtime` (HTTP) →
  `create-agent-runtime-endpoint` → wait `READY` → test-invoke.
- **Model**: `AI_PROVIDER=bedrock`, `BEDROCK_MODEL_ID` inference profile;
  `maxTokens` set explicitly on every call (unset reserves max quota).
- **Secrets**: service/agent DB strings + provider keys in Secrets Manager,
  never env vars. Least-privilege execution role, endpoint authorizer, VPC
  for prod, KMS on log group, CloudTrail on control calls.
- **Scaling**: one invocation per claimed workflow; Runtime auto-scales
  instances. Concurrency capped by claim rate + `MAX_CONCURRENT_RUNS`.

## Cost profile

Dominant cost is Bedrock tokens (Sonnet ≈ $3/$15 per 1M in/out → ~$0.03/run
at 5k+1k tokens). Runtime compute is cents per hundred runs; supporting AWS
(secrets, KMS, logs) is single dollars. Funded by the credit ledger ($1 = 20
credits ≈ 1 credit/run). Guards: explicit `maxTokens`, concurrency cap,
prompt caching, budget alarms, tagged inference profiles.

## What remains

- [ ] Real brain: Strands agent over the 7 tools (placeholder runner proves the loop today)
- [ ] X read tools + approval-gated publisher
- [ ] Dispatcher on EventBridge cadence (local poll loop covers dev)
- [ ] `agent_writer` LOGIN provisioning + Secrets Manager wiring at deploy
- [ ] Apply migrations `…05`–`…13` to the hosted project
