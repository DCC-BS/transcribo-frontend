---
outline: deep
editLink: true
skillParent: dcc-backend
skillName: backend-llm-agent
skillDescription: "dcc_backend_common.llm_agent module: a Pydantic AI agent framework (pydantic_ai extra). Use when subclassing BaseAgent, streaming with run/run_stream_text/run_stream_events, configuring LlmConfig, adding postprocessors (trim_text, replace_eszett), or debugging via withDebbuger."
---
# LLM Agent Module

The `dcc_backend_common.llm_agent` module provides a comprehensive Pydantic AI agent framework with streaming support, postprocessing utilities, and debugging tools.

## Overview

The module provides:

- **`BaseAgent`**: Abstract base class for creating reusable LLM agents with streaming and postprocessing
- **`LlmConfig`**: Base configuration class for LLM API settings
- **Debugging utilities**: Event stream handlers and decorators for detailed agent logging
- **Postprocessing utilities**: Automatic text normalization and custom postprocessing pipelines
- **Streaming modes**: Multiple options for streaming responses (text, lists, structured output, events)

## Installation

The LLM agent module requires the optional `pydantic_ai` extras:

```bash
uv add "dcc-backend-common[pydantic_ai]"
```

Or with uv sync:

```bash
uv sync --group dev --all-extras
```

## Quick Start

Here's a complete example of creating a simple translation agent:

```python
from pydantic_ai import Agent, Model
from pydantic_ai.models.openai import OpenAIChatModel
from dcc_backend_common.llm_agent import BaseAgent
from dcc_backend_common.config import LlmConfig, get_env_or_throw
from typing import override


# Configuration
class TranslationConfig(LlmConfig):
    @classmethod
    @override
    def from_env(cls) -> "TranslationConfig":
        return cls(
            llm_model=get_env_or_throw("LLM_MODEL"),
            llm_url=get_env_or_throw("LLM_URL"),
            llm_api_key=get_env_or_throw("LLM_API_KEY"),
        )
    
    @override
    def __str__(self) -> str:
        return f"TranslationConfig(llm_model={self.llm_model}, llm_api_key=****)"


# Agent
class TranslationAgent(BaseAgent[None, str]):
    def __init__(self, config: LlmConfig):
        super().__init__(config, deps_type=None, output_type=str)

    @override
    def create_agent(self, model: Model) -> Agent[None, str]:
        agent = Agent(model=model, deps_type=None, output_type=str)

        @agent.instructions
        def get_instruction(ctx: RunContext[None]):
            return "You are a helpful translator. Translate the given text to English."
        
        return agent


# Usage
config = TranslationConfig.from_env()
agent = TranslationAgent(config)

# Synchronous execution
result = await agent.run("Hallo Welt")
print(result)  # "Hello World"

# Streaming text
async for chunk in agent.run_stream_text("Hallo Welt"):
    print(chunk, end="")
```

## Configuration - LlmConfig

The `LlmConfig` class is a base configuration class specifically for LLM-related settings. It extends `AbstractAppConfig` but does not implement `from_env()` or `__str__()` by default.

### Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `llm_model` | `str` | The model identifier (e.g., `"gpt-4o"`) |
| `llm_url` | `str` | The URL for the LLM API endpoint |
| `llm_api_key` | `str` | The API key for authentication |

### Creating a Custom Config

Create a subclass of `LlmConfig` and implement `from_env()` and `__str__()`:

```python
from dcc_backend_common.config import LlmConfig, get_env_or_throw
from typing import override


class MyLlmConfig(LlmConfig):
    @classmethod
    @override
    def from_env(cls) -> "MyLlmConfig":
        return cls(
            llm_model=get_env_or_throw("LLM_MODEL"),
            llm_url=get_env_or_throw("LLM_URL"),
            llm_api_key=get_env_or_throw("LLM_API_KEY"),
        )
    
    @override
    def __str__(self) -> str:
        return f"MyLlmConfig(llm_model={self.llm_model}, llm_api_key=****)"


# Load configuration
config = MyLlmConfig.from_env()
print(config)  # MyLlmConfig(llm_model=gpt-4o, llm_api_key=****)
```

## Creating Custom Agents - BaseAgent

### BaseAgent Class

