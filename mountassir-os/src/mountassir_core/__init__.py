"""MOUNTASSIR CORE — sovereign personal memory (MVP 1).

The only supported entry point is :class:`mountassir_core.core.Core`. The MCP gateway
and the CLI are thin adapters over it; neither talks to the database directly.
"""

__version__ = "0.1.0"

from .core import Core  # noqa: E402

__all__ = ["Core", "__version__"]
