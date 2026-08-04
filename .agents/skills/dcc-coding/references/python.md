---
outline: deep
description: Coding standards and best practices for Python projects.
editLink: true
skillParent: dcc-coding
skillName: python
skillDescription: "Python coding standards and conventions: type hints, Google-style docstrings, FastAPI routers/Pydantic models, Returns for functional error handling, HTTPX async clients, Dependency Injector, and UV/ruff/ty/pytest tooling. Covers code style, structure, and tooling rules (not the shared backend-common library modules). Use when writing or reviewing .py backend code."
---
# Python Coding Standards

These coding standards define how we write, organize, and maintain our **Python** projects.
By following them, we ensure our codebase remains **consistent, predictable, and easy to evolve**.

## Philosophy

Our primary goals are:

- **Consistency:** Every file should look and behave predictably across the project.
- **Clarity:** Code should express its intent clearly, without unnecessary complexity.
- **Type Safety:** Strong typing prevents subtle bugs and simplifies refactoring.
- **Maintainability:** Future developers should understand the system without relying on tribal knowledge.
- **AI-Friendly:** Clear code standards help Generative AI tools better understand and generate code that aligns with our project conventions.
- **Reusability:** Factor out common logic (logger setup, health probes, LLM usage) into reusable pip packages and use this code in the packages.

## Tooling

We use the following tools to maintain high quality and performance:

