"""
EasyOCR Microservice – v2.1 (multi-store receipt-optimised)
============================================================
Stateless FastAPI service that extracts English text from grocery-product
labels and store receipts using EasyOCR (deep-learning scene-text detector).

Supported store formats
-----------------------
- **Costco**       – ALL-CAPS items, 7-digit item codes, "E" tax suffix
- **Walmart**      – item codes, N/T tax indicators, "X" qty, savings lines
- **Target**       – T/F tax/food suffix, department codes, REDcard savings
- **Indian grocery stores in USA** – Patel Brothers, India Bazaar, Apna Bazaar,
  Subzi Mandi, etc.  Desi product names in English, MRP/Rate columns, "Rs."
- **Generic**      – works for any US grocery store receipt

Endpoints
---------
POST /ocr    – multipart/form-data with field ``file`` (JPEG/PNG)
               → 200 {raw_text, lines, items, merchant, purchase_date,
                       total, currency, item_count, subtotal, tax, savings,
                       detected_store}
GET  /health – → 200 {status: "ok"}
"""

from __future__ import annotations

import io
import os
import re
import logging
import statistics
from typing import Optional

import easyocr
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
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
CONFIDENCE_THRESHOLD = float(os.getenv("OCR_CONFIDENCE_THRESHOLD", "0.15"))
# With 8 CPU cores on Railway, 1800px gives good accuracy for small receipt
# text while keeping single-pass OCR under ~15 seconds.
MAX_IMAGE_DIMENSION = int(os.getenv("OCR_MAX_IMAGE_DIMENSION", "1800"))

# ---------------------------------------------------------------------------
# EasyOCR reader – loaded once at module level so the model stays warm
# ---------------------------------------------------------------------------
logger.info("Loading EasyOCR model (English)…")
reader = easyocr.Reader(["en"], gpu=False)
logger.info("EasyOCR model loaded ✓")

# ---------------------------------------------------------------------------
# Constants / regexes
# ---------------------------------------------------------------------------
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}

# ---------------------------------------------------------------------------
# Price regexes – crafted to avoid matching phone-numbers / barcodes
# ---------------------------------------------------------------------------
# Matches: $12.50  Rs. 45.00  ₹125  €9.99   or trailing 45.00
PRICE_RE = re.compile(
    r"(?:Rs\.?|₹|\$|£|€)\s*(\d{1,6}(?:\.\d{1,2})?)"
    r"|"
    r"(\d{1,6}\.\d{2})\s*(?:Rs\.?|₹|\$|£|€)?(?:\s*[A-Z])?$"
    , re.IGNORECASE | re.MULTILINE
)

# Broader amount regex for total extraction
AMOUNT_RE = re.compile(r"(?:Rs\.?|₹|\$|£|€)?\s?(\d{1,6}(?:\.\d{1,2})?)")
CURRENCY_RE = re.compile(r"(Rs\.?|₹|\$|£|€)", re.IGNORECASE)
DATE_RE = re.compile(
    r"\b(\d{1,2}[/\-.]?\d{1,2}[/\-.]?\d{2,4}|"
    r"\d{4}[/\-.]?\d{1,2}[/\-.]?\d{1,2})\b"
)
# More robust date pattern that also handles "Feb 15, 2026" etc.
DATE_RE_VERBOSE = re.compile(
    r"\b(\d{1,2}[/\-.]?\d{1,2}[/\-.]?\d{2,4})\b"
    r"|"
    r"\b(\d{4}[/\-.]?\d{1,2}[/\-.]?\d{1,2})\b"
    r"|"
    r"\b(\w{3,9}\s+\d{1,2},?\s+\d{2,4})\b"
    r"|"
    r"\b(\d{1,2}\s+\w{3,9}\s+\d{2,4})\b"
    , re.IGNORECASE
)

