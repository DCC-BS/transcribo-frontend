---
outline: deep
editLink: true
skillParent: dcc-backend
skillName: backend-config
skillDescription: "dcc_backend_common.config module for type-safe settings. Use when defining AppConfig/AbstractAppConfig/LlmConfig with Pydantic, loading env vars via get_env_or_throw, masking secrets with log_secret, or running the generate-env-example / sync-env-with-example CLI tools."
---
# Configuration Management

The `dcc_backend_common.config` module provides a robust, type-safe way to manage application configuration using Pydantic and environment variables.

## Overview

The module provides:

- **`AbstractAppConfig`**: Base class for creating custom configuration classes
- **`AppConfig`**: A ready-to-use configuration class with common settings
- **`LlmConfig`**: A base configuration class for LLM API settings
- **`get_env_or_throw()`**: Helper to retrieve required environment variables
- **`log_secret()`**: Helper to safely log sensitive values
- **`.env.example` Generator**: CLI tool to automatically generate environment variable templates
- **`.env` Sync Tool**: CLI tool to synchronize local `.env` with `.env.example`

## Installation

The config module is part of the `dcc-backend-common` package:

```bash
uv add dcc-backend-common
```

## Quick Start

Initialize the configuration **once** at your application's entry point (e.g., in `app.py`):

```python
from contextlib import asynccontextmanager

from dcc_backend_common.config import AppConfig
from fastapi import FastAPI


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    config = AppConfig.from_env()
    print(config)  # Secrets are automatically masked
    yield


app = FastAPI(lifespan=lifespan)
```

## Using the Built-in AppConfig

The package provides a default `AppConfig` class with commonly used settings:

```python
from dcc_backend_common.config import AppConfig

# Load configuration from environment variables
config = AppConfig.from_env()

# Access configuration values
print(config.client_url)
print(config.llm_url)
```

### Available Fields

| Field | Environment Variable | Description |
|-------|---------------------|-------------|
| `client_url` | `CLIENT_URL` | The URL for the client application |
| `hmac_secret` | `HMAC_SECRET` | The secret key for HMAC authentication |
| `openai_api_key` | `OPENAI_API_KEY` | The API key for authenticating with OpenAI |
| `llm_url` | `LLM_URL` | The URL for the LLM API |
| `docling_url` | `DOCLING_URL` | The URL for the Docling service |
| `whisper_url` | `WHISPER_URL` | The URL for the Whisper API |
| `ocr_url` | `OCR_URL` | The URL for the OCR API |

## Using LlmConfig

The module also provides `LlmConfig`, a base class specifically for LLM-related configuration. It is designed to be extended or used to type-check configuration objects passed to LLM agents.

::: tip
`LlmConfig` does not implement `from_env` by default. You should inherit from it to define how your specific environment variables are mapped, or instantiate it manually.
:::

### Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `llm_model` | `str` | The model identifier for the LLM API (e.g., `gpt-4o`) |
| `llm_url` | `str` | The URL for the LLM API endpoint |
| `llm_api_key` | `str` | The API key for authenticating with the LLM provider |

## Creating a Custom AppConfig

For project-specific configuration, create your own class by inheriting from `AbstractAppConfig`:

```python
# utils/app_config.py
import os
from typing import override

from dcc_backend_common.config import AbstractAppConfig, get_env_or_throw, log_secret
from pydantic import Field


class AppConfig(AbstractAppConfig):
    """Application configuration loaded from environment variables."""

    openai_api_key: str = Field(description="The API key for authenticating with OpenAI")
    llm_model: str = Field(description="The language model to use for text generation")
    client_url: str = Field(description="The URL for the client application")
    hmac_secret: str = Field(description="The secret key for HMAC authentication")

    # Optional with defaults
    optimizer_model: str = Field(
        default="gpt-4o-mini",
        description="Model to use for optimization",
    )
    debug_mode: bool = Field(
        default=False,
        description="Enable debug mode for verbose logging",
    )

    @classmethod
    @override
    def from_env(cls) -> "AppConfig":
        """Load configuration from environment variables."""
        # Required variables - will raise AppConfigError if missing
        openai_api_key = get_env_or_throw("OPENAI_API_KEY")
        llm_model = get_env_or_throw("LLM_MODEL")
        client_url = get_env_or_throw("CLIENT_URL")
        hmac_secret = get_env_or_throw("HMAC_SECRET")

        # Optional variables with defaults
        optimizer_model = os.getenv("OPTIMIZER_MODEL", "gpt-4o-mini")
        debug_raw = os.getenv("DEBUG_MODE", "false").lower()
        debug_mode = debug_raw in {"1", "true", "yes", "on"}

        return cls(
            openai_api_key=openai_api_key,
            llm_model=f"openai/{llm_model}",
            client_url=client_url,
            hmac_secret=hmac_secret,
            optimizer_model=f"openai/{optimizer_model}",
            debug_mode=debug_mode,
        )

    @override
    def __str__(self) -> str:
        """Return string representation with secrets masked."""
        return f"""
        AppConfig(
            client_url={self.client_url},
            llm_model={self.llm_model},
            openai_api_key={log_secret(self.openai_api_key)},
            hmac_secret={log_secret(self.hmac_secret)},
            optimizer_model={self.optimizer_model},
            debug_mode={self.debug_mode}
        )
        """
```