- **[Astral ty](https://docs.astral.sh/ty/):** For type checking.
- **[Astral uv](https://docs.astral.sh/uv/):** For Python package and project management.
- **[Astral ruff](https://docs.astral.sh/ruff/):** For linting and code formatting.
- **[HTTPX](https://www.python-httpx.org/):** For synchronous and asynchronous HTTP requests.
- **[Returns](https://github.com/dry-python/returns):** For making functions return something meaningful, typed, and safe.
- **[Dependency Injector](https://python-dependency-injector.ets-labs.org/):** For dependency injection.
- **FastAPI:** For API creation.

## General Principles

- **Do:** Optimize for **Python 3.13**.
- **Do:** Follow **[PEP 8](https://peps.python.org/pep-0008/)** style guide.
- **Do:** Write **docstrings** for modules, classes, and functions.
- **Do:** Write small functions that do one thing.
- **Do:** Write unit tests with as little mocking as possible.
- **Do:** Use the **Receive an Object, Return an Object (RORO)** pattern where appropriate.
- **Do not:** Have side effects in functions unless explicitly intended.
- **Do not:** Write unnecessary comments; code should be self-documenting.

## Docstrings

We use **[Google-style docstrings](https://google.github.io/styleguide/pyguide.html#38-comments-and-docstrings)** for all modules, classes, and functions.

- **Do:** Write a one-line summary that fits on one line.
- **Do:** Add a blank line after the summary if there are more sections.
- **Do:** Document all arguments, return values, and raised exceptions.
- **Do:** Use type hints in signatures; don't repeat types in docstrings.

```python
# ✅ Right - Google-style docstring
def translate_text(
    text: str,
    source_lang: str,
    target_lang: str,
    *,
    preserve_formatting: bool = True,
) -> TranslationResult:
    """Translate text from source language to target language.

    Uses the configured LLM to perform translation while optionally
    preserving the original formatting.

    Args:
        text: The text to translate.
        source_lang: ISO 639-1 language code of the source language.
        target_lang: ISO 639-1 language code of the target language.
        preserve_formatting: Whether to maintain original text formatting.

    Returns:
        A TranslationResult containing the translated text and metadata.

    Raises:
        ValueError: If source_lang or target_lang is not a valid language code.
        TranslationError: If the translation service fails.

    Example:
        >>> result = translate_text("Hello", "en", "de")
        >>> print(result.text)
        "Hallo"
    """
```

```python
# ✅ Right - Simple function with one-liner docstring
def get_user_by_id(user_id: str) -> User | None:
    """Retrieve a user by their unique identifier."""
    return user_repository.find_by_id(user_id)
```

```python
# ✅ Right - Class docstring
class TranslationService:
    """Service for translating text between languages.

    This service wraps the LLM-based translation logic and provides
    caching and rate limiting capabilities.

    Attributes:
        model: The LLM model identifier used for translations.
        cache_enabled: Whether translation caching is active.
    """

    def __init__(self, config: AppConfig) -> None:
        """Initialize the translation service.

        Args:
            config: Application configuration containing LLM settings.
        """
        self.model = config.llm_model
        self.cache_enabled = True
```

## Naming Conventions

- **Do:** Use `snake_case` for variables and functions.
- **Do:** Use `PascalCase` for classes.
- **Do:** Use `UPPER_CASE` for constants.
- **Do:** Use `lower_case` for modules.

```python
# ✅ Right
class ShoppingCart:
    def calculate_total(self, items: list[Item]) -> float:
        return sum(item.price for item in items)

MAX_RETRIES = 3

# ❌ Wrong
class shoppingCart:
    def calcTotal(self, Items):
        pass
```

## Code Style & Layout

- **Do:** Use **4 spaces** for indentation.
- **Do:** Limit line length to **120 characters** (configured in Ruff).
- **Do:** Use **f-strings** for string formatting.
- **Do:** Use `is` or `is not` for comparisons with `None`.

```python
# ✅ Right
name = "Alice"
greeting = f"Hello, {name}!"

if user is None:
    return

# ❌ Wrong
greeting = "Hello, " + name + "!"

if user == None:
    return
```

## Modern Python & Best Practices

- **Do:** Use **list comprehensions** for simple transformations.
- **Do:** Use `pathlib` over `os.path` for file system operations.
- **Do:** Use `enumerate` and `zip` for cleaner loops.
- **Do:** Use **Type Hints** everywhere, including for variables and return types.

```python
# ✅ Right
squares = [x**2 for x in range(10)]
path = Path("data/file.txt")

for i, item in enumerate(items):
    print(f"{i}: {item}")

# ❌ Wrong
squares = []
for x in range(10):
    squares.append(x**2)
path = os.path.join("data", "file.txt")
```

## Functions vs Classes

- **Do:** Prefer **functions** over classes for stateless operations.
- **Do:** Use **dataclasses** over regular classes for data containers.
- **Do:** Use classes when you need to maintain state or implement interfaces.
- **Do not:** Create classes with only `__init__` and one method—use a function instead.

```python
# ✅ Right - Use a function for stateless operations
def calculate_discount(price: float, discount_percent: float) -> float:
    """Calculate the discounted price."""
    return price * (1 - discount_percent / 100)


# ❌ Wrong - Unnecessary class for stateless operation
class DiscountCalculator:
    def calculate(self, price: float, discount_percent: float) -> float:
        return price * (1 - discount_percent / 100)
```

```python
# ✅ Right - Use dataclass for data containers
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class TranslationRequest:
    """Request payload for translation."""

    text: str
    source_lang: str
    target_lang: str
    preserve_formatting: bool = True


# ❌ Wrong - Regular class for simple data
class TranslationRequest:
    def __init__(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        preserve_formatting: bool = True,
    ) -> None:
        self.text = text
        self.source_lang = source_lang
        self.target_lang = target_lang
        self.preserve_formatting = preserve_formatting
```

**Dataclass best practices:**

- Use `frozen=True` for immutable data (prevents accidental mutation).
- Use `slots=True` for memory efficiency.
- Use `kw_only=True` for classes with many fields to enforce named arguments.

## Abstract Classes & Interfaces

Use `abc.ABC` and `typing.Protocol` to define interfaces and abstract base classes.

- **Do:** Use `Protocol` for structural subtyping (duck typing with type safety).
- **Do:** Use `ABC` when you need shared implementation or enforced inheritance.
- **Do:** Place abstract classes in a dedicated `interfaces/` or `protocols/` module, or alongside related code.

```python
# ✅ Right - Protocol for structural subtyping (preferred for interfaces)
from typing import Protocol


class Translatable(Protocol):
    """Interface for objects that can be translated."""

    def translate(self, target_lang: str) -> str:
        """Translate content to the target language."""
        ...


# Any class with a matching `translate` method satisfies this protocol
class Document:
    def translate(self, target_lang: str) -> str:
        return f"Translated to {target_lang}"


def process_translatable(item: Translatable) -> str:
    """Works with any object that has a translate method."""
    return item.translate("de")
```

```python
# ✅ Right - ABC for shared implementation
from abc import ABC, abstractmethod


class AbstractAppConfig(ABC):
    """Base configuration class with shared functionality."""

    @classmethod
    @abstractmethod
    def from_env(cls) -> "AbstractAppConfig":
        """Load configuration from environment variables."""
        ...

    @abstractmethod
    def __str__(self) -> str:
        """Return a string representation (with secrets masked)."""
        ...

    def validate(self) -> bool:
        """Shared validation logic for all configs."""
        return True
```

**When to use which:**

| Use Case | Choice |
|----------|--------|
| Define a contract/interface | `Protocol` |
| Shared implementation needed | `ABC` |
| Duck typing with type safety | `Protocol` |
| Enforce inheritance hierarchy | `ABC` |

## Error Handling & Exceptions

- **Do:** Handle errors and edge cases at the beginning of functions (guard clauses).
- **Do:** Use **early returns** to avoid nested `if/else` structures.
- **Do:** Catch **specific exceptions** (e.g., `ValueError`) rather than bare `except`.
- **Do:** Use **exception chaining** (`raise ... from e`) to preserve the original traceback.
- **Do:** Use **context managers** (`with` statement) for resource management.
- **Do not:** Use bare `except:` clauses; this masks unexpected errors (like `KeyboardInterrupt`).
- **Do not:** Suppress exceptions silently with `pass` unless absolutely necessary and documented.
- **Do not:** Log an exception and then re-raise it (double logging).

```python
# ✅ Right
def process_file(path: Path):
    try:
        with open(path, "r") as f:  # Context manager
            return json.load(f)
    except json.JSONDecodeError as e:
        logger.error("Invalid JSON format")
        raise DataError("Corrupt file") from e  # Exception chaining

# ❌ Wrong
def process_file_bad(path):
    try:
        f = open(path, "r")
        return json.load(f)
    except:  # Bare except
        logger.error("Something went wrong") # Double logging if re-raised
        raise
```

## Functional Error Handling (Returns)

We use the **[Returns](https://github.com/dry-python/returns)** library to make our functions return meaningful, typed, and safe values. This helps avoid side effects and makes error handling explicit.

### Result Container

Use `Result` (`Success` or `Failure`) for pure functions that can fail.

- **Do:** Return `Success(value)` for successful operations.
- **Do:** Return `Failure(exception)` for failed operations.
- **Do:** Use `@safe` decorator to automatically wrap functions that might raise exceptions.

```python
from returns.result import Result, Success, Failure, safe

@safe
def divide(a: int, b: int) -> float:
    return a / b

# Usage
result = divide(10, 2) # Success(5.0)
result = divide(10, 0) # Failure(ZeroDivisionError)

if isinstance(result, Success):
    print(f"Result: {result.unwrap()}")
else:
    print(f"Error: {result.failure()}")
```

### IO and IOResult

Use `IO` for functions with side effects and `IOResult` for impure functions that can fail.

- **Do:** Use `IOResult` for operations like HTTP requests or filesystem access.
- **Do:** Use `@impure_safe` to wrap impure functions.

```python
from returns.io import IOResult, impure_safe
import requests

@impure_safe
def fetch_user_data(user_id: int) -> dict:
    response = requests.get(f"https://api.example.com/users/{user_id}")
    response.raise_for_status()
    return response.json()
```

### Future and FutureResult

Use `Future` and `FutureResult` for asynchronous operations.

- **Do:** Use `FutureResult` for async operations that can fail (e.g., async HTTP calls).
- **Do:** Use `@future_safe` to wrap async functions.

```python
from returns.future import future_safe, FutureResult
import httpx

@future_safe
async def fetch_user_async(user_id: int) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.example.com/users/{user_id}")
        response.raise_for_status()
        return response.json()
```

### Pipelines and Composition

Use `flow`, `bind`, and `map` to compose functions without manual error checking.

```python
from returns.pipeline import flow
from returns.pointfree import bind

def process_user(user_id: int) -> FutureResult:
    return flow(
        user_id,
        fetch_user_async,
        bind(validate_user),
        bind(save_user_locally)
    )
```

## Imports

- **Do:** Group imports: Standard Library first, then Third Party, then Local Application.
- **Do not:** Use wildcard imports (`from module import *`).

```python
# ✅ Right
import sys
from pathlib import Path

import requests

from myapp.utils import helper

# ❌ Wrong
from myapp.utils import *
```

## Async/Await Patterns

Since we use **FastAPI**, understanding async patterns is essential for building performant APIs.

### When to Use Async

- **Do:** Use `async def` for I/O-bound operations (HTTP calls, database queries, file I/O).
- **Do:** Use regular `def` for CPU-bound operations (they run in a thread pool in FastAPI).
- **Do not:** Mix blocking calls inside async functions without proper handling.

```python
# ✅ Right - Async for I/O-bound operations
async def fetch_translation(text: str, target_lang: str) -> str:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.translation.com/translate",
            json={"text": text, "target": target_lang},
        )
        return response.json()["translation"]


# ✅ Right - Regular def for CPU-bound (FastAPI handles threading)
def compute_similarity(text_a: str, text_b: str) -> float:
    # CPU-intensive operation
    return calculate_levenshtein_distance(text_a, text_b)
```

### Running Concurrent Tasks

Use `asyncio.gather` or `asyncio.TaskGroup` for concurrent operations:

```python
import asyncio


# ✅ Right - Concurrent execution with gather
async def translate_batch(texts: list[str], target_lang: str) -> list[str]:
    tasks = [fetch_translation(text, target_lang) for text in texts]
    return await asyncio.gather(*tasks)


# ✅ Right - TaskGroup for structured concurrency (Python 3.11+)
async def process_documents(doc_ids: list[str]) -> list[Document]:
    results: list[Document] = []
    async with asyncio.TaskGroup() as tg:
        for doc_id in doc_ids:
            tg.create_task(fetch_and_process(doc_id, results))
    return results
```

### Async Context Managers

```python
from contextlib import asynccontextmanager


@asynccontextmanager
async def get_db_session():
    """Async context manager for database sessions."""
    session = await create_session()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()


# Usage
async def save_translation(translation: Translation) -> None:
    async with get_db_session() as session:
        session.add(translation)
```

### Avoiding Common Pitfalls

```python
# ❌ Wrong - Blocking call in async function
async def bad_fetch():
    response = requests.get("https://api.example.com")  # Blocks the event loop!
    return response.json()


# ✅ Right - Use async HTTP client
async def good_fetch():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com")
        return response.json()


# ❌ Wrong - Sequential when could be concurrent
async def slow_batch():
    result1 = await fetch_data(1)
    result2 = await fetch_data(2)  # Waits for result1 unnecessarily
    return [result1, result2]


# ✅ Right - Concurrent execution
async def fast_batch():
    return await asyncio.gather(fetch_data(1), fetch_data(2))
```

## HTTP Clients (HTTPX)

We use **[HTTPX](https://www.python-httpx.org/)** as our primary HTTP client. It provides a modern, fully featured API for both synchronous and asynchronous requests.

### Sync vs Async Usage

**Always prefer `AsyncClient` (async) over `Client` (sync)** whenever possible, as it provides better scalability and allows for concurrent execution without blocking.

Choose the appropriate client based on your execution context:

- **Use `httpx.Client`** for synchronous code, scripts, or when performing sequential requests in a blocking environment.
- **Use `httpx.AsyncClient`** for asynchronous code, especially within FastAPI routers or when you need to perform multiple requests concurrently.

```python
# ✅ Right - Synchronous usage
import httpx

def fetch_data_sync(url: str) -> dict:
    """Fetch data from a URL synchronously."""
    with httpx.Client(timeout=10.0) as client:
        response = client.get(url)
        response.raise_for_status()
        return response.json()


# ✅ Right - Asynchronous usage
import httpx

async def fetch_data_async(url: str) -> dict:
    """Fetch data from a URL asynchronously."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.json()
```

### Best Practices

- **Do: Reuse client instances.** Creating a new client for every request is expensive as it requires setting up a new connection pool and SSL context. In services, inject the client or manage it as a long-lived object.
- **Do: Always use context managers.** Use `with` or `async with` to ensure connections are properly closed and returned to the pool.
- **Do: Set explicit timeouts.** Never use default timeouts (which can be infinite in some clients). Always specify a reasonable timeout for your use case.
- **Do: Use `response.raise_for_status()`.** This ensures that HTTP errors (4xx and 5xx) are raised as exceptions, preventing your code from proceeding with invalid data.
- **Do: Enable HTTP/2 for performance.** If the server supports it, HTTP/2 can significantly improve performance through multiplexing.
- **Do: Configure limits for high-concurrency.** Use `httpx.Limits` to control the maximum number of open connections and keep-alive connections.

```python
# ✅ Right - Efficient concurrent requests with shared client
import asyncio
import httpx

async def fetch_all(urls: list[str]) -> list[dict]:
    """Fetch data from multiple URLs concurrently using a single client."""
    # Configure limits and timeouts globally for the client
    limits = httpx.Limits(max_connections=100, max_keepalive_connections=20)
    timeout = httpx.Timeout(10.0, connect=5.0)

    async with httpx.AsyncClient(timeout=timeout, limits=limits, http2=True) as client:
        tasks = [client.get(url) for url in urls]
        responses = await asyncio.gather(*tasks)

        for response in responses:
            response.raise_for_status()

        return [response.json() for response in responses]
```

- **Do not: Mix sync and async clients.** Avoid using `httpx.Client` inside `async def` functions, as it will block the event loop. Use `httpx.AsyncClient` instead.
- **Do not: Create clients in "hot loops".** Move client instantiation outside of loops that perform many requests.

## Dependency Injection

- **Do:** Use **[Dependency Injector](https://python-dependency-injector.ets-labs.org/introduction/di_in_python.html)** to manage dependencies.
- **Do:** Define containers and providers in `container.py`.
- **Do:** Use dependency injection to decouple components and invert control.

**Why:**

- **Flexibility:** Components are loosely coupled. You can easily extend or change the functionality of a system by combining components in different ways.
- **Testability:** Testing is easier because you can easily inject mocks instead of real objects that use APIs or databases.
- **Clearness and Maintainability:** Dependency injection makes dependencies explicit. "Explicit is better than implicit" (PEP 20). It provides an overview and control of the application structure in one place.

## Configuration Management

We use `.env` files for environment-specific configuration and a Pydantic-based `AppConfig` class from the `backend_common` package.

::: tip Full Documentation
For detailed documentation on configuration management, including how to use the built-in `AppConfig` or create custom configurations, see the [backend-common Configuration Guide](/backend-common/config).
:::

**Quick summary:**

- **Do:** Place configuration in `utils/app_config.py`.
- **Do:** Use `get_env_or_throw()` for required environment variables.
- **Do:** Use `os.getenv()` with defaults for optional variables.
- **Do:** Never commit secrets to version control; use `.env` files locally.
- **Do:** Provide a `.env.example` with placeholder values.
- **Do not:** Log sensitive values; use `log_secret()` to mask them.

## Logging

We use **[structlog](https://www.structlog.org/)** via `backend_common.logger` for structured, consistent logging across all services.

::: tip Implementation Guide
For setup instructions and API reference on using the `backend_common.logger` module, see the [backend-common Logger Guide](/backend-common/logger).
:::

### Log Levels

| Level | When to Use |
|-------|-------------|
| `DEBUG` | Detailed diagnostic information (disabled in production) |
| `INFO` | General operational events (request received, task completed) |
| `WARNING` | Unexpected situations that don't prevent operation |
| `ERROR` | Errors that prevent a specific operation from completing |
| `CRITICAL` | System-wide failures requiring immediate attention |

### Best Practices

- **Do:** Use structured logging with key-value pairs, not string interpolation.
- **Do:** Include contextual information (request IDs, user IDs, operation names).
- **Do:** Log at appropriate levels (don't log expected errors as ERROR).
- **Do not:** Log sensitive data (passwords, API keys, PII, tokens).
- **Do not:** Log and re-raise exceptions (causes duplicate log entries).

```python
# ✅ Right - Structured logging
logger.info("User authenticated", user_id=user.id, method="oauth")

# ❌ Wrong - String interpolation
logger.info(f"User {user.id} authenticated via oauth")

# ❌ Wrong - Logging sensitive data
logger.info("API call", api_key=config.api_key)  # NEVER DO THIS!

# ✅ Right - Mask secrets if needed for debugging
logger.debug("API configured", api_key=log_secret(config.api_key))
```

## Folder Structure

**Do:** Organize projects using the following structure:

```
root/
 ├─ .github/             # Workflow and CI/CD
 ├─ src/
 │   └─ PROJECT_NAME/    # Source code directory
 │       ├─ __init__.py
 │       ├─ app.py
 │       ├─ container.py # Dependency injection container
 │       ├─ py.typed
 │       ├─ models/
 │       ├─ routers/
 │       ├─ services/
 │       └─ utils/
 ├─ tests/
 │   ├─ integration/     # Integration tests
 │   └─ unit/            # Unit tests
 ├─ scripts/             # Scripts for DB init, dataset prep, etc.
 ├─ .env
 ├─ .env.example
 ├─ .gitignore
 ├─ .pre-commit-config.yaml
 ├─ .python-version
 ├─ docker-compose.yml
 ├─ Dockerfile
 ├─ LICENSE
 ├─ Makefile
 ├─ pyproject.toml
 ├─ README.md
 └─ renovate.json
```

## Dependency Management

- **Do:** Use `pyproject.toml` for dependency management.
- **Do:** Use dependency groups to separate development dependencies from production ones to keep Docker images small.
- **Do:** Define scripts in `[project.scripts]` for tasks like data preparation or model training.

### Dependency Cooldowns

To prevent instability, catch potential regressions, and **mitigate supply chain attacks**, we use **dependency cooldowns**. This ensures that we only update to new package versions after they have been available for a certain period, allowing time for malicious or buggy releases to be identified and retracted by the community.

We configure this using `uv` in `pyproject.toml` (see [uv documentation](https://docs.astral.sh/uv/concepts/resolution/#dependency-cooldowns)):

```toml
[tool.uv]
# Global cooldown: ignore releases newer than 1 week
exclude-newer = "1 week"

# Override for specific internal packages (e.g., 1 day cooldown)
exclude-newer-package = { dcc-backend-common = "P1D" }
```

Example `pyproject.toml` snippet for scripts:

```toml
[project.scripts]
optimize-translation = "bs_translator_backend.scripts.optimize_llm:main"
prepare-dataset = "bs_translator_backend.scripts.prepare_dataset:main"
```

## Data Structures

Choose the right data structure based on your use case:

| Structure | Use Case | Validation | Immutable |
|-----------|----------|------------|-----------|
| `Pydantic BaseModel` | API input/output, configuration, external data | ✅ Yes | Optional |
| `dataclass` | Internal data containers, no validation needed | ❌ No | Optional |
| `TypedDict` | Dict-like data with type hints (JSON responses) | ❌ No | N/A |

### Pydantic Models

Use Pydantic for API request/response models and any data that needs validation:

```python
from pydantic import BaseModel, Field, field_validator


class TranslationRequest(BaseModel):
    """Request payload for translation endpoint."""

    text: str = Field(..., min_length=1, max_length=10000, description="Text to translate")
    source_lang: str = Field(..., pattern=r"^[a-z]{2}$", description="ISO 639-1 source language")
    target_lang: str = Field(..., pattern=r"^[a-z]{2}$", description="ISO 639-1 target language")
    preserve_formatting: bool = Field(default=True, description="Maintain original formatting")

    @field_validator("target_lang")
    @classmethod
    def target_must_differ_from_source(cls, v: str, info) -> str:
        if v == info.data.get("source_lang"):
            raise ValueError("Target language must differ from source language")
        return v


class TranslationResponse(BaseModel):
    """Response payload for translation endpoint."""

    translated_text: str
    source_lang: str
    target_lang: str
    confidence: float = Field(..., ge=0.0, le=1.0)
```

### Dataclasses

Use dataclasses for internal data structures that don't need validation:

```python
from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class TranslationMetrics:
    """Internal metrics for translation operations."""

    tokens_used: int
    processing_time_ms: float
    cache_hit: bool = False


@dataclass(slots=True)
class TranslationContext:
    """Mutable context passed through translation pipeline."""

    request_id: str
    user_id: str
    translations: list[str] = field(default_factory=list)

    def add_translation(self, text: str) -> None:
        self.translations.append(text)
```

### TypedDict

Use TypedDict for typing dict-like structures (e.g., JSON responses from external APIs):

```python
from typing import TypedDict, NotRequired


class OpenAIMessage(TypedDict):
    """Structure of an OpenAI chat message."""

    role: str
    content: str


class OpenAIResponse(TypedDict):
    """Structure of an OpenAI API response."""

    id: str
    choices: list[dict]
    usage: NotRequired[dict]  # Optional field


def parse_openai_response(data: OpenAIResponse) -> str:
    """Extract content from OpenAI response."""
    return data["choices"][0]["message"]["content"]
```

## API Design Patterns

Best practices for designing FastAPI endpoints.

### Request/Response Naming

- **Do:** Use descriptive names: `CreateUserRequest`, `UserResponse`, `UpdateUserRequest`.
- **Do:** Keep request and response models separate (even if similar).

```python
# models/user.py
from pydantic import BaseModel, EmailStr, Field


class CreateUserRequest(BaseModel):
    """Request to create a new user."""

    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(default="user")


class UpdateUserRequest(BaseModel):
    """Request to update an existing user."""

    name: str | None = None
    role: str | None = None


class UserResponse(BaseModel):
    """User data returned by the API."""

    id: str
    email: str
    name: str
    role: str
    created_at: datetime
```

### Router Organization

```python
# routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status

from myapp.models.user import CreateUserRequest, UserResponse, UpdateUserRequest
from myapp.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: CreateUserRequest,
    user_service: UserService = Depends(),
) -> UserResponse:
    """Create a new user account."""
    return await user_service.create(request)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    user_service: UserService = Depends(),
) -> UserResponse:
    """Retrieve a user by ID."""
    user = await user_service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    user_service: UserService = Depends(),
) -> UserResponse:
    """Update an existing user."""
    return await user_service.update(user_id, request)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    user_service: UserService = Depends(),
) -> None:
    """Delete a user account."""
    await user_service.delete(user_id)
```

### Error Responses

Use consistent error response format across all endpoints:

```python
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Standard error response format."""

    detail: str
    code: str | None = None
    field: str | None = None


# Usage in exception handlers
@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            detail=str(exc),
            code="VALIDATION_ERROR",
        ).model_dump(),
    )
```

### HTTP Status Codes

| Operation | Success | Common Errors |
|-----------|---------|---------------|
| `POST` (create) | `201 Created` | `400`, `409 Conflict` |
| `GET` (read) | `200 OK` | `404 Not Found` |
| `PATCH/PUT` (update) | `200 OK` | `404`, `400` |
| `DELETE` | `204 No Content` | `404` |

## Testing

We use **[pytest](https://docs.pytest.org/)** as our testing framework with native pytest assertions.

### Test Organization

- **Do:** Place tests in the `tests/` directory.
- **Do:** Separate **unit** tests (fast, run in CI/CD) from **integration** tests (slower, excluded from CI/CD, used locally).
- **Do:** Run unit tests in the CI/CD pipeline.
- **Do:** Mirror the source structure in tests (e.g., `src/myapp/services/translator.py` → `tests/unit/services/test_translator.py`).

### Test Naming

- **Do:** Name test files with `test_` prefix: `test_<module_name>.py`
- **Do:** Name test functions descriptively: `test_<function>_<scenario>_<expected_result>`

```python
# ✅ Right - Descriptive test names
def test_translate_text_with_valid_input_returns_translation():
    ...

def test_translate_text_with_empty_string_raises_value_error():
    ...

def test_translate_text_with_unsupported_language_raises_translation_error():
    ...


# ❌ Wrong - Vague test names
def test_translate():
    ...

def test_error():
    ...
```

### Writing Tests

- **Do:** Use native `assert` statements (pytest provides detailed failure messages).
- **Do:** Use `pytest.raises` for testing exceptions.
- **Do:** Use `pytest.mark.parametrize` for testing multiple inputs.
- **Do:** Write tests with minimal mocking; prefer real objects when possible.
- **Do:** Use fixtures for shared setup.

```python
import pytest
from myapp.services.translator import translate_text, TranslationError


# ✅ Right - Simple test with assert
def test_translate_text_returns_correct_translation():
    result = translate_text("Hello", source_lang="en", target_lang="de")

    assert result.text == "Hallo"
    assert result.source_lang == "en"
    assert result.target_lang == "de"


# ✅ Right - Testing exceptions
def test_translate_text_with_invalid_language_raises_error():
    with pytest.raises(ValueError, match="Invalid language code"):
        translate_text("Hello", source_lang="en", target_lang="invalid")


# ✅ Right - Parameterized tests for multiple scenarios
@pytest.mark.parametrize(
    ("input_text", "expected"),
    [
        ("Hello", "Hallo"),
        ("Goodbye", "Auf Wiedersehen"),
        ("Thank you", "Danke"),
    ],
)
def test_translate_text_handles_common_phrases(input_text: str, expected: str):
    result = translate_text(input_text, source_lang="en", target_lang="de")
    assert result.text == expected
```

### Fixtures

- **Do:** Use fixtures for reusable test setup.
- **Do:** Define shared fixtures in `conftest.py`.
- **Do:** Use factory fixtures for creating test data with variations.

```python
# conftest.py
import pytest
from myapp.container import Container


@pytest.fixture
def app_config():
    """Provide test configuration."""
    return AppConfig(
        openai_api_key="test-key",
        llm_model="gpt-4o-mini",
        # ... other test values
    )


@pytest.fixture
def translation_service(app_config):
    """Provide a configured translation service."""
    container = Container()
    container.config.override(app_config)
    return container.translation_service()


# Factory fixture for flexible test data
@pytest.fixture
def make_translation_request():
    """Factory for creating translation requests with defaults."""

    def _make(
        text: str = "Hello",
        source_lang: str = "en",
        target_lang: str = "de",
    ) -> TranslationRequest:
        return TranslationRequest(
            text=text,
            source_lang=source_lang,
            target_lang=target_lang,
        )

    return _make


# Using the factory fixture
def test_translate_with_factory(translation_service, make_translation_request):
    request = make_translation_request(text="Good morning")
    result = translation_service.translate(request)
    assert result.text is not None
```

### Async Tests

Use `pytest-asyncio` for testing async code:

```python
import pytest


@pytest.mark.asyncio
async def test_async_translate_returns_result():
    result = await async_translate("Hello", target_lang="de")
    assert result.text == "Hallo"


@pytest.mark.asyncio
async def test_async_translate_with_timeout_raises_error():
    with pytest.raises(TimeoutError):
        await async_translate("Hello", target_lang="de", timeout=0.001)
```

## Versioning

We use **[Semantic Versioning (SemVer)](https://semver.org/)** for all packages and services.

Format: `MAJOR.MINOR.PATCH` (e.g., `2.1.0`)

| Component | When to Increment |
|-----------|-------------------|
| `MAJOR` | Breaking changes (incompatible API changes) |
| `MINOR` | New features (backwards-compatible) |
| `PATCH` | Bug fixes (backwards-compatible) |

- **Do:** Define version in `pyproject.toml` under `[project]`.
- **Do:** Tag releases in Git with `v` prefix (e.g., `v2.1.0`).
- **Do:** Update version before merging to main/production.

```toml
# pyproject.toml
[project]
name = "my-service"
version = "2.1.0"
```

## Decorators

Decorators are useful for cross-cutting concerns like logging, timing, retries, and caching.

- **Do:** Place reusable decorators in `utils/decorators.py`.
- **Do:** Use `functools.wraps` to preserve function metadata.
- **Do:** Keep decorators simple and single-purpose.

```python
# utils/decorators.py
import functools
import time
from typing import Callable, ParamSpec, TypeVar

from backend_common.logger import get_logger

logger = get_logger(__name__)

P = ParamSpec("P")
R = TypeVar("R")


def log_execution_time(func: Callable[P, R]) -> Callable[P, R]:
    """Log the execution time of a function."""

    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        logger.info(f"{func.__name__} executed", duration_ms=elapsed * 1000)
        return result

    return wrapper


def retry(max_attempts: int = 3, delay: float = 1.0):
    """Retry a function on failure with exponential backoff."""

    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            last_exception: Exception | None = None
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        time.sleep(delay * (2**attempt))
            raise last_exception  # type: ignore

        return wrapper

    return decorator


# Usage
@log_execution_time
@retry(max_attempts=3)
def fetch_remote_data(url: str) -> dict:
    ...
```

## Context Managers

Use context managers for resource management (files, connections, locks, transactions).

- **Do:** Place reusable context managers in `utils/context_managers.py`.
- **Do:** Use `contextlib.contextmanager` for simple cases.
- **Do:** Use `contextlib.asynccontextmanager` for async resources.

```python
# utils/context_managers.py
from contextlib import contextmanager, asynccontextmanager
from typing import Generator
import time

from backend_common.logger import get_logger

logger = get_logger(__name__)


@contextmanager
def timed_operation(name: str) -> Generator[None, None, None]:
    """Log the duration of an operation."""
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        logger.info(f"{name} completed", duration_ms=elapsed * 1000)


@contextmanager
def temporary_env_var(key: str, value: str) -> Generator[None, None, None]:
    """Temporarily set an environment variable."""
    import os

    original = os.environ.get(key)
    os.environ[key] = value
    try:
        yield
    finally:
        if original is None:
            del os.environ[key]
        else:
            os.environ[key] = original


# Usage
with timed_operation("translation"):
    result = translate(text)

with temporary_env_var("DEBUG", "true"):
    run_debug_operation()
```

## Constants & Enums

- **Do:** Place module-level constants at the top of the file, after imports.
- **Do:** Place shared constants in `utils/constants.py`.
- **Do:** Use `Enum` or `StrEnum` for related constants with type safety.

```python
# utils/constants.py
from enum import StrEnum


# Simple constants
DEFAULT_TIMEOUT_SECONDS = 30
MAX_RETRIES = 3
SUPPORTED_LANGUAGES = frozenset({"en", "de", "fr", "es", "it"})


# StrEnum for string constants (Python 3.11+)
class TranslationStatus(StrEnum):
    """Status of a translation request."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Language(StrEnum):
    """Supported languages."""

    ENGLISH = "en"
    GERMAN = "de"
    FRENCH = "fr"
    SPANISH = "es"
    ITALIAN = "it"


# Usage
def get_translation(request_id: str) -> TranslationResponse:
    status = get_status(request_id)
    if status == TranslationStatus.COMPLETED:
        return fetch_result(request_id)
    raise TranslationPendingError(status)
```

**Where to place things:**

| Item | Location |
|------|----------|
| Module-specific constants | Top of the module file |
| Shared constants | `utils/constants.py` |
| Shared enums | `utils/constants.py` or `models/enums.py` |
| Decorators | `utils/decorators.py` |
| Context managers | `utils/context_managers.py` |
| Protocols/Interfaces | `interfaces/` or alongside related code |