# ---------------------------------------------------------------------------
# Store detection keywords
# ---------------------------------------------------------------------------
STORE_PATTERNS: dict[str, list[re.Pattern]] = {
    "costco": [
        re.compile(r"\bcostco\b", re.I),
        re.compile(r"\bcostco\s*wholesale\b", re.I),
    ],
    "walmart": [
        re.compile(r"\bwal[\s\-]*mart\b", re.I),
        re.compile(r"\bwalmart\b", re.I),
        re.compile(r"\bsam['\u2019]?s\s*club\b", re.I),
    ],
    "target": [
        re.compile(r"\btarget\b", re.I),
        re.compile(r"\bsuper\s*target\b", re.I),
    ],
    "indian_grocery": [
        re.compile(r"\bpatel\s*brothers?\b", re.I),
        re.compile(r"\bindia\s*(?:bazaar|bazar|market)\b", re.I),
        re.compile(r"\bapna\s*(?:bazaar|bazar|market)\b", re.I),
        re.compile(r"\bsubzi\s*mandi\b", re.I),
        re.compile(r"\bdesi\s*(?:bazaar|bazar|market|store)\b", re.I),
        re.compile(r"\braj\s*(?:store|market|grocery)\b", re.I),
        re.compile(r"\bspice\s*(?:bazaar|house|world|land)\b", re.I),
        re.compile(r"\bglobal\s*(?:foods?|market|grocery)\b", re.I),
        re.compile(r"\bcherians?\b", re.I),
        re.compile(r"\bdeepam\b", re.I),
        re.compile(r"\bshaan\b", re.I),
        re.compile(r"\bswad\b", re.I),
        re.compile(r"\bnamaste\b", re.I),
        re.compile(r"\b(?:sri|shri)\s*(?:krishna|lakshmi|ganesh)\b", re.I),
        # Detect Indian-ness from product patterns (fallback)
        re.compile(r"\bMRP\b"),
        re.compile(r"\b(?:masala|atta|ghee|paneer|daal|dal|roti|naan)\b", re.I),
    ],
    "kroger": [
        re.compile(r"\bkroger\b", re.I),
        re.compile(r"\bralph['\u2019]?s\b", re.I),
        re.compile(r"\bfry['\u2019]?s\b", re.I),
    ],
    "aldi": [
        re.compile(r"\baldi\b", re.I),
    ],
    "trader_joes": [
        re.compile(r"\btrader\s*joe['\u2019]?s?\b", re.I),
    ],
    "whole_foods": [
        re.compile(r"\bwhole\s*foods?\b", re.I),
    ],
    "heb": [
        re.compile(r"\bh[\s\-]?e[\s\-]?b\b", re.I),
    ],
}

# ---------------------------------------------------------------------------
# Noise patterns – lines that are definitely NOT items
# ---------------------------------------------------------------------------
NOISE_PATTERNS = [
    re.compile(r"\b\d{10,}\b"),                              # phone numbers, barcodes
    re.compile(r"\bGST(?:IN)?[\s:]*\d", re.I),               # GSTIN numbers
    re.compile(r"\bPAN[\s:]*[A-Z]{5}\d{4}[A-Z]", re.I),     # PAN numbers
    re.compile(r"\bFSSAI", re.I),                             # FSSAI license
    re.compile(r"\bCIN[\s:]*[A-Z0-9]", re.I),                # CIN numbers
    re.compile(r"\b(?:thank\s*you|have\s*a\s*nice)", re.I),
    re.compile(r"^\**\s*$"),                                   # decoration lines
    re.compile(r"^[-=*_#]{3,}$"),                              # separator lines
    re.compile(r"\bwww\.|\.com\b|\.org\b", re.I),             # URLs
    re.compile(r"\btax\s*(?:invoice|receipt)\b", re.I),       # headers
    re.compile(r"\b(?:bill|invoice)\s*(?:no|#|number)\b", re.I),
    re.compile(r"\boriginal\s*(?:for|copy)\b", re.I),
    re.compile(r"\b(?:store|str)\s*(?:#|no|number)\s*\d", re.I),  # store number
    re.compile(r"\b(?:cashier|operator|register|terminal)\b", re.I),
    re.compile(r"\b(?:member|membership)\s*(?:#|no|id)\b", re.I),  # membership
    re.compile(r"\bref\s*(?:#|no)\b", re.I),                  # reference number
    re.compile(r"\b(?:visa|mastercard|amex|discover|debit|credit)\b", re.I),
    re.compile(r"\bchange\s*due\b", re.I),                    # change due
    re.compile(r"\b(?:return|exchange)\s*policy\b", re.I),
    re.compile(r"\bvalid\s*(?:thru|through|until)\b", re.I),
    re.compile(r"\bapproval\s*(?:code|#)\b", re.I),
    re.compile(r"\b(?:tc|transaction)\s*#?\s*\d", re.I),
    re.compile(r"^\s*\d{12,}\s*$"),                            # pure UPC/barcode lines
]

