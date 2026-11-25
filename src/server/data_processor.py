#!/usr/bin/env python3
"""
HY Precision Technologies — Python Data Processing & Preprocessing Engine.

Handles structured normalization, validation, engineering specification
preprocessing, comparison matrix synthesis, natural-language query
preprocessing, and SQLite fleet inventory analytics.
"""

from __future__ import annotations

import json
import math
import os
import re
import sqlite3
import statistics
import sys
import unicodedata
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse


CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
MULTI_SPACE_RE = re.compile(r"\s+")
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
NUMBER_RE = re.compile(r"-?\d+(?:,\d{3})*(?:\.\d+)?")

UNIT_ALIASES = {
    "meter": "Meters",
    "meters": "Meters",
    "m": "Meters",
    "liter": "Liters",
    "liters": "Liters",
    "l": "Liters",
    "knot": "Knots",
    "knots": "Knots",
    "kn": "Knots",
    "kgs": "kg",
    "kg": "kg",
    "tonne": "Tonnes (t)",
    "tonnes": "Tonnes (t)",
    "hp": "HP",
    "cv": "CV",
    "kw": "kW",
    "bar": "Bar",
    "days": "days",
    "years": "Years",
}

DEFAULT_IMAGE_URL = (
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800"
)


def normalize_text(value: Any, max_len: int | None = None, collapse_ws: bool = True) -> str:
    if value is None:
        return ""
    text = unicodedata.normalize("NFKC", str(value))
    text = CONTROL_CHAR_RE.sub("", text).strip()
    if collapse_ws:
        text = MULTI_SPACE_RE.sub(" ", text)
    if max_len is not None and max_len > 0:
        text = text[:max_len]
    return text


def normalize_unit(unit: Any) -> str:
    cleaned = normalize_text(unit, max_len=64)
    if not cleaned:
        return ""
    return UNIT_ALIASES.get(cleaned.lower(), cleaned)


def is_safe_asset_url(url: str) -> bool:
    trimmed = normalize_text(url, max_len=1024, collapse_ws=False)
    if not trimmed:
        return False
    if trimmed.startswith("/"):
        return not trimmed.startswith("//")
    try:
        parsed = urlparse(trimmed)
        return parsed.scheme in ("https", "http") and bool(parsed.netloc)
    except ValueError:
        return False


def extract_first_number(raw: Any) -> float | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)) and not isinstance(raw, bool):
        return float(raw) if math.isfinite(float(raw)) else None
    match = NUMBER_RE.search(str(raw))
    if not match:
        return None
    try:
        val = float(match.group(0).replace(",", ""))
        return val if math.isfinite(val) else None
    except ValueError:
        return None


def preprocess_specifications(specs: Any) -> list[dict[str, Any]]:
    if not isinstance(specs, list):
        return []
    cleaned: list[dict[str, Any]] = []
    seen_keys: set[str] = set()
    for item in specs:
        if not isinstance(item, dict):
            continue
        key = normalize_text(item.get("key") or item.get("spec_key"), max_len=120)
        value = normalize_text(item.get("value") or item.get("spec_value"), max_len=240)
        if not key or not value:
            continue
        unit = normalize_unit(item.get("unit"))
        highlight = bool(item.get("highlight") or item.get("is_highlight"))
        dedupe_key = key.lower()
        if dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)
        cleaned.append(
            {
                "key": key,
                "value": value,
                "unit": unit,
                "highlight": highlight,
            }
        )
    return cleaned


