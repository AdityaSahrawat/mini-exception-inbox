FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv (extremely fast Python package manager)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Copy configuration and project files
COPY pyproject.toml .
# If uv.lock exists, copy it, otherwise ignore
COPY uv.lock* .

# Install dependencies using uv
RUN uv sync --frozen --no-cache

# Copy the rest of the application
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH"

# Run seed script to populate DB, then launch Uvicorn
CMD python seed.py && uvicorn app.main:app --host 0.0.0.0 --port 8000