# Store-specific noise
COSTCO_NOISE = [
    re.compile(r"^\s*\d{7}\s*$"),                              # bare item number
    re.compile(r"\bmember\s*#?\s*\d", re.I),
    re.compile(r"\b(?:whse|warehouse)\b", re.I),
    re.compile(r"\binstant\s*savings\b", re.I),
]

WALMART_NOISE = [
    re.compile(r"\bsave\s*money\b", re.I),
    re.compile(r"\blive\s*better\b", re.I),
    re.compile(r"\bmanager\b", re.I),
    re.compile(r"\bpromo\b", re.I),
    re.compile(r"\bprice\s*match\b", re.I),
    re.compile(r"\b(?:sc|snap)\s*(?:eligible|ebt)\b", re.I),
]

TARGET_NOISE = [
    re.compile(r"\bexpect\s*more\b", re.I),
    re.compile(r"\bpay\s*less\b", re.I),
    re.compile(r"\bredcard\b", re.I),
    re.compile(r"\bcircle\s*(?:offer|earnings?|savings?)\b", re.I),
    re.compile(r"\bdpci\b", re.I),
]

# ---------------------------------------------------------------------------
# Lines that signal "total" – checked in priority order
# ---------------------------------------------------------------------------
TOTAL_KEYWORDS = [
    re.compile(r"\bgrand\s*total\b", re.I),
    re.compile(r"\bnet\s*(?:amount|total|payable)\b", re.I),
    re.compile(r"\b(?:order\s*)?total\s*(?:amount|payable|due)?\b", re.I),
    re.compile(r"\bamount\s*(?:due|payable|tendered)\b", re.I),
    re.compile(r"\bbalance\s*due\b", re.I),
    re.compile(r"\bpayable\b", re.I),
]

# Lines that are subtotal (not the final total)
SUBTOTAL_KEYWORDS = [
    re.compile(r"\bsub[\s\-]?total\b", re.I),
    re.compile(r"\bmerch(?:andise)?\s*(?:sub)?total\b", re.I),
]

# Tax lines
TAX_KEYWORDS = [
    re.compile(r"\b(?:sales?\s*)?tax\b", re.I),
    re.compile(r"\bstate\s*tax\b", re.I),
    re.compile(r"\blocal\s*tax\b", re.I),
    re.compile(r"\btax\s*\d", re.I),
    re.compile(r"\bGST\b"),
    re.compile(r"\bSGST\b"),
    re.compile(r"\bCGST\b"),
    re.compile(r"\bIGST\b"),
]

# Savings/discount lines
SAVINGS_KEYWORDS = [
    re.compile(r"\b(?:you\s*)?saved?\b", re.I),
    re.compile(r"\bsavings?\b", re.I),
    re.compile(r"\bdiscount\b", re.I),
    re.compile(r"\bcoupon\b", re.I),
    re.compile(r"\brollback\b", re.I),
    re.compile(r"\bmarkdown\b", re.I),
    re.compile(r"\bprice\s*cut\b", re.I),
    re.compile(r"\bmanager\s*special\b", re.I),
    re.compile(r"\binstant\s*savings\b", re.I),
    re.compile(r"\b(?:rewards?|points?)\s*(?:earned|applied|redeemed)\b", re.I),
]

# Lines that signal "item count"
ITEM_COUNT_RE = re.compile(
    r"\b(?:total\s*)?(?:items?|qty|quantities?|no\.?\s*of\s*items?)"
    r"\s*[:\-]?\s*(\d{1,4})\b", re.I
)

# Costco-specific item count: "## Items Sold = ##"
COSTCO_ITEM_COUNT_RE = re.compile(
    r"\b(\d{1,3})\s*items?\s*sold\b", re.I
)

# Quantity x Price patterns  (e.g. "2 x 45.00", "3 X Rs.15", "2 @ 3.99")
QTY_PRICE_RE = re.compile(
    r"(\d+)\s*[xX×@]\s*(?:Rs\.?|₹|\$|£|€)?\s*(\d{1,6}(?:\.\d{1,2})?)"
)

# Costco item code pattern: 7-digit number at start of line
COSTCO_ITEM_CODE_RE = re.compile(r"^\s*(\d{5,7})\s+")

