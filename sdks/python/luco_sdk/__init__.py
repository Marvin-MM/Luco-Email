
"""
Luco Python SDK
Official Python SDK for the Luco email sending platform

Version: 1.0.0
Author: Luco Team
"""

from .client import LucoClient
from .exceptions import LucoError, LucoAPIError, LucoValidationError

__version__ = "1.0.0"
__all__ = ["LucoClient", "LucoError", "LucoAPIError", "LucoValidationError"]