def preprocess_product(payload: dict[str, Any]) -> dict[str, Any]:
    mode = payload.get("mode", "create")
    data = payload.get("data") or {}
    specs = payload.get("specifications")

    result: dict[str, Any] = {}

    if mode == "create" or "sku" in data:
        sku = normalize_text(data.get("sku"), max_len=64).upper()
        if len(sku) < 3 or len(sku) > 64:
            raise ValueError("SKU must be between 3 and 64 characters.")
        result["sku"] = sku

    if mode == "create" or "title" in data:
        title = normalize_text(data.get("title"), max_len=200)
        if len(title) < 3 or len(title) > 200:
            raise ValueError("Product title must be between 3 and 200 characters.")
        result["title"] = title

    if mode == "create" or "price_usd" in data:
        raw_price = data.get("price_usd")
        try:
            price = float(raw_price)
        except (TypeError, ValueError) as exc:
            raise ValueError("Price must be a non-negative finite number.") from exc
        if not math.isfinite(price) or price < 0:
            raise ValueError("Price must be a non-negative finite number.")
        result["price_usd"] = round(price, 2)

    if mode == "create" or "stock_quantity" in data:
        raw_stock = data.get("stock_quantity")
        try:
            stock_float = float(raw_stock)
        except (TypeError, ValueError) as exc:
            raise ValueError("Stock quantity must be a non-negative integer.") from exc
        if not math.isfinite(stock_float) or not stock_float.is_integer() or stock_float < 0:
            raise ValueError("Stock quantity must be a non-negative integer.")
        result["stock_quantity"] = int(stock_float)

    if mode == "create" or "min_order_quantity" in data:
        raw_moq = data.get("min_order_quantity", 1)
        try:
            moq_float = float(1 if raw_moq is None else raw_moq)
        except (TypeError, ValueError) as exc:
            raise ValueError("Minimum order quantity must be at least 1.") from exc
        if not math.isfinite(moq_float) or not moq_float.is_integer() or moq_float < 1:
            raise ValueError("Minimum order quantity must be at least 1.")
        result["min_order_quantity"] = int(moq_float)

    if mode == "create" or "lead_time_days" in data:
        raw_lead = data.get("lead_time_days", 7)
        try:
            lead_float = float(7 if raw_lead is None else raw_lead)
        except (TypeError, ValueError) as exc:
            raise ValueError("Lead time days must be a non-negative integer.") from exc
        if not math.isfinite(lead_float) or not lead_float.is_integer() or lead_float < 0:
            raise ValueError("Lead time days must be a non-negative integer.")
        result["lead_time_days"] = int(lead_float)

    if mode == "create" or "category_id" in data:
        cat_id = normalize_text(data.get("category_id"), max_len=120)
        if not cat_id:
            raise ValueError("Category ID is required.")
        result["category_id"] = cat_id

    if mode == "create" or "short_desc" in data:
        result["short_desc"] = normalize_text(data.get("short_desc"), max_len=500)

    if mode == "create" or "description" in data:
        desc_source = data.get("description") if data.get("description") is not None else result.get("short_desc", "")
        result["description"] = normalize_text(desc_source, max_len=4000)

    if mode == "create" or "image_url" in data:
        raw_url = normalize_text(data.get("image_url"), max_len=1024, collapse_ws=False)
        image_url = raw_url if raw_url else (DEFAULT_IMAGE_URL if mode == "create" else "")
        if not is_safe_asset_url(image_url):
            raise ValueError("Image URL must be an https/http URL or relative / path.")
        result["image_url"] = image_url

    if mode == "create" or "certifications" in data:
        certs = data.get("certifications")
        if isinstance(certs, list):
            clean_certs = [normalize_text(c, max_len=80) for c in certs if normalize_text(c)]
        elif isinstance(certs, str):
            clean_certs = [normalize_text(c, max_len=80) for c in certs.split(",") if normalize_text(c)]
        else:
            clean_certs = ["ISO 9001:2015", "CE"]
        result["certifications"] = clean_certs or ["ISO 9001:2015", "CE"]

    cleaned_specs = preprocess_specifications(specs) if specs is not None else None
    return {"product": result, "specifications": cleaned_specs}