# Walmart item code: long number at start, or "0 12345 67890" UPC format
WALMART_ITEM_CODE_RE = re.compile(
    r"^\s*(?:\d[\s\-]?)?\d{10,13}\s+"    # UPC/EAN at start
    r"|"
    r"^\s*\d{9,13}\s+"                    # raw item code
)

# Target DPCI pattern
TARGET_DPCI_RE = re.compile(r"\d{3}[\-\s]\d{2}[\-\s]\d{4}")

# Costco tax indicator at end of line (single letter like E, A)
COSTCO_TAX_SUFFIX_RE = re.compile(r"\s+[EA]\s*$")

# Walmart tax indicator at end (N=nontax, T=taxed, X=food stamp eligible)
WALMART_TAX_SUFFIX_RE = re.compile(r"\s+[NTOXA]\s*$")

# Target tax indicator (T=taxed, F=food, X=nontax)
TARGET_TAX_SUFFIX_RE = re.compile(r"\s+[TFX]\s*$")

# Weight-based item: "1.23 lb @ $2.99/lb"
WEIGHT_ITEM_RE = re.compile(
    r"(\d+\.?\d*)\s*(?:lb|kg|oz|lbs)\s*[@]\s*(?:Rs\.?|₹|\$|£|€)?\s*(\d+\.?\d*)",
    re.I
)

# ---------------------------------------------------------------------------
# Image preprocessing
# ---------------------------------------------------------------------------

def _preprocess_image(img: Image.Image) -> np.ndarray:
    """
    Prepare the receipt image for OCR.  Returns a **grayscale** numpy array.

    Passing a single-channel (H×W) array to EasyOCR instead of an RGB
    (H×W×3) array reduces the work by ~3× which is critical on CPU-only
    Railway deployments.

    Steps:
    1. Resize if too large (target ≤1200px longest edge).
    2. Convert to grayscale.
    3. Auto-contrast to handle varying lighting / faded thermal ink.
    4. Light denoise (median filter).
    5. Sharpen to recover thin receipt characters.
    """
    w, h = img.size
    if max(w, h) > MAX_IMAGE_DIMENSION:
        scale = MAX_IMAGE_DIMENSION / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        logger.info("Resized image from %dx%d to %dx%d", w, h, img.width, img.height)

    # Grayscale + enhance
    img = img.convert("L")
    img = ImageOps.autocontrast(img, cutoff=2)
    img = img.filter(ImageFilter.MedianFilter(size=3))
    img = ImageEnhance.Sharpness(img).enhance(1.5)

    # Return single-channel numpy array (H, W) – NOT (H, W, 3)
    return np.array(img)


def _run_ocr(img_array: np.ndarray) -> list:
    """
    Run EasyOCR on a preprocessed numpy array.

    Key speed optimisations vs defaults:
    - ``decoder='greedy'`` – skips beam search, ~2× faster recognition.
    - ``batch_size=8``     – recognise multiple text boxes in parallel.
    - grayscale input      – 3× fewer pixels for CRAFT to process.
    - no mag_ratio         – avoids upscaling the image.
    """
    import time
    t0 = time.time()

    results = reader.readtext(
        img_array,
        # CRAFT text-detector tuning
        text_threshold=0.5,
        low_text=0.35,
        link_threshold=0.25,
        width_ths=0.8,
        # Speed optimisations
        decoder="greedy",       # skip beam search → ~2× faster
        batch_size=16,          # recognise 16 crops at once (8 CPU cores)
        paragraph=False,
        detail=1,
        slope_ths=0.3,
    )

    # Filter low-confidence noise
    results = [
        (box, text, conf)
        for box, text, conf in results
        if conf >= CONFIDENCE_THRESHOLD and len(text.strip()) >= 1
    ]

    elapsed = time.time() - t0
    avg_conf = (
        sum(c for _, _, c in results) / len(results) if results else 0
    )
    logger.info(
        "OCR done in %.1fs – %d detections, avg conf %.2f",
        elapsed, len(results), avg_conf
    )
    return results


# ---------------------------------------------------------------------------
# Line merging
# ---------------------------------------------------------------------------

def _sort_results_by_y(results: list) -> list:
    """Sort EasyOCR results top-to-bottom by the average Y of each bounding box."""
    def avg_y(r):
        box = r[0]
        return sum(pt[1] for pt in box) / len(box)
    return sorted(results, key=avg_y)


