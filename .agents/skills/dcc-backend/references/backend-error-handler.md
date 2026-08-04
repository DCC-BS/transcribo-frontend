---
outline: deep
editLink: true
skillParent: dcc-backend
skillName: backend-error-handler
skillDescription: "dcc_backend_common.fastapi_error_handling module for standardized API errors. Use when raising ApiErrorException, choosing ApiErrorCodes (INVALID_REQUEST, RESOURCE_NOT_FOUND, etc.), shaping the ErrorResponse JSON, or registering the handler with inject_api_error_handler(app)."
---
# Error Handler

The `dcc_backend_common.fastapi_error_handling` module provides a standardized way to handle and format API errors across all FastAPI services.

## Overview

The module provides:

- **`ApiErrorException`**: Custom exception class for API errors
- **`ApiErrorCodes`**: Enum of standard error codes for consistency
- **`ErrorResponse`**: TypedDict for structured error responses
- **`api_error_exception()`**: Helper to create API error exceptions
- **`construct_api_error_exception()`**: Convert any exception to API error
- **`inject_api_error_handler()`**: Register error handler with FastAPI

## Installation

The error handler module is part of the `dcc-backend-common` package:

```bash
uv add dcc-backend-common
```

## Quick Start

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from dcc_backend_common.fastapi_error_handling import (
    ApiErrorException,
    ApiErrorCodes,
    api_error_exception,
    inject_api_error_handler,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    inject_api_error_handler(app)  # Register error handler
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/users/{user_id}")
async def get_user(user_id: int):
    if user_id < 1:
        raise api_error_exception(
            errorId=ApiErrorCodes.INVALID_REQUEST,
            status=400,
            debugMessage="User ID must be positive",
        )
    return {"id": user_id, "name": "John Doe"}
```

## Error Codes

The `ApiErrorCodes` enum provides standard error codes:

| Error Code | Description | Typical Status |
|------------|-------------|----------------|
| `UNEXPECTED_ERROR` | Unexpected server error | 500 |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable | 503 |
| `INVALID_REQUEST` | Invalid request parameters | 400 |
| `AUTHENTICATION_FAILED` | Authentication failed | 401 |
| `PERMISSION_DENIED` | Access denied | 403 |
| `RESOURCE_NOT_FOUND` | Resource does not exist | 404 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `VALIDATION_ERROR` | Input validation failed | 422 |

## Error Exception

### ApiErrorException

Custom exception that holds a structured error response.

```python
from dcc_backend_common.fastapi_error_handling import ApiErrorException, ApiErrorCodes

# Create directly
error = ApiErrorException(
    error_response={
        "errorId": ApiErrorCodes.RESOURCE_NOT_FOUND,
        "status": 404,
        "debugMessage": "User not found",
    }
)
raise error
```

### ErrorResponse

TypedDict structure for error responses:

```python
class ErrorResponse(TypedDict, total=False):
    errorId: str | ApiErrorCodes
    status: int | None  # defaults to 500
    debugMessage: str | None
```

## Helper Functions

### api_error_exception()

Create an `ApiErrorException` with parameters.

```python
from dcc_backend_common.fastapi_error_handling import api_error_exception, ApiErrorCodes

raise api_error_exception(
    errorId=ApiErrorCodes.VALIDATION_ERROR,
    status=422,
    debugMessage="Email format is invalid",
)
```

**Parameters:**
- `errorId` (str | ApiErrorCodes): Error identifier, defaults to `UNEXPECTED_ERROR`
- `status` (int): HTTP status code, defaults to 500
- `debugMessage` (str | None): Optional debug message

### construct_api_error_exception()

Convert any exception to an `ApiErrorException`.

```python
from dcc_backend_common.fastapi_error_handling import construct_api_error_exception, ApiErrorCodes

try:
    result = risky_operation()
except ValueError as e:
    api_error = construct_api_error_exception(
        exception=e,
        error_id=ApiErrorCodes.VALIDATION_ERROR,
        status_code=422,
    )
    raise api_error
```

**Parameters:**
- `exception` (Exception): Original exception to convert
- `error_id` (str | ApiErrorCodes): Error identifier, defaults to `UNEXPECTED_ERROR`
- `status_code` (int | None): Optional HTTP status code

**Note:** If `status_code` is not provided and the exception is a `HTTPException`, the status code from the exception is used.

## Handler Integration

### inject_api_error_handler()

Register the error handler with your FastAPI application.

```python
from dcc_backend_common.fastapi_error_handling import inject_api_error_handler

app = FastAPI()
inject_api_error_handler(app)
```

The handler:
- Catches `ApiErrorException` and returns its structured response
- Catches other exceptions and returns a 500 response with `UNEXPECTED_ERROR`

## API Response Format

All errors are returned in a consistent JSON format:

```json
{
  "errorId": "resource_not_found",
  "status": 404,
  "debugMessage": "User not found"
}
```

**Response fields:**
- `errorId` (str): Error code from `ApiErrorCodes` or custom string
- `status` (int): HTTP status code
- `debugMessage` (string | null): Optional debug information

## Related Documentation

- [Configuration](/backend-common/config) - Manage application configuration
- [Logger](/backend-common/logger) - Structured logging with structlog
- [Python Coding Standards](/coding/python) - General Python best practices

## API Reference

::: tip Source Code
The full implementation is available on GitHub:
- [__init__.py](https://github.com/DCC-BS/backend-common/blob/main/src/dcc_backend_common/fastapi_error_handling/__init__.py)
- [error_codes.py](https://github.com/DCC-BS/backend-common/blob/main/src/dcc_backend_common/fastapi_error_handling/error_codes.py)
- [error_exception.py](https://github.com/DCC-BS/backend-common/blob/main/src/dcc_backend_common/fastapi_error_handling/error_exception.py)
- [error_handler.py](https://github.com/DCC-BS/backend-common/blob/main/src/dcc_backend_common/fastapi_error_handling/error_handler.py)
:::
