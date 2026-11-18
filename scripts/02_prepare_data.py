#!/usr/bin/env python3
"""Convert heco_kam_view.csv into compact JSON for the static dashboard."""

from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "heco_kam_view.csv"
OUT_PATH = ROOT / "public" / "data" / "bills.json"

MONTHS = (
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
)


def parse_amount(raw: str) -> float:
    if not raw:
        return 0.0
    return float(raw.replace("$", "").replace(",", "").strip() or 0)


def parse_number(raw: str) -> float:
    if not raw:
        return 0.0
    return float(raw.replace(",", "").strip() or 0)


def main() -> None:
    rows: list[dict] = []
    campuses: set[str] = set()
    customers: set[str] = set()
    years: set[str] = set()
    months: set[str] = set()

    with CSV_PATH.open(newline="", encoding="utf-8") as fh:
        for rec in csv.DictReader(fh):
            campus = (rec.get("campus_affiliation") or "").strip() or "Null"
            customer = (rec.get("customer_name") or "").strip()
            other = (rec.get("other_identifier") or "").strip() or "Not assigned"
            contract = (rec.get("contract") or "").strip()
            fy = (rec.get("fiscal_year") or "").strip()
            to_raw = (rec.get("billing_period_to") or "").strip()
            if not to_raw:
                continue
            dt = datetime.fromisoformat(to_raw)
            month = f"{MONTHS[dt.month - 1]} {dt.year}"
            month_key = f"{dt.year:04d}-{dt.month:02d}"
            kwh = parse_number(rec.get("billed_usage_kwh") or "")
            amount = parse_amount(rec.get("amount") or "")

            campuses.add(campus)
            if customer:
                customers.add(customer)
            if fy:
                years.add(fy)
            months.add(month_key)

            rows.append(
                {
                    "campus": campus,
                    "customer": customer,
                    "other": other,
                    "contract": contract,
                    "fy": fy,
                    "month": month,
                    "monthKey": month_key,
                    "kwh": kwh,
                    "amount": round(amount, 2),
                }
            )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "rows": rows,
        "campuses": sorted(campuses, key=lambda x: (x == "Null", x.lower())),
        "customers": sorted(customers),
        "fiscalYears": sorted(years),
        "monthKeys": sorted(months),
    }
    OUT_PATH.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(rows)} rows to {OUT_PATH} ({OUT_PATH.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