def _compute_adaptive_y_threshold(results: list) -> float:
    """
    Compute an adaptive y_threshold based on the median text-box height.
    This handles receipts photographed at different distances/resolutions.
    """
    if not results:
        return 15.0

    heights = []
    for box, _text, _conf in results:
        ys = [pt[1] for pt in box]
        h = max(ys) - min(ys)
        if h > 0:
            heights.append(h)

    if not heights:
        return 15.0

    median_h = statistics.median(heights)
    threshold = median_h * 0.6
    return max(8.0, min(threshold, 50.0))


def _merge_nearby_boxes(results: list) -> list[str]:
    """
    Merge bounding boxes that sit on the same horizontal line into single
    text lines, reading left to right.  Uses adaptive y_threshold.
    """
    if not results:
        return []

    results = _sort_results_by_y(results)
    y_threshold = _compute_adaptive_y_threshold(results)
    logger.info("Adaptive y_threshold: %.1f px", y_threshold)

    lines: list[list[tuple]] = []
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
            current_line.append((avg_x, text))
            current_y = (current_y + avg_y) / 2
        else:
            lines.append(current_line)
            current_line = [(avg_x, text)]
            current_y = avg_y

    if current_line:
        lines.append(current_line)

    merged: list[str] = []
    for line_items in lines:
        line_items.sort(key=lambda item: item[0])
        merged.append(" ".join(t for _, t in line_items))

    return merged


# ---------------------------------------------------------------------------
# Store detection
# ---------------------------------------------------------------------------

def _detect_store(lines: list[str], raw_text: str) -> str:
    """
    Detect which store the receipt is from.
    Returns one of the STORE_PATTERNS keys or "generic".
    """
    # Check first 10 lines (store name is near top)
    header = "\n".join(lines[:10])

    for store_name, patterns in STORE_PATTERNS.items():
        for pat in patterns:
            if pat.search(header):
                return store_name

    # Fallback: check entire text for Indian grocery markers
    for pat in STORE_PATTERNS.get("indian_grocery", []):
        if pat.search(raw_text):
            return "indian_grocery"

    return "generic"


# ---------------------------------------------------------------------------
# Structured extraction helpers
# ---------------------------------------------------------------------------

def _is_noise(line: str, store: str = "generic") -> bool:
    """Return True if *line* matches any noise pattern."""
    if any(pat.search(line) for pat in NOISE_PATTERNS):
        return True

    # Store-specific noise
    extra_noise = {
        "costco": COSTCO_NOISE,
        "walmart": WALMART_NOISE,
        "target": TARGET_NOISE,
    }
    for pat in extra_noise.get(store, []):
        if pat.search(line):
            return True

    return False


def _extract_currency(lines: list[str], raw_text: str) -> str | None:
    """Find the dominant currency symbol in the text."""
    m = CURRENCY_RE.search(raw_text)
    if m:
        sym = m.group(1)
        if sym.lower().startswith("rs"):
            return "₹"
        return sym
    return "$"  # Default to USD for US stores


def _extract_merchant(lines: list[str], store: str = "generic") -> str | None:
    """
    Merchant name is usually the first non-noise, non-date, alphabetic line.
    For known stores, use the canonical name.
    """
    canonical = {
        "costco": "Costco Wholesale",
        "walmart": "Walmart",
        "target": "Target",
        "kroger": "Kroger",
        "aldi": "ALDI",
        "trader_joes": "Trader Joe's",
        "whole_foods": "Whole Foods Market",
        "heb": "H-E-B",
    }
    if store in canonical:
        return canonical[store]

    for line in lines[:5]:
        if _is_noise(line, store):
            continue
        if DATE_RE.search(line):
            continue
        text = line.strip()
        if len(text) < 3:
            continue
        alpha = sum(1 for c in text if c.isalpha())
        if alpha < len(text) * 0.3:
            continue
        return text
    return None


def _extract_date(lines: list[str]) -> str | None:
    """Find the first date in the receipt."""
    for line in lines:
        m = DATE_RE_VERBOSE.search(line)
        if m:
            # Return the first non-None group
            for g in m.groups():
                if g:
                    return g.strip()
    return None


def _extract_amount_from_line(line: str) -> float | None:
    """Extract a numeric amount from a line, avoiding false matches."""
    # Try price regex first (anchored patterns)
    m = PRICE_RE.search(line)
    if m:
        raw = m.group(1) or m.group(2)
        if raw:
            try:
                return float(raw)
            except ValueError:
                pass

    # Fallback to broad amount regex
    m = AMOUNT_RE.search(line)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            pass
    return None


