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
   `POST /invocations` → `claim_next_run()` RPC first reaps stale runs
   (`reap_stale_runs()` for `running` >10m with no heartbeat, default timeout)
   then atomically picks the oldest due `running` workflow with no active run
   and opens a `workflow_runs` row (`queued → running`). Due = start passed,
   window unexpired.
3. Runner executes with the 7 tools (placeholder flow in v1, Strands agent in
   v2 — same tools unchanged).
4. Run closes `succeeded`/`failed` with `result_summary`; drafts, milestones,
   notifications, and credit spend are already written. If the agent crashes,
   the next `claim_next_run()` reaps the stuck `running` row to `failed` so the
   workflow is not permanently blocked (future: `heartbeat_at` column for tighter
   reaping; `pg_cron` every minute in prod).
5. User reviews in `/app/workflow/<id>/activities`: approve / edit / comment /
   reject per draft. Only `approved` rows may ever publish.

One run = one notification (`draft_ready`) but two timeline rows (run +
draft). The atomic claim (`FOR UPDATE SKIP LOCKED`) means poll ticks and
manual invokes can never double-run a workflow. `set search_path = ''` on
`claim_next_run`/`try_spend_credits`/`reap_stale_runs` is intentional
hardening for `SECURITY DEFINER`.

## Database pieces (Supabase migrations)

| Migration | What |
|---|---|
| `20260915000008_create_drafts.sql` | Adaptive drafts: 10 kinds (`post`, `reply`, `repost`, `dm`, `article`, `block`, `mute`, `follow`, `like`, `bookmark`), `content` + `payload` jsonb, status `draft → approved/rejected → published/failed`, anti-retarget trigger |
| `20260915000009_workflow_runs_summary.sql` | `result_summary` — the agent's short "why", shown in Activity |
| `20260915000010_agent_writer_role.sql` | Least-privilege role, exactly 5 tables + `try_spend_credits` / `reap_stale_runs` (below) |
| `20260915000011_claim_run.sql` | `claim_next_run()` atomic claim RPC (`SECURITY DEFINER`, `set search_path = ''`, `EXECUTE` to `agent_writer` only) |
| `20260915000012_draft_comments.sql` | Owner discussion on drafts (agent never writes here) |
| `20260915000013_agent_feedback_read.sql` | `SELECT` on comments for the agent (feedback loop) |
| `20260915000014_atomic_credit_spend.sql` | `try_spend_credits()` — per-owner `pg_advisory_xact_lock` so concurrent spends serialize (no overspend) |
| `20260915000015_reap_stale_runs.sql` | `reap_stale_runs()` + auto-reap inside `claim_next_run()` (10m timeout), `workflow_runs_status_started_at_idx` |
| `20260915000007_create_notifications.sql` | In-app notifications, server-side `read_at` |

## The `agent_writer` badge

NOLOGIN role, granted **exactly 5 tables** — nothing else, not even
`goals`/`goal_permissions` (context is injected via the job envelope):

- `drafts`: SELECT, INSERT, UPDATE (`status`, `error_message`)
- `notifications`: SELECT, INSERT (never marks read — users do)
- `workflow_runs`: full lifecycle columns only
- `workflows`: SELECT, UPDATE (`status`, `definition`) — can't rename/repoint
- `credit_ledger`: SELECT, INSERT (append-only, no UPDATE/DELETE ever) + `EXECUTE` on `try_spend_credits()` for atomic spend

Provisioning (IaC, not manual): the role is **NOLOGIN** in SQL; login is
enabled by infrastructure code (CDK/Terraform), not a hand-run
`ALTER ROLE ... WITH LOGIN`:

- **Secret**: `agent_writer/password` in Secrets Manager (generated, 32+ chars).
- **Rotation**: Secrets Manager rotation Lambda on a 30-day schedule. The
  Lambda does both: `UpdateSecret` + `ALTER ROLE agent_writer WITH PASSWORD '<new>'`
  in a single transaction, so secret and DB stay in sync. No human ever sees
  the password.
- **IaC** (CDK/Terraform) declares: the secret, the rotation Lambda + schedule,
  the `agent_writer` LOGIN wiring (via a `psql` custom resource or
  `postgresql` provider), and the AgentCore execution role that may `secretsmanager:GetSecretValue`.
  Apply = `cdk deploy` / `terraform apply`; no manual `psql` step. Local dev
  still uses `SET ROLE agent_writer` via the `grant agent_writer to service_role`
  path for testing without a password.
- **Runtime**: agent connects direct-Postgres (`AGENT_DATABASE_URL` from the
  secret). Through the Supabase shared pooler the username is
  `agent_writer.<project-ref>`. Service key stays break-glass admin only and
  never enters the agent loop.

## The 7 tools (`agent/tools.py`)

The ONLY way the model touches data. IDs come from the trusted `JobContext`
(built by the dispatcher, never the model); every input validated:

1. `load_job_context` — goal, milestones, skills, grants, balance, status
2. `save_draft` — always `status='draft'`; text kinds need words, action kinds need valid handle/post ID
3. `complete_milestone` — run milestones only; goal list untouched
4. `record_run_result` — closes the run with summary (failed → also `error_message`)
5. `send_notification` — informational only; in-app `/…` links or empty
6. `log_credit_spend` — atomic `try_spend_credits()` (`pg_advisory_xact_lock` per owner, no overspend); fails loudly when broke
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

**Resilience**: every X call is wrapped with explicit error classes:
  - **Token refresh**: on 401 / `invalid_token`, refresh via `offline.access` once,
    then retry. On refresh failure (revoked/expired), fail the draft with
    `error_message='X auth expired — reconnect'` and `send_notification(kind='info')`;
    never loop.
  - **Rate limits**: on 429, respect `x-rate-limit-reset` / `retry-after` and
    backoff (e.g., `sleep(reset - now) + jitter`). Reads back off and continue;
    writes back off and re-queue the draft as `failed` with `Retry-After` in
    `error_message` for the publisher to retry. No tight retry loops.
  - **Publisher retries**: `429`/`5xx` → exponential backoff with jitter
    (1s, 2s, 4s, cap 30s, max 3 attempts), then mark `failed`. `4xx` (other than
    401/429) → immediate `failed` (bad payload). Every publish writes
    `drafts.error_message` verbatim so the UI can show why.

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
- [ ] X read tools + approval-gated publisher (with token-refresh + rate-limit backoff, see below)
- [ ] Dispatcher on EventBridge cadence (local poll loop covers dev; prod adds `reap_stale_runs` pg_cron every minute)
- [x] `agent_writer` LOGIN provisioning as IaC + Secrets Manager rotation (was manual `ALTER ROLE`; now CDK/Terraform + rotation Lambda, `AGENT.md:54`)
- [x] Atomic credit spend + stuck-run reaper (`20260915000014`/`15`, `try_spend_credits` advisory lock, `claim_next_run` auto-reap)
- [ ] Apply migrations `…05`–`…15` to the hosted project
