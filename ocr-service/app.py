"""
Google Cloud Vision OCR Microservice – v3.0
============================================
Stateless FastAPI service that extracts English text from grocery-product
labels and store receipts using Google Cloud Vision API.

Google Vision provides dramatically better accuracy than EasyOCR for
receipt text – it handles blurry, skewed, faded thermal receipts with
near-perfect results and is free for up to 1,000 requests/month.

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
import json
import logging
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from google.cloud import vision
from PIL import Image, ImageOps

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("ocr-service")

# ---------------------------------------------------------------------------
# Google Cloud Vision client
# ---------------------------------------------------------------------------
# Authentication options (in order of precedence):
# 1. GOOGLE_APPLICATION_CREDENTIALS env var → path to a service-account JSON
# 2. GOOGLE_CLOUD_API_KEY env var → simple API key (no service account needed)
# 3. Default credentials (e.g. when running on GCP)

_api_key = os.getenv("GOOGLE_CLOUD_API_KEY")

if _api_key:
    # Use API key authentication (simpler setup, no service account needed)
    vision_client = vision.ImageAnnotatorClient(
        client_options={"api_key": _api_key}
    )
    logger.info("Google Cloud Vision client initialized with API key ✓")
else:
    # Use default credentials (service account JSON via GOOGLE_APPLICATION_CREDENTIALS)
    vision_client = vision.ImageAnnotatorClient()
    logger.info("Google Cloud Vision client initialized with default credentials ✓")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB (Vision API limit)

# ---------------------------------------------------------------------------
# Price regexes – crafted to avoid matching phone-numbers / barcodes
# ---------------------------------------------------------------------------
# Matches prices WITH a currency symbol: $12.50, Rs. 45.00, ₹125, €9.99
CURRENCY_PRICE_RE = re.compile(
    r"(?:Rs\.?|₹|\$|£|€)\s*(\d{1,6}(?:\.\d{1,2})?)", re.IGNORECASE
)

# Matches prices that are a number with exactly 2 decimal places (e.g. 45.67)
# This is the hallmark of a price on a receipt – item counts never have .XX
DECIMAL_PRICE_RE = re.compile(
    r"\b(\d{1,6}\.\d{2})\b"
)

# Legacy combined regex (used by item extraction for backward compat)
PRICE_RE = re.compile(
    r"(?:Rs\.?|₹|\$|£|€)\s*(\d{1,6}(?:\.\d{1,2})?)"
    r"|"
    r"(\d{1,6}\.\d{2})\s*(?:Rs\.?|₹|\$|£|€)?(?:\s*[A-Z])?$"
    , re.IGNORECASE | re.MULTILINE
)

AMOUNT_RE = re.compile(r"(?:Rs\.?|₹|\$|£|€)?\s?(\d{1,6}(?:\.\d{1,2})?)")

# Lines that mention "total" but are NOT dollar amounts (skip these)
TOTAL_ITEM_COUNT_RE = re.compile(
    r"\btotal\s*(?:items?|qty|quantities?)\b"
    r"|\b(?:items?|qty)\s*(?:sold|total|count)\b",
    re.IGNORECASE
)
CURRENCY_RE = re.compile(r"(Rs\.?|₹|\$|£|€)", re.IGNORECASE)
# Date patterns – separators (/ - .) are REQUIRED to avoid matching zip codes.
# "02/15/2026" ✓   "2026-02-15" ✓   "08901" ✗ (zip code)
DATE_RE = re.compile(
    r"\b(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})"
    r"|"
    r"\b(\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2})\b"
)
DATE_RE_VERBOSE = re.compile(
    r"\b(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})\b"
    r"|"
    r"\b(\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2})\b"
    r"|"
    r"\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{2,4})\b"
    r"|"
    r"\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{2,4})\b"
    , re.IGNORECASE
)

# Address line detection – skip these when looking for dates
ADDRESS_RE = re.compile(
    r"\b(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD"
    r"|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD"
    r"|TN|TX|UT|VT|VA|WA|WV|WI|WY)\s*\d{5}\b",
    re.IGNORECASE
)

# Keyword that indicates a date line on receipts
DATE_KEYWORD_RE = re.compile(
    r"\b(?:date|dt|dated)\b", re.IGNORECASE
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
    re.compile(r"\bwww\.|\.\bcom\b|\.\borg\b", re.I),         # URLs
    re.compile(r"\btax\s*(?:invoice|receipt)\b", re.I),       # headers
    re.compile(r"\b(?:bill|invoice)\s*(?:no|#|number)\b", re.I),
    re.compile(r"\boriginal\s*(?:for|copy)\b", re.I),
    re.compile(r"\b(?:store|str)\s*(?:#|no|number)\s*\d", re.I),
    re.compile(r"\b(?:cashier|operator|register|terminal)\b", re.I),
    re.compile(r"\b(?:member|membership)\s*(?:#|no|id)\b", re.I),
    re.compile(r"\bref\s*(?:#|no)\b", re.I),
    re.compile(r"\b(?:visa|mastercard|amex|discover|debit|credit)\b", re.I),
    re.compile(r"\bchange\s*due\b", re.I),
    re.compile(r"\b(?:return|exchange)\s*policy\b", re.I),
    re.compile(r"\bvalid\s*(?:thru|through|until)\b", re.I),
    re.compile(r"\bapproval\s*(?:code|#)\b", re.I),
    re.compile(r"\b(?:tc|transaction)\s*#?\s*\d", re.I),
    re.compile(r"^\s*\d{12,}\s*$"),                            # pure UPC/barcode lines
]

COSTCO_NOISE = [
    re.compile(r"^\s*\d{7}\s*$"),
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
# Total / subtotal / tax / savings keywords
# ---------------------------------------------------------------------------
TOTAL_KEYWORDS = [
    re.compile(r"\bgrand\s*total\b", re.I),
    re.compile(r"\bnet\s*(?:amount|total|payable)\b", re.I),
    re.compile(r"\b(?:order\s*)?total\s*(?:amount|payable|due)?\b", re.I),
    re.compile(r"\bamount\s*(?:due|payable|tendered)\b", re.I),
    re.compile(r"\bbalance\s*due\b", re.I),
    re.compile(r"\bpayable\b", re.I),
]

SUBTOTAL_KEYWORDS = [
    re.compile(r"\bsub[\s\-]?total\b", re.I),
    re.compile(r"\bmerch(?:andise)?\s*(?:sub)?total\b", re.I),
]

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

ITEM_COUNT_RE = re.compile(
    r"\b(?:total\s*)?(?:items?|qty|quantities?|no\.?\s*of\s*items?)"
    r"\s*[:\-]?\s*(\d{1,4})\b", re.I
)

COSTCO_ITEM_COUNT_RE = re.compile(
    r"\b(\d{1,3})\s*items?\s*sold\b", re.I
)

QTY_PRICE_RE = re.compile(
    r"(\d+)\s*[xX×@]\s*(?:Rs\.?|₹|\$|£|€)?\s*(\d{1,6}(?:\.\d{1,2})?)"
)

COSTCO_ITEM_CODE_RE = re.compile(r"^\s*(\d{5,7})\s+")
WALMART_ITEM_CODE_RE = re.compile(
    r"^\s*(?:\d[\s\-]?)?\d{10,13}\s+"
    r"|"
    r"^\s*\d{9,13}\s+"
)
TARGET_DPCI_RE = re.compile(r"\d{3}[\-\s]\d{2}[\-\s]\d{4}")
COSTCO_TAX_SUFFIX_RE = re.compile(r"\s+[EA]\s*$")
WALMART_TAX_SUFFIX_RE = re.compile(r"\s+[NTOXA]\s*$")
TARGET_TAX_SUFFIX_RE = re.compile(r"\s+[TFX]\s*$")
WEIGHT_ITEM_RE = re.compile(
    r"(\d+\.?\d*)\s*(?:lb|kg|oz|lbs)\s*[@]\s*(?:Rs\.?|₹|\$|£|€)?\s*(\d+\.?\d*)",
    re.I
)


# ---------------------------------------------------------------------------
# Google Cloud Vision – text detection
# ---------------------------------------------------------------------------

def _detect_text_vision(image_bytes: bytes) -> str:
    """
    Send image bytes to Google Cloud Vision TEXT_DETECTION and return
    the full text annotation.

    TEXT_DETECTION is optimised for scene text (signs, labels, receipts)
    and handles rotation, skew, varying lighting, and low contrast
    far better than local OCR engines.
    """
    image = vision.Image(content=image_bytes)

    # Use DOCUMENT_TEXT_DETECTION for dense text like receipts – it uses
    # a model optimised for documents and returns better paragraph/line
    # grouping than plain TEXT_DETECTION.
    response = vision_client.document_text_detection(
        image=image,
        image_context={"language_hints": ["en"]},
    )

    if response.error.message:
        raise RuntimeError(
            f"Google Vision API error: {response.error.message}"
        )

    if not response.full_text_annotation:
        logger.warning("Google Vision returned no text")
        return ""

    return response.full_text_annotation.text


# ---------------------------------------------------------------------------
# Image preparation (minimal – Vision API handles most preprocessing)
# ---------------------------------------------------------------------------

def _prepare_image_bytes(raw_bytes: bytes) -> bytes:
    """
    Minimal image preparation before sending to Vision API:
    1. Fix EXIF orientation (mobile photos are often rotated).
    2. Resize if image is unreasonably large (save bandwidth/cost).
    3. Re-encode as PNG.

    Google Vision handles contrast/lighting/skew internally, so we
    don't need heavy preprocessing like we did with EasyOCR.
    """
    img = Image.open(io.BytesIO(raw_bytes))
    img = ImageOps.exif_transpose(img)

    # Resize only if very large (Vision API handles up to 20MB but
    # receipts don't need more than 2000px for perfect accuracy)
    MAX_DIM = 2000
    w, h = img.size
    if max(w, h) > MAX_DIM:
        scale = MAX_DIM / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        logger.info("Resized image from %dx%d to %dx%d", w, h, img.width, img.height)

    # Convert to RGB if not already (handles RGBA, palette, etc.)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    # Encode as PNG
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Store detection
# ---------------------------------------------------------------------------

def _detect_store(lines: list[str], raw_text: str) -> str:
    header = "\n".join(lines[:10])
    for store_name, patterns in STORE_PATTERNS.items():
        for pat in patterns:
            if pat.search(header):
                return store_name
    for pat in STORE_PATTERNS.get("indian_grocery", []):
        if pat.search(raw_text):
            return "indian_grocery"
    return "generic"


# ---------------------------------------------------------------------------
# Structured extraction helpers
# ---------------------------------------------------------------------------

def _is_noise(line: str, store: str = "generic") -> bool:
    if any(pat.search(line) for pat in NOISE_PATTERNS):
        return True
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
    m = CURRENCY_RE.search(raw_text)
    if m:
        sym = m.group(1)
        if sym.lower().startswith("rs"):
            return "₹"
        return sym
    return "$"


def _extract_merchant(lines: list[str], store: str = "generic") -> str | None:
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
    """
    Extract the purchase date from receipt lines.

    Strategy:
    1. First look for lines that contain a "DATE" keyword (most reliable).
    2. Then scan all lines for date patterns.
    3. Skip lines that look like addresses (state + zip code).
    """
    # Pass 1: lines with explicit "DATE" keyword (highest confidence)
    for line in lines:
        if DATE_KEYWORD_RE.search(line):
            m = DATE_RE_VERBOSE.search(line)
            if m:
                for g in m.groups():
                    if g:
                        return g.strip()

    # Pass 2: any line with a date pattern, but skip address lines
    for line in lines:
        # Skip lines that look like addresses ("NJ 08901", "CA 90210")
        if ADDRESS_RE.search(line):
            continue
        m = DATE_RE_VERBOSE.search(line)
        if m:
            for g in m.groups():
                if g:
                    return g.strip()
    return None


def _find_best_price(text: str) -> float | None:
    """
    Find the best price-like number in a string.

    Strategy (in priority order):
    1. Currency-anchored prices ($45.67, Rs. 100) – take the LAST one
       (prices are right-aligned on receipts).
    2. Decimal prices (45.67) – numbers with exactly 2 decimal places
       are almost always prices, not counts.  Take the LAST one.
    3. Fall back to None – bare integers like "5" are probably item
       counts, not dollar amounts.
    """
    # Priority 1: currency-symbol prices (most reliable)
    currency_matches = CURRENCY_PRICE_RE.findall(text)
    if currency_matches:
        try:
            return float(currency_matches[-1])  # last = rightmost on receipt
        except ValueError:
            pass

    # Priority 2: numbers with exactly 2 decimal places (e.g. 45.67)
    decimal_matches = DECIMAL_PRICE_RE.findall(text)
    if decimal_matches:
        try:
            return float(decimal_matches[-1])
        except ValueError:
            pass

    # Do NOT fall back to bare integers – they're usually item counts,
    # store numbers, or other non-price data.
    return None


def _extract_amount_from_line(line: str) -> float | None:
    """Extract the best price from a receipt line."""
    return _find_best_price(line)


def _extract_total(lines: list[str]) -> tuple[float | None, str | None]:
    """
    Find the total amount.  Handles multi-line receipts where the keyword
    ("Total Charge:") is on one line and the amount ("$77.65") is on the
    next line.
    """
    for pattern in TOTAL_KEYWORDS:
        for i, line in enumerate(lines):
            if not pattern.search(line):
                continue

            # Skip subtotal lines
            if any(st.search(line) for st in SUBTOTAL_KEYWORDS):
                continue

            # Skip "total items" lines
            if TOTAL_ITEM_COUNT_RE.search(line):
                continue

            # Skip tax lines ("Tax Total:" is NOT the receipt total)
            if any(t.search(line) for t in TAX_KEYWORDS):
                continue

            # Try price on the SAME line
            amount = _find_best_price(line)

            # If no price on same line, check the NEXT few lines
            if amount is None:
                for j in range(1, 4):
                    if i + j >= len(lines):
                        break
                    next_line = lines[i + j]
                    # Stop if we hit another keyword line
                    if any(kw.search(next_line) for kw in
                           TOTAL_KEYWORDS + SUBTOTAL_KEYWORDS + TAX_KEYWORDS + SAVINGS_KEYWORDS):
                        break
                    amount = _find_best_price(next_line)
                    if amount is not None:
                        break

            if amount is not None and amount >= 0.01:
                # Look for currency on the keyword line or the amount line
                curr = CURRENCY_RE.search(line)
                if not curr:
                    for j in range(1, 4):
                        if i + j >= len(lines):
                            break
                        curr = CURRENCY_RE.search(lines[i + j])
                        if curr:
                            break
                sym = curr.group(1) if curr else None
                if sym and sym.lower().startswith("rs"):
                    sym = "₹"
                return amount, sym

    # Fallback: scan from bottom up for the last line with a price
    for line in reversed(lines):
        if _is_noise(line):
            continue
        if any(kw.search(line) for kw in SAVINGS_KEYWORDS):
            continue
        if TOTAL_ITEM_COUNT_RE.search(line):
            continue
        amt = _find_best_price(line)
        if amt and amt >= 1.0:
            curr = CURRENCY_RE.search(line)
            sym = curr.group(1) if curr else None
            if sym and sym.lower().startswith("rs"):
                sym = "₹"
            return amt, sym

    return None, None


def _extract_subtotal(lines: list[str]) -> float | None:
    """Extract subtotal – handles amount on same or next line."""
    for pat in SUBTOTAL_KEYWORDS:
        for i, line in enumerate(lines):
            if pat.search(line):
                amount = _find_best_price(line)
                if amount is not None and amount >= 0.01:
                    return amount
                # Check next few lines
                for j in range(1, 4):
                    if i + j >= len(lines):
                        break
                    next_line = lines[i + j]
                    if any(kw.search(next_line) for kw in
                           TOTAL_KEYWORDS + SUBTOTAL_KEYWORDS + TAX_KEYWORDS):
                        break
                    amount = _find_best_price(next_line)
                    if amount is not None and amount >= 0.01:
                        return amount
    return None


def _extract_tax(lines: list[str]) -> float | None:
    """Extract sales tax – handles amount on same or next line."""
    for pat in TAX_KEYWORDS:
        for i, line in enumerate(lines):
            if pat.search(line):
                amount = _find_best_price(line)
                if amount is not None and 0.01 <= amount < 500:
                    return amount
                # Check next few lines
                for j in range(1, 4):
                    if i + j >= len(lines):
                        break
                    next_line = lines[i + j]
                    if any(kw.search(next_line) for kw in
                           TOTAL_KEYWORDS + SUBTOTAL_KEYWORDS + TAX_KEYWORDS):
                        break
                    amount = _find_best_price(next_line)
                    if amount is not None and 0.01 <= amount < 500:
                        return amount
    return None


def _extract_savings(lines: list[str]) -> float | None:
    """Extract total savings/discounts – handles amount on same or next line."""
    for pat in SAVINGS_KEYWORDS:
        for i, line in enumerate(lines):
            if pat.search(line):
                amount = _find_best_price(line)
                if amount is not None and amount >= 0.01:
                    return amount
                for j in range(1, 4):
                    if i + j >= len(lines):
                        break
                    next_line = lines[i + j]
                    if any(kw.search(next_line) for kw in
                           TOTAL_KEYWORDS + SUBTOTAL_KEYWORDS + TAX_KEYWORDS + SAVINGS_KEYWORDS):
                        break
                    amount = _find_best_price(next_line)
                    if amount is not None and amount >= 0.01:
                        return amount
    return None


def _extract_item_count_from_text(lines: list[str], store: str) -> int | None:
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
# Item extraction
# ---------------------------------------------------------------------------

def _clean_item_name(name: str, store: str) -> str:
    if store == "costco":
        name = COSTCO_ITEM_CODE_RE.sub("", name)
    if store == "walmart":
        name = WALMART_ITEM_CODE_RE.sub("", name)
    if store == "target":
        name = TARGET_DPCI_RE.sub("", name)

    name = re.sub(r"\s+[EATFNOX]\s*$", "", name, flags=re.I)
    name = PRICE_RE.sub("", name)
    name = CURRENCY_RE.sub("", name)
    name = QTY_PRICE_RE.sub("", name)
    name = WEIGHT_ITEM_RE.sub("", name)
    name = re.sub(r"\b\d{4,}\b", "", name)
    name = re.sub(r"\s+", " ", name).strip(" -:,./\\|")
    return name


def _is_non_item_line(line: str, store: str) -> bool:
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


def _has_item_name(text: str) -> bool:
    """
    Check if a line contains a meaningful item name (at least 3 letters
    after stripping prices, quantities, and currency symbols).
    """
    cleaned = PRICE_RE.sub("", text)
    cleaned = QTY_PRICE_RE.sub("", cleaned)
    cleaned = CURRENCY_RE.sub("", cleaned)
    cleaned = WEIGHT_ITEM_RE.sub("", cleaned)
    alpha_chars = sum(1 for c in cleaned if c.isalpha())
    return alpha_chars >= 3


def _extract_items(
    lines: list[str],
    total: float | None,
    store: str = "generic",
) -> list[dict]:
    """
    Extract items from receipt lines using a multi-line buffered approach.

    Many receipts (especially from smaller stores) put the item name on one
    line and the price on the next:

        QUIK TEA GINGER CHAI 8.5OZ     ← name
        1 @ $5.99                       ← qty + unit price
        $5.99                           ← extended price

    Strategy:
    - When we see a text-only line (has letters, no price) → buffer it as
      the current item name.
    - When we see a price line → associate it with the buffered name.
    - The LAST price before the next item name wins (it's the extended price).
    - Stop when we hit subtotal/total keywords.
    """
    items: list[dict] = []
    pending_name: str | None = None
    pending_price: float | None = None
    pending_qty: int = 1

    def _finalize_pending():
        """Save the current pending item if we have both name and price."""
        nonlocal pending_name, pending_price, pending_qty
        if pending_name and pending_price is not None and pending_price > 0:
            name = _clean_item_name(pending_name, store)
            if name and len(name) >= 2:
                # Sanity: individual item shouldn't exceed total
                if total is None or pending_price <= total * 1.1:
                    # Title-case ALL CAPS names for readability
                    if store in ("costco", "indian_grocery") and name == name.upper() and len(name) > 3:
                        name = name.title()
                    items.append({
                        "name": name,
                        "quantity": pending_qty,
                        "price": pending_price,
                    })
        pending_name = None
        pending_price = None
        pending_qty = 1

    for line in lines:
        stripped = line.strip()
        if not stripped or len(stripped) < 2:
            continue

        # Stop at subtotal/total lines (items are above these)
        if any(kw.search(stripped) for kw in SUBTOTAL_KEYWORDS + TOTAL_KEYWORDS):
            _finalize_pending()
            break

        # Skip noise, tax, savings lines entirely
        if _is_non_item_line(stripped, store):
            continue

        # Skip date-only lines
        if DATE_RE.search(stripped):
            non_date = DATE_RE.sub("", stripped).strip()
            if len(non_date) < 5:
                continue

        # Determine: does this line have a price? Does it have a name?
        price = _find_best_price(stripped)
        is_name_line = _has_item_name(stripped)

        if is_name_line and price is None:
            # Pure item name line (e.g. "QUIK TEA GINGER CHAI 8.5OZ")
            # Finalize any previous pending item, then start new one
            _finalize_pending()
            pending_name = stripped
            pending_price = None
            pending_qty = 1

        elif is_name_line and price is not None:
            # Line has BOTH name and price (e.g. "BABY SPINACH $3.49")
            cleaned_name = _clean_item_name(stripped, store)
            if cleaned_name and len(cleaned_name) >= 2:
                _finalize_pending()
                pending_name = stripped
                pending_price = price
                # Check for qty pattern
                qty_match = QTY_PRICE_RE.search(stripped)
                pending_qty = int(qty_match.group(1)) if qty_match else 1
            else:
                # Name is too short after cleaning – treat as price-only
                if pending_name is not None:
                    pending_price = price
                    qty_match = QTY_PRICE_RE.search(stripped)
                    if qty_match:
                        pending_qty = int(qty_match.group(1))

        elif price is not None:
            # Price-only or qty+price line (e.g. "$5.99" or "1 @ $5.99")
            # Associate with the current pending item name
            if pending_name is not None:
                pending_price = price  # last price wins (extended price)
                qty_match = QTY_PRICE_RE.search(stripped)
                if qty_match:
                    pending_qty = int(qty_match.group(1))

        # else: line has no price and no meaningful name – skip it

    # Don't forget the last pending item
    _finalize_pending()

    return items


# ---------------------------------------------------------------------------
# Post-processing: validate items against total
# ---------------------------------------------------------------------------

def _validate_items_against_total(
    items: list[dict],
    total: float | None,
    subtotal: float | None,
) -> list[dict]:
    if not items:
        return items

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
    title="Google Vision OCR Microservice",
    description="Extracts text from grocery receipts using Google Cloud Vision API.",
    version="3.0.0",
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

    if len(raw_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Image too large ({len(raw_bytes) / 1024 / 1024:.1f} MB). "
                   f"Maximum is {MAX_IMAGE_BYTES / 1024 / 1024:.0f} MB.",
        )

    # --- prepare image + call Vision API ----------------------------------
    try:
        image_bytes = _prepare_image_bytes(raw_bytes)
    except Exception as exc:
        logger.exception("Image preparation failed")
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}")

    logger.info("Sending image to Google Cloud Vision (%d bytes)", len(image_bytes))

    try:
        raw_text = _detect_text_vision(image_bytes)
    except Exception as exc:
        logger.exception("Google Vision API call failed")
        raise HTTPException(
            status_code=502,
            detail=f"OCR service error: {exc}",
        )

    if not raw_text:
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

    # --- split into lines ------------------------------------------------
    lines = [l.strip() for l in raw_text.split("\n") if l.strip()]

    # Debug: log all OCR lines so we can see what Vision returned
    logger.info("=== RAW OCR LINES (%d) ===", len(lines))
    for i, line in enumerate(lines):
        logger.info("  [%02d] %s", i, line)
    logger.info("=== END RAW OCR LINES ===")

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

    skip = 2 if len(lines) > 6 else (1 if len(lines) > 2 else 0)
    item_lines = lines[skip:]
    items = _extract_items(item_lines, total, store)
    items = _validate_items_against_total(items, total, subtotal)

    receipt_item_count = _extract_item_count_from_text(lines, store)
    item_count = receipt_item_count if receipt_item_count else len(items)

    if store == "indian_grocery" and currency == "₹":
        currency = "$"

    logger.info(
        "=== EXTRACTION RESULTS [%s] ===\n"
        "  merchant=%s | date=%s\n"
        "  total=%.2f | subtotal=%s | tax=%s | savings=%s\n"
        "  currency=%s | items=%d | item_count=%d",
        store,
        merchant, purchase_date,
        total or 0, subtotal, tax, savings,
        currency, len(items), item_count,
    )
    for item in items:
        logger.info("  ITEM: %s | qty=%s | price=%.2f",
                     item["name"], item["quantity"], item["price"])

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
