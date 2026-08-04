---
outline: deep
editLink: true
skillName: dcc-backend
skillDescription: "Shared Python library dcc-backend-common for FastAPI services. Use when building or maintaining a DCC backend and needing its reusable modules: config (Pydantic AppConfig/LlmConfig), structlog logging, fastapi_health_probes (Kubernetes probes), fastapi_error_handling, usage_tracking, and the Pydantic AI llm_agent framework. Routes to the matching module reference."
---
# Backend Common

`dcc-backend-common` is our shared Python package that provides reusable components for building FastAPI-based backend services. It standardizes logging, configuration, health probes, and LLM integration across all our projects.

## Why Use It?

- **Consistency**: All services follow the same patterns for logging, config, and health checks
- **Less Boilerplate**: Common functionality is already implemented and tested
- **Best Practices**: Built-in support for Kubernetes, structured logging, and type safety
- **Faster Development**: Focus on business logic instead of infrastructure code
- **LLM Integration**: Comprehensive Pydantic AI agent framework with streaming and debugging support 

## Installation

Install the base package using [uv](https://docs.astral.sh/uv/):

```bash
uv add dcc-backend-common
```

For **LLM Agent** support, install the optional dependencies:

```bash
uv add dcc-backend-common[pydantic_ai]
```

## Quick Start

Here's a minimal FastAPI application using `dcc-backend-common`:

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from dcc_backend_common.config import AppConfig
from dcc_backend_common.logger import init_logger, get_logger
from dcc_backend_common.fastapi_health_probes import health_probe_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Initialize logging
    init_logger()
    
    # Load configuration
    config = AppConfig.from_env()

    # Inject error handler
    inject_api_error_handler(app)
    
    logger = get_logger(__name__)
    logger.info("Application started", config=str(config))
    
    yield
    
    logger.info("Application shutting down")


app = FastAPI(lifespan=lifespan)



# Add Kubernetes health probes
service_dependencies = [
    {
        "name": "database",
        "health_check_url": "http://postgres:5432/health",
        "api_key": None
    }
]
app.include_router(health_probe_router(service_dependencies))


@app.get("/")
async def root():
    return {"message": "Hello World"}
```

## Modules

| Module | Description |
|--------|-------------|
| [Configuration](/backend-common/config) | Type-safe configuration management with Pydantic and CLI tools |
| [Logger](/backend-common/logger) | Structured logging with structlog |
| [Health Probes](/backend-common/probes) | Kubernetes liveness, readiness, and startup probes |
| [Error Handler](/backend-common/error_handler) | Standardized API error handling |
| [Usage Tracking](/backend-common/usage_tracking) | Usage tracking for the application |
| [LLM Agent](/backend-common/llm_agent) | Pydantic AI agent framework with streaming, postprocessing, and debugging |

## Environment Variables

The package uses environment variables for configuration. Here are the common ones:

| Variable | Required | Description |
|----------|----------|-------------|
| `IS_PROD` | Yes | Set to `true` for production (enables JSON logging) |
| `LOG_LEVEL` | No | Logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`). Default: `INFO` |
| `DEV_TRACEBACK_STYLE` | No | Traceback style in dev mode (`focused` or `rich`). Default: `focused` |
| `LOGGER_USER_CODE_PATHS` | No | Comma-separated paths to consider as user code for focused tracebacks. Default: `dcc_backend_common,src/,app/,tests/` |

Module-specific environment variables are documented in their respective pages.

## Project Structure

When using `dcc-backend-common`, your project structure typically looks like:

```
my-service/
├── src/
│   └── my_service/
│       ├── __init__.py
│       ├── app.py              # FastAPI app with lifespan
│       ├── container.py        # Dependency injection
│       ├── utils/
│       │   └── app_config.py   # Custom AppConfig (extends AbstractAppConfig)
│       ├── routers/
│       ├── services/
│       └── models/
├── tests/
├── .env
├── .env.example
├── pyproject.toml
└── Dockerfile
```

## Best Practices

### 1. Initialize Once at Startup

Always initialize the logger and load configuration in the FastAPI lifespan handler:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_logger()  # Initialize logging first
    config = AppConfig.from_env()  # Then load config
    # ... rest of startup
    yield
```

### 2. Use Custom AppConfig

For project-specific configuration, extend `AbstractAppConfig`:

```python
from dcc_backend_common.config import AbstractAppConfig, get_env_or_throw

class AppConfig(AbstractAppConfig):
    # Add your project-specific fields
    my_custom_setting: str
    
    @classmethod
    def from_env(cls) -> "AppConfig":
        return cls(
            my_custom_setting=get_env_or_throw("MY_CUSTOM_SETTING"),
            # ...
        )
```

### 3. Register Health Probes

Always include health probes for Kubernetes deployments:

```python
app.include_router(health_probe_router(service_dependencies))
```

### 4. Use Structured Logging

Always use key-value pairs instead of string interpolation:

```python
logger.info("User created", user_id=user.id, email=user.email)
```

## Contributing to Backend Common

If you find yourself writing the same code across multiple FastAPI applications, consider adding it to `dcc-backend-common` for reuse.

### When to Add Code

Add code to `dcc-backend-common` when it is:

| Criteria | Example |
|----------|---------|
| **Used in 2+ projects** | A custom middleware, utility function, or base class |
| **Generic and reusable** | Not tied to specific business logic |
| **Well-tested** | Has unit tests and documentation |
| **Stable** | API is unlikely to change frequently |

### What Belongs Here

✅ **Good candidates:**
- FastAPI middleware (authentication, rate limiting, request logging)
- Base classes and protocols (abstract services, repository patterns)
- Utility functions (string normalization, date helpers, validation)
- Pydantic validators and custom types
- Common API response models

❌ **Does not belong:**
- Business logic specific to one application
- Project-specific configuration
- One-off scripts or experiments
- Code with external dependencies not needed by other projects

### How to Add Code

1. **Clone the repository:**

   ```bash
   git clone https://github.com/DCC-BS/dcc-backend-common.git
   cd dcc-backend-common
   ```

2. **Create a new module** in the appropriate location:

   ```
   src/dcc_backend_common/
   ├── config/           # Configuration utilities
   ├── logger/           # Logging utilities
   ├── fastapi_health_probes/  # Health check endpoints
   └── your_module/      # Your new module
       ├── __init__.py
       └── implementation.py
   ```

3. **Follow the existing patterns:**
   - Use type hints everywhere
   - Write Google-style docstrings
   - Export public APIs in `__init__.py`
   - Keep dependencies minimal

4. **Add tests** in the `tests/` directory

5. **Update documentation** in this documentation site

6. **Submit a pull request** with a clear description

### Module Structure

Each module should follow this structure:

```python
# src/backend_common/your_module/__init__.py
"""Your module description."""

from .implementation import YourClass, your_function

__all__ = ["YourClass", "your_function"]
```

```python
# src/backend_common/your_module/implementation.py
"""Implementation details."""

from typing import ...


class YourClass:
    """Brief description.
    
    Detailed description of what this class does and when to use it.
    
    Example:
        >>> obj = YourClass()
        >>> obj.do_something()
    """
    
    def do_something(self) -> str:
        """Do something useful.
        
        Returns:
            A useful result.
        """
        ...
```

## Source Code

The package source code is available on GitHub:

::: info Repository
[github.com/DCC-BS/backend-common](https://github.com/DCC-BS/backend-common)
:::