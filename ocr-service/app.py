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
import os
import re
import logging

import easyocr
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image, ImageEnhance, ImageFilter
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
# Config (tunable via environment variables)
# ---------------------------------------------------------------------------
CONFIDENCE_THRESHOLD = float(os.getenv("OCR_CONFIDENCE_THRESHOLD", "0.25"))
CONTRAST_FACTOR = float(os.getenv("OCR_CONTRAST_FACTOR", "1.5"))
SHARPNESS_FACTOR = float(os.getenv("OCR_SHARPNESS_FACTOR", "2.0"))
MAX_IMAGE_DIMENSION = int(os.getenv("OCR_MAX_IMAGE_DIMENSION", "2400"))

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
# Image preprocessing
# ---------------------------------------------------------------------------

def _preprocess_image(img: Image.Image) -> Image.Image:
    """
    Enhance a receipt/label photo for better OCR accuracy.

    Steps:
    1. Resize if too large (saves memory and speeds up OCR).
    2. Convert to grayscale (removes color noise from backgrounds).
    3. Enhance contrast (makes faded/blurry text pop).
    4. Sharpen (counteracts camera blur and motion blur).
    """
    # 1. Resize large images – keep aspect ratio
    w, h = img.size
    if max(w, h) > MAX_IMAGE_DIMENSION:
        scale = MAX_IMAGE_DIMENSION / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        logger.info("Resized image from %dx%d to %dx%d", w, h, img.width, img.height)

    # 2. Convert to grayscale
    img = img.convert("L")

    # 3. Enhance contrast
    img = ImageEnhance.Contrast(img).enhance(CONTRAST_FACTOR)

    # 4. Sharpen
    img = ImageEnhance.Sharpness(img).enhance(SHARPNESS_FACTOR)

    # Convert back to RGB (EasyOCR expects 3-channel or grayscale numpy array)
    img = img.convert("RGB")

    return img


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


def _sort_results_by_y(results: list) -> list:
    """Sort EasyOCR results top-to-bottom by the average Y of each bounding box."""
    def avg_y(r):
        box = r[0]  # list of 4 [x, y] points
        return sum(pt[1] for pt in box) / len(box)
    return sorted(results, key=avg_y)


def _merge_nearby_boxes(results: list, y_threshold: float = 15.0) -> list[str]:
    """
    Merge bounding boxes that sit on the same horizontal line into single
    text lines, reading left to right.  This produces natural receipt lines
    instead of fragmented words.

    Two boxes are considered "same line" when their average-Y values differ
    by less than *y_threshold* pixels.
    """
    if not results:
        return []

    # Sort top-to-bottom first
    results = _sort_results_by_y(results)

    lines: list[list[tuple]] = []  # each entry: list of (avg_x, text)
    current_line: list[tuple] = []
    current_y: float = 0.0

    for box, text, _conf in results:
        text = text.strip()
        if not text:
            continue

        avg_y = sum(pt[1] for pt in box) / len(box)
        avg_x = sum(pt[0] for pt in box) / len(box)

        if not current_line:
            current_line.append((avg_x, text))
            current_y = avg_y
        elif abs(avg_y - current_y) <= y_threshold:
            # Same line – append
            current_line.append((avg_x, text))
            # Update running Y average
            current_y = (current_y + avg_y) / 2
        else:
            # New line
            lines.append(current_line)
            current_line = [(avg_x, text)]
            current_y = avg_y

    if current_line:
        lines.append(current_line)

    # Sort each line left-to-right, then join with space
    merged: list[str] = []
    for line_items in lines:
        line_items.sort(key=lambda item: item[0])
        merged.append(" ".join(t for _, t in line_items))

    return merged


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="EasyOCR Microservice",
    description="Extracts English text from grocery receipts & product labels.",
    version="1.1.0",
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

    # --- preprocess ------------------------------------------------------
    try:
        img = Image.open(io.BytesIO(raw_bytes))
        img = _preprocess_image(img)
        img_array = np.array(img)
    except Exception as exc:
        logger.exception("Image preprocessing failed")
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}")

    # --- OCR -------------------------------------------------------------
    try:
        results = reader.readtext(
            img_array,
            # CRAFT text-detector tuning for receipts/labels
            text_threshold=0.6,     # higher = fewer false-positive text regions
            low_text=0.4,           # lower boundary for text regions
            link_threshold=0.3,     # link nearby characters into words
            # Merge horizontally adjacent boxes into wider text spans
            width_ths=0.7,
            # Use paragraph mode to group text blocks
            paragraph=False,        # we do our own line merging below
            detail=1,               # return (box, text, confidence)
        )
    except Exception as exc:
        logger.exception("EasyOCR processing failed")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {exc}")

    # --- filter by confidence --------------------------------------------
    total_before = len(results)
    results = [
        (box, text, conf)
        for box, text, conf in results
        if conf >= CONFIDENCE_THRESHOLD and len(text.strip()) >= 2
    ]
    filtered_out = total_before - len(results)

    # --- merge into logical lines ----------------------------------------
    lines = _merge_nearby_boxes(results)

    raw_text = "\n".join(lines)

    # --- item extraction (phase-2 heuristic) -----------------------------
    items = _parse_items(lines)

    logger.info(
        "OCR complete – %d raw detection(s), %d filtered out, "
        "%d merged line(s), %d item(s), %d chars",
        total_before,
        filtered_out,
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
