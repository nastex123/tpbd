# Multi-stage Dockerfile for TPBD Climate Engine (FastAPI)
# NASA Space Apps Challenge 2026 - The Pale Blue Dot (TPBD)
FROM python:3.12-slim AS builder

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies in isolated prefix
COPY pyproject.toml ./
RUN pip install --no-cache-dir --prefix=/install \
    "fastapi>=0.115.0" \
    "uvicorn[standard]>=0.30.0" \
    "numpy>=2.0.0" \
    "scipy>=1.14.0" \
    "pymannkendall>=1.4.3" \
    "pydantic>=2.8.0" \
    "pydantic-settings>=2.4.0" \
    "httpx>=0.27.0"

# Runtime stage
FROM python:3.12-slim AS runner

WORKDIR /app

COPY --from=builder /install /usr/local

# Copy application source code
COPY app/ ./app
COPY tpbd_cache.db* ./

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOST=0.0.0.0

EXPOSE 8000

# Health check using standard urllib to avoid extra tool dependencies
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