def preprocess_rfq(payload: dict[str, Any]) -> dict[str, Any]:
    data = payload.get("data") or payload
    customer_name = normalize_text(data.get("customer_name"), max_len=120)
    if len(customer_name) < 2 or len(customer_name) > 120:
        raise ValueError("Customer name must be between 2 and 120 characters.")

    raw_email = normalize_text(data.get("email"), max_len=180, collapse_ws=False)
    if not EMAIL_RE.match(raw_email) or len(raw_email) > 180:
        raise ValueError("Valid email address is required.")
    local_part, domain_part = raw_email.rsplit("@", 1)
    email = f"{local_part}@{domain_part.lower()}"

    raw_qty = data.get("quantity_requested")
    if raw_qty is None:
        qty = 1
    else:
        if isinstance(raw_qty, bool):
            raise ValueError("Requested quantity must be an integer between 1 and 1000.")
        try:
            qty_float = float(raw_qty)
        except (TypeError, ValueError) as exc:
            raise ValueError("Requested quantity must be an integer between 1 and 1000.") from exc
        if not math.isfinite(qty_float) or not qty_float.is_integer() or qty_float < 1 or qty_float > 1000:
            raise ValueError("Requested quantity must be an integer between 1 and 1000.")
        qty = int(qty_float)

    product_id = normalize_text(data.get("product_id"), max_len=120) or None
    company_name = normalize_text(data.get("company_name"), max_len=150)
    phone = re.sub(r"[^\d+\-()\s]", "", normalize_text(data.get("phone"), max_len=50)).strip()
    custom_specs = normalize_text(data.get("custom_specs"), max_len=2000)

    return {
        "product_id": product_id,
        "customer_name": customer_name,
        "company_name": company_name,
        "email": email,
        "phone": phone,
        "quantity_requested": qty,
        "custom_specs": custom_specs,
    }


def preprocess_catalog(payload: dict[str, Any]) -> dict[str, Any]:
    products = payload.get("products") or []
    processed: list[dict[str, Any]] = []

    for prod in products:
        if not isinstance(prod, dict):
            continue
        specs = preprocess_specifications(prod.get("specifications"))
        certs = [
            normalize_text(c, max_len=80)
            for c in (prod.get("certifications") or [])
            if normalize_text(c)
        ]

        loa_meters = None
        max_speed_knots = None
        for spec in specs:
            k_lower = spec["key"].lower()
            if loa_meters is None and ("length" in k_lower or "(loa)" in k_lower):
                loa_meters = extract_first_number(spec["value"])
            if max_speed_knots is None and "speed" in k_lower:
                max_speed_knots = extract_first_number(spec["value"])

        price = float(prod.get("price_usd") or 0.0)
        stock = int(prod.get("stock_quantity") or 0)
        price_tier = (
            "Flagship Heavy"
            if price >= 500000
            else "Offshore Commercial"
            if price >= 150000
            else "Tactical / Workboat"
        )
        readiness_status = (
            "BUILT_TO_ORDER"
            if stock == 0
            else "LOW_STOCK"
            if stock <= 5
            else "READY_STOCK"
        )

        item = dict(prod)
        item["sku"] = normalize_text(prod.get("sku"), max_len=64).upper()
        item["title"] = normalize_text(prod.get("title"), max_len=200)
        item["short_desc"] = normalize_text(prod.get("short_desc"), max_len=500)
        item["description"] = normalize_text(prod.get("description"), max_len=4000)
        item["price_usd"] = round(price, 2)
        item["certifications"] = certs
        item["specifications"] = specs
        item["derived_metrics"] = {
            "loa_meters": loa_meters,
            "max_speed_knots": max_speed_knots,
            "price_tier": price_tier,
            "readiness_status": readiness_status,
            "spec_count": len(specs),
        }
        processed.append(item)

    return {"products": processed}


