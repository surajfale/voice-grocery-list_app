FROM python:3.11-slim AS base

# Prevent Python from writing .pyc files and enable unbuffered stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system deps needed by OpenCV (EasyOCR dependency)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download EasyOCR English model so container starts fast
RUN python -c "import easyocr; easyocr.Reader(['en'], gpu=False)"

# Copy application code
COPY . .

EXPOSE 8000

# Use 2 workers to handle concurrent requests on 8-CPU Railway.
# NOTE: Each EasyOCR worker uses ~500MB RAM, so 2 workers ≈ 1GB.
# Don't go higher – EasyOCR's CRAFT detector already uses multiple
# threads internally per worker.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--timeout-keep-alive", "120"]