def _extract_total(lines: list[str]) -> tuple[float | None, str | None]:
    """
    Find the total amount by checking keywords in priority order.
    Returns (amount, currency_symbol).
    """
    # Pass 1: explicit "total" keywords (in priority order)
    for pattern in TOTAL_KEYWORDS:
        for line in lines:
            if pattern.search(line):
                # Avoid matching "subtotal" when looking for "total"
                if any(st.search(line) for st in SUBTOTAL_KEYWORDS):
                    continue
                # Search part after the keyword
                after_kw = pattern.sub("", line)
                m = AMOUNT_RE.search(after_kw)
                if m:
                    try:
                        amount = float(m.group(1))
                        curr = CURRENCY_RE.search(line)
                        sym = curr.group(1) if curr else None
                        if sym and sym.lower().startswith("rs"):
                            sym = "₹"
                        if amount >= 0.01:
                            return amount, sym
                    except ValueError:
                        pass

    # Pass 2: last line with a price
    for line in reversed(lines):
        if _is_noise(line):
            continue
        if any(kw.search(line) for kw in SAVINGS_KEYWORDS):
            continue
        amt = _extract_amount_from_line(line)
        if amt and amt >= 1.0:
            curr = CURRENCY_RE.search(line)
            sym = curr.group(1) if curr else None
            if sym and sym.lower().startswith("rs"):
                sym = "₹"
            return amt, sym

    return None, None


def _extract_subtotal(lines: list[str]) -> float | None:
    """Extract subtotal if present."""
    for pat in SUBTOTAL_KEYWORDS:
        for line in lines:
            if pat.search(line):
                after_kw = pat.sub("", line)
                m = AMOUNT_RE.search(after_kw)
                if m:
                    try:
                        return float(m.group(1))
                    except ValueError:
                        pass
    return None


def _extract_tax(lines: list[str]) -> float | None:
    """Extract sales tax if present."""
    for pat in TAX_KEYWORDS:
        for line in lines:
            if pat.search(line):
                # Make sure it's not just a "tax" keyword on a non-amount line
                after_kw = pat.sub("", line)
                m = AMOUNT_RE.search(after_kw)
                if m:
                    try:
                        val = float(m.group(1))
                        # Tax is usually much smaller than total
                        if val < 500:
                            return val
                    except ValueError:
                        pass
    return None


def _extract_savings(lines: list[str]) -> float | None:
    """Extract total savings/discounts if present."""
    for pat in SAVINGS_KEYWORDS:
        for line in lines:
            if pat.search(line):
                m = AMOUNT_RE.search(pat.sub("", line))
                if m:
                    try:
                        return float(m.group(1))
                    except ValueError:
                        pass
    return None


def _extract_item_count_from_text(lines: list[str], store: str) -> int | None:
    """Check if the receipt itself says how many items there are."""
    # Costco format: "## Items Sold"
    if store == "costco":
        for line in lines:
            m = COSTCO_ITEM_COUNT_RE.search(line)
            if m:
                try:
                    return int(m.group(1))
                except ValueError:
                    pass

    for line in lines:
        m = ITEM_COUNT_RE.search(line)
        if m:
            try:
                return int(m.group(1))
            except ValueError:
                pass
    return None


# ---------------------------------------------------------------------------
# Item extraction – store-specific logic
# ---------------------------------------------------------------------------

def _clean_item_name(name: str, store: str) -> str:
    """Clean up an item name after stripping prices/codes."""
    # Remove item codes at start for Costco
    if store == "costco":
        name = COSTCO_ITEM_CODE_RE.sub("", name)

    # Remove UPC/item codes for Walmart
    if store == "walmart":
        name = WALMART_ITEM_CODE_RE.sub("", name)

    # Remove Target DPCI
    if store == "target":
        name = TARGET_DPCI_RE.sub("", name)

    # Remove tax suffix letters (E, A for Costco; N, T, O for Walmart; T, F for Target)
    name = re.sub(r"\s+[EATFNOX]\s*$", "", name, flags=re.I)

    # Remove price patterns
    name = PRICE_RE.sub("", name)
    name = CURRENCY_RE.sub("", name)
    name = QTY_PRICE_RE.sub("", name)
    name = WEIGHT_ITEM_RE.sub("", name)

    # Remove stray digits that look like codes (4+ consecutive digits)
    name = re.sub(r"\b\d{4,}\b", "", name)

    # Clean up whitespace and punctuation
    name = re.sub(r"\s+", " ", name).strip(" -:,./\\|")

    return name