def build_comparison_matrix(payload: dict[str, Any]) -> dict[str, Any]:
    raw_products = payload.get("products") or []
    products = preprocess_catalog({"products": raw_products})["products"]
    if len(products) < 2:
        raise ValueError("Please select at least two products to compare.")

    skus = [p["sku"] for p in products]
    cheapest = min(products, key=lambda p: p["price_usd"])
    fastest_lead = min(products, key=lambda p: int(p.get("lead_time_days") or 9999))

    matrix: list[dict[str, Any]] = [
        {
            "criteria": "Cost & Acquisition",
            "values": {
                p["sku"]: f"${p['price_usd']:,.2f} FOB (Lead time: {p['lead_time_days']} days)"
                for p in products
            },
            "winnerSku": cheapest["sku"],
        },
        {
            "criteria": "Delivery Readiness (Lead Time)",
            "values": {
                p["sku"]: f"{p['lead_time_days']} days ({p['stock_quantity']} in stock)"
                for p in products
            },
            "winnerSku": fastest_lead["sku"],
        },
        {
            "criteria": "Quality & Manufacturing Standards",
            "values": {
                p["sku"]: " • ".join(p.get("certifications") or ["ISO 9001:2015"])
                for p in products
            },
            "winnerSku": None,
        },
    ]

    ordered_keys: list[str] = []
    seen: set[str] = set()
    for p in products:
        for spec in p.get("specifications") or []:
            key = spec["key"]
            if key not in seen:
                seen.add(key)
                ordered_keys.append(key)

    for key in ordered_keys:
        val_map: dict[str, str] = {}
        numeric_scores: list[tuple[str, float]] = []
        for p in products:
            match = next(
                (s for s in (p.get("specifications") or []) if s["key"] == key), None
            )
            if match:
                formatted = f"{match['value']} {match.get('unit', '')}".strip()
                num = extract_first_number(match["value"])
                if num is not None:
                    numeric_scores.append((p["sku"], num))
            else:
                formatted = "N/A"
            val_map[p["sku"]] = formatted

        winner_sku = None
        if len(numeric_scores) >= 2 and len({score for _, score in numeric_scores}) > 1:
            lower_key = key.lower()
            if "draft" in lower_key or "weight" in lower_key:
                winner_sku = min(numeric_scores, key=lambda pair: pair[1])[0]
            else:
                winner_sku = max(numeric_scores, key=lambda pair: pair[1])[0]

        matrix.append(
            {
                "criteria": key,
                "values": val_map,
                "winnerSku": winner_sku,
            }
        )

    recommendations: list[dict[str, Any]] = []
    for p in products:
        cat_slug = (p.get("category_slug") or "").lower()
        best_for = (
            "Heavy naval patrol, harbor escort, and littoral interdiction"
            if "military" in cat_slug
            else "All-weather offshore windfarm & commercial harbour duty"
            if "alunautic" in cat_slug
            else "High-speed interception, SAR, and boarding operations"
            if "blue-spirit" in cat_slug
            else "Zero-corrosion heavy impact & shallow beaching workboat duty"
            if "hdpe" in cat_slug
            else "SOLAS emergency survival craft & marine evacuation deployment"
            if "lifesaving" in cat_slug
            else "Modular containerized passenger & commercial ferry charter"
            if "aquacat" in cat_slug
            else "24/7 pilot transfer, port authority, and commercial marine service"
        )
        loa = p.get("derived_metrics", {}).get("loa_meters")
        pros = [
            f"Verified certifications: {', '.join((p.get('certifications') or ['ISO 9001:2015'])[:2])}",
            f"Lead time of {p['lead_time_days']} days"
            + (f" with {loa:.2f}m LOA platform geometry" if loa else ""),
        ]
        cons = [
            "Limited hull availability — advance batch reservation advised"
            if int(p.get("stock_quantity") or 0) <= 2
            else "Requires certified marine commissioning engineer on handover"
        ]
        recommendations.append(
            {
                "sku": p["sku"],
                "bestFor": best_for,
                "pros": pros,
                "cons": cons,
            }
        )

    prices = [p["price_usd"] for p in products]
    price_spread = max(prices) - min(prices)
    summary = (
        f"Technical engineering comparison across {' vs '.join(skus)}. "
        f"Evaluated {len(ordered_keys)} normalized specification dimensions with a "
        f"${price_spread:,.0f} FOB acquisition spread (lowest cost: {cheapest['sku']})."
    )

    return {
        "summary": summary,
        "matrix": matrix,
        "recommendations": recommendations,
    }


def preprocess_ai_query(payload: dict[str, Any]) -> dict[str, Any]:
    prompt = normalize_text(payload.get("prompt"), max_len=2000)
    if not prompt:
        raise ValueError("Query prompt is required.")

    raw_history = payload.get("history") or []
    cleaned_history: list[dict[str, str]] = []
    if isinstance(raw_history, list):
        for item in raw_history[-8:]:
            if not isinstance(item, dict):
                continue
            text = normalize_text(item.get("text"), max_len=1500)
            if not text:
                continue
            role = "model" if item.get("role") in ("assistant", "model") else "user"
            cleaned_history.append({"role": role, "text": text})

    lower = prompt.lower()
    under_match = re.search(r"(?:under|below|less than|max)\s*\$?(\d+(?:\.\d+)?)", lower)
    over_match = re.search(r"(?:over|above|more than|min)\s*\$?(\d+(?:\.\d+)?)", lower)

    stop_words = {"the", "and", "with", "for", "show", "find", "get", "what", "how", "are"}
    tokens = [
        tok
        for tok in re.sub(r"[^\w\s-]", " ", lower).split()
        if len(tok) > 2 and tok not in stop_words
    ]

    return {
        "sanitizedPrompt": prompt,
        "cleanedHistory": cleaned_history,
        "signals": {
            "maxPrice": float(under_match.group(1)) if under_match else None,
            "minPrice": float(over_match.group(1)) if over_match else None,
            "lowStockQuery": any(
                phrase in lower for phrase in ("low stock", "out of stock", "reorder")
            ),
            "keywords": tokens[:15],
        },
    }


