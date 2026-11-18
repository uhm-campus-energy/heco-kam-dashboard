#!/usr/bin/env python3
"""Re-export the HECO KAM view, then rebuild public/data/bills.json."""

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "heco_kam_view.csv"
TEMP_PATH = ROOT / "heco_kam_view.csv.tmp"
DATABASE = "uhm2023"

SQL = "SELECT * FROM heco.kam_view"


def export_csv() -> None:
    copy_cmd = (
        f"\\copy ({SQL}) TO '{TEMP_PATH.as_posix()}' "
        "WITH (FORMAT csv, HEADER)"
    )
    result = subprocess.run(
        ["psql", "-d", DATABASE, "-v", "ON_ERROR_STOP=1", "-c", copy_cmd],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        TEMP_PATH.unlink(missing_ok=True)
        sys.exit(result.stderr.strip() or f"psql failed ({result.returncode})")
    shutil.move(TEMP_PATH, CSV_PATH)
    print(result.stdout.strip())


def main() -> None:
    if shutil.which("psql") is None:
        sys.exit("psql was not found on PATH")
    export_csv()
    subprocess.run([sys.executable, str(ROOT / "scripts" / "prepare_data.py")], check=True)


if __name__ == "__main__":
    main()