# xGoal local agent

This service runs the hackathon agent locally with Strands Agents SDK and Ollama.

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r agent\requirements.txt
ollama pull llama3.1
ollama serve
```

Start the agent service from the repository root:

```powershell
python -m uvicorn agent.main:app --host 127.0.0.1 --port 8000
```

Verify it:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```
