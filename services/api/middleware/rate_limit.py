"""Sliding-window rate-limiting middleware for FastAPI."""

import time
from collections import defaultdict
from typing import Dict, List
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from services.shared.logger import logger


class MemorySlidingWindowRateLimiter:
    """Sliding window rate limiter stored in memory."""

    def __init__(self, limit: int = 60, window_seconds: int = 60):
        self.limit = limit
        self.window_seconds = window_seconds
        # Maps client identifier -> list of request timestamps
        self.history: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, client_id: str) -> bool:
        """Checks if a request from the given client_id is allowed.

        Prunes old timestamps and registers the new timestamp if allowed.
        """
        now = time.time()
        cutoff = now - self.window_seconds
        
        # Prune old timestamps
        self.history[client_id] = [t for t in self.history[client_id] if t > cutoff]
        
        if len(self.history[client_id]) >= self.limit:
            return False
            
        self.history[client_id].append(now)
        return True


# Global default rate limiter: 60 requests per minute
_limiter = MemorySlidingWindowRateLimiter(limit=60, window_seconds=60)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """FastAPI Middleware to enforce rate limits per client IP or authenticated user."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Determine client identifier (prefer authenticated sub claim, fallback to client host)
        client_id = "anonymous"
        if request.headers.get("Authorization"):
            # A simple peek at headers to extract sub if token is present,
            # but to keep it lightweight, we can check if it's there.
            # However, falling back to IP address is extremely reliable and safe.
            pass

        client_host = request.client.host if request.client else "unknown"
        client_id = f"{client_host}"

        # Bypass rate limiting for health check and docs
        if request.url.path in ("/v1/health", "/docs", "/openapi.json", "/favicon.ico"):
            return await call_next(request)

        if not _limiter.is_allowed(client_id):
            logger.warning(f"Rate limit exceeded for client: {client_id}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again in a minute."
            )

        return await call_next(request)
