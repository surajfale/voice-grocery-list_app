"""
EasyOCR Microservice
====================
Stateless FastAPI service that extracts English text from grocery-product
labels and store receipts using EasyOCR (deep-learning scene-text detector).

Endpoints
---------
POST /ocr    – multipart/form-data with field ``file`` (JPEG/PNG)
               → 200 {raw_text, lines, items}
GET  /health – → 200 {status: "ok"}
"""

from __future__ import annotations

import io
import re
import logging
from typing import Optional

import easyocr
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
import numpy as np

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("ocr-service")

# ---------------------------------------------------------------------------
# EasyOCR reader – loaded once at module level so the model stays warm
# ---------------------------------------------------------------------------
logger.info("Loading EasyOCR model (English)…")
reader = easyocr.Reader(["en"], gpu=False)
logger.info("EasyOCR model loaded ✓")

# ---------------------------------------------------------------------------
# Constants / regexes (mirrored from the Node.js receiptOcr.js)
# ---------------------------------------------------------------------------
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}

AMOUNT_RE = re.compile(r"([$£€₹]?)\s?(\d{1,6}(?:\.\d{1,2})?)")
CURRENCY_RE = re.compile(r"[$£€₹]")
DATE_RE = re.compile(
    r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b"
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_amount(text: str) -> dict:
    """Extract a currency symbol and numeric amount from *text*."""
    m = AMOUNT_RE.search(text)
    if not m:
        return {"currency": None, "amount": None}
    symbol = m.group(1) or None
    try:
        value = float(m.group(2))
    except ValueError:
        value = None
    return {"currency": symbol, "amount": value}


def _parse_items(lines: list[str]) -> list[dict]:
    """
    Heuristic item extractor – keeps lines that contain a numeric amount and
    a non-empty name after stripping the amount.
    """
    items: list[dict] = []
    for line in lines:
        if not line or len(line) < 3:
            continue
        amt = _parse_amount(line)
        if amt["amount"] is None:
            continue
        name = AMOUNT_RE.sub("", line).strip()
        if not name:
            continue
        items.append(
            {
                "name": name,
                "quantity": 1,
                "price": amt["amount"],
                "currency": amt["currency"],
            }
        )
    return items


def _image_bytes_to_numpy(raw: bytes) -> np.ndarray:
    """Decode raw image bytes into a NumPy array suitable for EasyOCR."""
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    return np.array(img)


def _sort_results_by_y(results: list) -> list:
    """Sort EasyOCR results top-to-bottom by the average Y of each bounding box."""
    def avg_y(r):
        box = r[0]  # list of 4 [x, y] points
        return sum(pt[1] for pt in box) / len(box)
    return sorted(results, key=avg_y)


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="EasyOCR Microservice",
    description="Extracts English text from grocery receipts & product labels.",
    version="1.0.0",
)


@app.get("/health")
async def health():
    """Simple liveness / readiness check."""
    return {"status": "ok"}


@app.post("/ocr")
async def ocr(file: UploadFile = File(...)):
    """
    Accept a single image upload and return extracted text.

    Returns
    -------
    JSON with ``raw_text`` (str), ``lines`` (list[str]), and ``items``
    (list of ``{name, quantity, price, currency}``).
    """

    # --- validate --------------------------------------------------------
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported content type: {file.content_type}. "
                   f"Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}",
        )

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    # --- OCR -------------------------------------------------------------
    try:
        img_array = _image_bytes_to_numpy(raw_bytes)
        results = reader.readtext(img_array)
    except Exception as exc:
        logger.exception("EasyOCR processing failed")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {exc}")

    # Sort results top-to-bottom for natural reading order
    results = _sort_results_by_y(results)

    # Build line list (text only, preserving order)
    lines: list[str] = [text for (_box, text, _conf) in results if text.strip()]

    raw_text = "\n".join(lines)

    # --- item extraction (phase-2 heuristic) -----------------------------
    items = _parse_items(lines)

    logger.info(
        "OCR complete – %d line(s), %d item(s), %d chars",
        len(lines),
        len(items),
        len(raw_text),
    )

    return JSONResponse(
        content={
            "raw_text": raw_text,
            "lines": lines,
            "items": items,
        }
    )


# ---------------------------------------------------------------------------
# Entrypoint (for dev: python app.py)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
