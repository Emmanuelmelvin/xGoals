# xGoal local agent

This service runs the hackathon agent with the Strands Agents SDK. Ollama is the
default provider, and the provider can be selected through `AI_PROVIDER`.

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r agent\requirements-ollama.txt
ollama pull llama3.1
ollama serve
```

Install only the provider you want:

```powershell
python -m pip install -r agent\requirements-ollama.txt
python -m pip install -r agent\requirements-bedrock.txt
python -m pip install -r agent\requirements-openai.txt
python -m pip install -r agent\requirements-groq.txt
```

Set the provider in `.env`:

```env
AI_PROVIDER="ollama"
```

Use `bedrock`, `openai`, or `groq` for the other supported providers. Bedrock
uses the normal AWS credential chain or the `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` environment variables. Set
`BEDROCK_MODEL_ID` when you want a specific Bedrock model.

The agent logs to stdout. Set `AI_LOG_LEVEL="DEBUG"` for more detail. `make
start` opens a visible PowerShell window for the agent logs; use `make logs` to
run the agent in the current terminal instead.

Start the agent service from the repository root:

```powershell
python -m uvicorn agent.main:app --host 127.0.0.1 --port 8000
```

Verify it:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```