The `BaseAgent` class is an abstract base class for creating LLM agents. It's a generic class with two type parameters:

```python
class BaseAgent[DepsType, OutputType](ABC):
    ...
```

**Type Parameters:**
- `DepsType`: Type for dependency injection passed to the agent (use `None` if not needed)
- `OutputType`: Expected output type (`str`, Pydantic model, TypedDict, etc.)

### Constructor Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `config` | `LlmConfig` | Required | LLM API configuration |
| `deps_type` | `type[DepsType]` | `NoneType` | Type for dependencies |
| `output_type` | `type[OutputType]` | `str` | Expected output type |
| `enable_thinking` | `bool` | `False` | Enable thinking mode |

### Abstract Method

You must implement the `create_agent()` method:

```python
@override
def create_agent(self, model: Model) -> Agent[DepsType, OutputType]:
    """Create the pydantic-ai Agent instance."""
    ...
```

### Example: Agent with Pydantic Output

```python
from pydantic import BaseModel


class SummaryResult(BaseModel):
    summary: str
    word_count: int


class SummaryAgent(BaseAgent[None, SummaryResult]):
    def __init__(self, config: LlmConfig):
        super().__init__(config, deps_type=None, output_type=SummaryResult)

    @override
    def create_agent(self, model: Model) -> Agent[None, SummaryResult]:
        return Agent(model=model, deps_type=None, output_type=SummaryResult)
```

## Streaming Modes

### Simple Execution - `run()`

Executes the agent and returns the complete output after processing.

```python
result: OutputType = await agent.run(user_prompt="Hello, world!")
```

**Features:**
- Returns complete structured output
- Applies postprocessing to the final result
- Logs LLM usage statistics (tokens, tool calls, etc.)

### Streaming Text - `run_stream_text()`

Streams text output chunk by chunk, ideal for real-time responses.

```python
async for chunk in agent.run_stream_text(user_prompt="Hello, world!"):
    print(chunk, end="")
```

**Parameters:**
- `user_prompt`: The input prompt (default: `None`)
- `deps`: Dependencies for the agent (default: `None`)
- `delta`: Stream partial tokens (`True`) or full text chunks (`False`, default)
- `**kwargs`: Additional keyword arguments passed to the agent

**Features:**
- Streams text chunks as they arrive
- Applies postprocessing to each chunk
- Useful for chat interfaces and real-time feedback

## Debugging

### `withDebbuger` Decorator

Use the `withDebbuger` decorator to inject an event stream debugger into any async function that runs an agent:

```python
from dcc_backend_common.llm_agent.debugging import withDebbuger

agent = TranslationAgent(config)
# without debugger
result = await agent.run("Hallo Welt")
# with debugger
result = withDebbuger(agent.run)("Hallo Welt")
```

The decorator automatically:
- Logs all agent events with the agent name

### What Gets Logged

The debugger logs the following event types:

| Event Type | Description |
|------------|-------------|
| `PartStartEvent` | When a response part starts |
| `PartDeltaEvent` | Text, thinking, and tool call deltas |
| `FunctionToolCallEvent` | When LLM calls a tool |
| `FunctionToolResultEvent` | When a tool returns results |
| `FinalResultEvent` | When final result production starts |
| `PartEndEvent` | When a response part ends |

### Using `create_event_debugger()`

Create a custom event stream handler:

```python
from dcc_backend_common.llm_agent.debugging import create_event_debugger


event_handler = create_event_debugger(name="MyAgent")

async for event in agent.run_stream_events(user_prompt="Hello"):
    await event_handler(ctx=None, event_stream=[event])
```

## Postprocessing

Postprocessing automatically transforms agent outputs after the LLM generates them but before they're returned.

### Built-in Postprocessors

Two postprocessors are included by default:

| Function | Description |
|----------|-------------|
| `trim_text()` | Removes blank lines from the start of text (only on first chunk in streaming) |
| `replace_eszett()` | Recursively replaces German ß with "ss" in all string fields |

### Adding Custom Postprocessors

Override the `_get_postprocessors()` method to add custom postprocessing logic:

