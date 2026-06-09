# ─── ZEMA 360 FastAPI backend ─────────────────────────────────────────────────
# Alibaba Cloud Function Compute — Custom Container Runtime
# Build: docker build -t zema360-backend .
# Run locally: docker run -p 8000:8000 --env-file .env zema360-backend

FROM python:3.11-slim

# System deps for oss2 (libssl) and psycopg2 (libpq)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (Docker cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# ── Health check ──────────────────────────────────────────────────────────────
# FC probes this endpoint to determine if the container is ready.
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/v1/zema/health || exit 1

# ── Non-root user ─────────────────────────────────────────────────────────────
RUN useradd -m -u 1001 zema
USER zema

# ── Runtime config ────────────────────────────────────────────────────────────
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=8000

EXPOSE 8000

# Alibaba FC passes CA_CERTIFICATES_PATH for internal TLS — no extra config needed.
# The HTTP trigger calls port 8000 directly.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
