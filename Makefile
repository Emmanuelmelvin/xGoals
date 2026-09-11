.PHONY: start stop stop-agent ollama agent model health install

PYTHON := .venv\Scripts\python.exe
MODEL ?= llama3.2:1b

start:
	powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$$ollamaPath = Join-Path $$env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'; if (-not (Get-NetTCPConnection -LocalPort 11434 -State Listen -ErrorAction SilentlyContinue)) { Start-Process -FilePath $$ollamaPath -ArgumentList 'serve' -WindowStyle Hidden; Start-Sleep -Seconds 3 }; $$env:OLLAMA_HOST = 'http://127.0.0.1:11434'; $$env:OLLAMA_MODEL = '$(MODEL)'; if (-not (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue)) { $$pythonPath = (Resolve-Path '$(PYTHON)').Path; Start-Process -FilePath $$pythonPath -ArgumentList '-m','uvicorn','agent.main:app','--host','127.0.0.1','--port','8000' -WorkingDirectory (Get-Location).Path -WindowStyle Hidden; Start-Sleep -Seconds 3 }; Invoke-RestMethod 'http://127.0.0.1:8000/health' | ConvertTo-Json -Compress"

stop:
	powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "foreach ($$port in @(8000,11434)) { $$connection = Get-NetTCPConnection -LocalPort $$port -State Listen -ErrorAction SilentlyContinue; if ($$connection) { Stop-Process -Id $$connection.OwningProcess -Force } }"

stop-agent:
	powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$$connection = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue; if ($$connection) { Stop-Process -Id $$connection.OwningProcess -Force }"

ollama:
	powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "if (-not (Get-NetTCPConnection -LocalPort 11434 -State Listen -ErrorAction SilentlyContinue)) { $$ollamaPath = Join-Path $$env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'; Start-Process -FilePath $$ollamaPath -ArgumentList 'serve' -WindowStyle Hidden }; Invoke-RestMethod 'http://127.0.0.1:11434/'"

agent:
	powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$$env:OLLAMA_HOST = 'http://127.0.0.1:11434'; $$env:OLLAMA_MODEL = '$(MODEL)'; & '$(PYTHON)' -m uvicorn agent.main:app --host 127.0.0.1 --port 8000"

model:
	powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$$ollamaPath = Join-Path $$env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'; & $$ollamaPath pull '$(MODEL)'"

health:
	powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-RestMethod 'http://127.0.0.1:11434/' ; Invoke-RestMethod 'http://127.0.0.1:8000/health' | ConvertTo-Json -Compress"

install:
	$(PYTHON) -m pip install -r agent\requirements.txt