```python
from dcc_backend_common.llm_agent import BaseAgent, Preprocessor, PostprocessingContext


class MyAgent(BaseAgent[None, str]):
    def __init__(self, config: LlmConfig):
        super().__init__(config, deps_type=None, output_type=str)

    @override
    def _get_postprocessors(self) -> list[Preprocessor]:
        postprocessors = super()._get_postprocessors()
        
        def to_uppercase(text: Any, context: PostprocessingContext) -> Any:
            if isinstance(text, str):
                return text.upper()
            return text
        
        postprocessors.append(to_uppercase)
        return postprocessors
```

### PostprocessingContext

Postprocessor functions receive a `PostprocessingContext` object with information about the current processing state:

| Field | Type | Description |
|-------|------|-------------|
| `index` | `int` | The index of the item being processed (0, 1, 2, ...) |
| `is_partial` | `bool` | Whether this is a partial (streaming) result |

## API Reference

### Main Classes

| Class | Location | Description |
|-------|----------|-------------|
| `BaseAgent` | [base_agent.py](https://github.com/DCC-BS/backend-common/blob/main/src/dcc_backend_common/llm_agent/base_agent.py) | Abstract base class for LLM agents |
| `LlmConfig` | [config/app_config.py](https://github.com/DCC-BS/backend-common/blob/main/src/dcc_backend_common/config/app_config.py) | LLM configuration base class |
| `PostprocessingContext` | [postprocessing.py](https://github.com/DCC-BS/backend-common/blob/main/src/dcc_backend_common/llm_agent/postprocessing.py) | Context for postprocessing functions |

### Public API Methods

| Method | Description | Return Type |
|--------|-------------|-------------|
| `run()` | Execute agent and return complete output | `OutputType` |
| `run_stream_text()` | Stream text output chunk by chunk | `AsyncGenerator[str, None]` |
| `stream_list()` | Stream list items one-by-one | `AsyncGenerator[T, None]` |
| `run_stream_output()` | Stream structured output with postprocessing | `AsyncGenerator[Any, None]` |
| `run_stream_events()` | Stream all events for detailed debugging | `AsyncGenerator[AgentStreamEvent \| AgentRunResultEvent]` |

### Debugging Utilities

| Function/Decorator | Location | Description |
|--------------------|----------|-------------|
| `withDebbuger` | [agent_debugger.py](https://github.com/DCC-BS/backend-common/blob/main/src/dcc_backend_common/llm_agent/debugging/agent_debugger.py) | Decorator to inject event debugger |
| `create_event_debugger()` | [event_debugger.py](https://github.com/DCC-BS/backend-common/blob/main/src/dcc_backend_common/llm_agent/debugging/event_debugger.py) | Create event stream handler |

### Postprocessing Functions

| Function | Location | Description |
|----------|----------|-------------|
| `trim_text()` | [postprocessing.py](https://github.com/DCC-BS/backend-common/blob/main/src/dcc_backend_common/llm_agent/postprocessing.py) | Remove blank lines from text start |
| `replace_eszett()` | [postprocessing.py](https://github.com/DCC-BS/backend-common/blob/main/src/dcc_backend_common/llm_agent/postprocessing.py) | Replace German ß with "ss" |

## Related Documentation

- [Configuration](/backend-common/config) - Manage application configuration
- [Logger](/backend-common/logger) - Structured logging with structlog
- [Python Coding Standards](/coding/python) - General Python best practices

## Source Code

::: tip Repository
Full implementation on GitHub: [github.com/DCC-BS/backend-common](https://github.com/DCC-BS/backend-common)
:::

Files:
- [llm_agent/base_agent.py](https://github.com/DCC-BS/backend-common/blob/main/src/dcc_backend_common/llm_agent/base_agent.py)
- [llm_agent/postprocessing.py](https://github.com/DCC-BS/backend-common/blob/main/src/dcc_backend_common/llm_agent/postprocessing.py)
- [llm_agent/debugging/agent_debugger.py](https://github.com/DCC-BS/backend-common/blob/main/src/dcc_backend_common/llm_agent/debugging/agent_debugger.py)
- [llm_agent/debugging/event_debugger.py](https://github.com/DCC-BS/backend-common/blob/main/src/dcc_backend_common/llm_agent/debugging/event_debugger.py)
- [config/app_config.py](https://github.com/DCC-BS/backend-common/blob/main/src/dcc_backend_common/config/app_config.py)