def _is_non_item_line(line: str, store: str) -> bool:
    """
    Return True if the line should be skipped during item extraction
    (it's a total/subtotal/tax/savings/header/noise line).
    """
    if _is_noise(line, store):
        return True
    if any(kw.search(line) for kw in TOTAL_KEYWORDS):
        return True
    if any(kw.search(line) for kw in SUBTOTAL_KEYWORDS):
        return True
    if any(kw.search(line) for kw in TAX_KEYWORDS):
        return True
    if any(kw.search(line) for kw in SAVINGS_KEYWORDS):
        return True
    return False


def _extract_items(
    lines: list[str],
    total: float | None,
    store: str = "generic",
) -> list[dict]:
    """
    Extract items from receipt lines.  Uses store-specific heuristics
    for Costco, Walmart, Target, and Indian grocery stores.
    """
    items: list[dict] = []
    seen_total = False

    for line in lines:
        stripped = line.strip()
        if not stripped or len(stripped) < 3:
            continue

        # Skip non-item lines
        if _is_non_item_line(stripped, store):
            if any(kw.search(stripped) for kw in TOTAL_KEYWORDS):
                seen_total = True
            continue

        # Stop processing after we see the total line
        if seen_total:
            continue

        # Skip date-only lines
        if DATE_RE.search(stripped):
            non_date = DATE_RE.sub("", stripped).strip()
            if len(non_date) < 5:
                continue

        # ---- Try to find a price in this line ---

        # Check for weight-based items first: "1.23 lb @ $2.99/lb"
        weight_match = WEIGHT_ITEM_RE.search(stripped)
        qty_match = QTY_PRICE_RE.search(stripped)
        price_match = PRICE_RE.search(stripped)

        price = None
        qty = 1

        if weight_match:
            # Weight-based: use the total line price, not per-unit
            try:
                weight = float(weight_match.group(1))
                unit_price = float(weight_match.group(2))
                price = round(weight * unit_price, 2)
                qty = 1
            except ValueError:
                pass
            # Also check if there's a separate total price on the line
            if price_match:
                raw_p = price_match.group(1) or price_match.group(2)
                if raw_p:
                    try:
                        ext_price = float(raw_p)
                        # If there's an extended price, prefer it
                        if ext_price > 0:
                            price = ext_price
                    except ValueError:
                        pass

        elif qty_match:
            # Qty x Unit pattern
            try:
                qty = int(qty_match.group(1))
                unit_price = float(qty_match.group(2))
                price = round(qty * unit_price, 2)
            except ValueError:
                pass
            # Check for extended price
            if price_match:
                raw_p = price_match.group(1) or price_match.group(2)
                if raw_p:
                    try:
                        ext_price = float(raw_p)
                        if ext_price > 0:
                            price = ext_price
                    except ValueError:
                        pass

        elif price_match:
            raw_p = price_match.group(1) or price_match.group(2)
            if raw_p:
                try:
                    price = float(raw_p)
                except ValueError:
                    continue

        if price is None or price <= 0:
            continue

        # Sanity check – an individual item shouldn't exceed the total
        if total and price > total * 1.1:
            continue

        # Clean item name
        name = _clean_item_name(stripped, store)

        if not name or len(name) < 2:
            continue

        # Skip if name is mostly digits
        alpha_chars = sum(1 for c in name if c.isalpha())
        if alpha_chars < max(1, len(name) * 0.25):
            continue

        # For Costco, item names are often in ALL CAPS – title-case them
        if store == "costco" and name == name.upper() and len(name) > 3:
            name = name.title()

        items.append({
            "name": name,
            "quantity": qty,
            "price": price,
        })

    return items


# ---------------------------------------------------------------------------
# Post-processing: validate item list against total
# ---------------------------------------------------------------------------

