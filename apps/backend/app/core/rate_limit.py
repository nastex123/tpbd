"""In-memory rate limiting middleware for sensitive endpoints (ADR 0009 defense in depth)."""
import time
from collections import defaultdict
from threading import Lock
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class InMemoryRateLimiter:
    """Sliding-window in-memory rate limiter per client IP address."""

    def __init__(self, max_requests: int = 15, window_seconds: float = 60.0):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def is_allowed(self, client_ip: str) -> tuple[bool, int]:
        """Check if request is permitted under rate limit window.

        Returns (allowed, retry_after_seconds).
        """
        now = time.monotonic()
        cutoff = now - self.window_seconds

        with self._lock:
            # Purge expired timestamps for this IP
            timestamps = [t for t in self._requests[client_ip] if t > cutoff]
            if len(timestamps) >= self.max_requests:
                earliest = timestamps[0]
                retry_after = max(1, int(self.window_seconds - (now - earliest)))
                self._requests[client_ip] = timestamps
                return False, retry_after

            timestamps.append(now)
            self._requests[client_ip] = timestamps
            return True, 0

    def reset(self) -> None:
        """Clear all stored rate limit history (useful for automated testing)."""
        with self._lock:
            self._requests.clear()


class AIRateLimitMiddleware(BaseHTTPMiddleware):
    """Protects Gemini AI Studio routes against unauthenticated scraping and quota exhaustion."""

    def __init__(
        self,
        app,
        limiter: InMemoryRateLimiter | None = None,
        prefix: str = "/api/v1/ai",
    ):
        super().__init__(app)
        self.limiter = limiter or InMemoryRateLimiter(max_requests=15, window_seconds=60.0)
        self.prefix = prefix

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Only rate limit target prefix
        if request.url.path.startswith(self.prefix):
            # Prefer X-Forwarded-For if behind proxy/Cloudflare, fallback to client.host
            forwarded = request.headers.get("x-forwarded-for")
            client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "127.0.0.1")

            allowed, retry_after = self.limiter.is_allowed(client_ip)
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    headers={"Retry-After": str(retry_after)},
                    content={
                        "title": "Too Many Requests",
                        "status": 429,
                        "detail": f"AI Copilot request rate limit exceeded ({self.limiter.max_requests} req/min). Please try again in {retry_after} seconds.",
                        "type": "https://tpbd.nasa.gov/errors/rate-limit-exceeded",
                    },
                    media_type="application/problem+json",
                )

        return await call_next(request)
