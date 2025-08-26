
"""
Custom exceptions for the Luco Python SDK.
"""


class LucoError(Exception):
    """Base exception for all Luco SDK errors."""
    pass


class LucoValidationError(LucoError):
    """Raised when input validation fails."""
    pass


class LucoAPIError(LucoError):
    """Raised when the API returns an error response."""
    
    def __init__(
        self,
        message: str,
        status_code: int = None,
        error_type: str = None,
        error_code: str = None,
        details: dict = None
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_type = error_type
        self.error_code = error_code
        self.details = details

    def __str__(self):
        parts = [self.message]
        if self.status_code:
            parts.append(f"Status: {self.status_code}")
        if self.error_type:
            parts.append(f"Type: {self.error_type}")
        return " | ".join(parts)