def _validate_items_against_total(
    items: list[dict],
    total: float | None,
    subtotal: float | None,
) -> list[dict]:
    """
    Cross-check extracted items against the receipt total.
    Remove obvious duplicates or misparses.
    """
    if not items:
        return items

    # De-duplicate by (name, price)
    seen = set()
    unique_items = []
    for item in items:
        key = (item["name"].lower(), item["price"])
        if key not in seen:
            seen.add(key)
            unique_items.append(item)

    ref = subtotal or total
    if ref:
        items_sum = sum(i["price"] for i in unique_items)
        # If items sum is wildly off (>2x), something went wrong –
        # but still return what we have
        if items_sum > ref * 2.5:
            logger.warning(
                "Items sum ($%.2f) is > 2.5x the total ($%.2f) – "
                "some items may be mis-parsed",
                items_sum, ref,
            )

    return unique_items


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="EasyOCR Microservice",
    description="Extracts English text from grocery receipts & product labels.",
    version="2.1.0",
)


@app.get("/health")
async def health():
    """Simple liveness / readiness check."""
    return {"status": "ok"}


@app.post("/ocr")
async def ocr(file: UploadFile = File(...)):
    """
    Accept a single image upload and return extracted text with structured
    receipt data.

    Returns
    -------
    JSON with:
      - raw_text (str)
      - lines (list[str])
      - items (list of {name, quantity, price})
      - merchant (str | null)
      - purchase_date (str | null)
      - total (float | null)
      - subtotal (float | null)
      - tax (float | null)
      - savings (float | null)
      - currency (str | null)
      - item_count (int)
      - detected_store (str)
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

    # --- preprocess + OCR -------------------------------------------------
    try:
        img = Image.open(io.BytesIO(raw_bytes))
        # Fix orientation using EXIF data (mobile photos are often rotated)
        img = ImageOps.exif_transpose(img)
        img_array = _preprocess_image(img)
    except Exception as exc:
        logger.exception("Image preprocessing failed")
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}")

    logger.info("Image ready: %s, shape=%s", img_array.dtype, img_array.shape)
    results = _run_ocr(img_array)

    if not results:
        logger.warning("No text detected in image")
        return JSONResponse(content={
            "raw_text": "",
            "lines": [],
            "items": [],
            "merchant": None,
            "purchase_date": None,
            "total": None,
            "subtotal": None,
            "tax": None,
            "savings": None,
            "currency": None,
            "item_count": 0,
            "detected_store": "unknown",
        })

    # --- merge into logical lines ----------------------------------------
    lines = _merge_nearby_boxes(results)
    raw_text = "\n".join(lines)

    # --- detect store type -----------------------------------------------
    store = _detect_store(lines, raw_text)
    logger.info("Detected store: %s", store)

    # --- structured extraction -------------------------------------------
    merchant = _extract_merchant(lines, store)
    purchase_date = _extract_date(lines)
    total, total_currency = _extract_total(lines)
    currency = total_currency or _extract_currency(lines, raw_text)
    subtotal = _extract_subtotal(lines)
    tax = _extract_tax(lines)
    savings = _extract_savings(lines)

    # Items – skip header lines (merchant/address)
    # For large receipts (>6 lines), skip first 2; otherwise skip 1
    skip = 2 if len(lines) > 6 else (1 if len(lines) > 2 else 0)
    item_lines = lines[skip:]
    items = _extract_items(item_lines, total, store)
    items = _validate_items_against_total(items, total, subtotal)

    receipt_item_count = _extract_item_count_from_text(lines, store)
    item_count = receipt_item_count if receipt_item_count else len(items)

    # Normalise currency for Indian grocery stores in USA
    if store == "indian_grocery" and currency == "₹":
        # Indian stores in the USA actually charge in USD
        currency = "$"

    logger.info(
        "OCR complete [%s] – %d detection(s), %d merged line(s), "
        "%d item(s), total=%.2f, subtotal=%s, tax=%s, merchant=%s, date=%s",
        store,
        len(results),
        len(lines),
        len(items),
        total or 0,
        subtotal,
        tax,
        merchant,
        purchase_date,
    )

    return JSONResponse(
        content={
            "raw_text": raw_text,
            "lines": lines,
            "items": items,
            "merchant": merchant,
            "purchase_date": purchase_date,
            "total": total,
            "subtotal": subtotal,
            "tax": tax,
            "savings": savings,
            "currency": currency,
            "item_count": item_count,
            "detected_store": store,
        }
    )


# ---------------------------------------------------------------------------
# Entrypoint (for dev: python app.py)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
