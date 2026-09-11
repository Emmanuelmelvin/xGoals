.PHONY: start stop stop-agent ollama agent model health install

PYTHON := .venv\Scripts\python.exe
PROVIDER ?= ollama
MODEL ?= llama3.2:1b

start:
	powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$$providerLine = Get-Content '.env' -ErrorAction SilentlyContinue | Where-Object { $$_ -match '^AI_PROVIDER=' } | Select-Object -First 1; $$provider = if ($$providerLine) { ($$providerLine -split '=',2)[1].Trim().Trim([char]34) } else { '$(PROVIDER)' }; $$env:AI_PROVIDER = $$provider; if ($$provider -eq 'ollama' -and -not (Get-NetTCPConnection -LocalPort 11434 -State Listen -ErrorAction SilentlyContinue)) { $$ollamaPath = Join-Path $$env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'; Start-Process -FilePath $$ollamaPath -ArgumentList 'serve' -WindowStyle Hidden; Start-Sleep -Seconds 3 }; if (-not (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue)) { $$pythonPath = (Resolve-Path '$(PYTHON)').Path; Start-Process -FilePath $$pythonPath -WorkingDirectory (Get-Location).Path -ArgumentList '-m','uvicorn','agent.main:app','--host','127.0.0.1','--port','8000' -WindowStyle Hidden; Start-Sleep -Seconds 3 }; Invoke-RestMethod 'http://127.0.0.1:8000/health' | ConvertTo-Json -Compress"

stop:
	powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "foreach ($$port in @(8000,11434)) { $$connection = Get-NetTCPConnection -LocalPort $$port -State Listen -ErrorAction SilentlyContinue; if ($$connection) { Stop-Process -Id $$connection.OwningProcess -Force } }"

stop-agent:
	powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$$connection = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue; if ($$connection) { Stop-Process -Id $$connection.OwningProcess -Force }"

ollama:
	powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "if (-not (Get-NetTCPConnection -LocalPort 11434 -State Listen -ErrorAction SilentlyContinue)) { $$ollamaPath = Join-Path $$env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'; Start-Process -FilePath $$ollamaPath -ArgumentList 'serve' -WindowStyle Hidden }; Invoke-RestMethod 'http://127.0.0.1:11434/'"

agent:
	powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& '$(PYTHON)' -m uvicorn agent.main:app --host 127.0.0.1 --port 8000"

model:
	powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$$ollamaPath = Join-Path $$env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'; & $$ollamaPath pull '$(MODEL)'"

health:
	powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-RestMethod 'http://127.0.0.1:11434/' ; Invoke-RestMethod 'http://127.0.0.1:8000/health' | ConvertTo-Json -Compress"

install:
	$(PYTHON) -m pip install -r agent\requirements-$(PROVIDER).txt