def compute_fleet_analytics(payload: dict[str, Any]) -> dict[str, Any]:
    db_path = payload.get("dbPath")
    if not db_path or not os.path.exists(db_path):
        raise ValueError("SQLite database path not found.")

    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        products_rows = conn.execute(
            """
            SELECT p.price_usd, p.stock_quantity, p.lead_time_days, c.name as category_name
            FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = 1
            """
        ).fetchall()
        categories_count = conn.execute("SELECT COUNT(*) FROM categories").fetchone()[0]
        rfqs_rows = conn.execute(
            "SELECT status, quantity_requested FROM quotation_requests"
        ).fetchall()
        recent_logs = [
            dict(row)
            for row in conn.execute(
                "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10"
            ).fetchall()
        ]
    finally:
        conn.close()

    prices = [float(r["price_usd"]) for r in products_rows]
    lead_times = [int(r["lead_time_days"]) for r in products_rows]
    low_stock_count = sum(1 for r in products_rows if int(r["stock_quantity"]) <= 5)
    out_of_stock_count = sum(1 for r in products_rows if int(r["stock_quantity"]) == 0)
    total_valuation = sum(
        float(r["price_usd"]) * max(1, int(r["stock_quantity"])) for r in products_rows
    )

    category_breakdown: dict[str, int] = {}
    for row in products_rows:
        cat = row["category_name"]
        category_breakdown[cat] = category_breakdown.get(cat, 0) + 1

    rfq_status_breakdown: dict[str, int] = {}
    for row in rfqs_rows:
        st = row["status"] or "PENDING"
        rfq_status_breakdown[st] = rfq_status_breakdown.get(st, 0) + 1

    return {
        "productsCount": len(products_rows),
        "categoriesCount": int(categories_count),
        "rfqsCount": len(rfqs_rows),
        "lowStockCount": low_stock_count,
        "recentLogs": recent_logs,
        "pythonAnalytics": {
            "engine": "python3-data-processor",
            "totalFleetValuationUsd": round(total_valuation, 2),
            "medianUnitPriceUsd": round(statistics.median(prices), 2) if prices else 0.0,
            "averageUnitPriceUsd": round(statistics.mean(prices), 2) if prices else 0.0,
            "averageLeadTimeDays": round(statistics.mean(lead_times), 1) if lead_times else 0.0,
            "outOfStockCount": out_of_stock_count,
            "categoryBreakdown": category_breakdown,
            "rfqStatusBreakdown": rfq_status_breakdown,
            "preprocessedAt": datetime.now(timezone.utc).isoformat(),
        },
    }


HANDLERS = {
    "preprocess_product": preprocess_product,
    "preprocess_rfq": preprocess_rfq,
    "preprocess_catalog": preprocess_catalog,
    "build_comparison_matrix": build_comparison_matrix,
    "preprocess_ai_query": preprocess_ai_query,
    "compute_fleet_analytics": compute_fleet_analytics,
}


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] not in HANDLERS:
        sys.stderr.write(
            json.dumps({"error": f"Unknown command. Valid commands: {sorted(HANDLERS)}"})
        )
        return 1

    command = sys.argv[1]
    raw_input = sys.stdin.read().strip()
    payload = json.loads(raw_input) if raw_input else {}

    try:
        output = HANDLERS[command](payload)
        sys.stdout.write(json.dumps({"ok": True, "data": output}))
        return 0
    except ValueError as err:
        sys.stdout.write(json.dumps({"ok": False, "error": str(err)}))
        return 0
    except Exception as err:  # pragma: no cover - defensive boundary
        sys.stdout.write(json.dumps({"ok": False, "error": f"Processing failure: {err}"}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
