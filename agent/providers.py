"""Model-provider selection for the xGoal agent.

The provider is selected with AI_PROVIDER. Ollama is the local default so the
agent can still run without a hosted-model account.
"""

from __future__ import annotations

import os
import logging
from pathlib import Path
from typing import Any

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / ".env.local", override=True)


logger = logging.getLogger(__name__)

DEFAULT_PROVIDER = "ollama"
SUPPORTED_PROVIDERS = {"ollama", "bedrock", "openai", "groq"}


def get_provider_name() -> str:
    provider = (os.getenv("AI_PROVIDER") or os.getenv("MODEL_PROVIDER") or DEFAULT_PROVIDER).strip().lower()
    if provider not in SUPPORTED_PROVIDERS:
        supported = ", ".join(sorted(SUPPORTED_PROVIDERS))
        raise ValueError(f"Unsupported AI_PROVIDER '{provider}'. Choose one of: {supported}.")
    return provider


def get_model_name(provider: str | None = None) -> str:
    selected_provider = provider or get_provider_name()
    model_env_names = {
        "ollama": "OLLAMA_MODEL",
        "bedrock": "BEDROCK_MODEL_ID",
        "openai": "OPENAI_MODEL",
        "groq": "GROQ_MODEL",
    }
    defaults = {
        "ollama": "llama3.1",
        "bedrock": "global.anthropic.claude-sonnet-4-6",
        "openai": "gpt-5.4",
        "groq": "openai/gpt-oss-20b",
    }
    return os.getenv(model_env_names[selected_provider], defaults[selected_provider])


def _temperature() -> float:
    return float(os.getenv("AI_TEMPERATURE", "0.2"))


def _required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required when AI_PROVIDER is configured for this provider.")
    return value


def build_model() -> Any:
    provider = get_provider_name()
    model_id = get_model_name(provider)
    logger.info("Initializing model provider=%s model=%s", provider, model_id)

    try:
        if provider == "ollama":
            from strands.models.ollama import OllamaModel

            return OllamaModel(
                host=os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434"),
                model_id=model_id,
                temperature=_temperature(),
            )

        if provider == "bedrock":
            from strands.models.bedrock import BedrockModel

            config: dict[str, Any] = {
                "model_id": model_id,
                "temperature": _temperature(),
            }
            region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION")
            if region:
                config["region_name"] = region
            return BedrockModel(**config)

        from strands.models.openai import OpenAIModel

        if provider == "openai":
            api_key = _required_env("OPENAI_API_KEY")
            base_url = os.getenv("OPENAI_BASE_URL", "").strip()
        else:
            api_key = _required_env("GROQ_API_KEY")
            base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").strip()

        client_args: dict[str, str] = {"api_key": api_key}
        if base_url:
            client_args["base_url"] = base_url

        return OpenAIModel(
            client_args=client_args,
            model_id=model_id,
            params={
                "temperature": _temperature(),
                **(
                    {"response_format": {"type": "json_object"}}
                    if provider == "groq"
                    else {}
                ),
            },
        )
    except ImportError as error:
        requirements_file = f"requirements-{provider}.txt"
        raise RuntimeError(
            f"The '{provider}' provider is not installed. "
            f"Install it with: python -m pip install -r agent/{requirements_file}"
        ) from error


def provider_status() -> dict[str, str]:
    provider = get_provider_name()
    return {"provider": provider, "model": get_model_name(provider)}