## Helper Functions

### get_env_or_throw

Use this for **required** environment variables. Raises `AppConfigError` if the variable is not set:

```python
from dcc_backend_common.config import get_env_or_throw

# Raises AppConfigError if OPENAI_API_KEY is not set
api_key = get_env_or_throw("OPENAI_API_KEY")
```

### log_secret

Use this to safely log sensitive values. Returns `"****"` for non-empty secrets and `"None"` for empty/null values:

```python
from dcc_backend_common.config import log_secret

# Safe to log - will print "****" instead of the actual key
print(f"API Key: {log_secret(config.openai_api_key)}")
```

## Generating .env.example

The module includes a CLI tool to automatically generate a `.env.example` file based on your Pydantic configuration class. This helps keep your environment documentation in sync with your code.

### Usage

Run the CLI script, providing the Python path to your config class:

```bash
generate-env-example \
    myapp.utils.app_config \
    AppConfig \
    -o .env.example
```
or with uvx
```bash
uvx --from dcc-backend-common generate-env-example
```

**Arguments:**

- `model_path`: The Python import path to the module (e.g., `myapp.utils.app_config`).
- `class_name`: The name of the Pydantic model class (e.g., `AppConfig`).
- `-o, --output`: The output file path (defaults to `.env.example`).

### Behavior

- **Required Fields**: Marked with `TODO` in the generated file.
- **Optional Fields**: Populated with their defined default values.
- **Descriptions**: Added as comments based on the `Field` description.
- **Exclusions**: Fields marked with `json_schema_extra={"exclude_from_env": True}` are skipped.

### Excluding Fields

If you have fields that should not appear in the environment file (e.g., constants or computed values), mark them for exclusion:

```python
internal_setting: str = Field(
    default="static_value",
    json_schema_extra={"exclude_from_env": True}
)
```

## Syncing .env with .env.example

To ensure your local `.env` file contains all variables defined in `.env.example`, you can use the `sync-env-with-example` CLI tool. This tool identifies missing variables in your local file and appends them, preserving comments and defaults.

### Usage

Run the tool to sync your environment files:

```bash
sync-env-with-example
```
or with uvx
```bash
uvx --from dcc-backend-common sync-env-with-example
```

**Options:**

- `--example-path`: Path to the `.env.example` file (default: `.env.example`).
- `--env-path`: Path to the `.env` file (default: `.env`).
- `-d, --dry-run`: Preview changes without modifying files.

### Behavior

1. **Missing Variables**: If variables exist in `.env.example` but are missing in `.env`, they are appended to `.env`.
2. **Extra Variables**: If variables exist in `.env` but not in `.env.example`, a warning is printed (they are not removed).
3. **Preservation**: Comments from `.env.example` are preserved when appending new variables.

### Example

```bash
# Check what would be changed without applying them
sync-env-with-example --dry-run

# Apply the changes
sync-env-with-example
```

## Best Practices

- **Do:** Place custom configuration in `utils/app_config.py`.
- **Do:** Use `get_env_or_throw()` for required environment variables.
- **Do:** Use `os.getenv()` with defaults for optional variables.
- **Do:** Never commit secrets to version control; use `.env` files locally.
- **Do:** Provide a `.env.example` with placeholder values. Use the included CLI tool to generate it automatically from your Pydantic model.
- **Do:** Use `sync-env-with-example` to keep your local development environment in sync with the template.
- **Do not:** Log sensitive values; use `log_secret()` to mask them.

### Example .env File

```bash
# .env.example
CLIENT_URL=http://localhost:3000
HMAC_SECRET=your-secret-here
OPENAI_API_KEY=sk-your-key-here
LLM_MODEL=gpt-4o
OPTIMIZER_MODEL=gpt-4o-mini
DEBUG_MODE=false
```

## Integration with Dependency Injection

When using [Dependency Injector](https://python-dependency-injector.ets-labs.org/), register the config as a singleton:

```python
# container.py
from dependency_injector import containers, providers

from myapp.utils.app_config import AppConfig


class Container(containers.DeclarativeContainer):
    config = providers.Singleton(AppConfig.from_env)

    # Other services can depend on config
    translation_service = providers.Factory(
        TranslationService,
        config=config,
    )
```

## Secrets Management

For production deployments, refer to the internal documentation on managing secrets in our Kubernetes ArgoCD GitOps environment.

## API Reference

::: tip Source Code
The full implementation is available on GitHub: [dcc_backend_common/config/app_config.py](https://github.com/DCC-BS/backend-common/blob/main/src/dcc_backend_common/config/app_config.py)
:::
