#!/usr/bin/env python3
"""Create and validate a consistent SQLite backup, then prune old copies."""

from __future__ import annotations

import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path


def backup_database(source: Path, destination_dir: Path, keep: int) -> Path:
    if keep < 1:
        raise ValueError("keep must be at least 1")
    if not source.is_file():
        raise FileNotFoundError(source)

    destination_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    destination = destination_dir / f"blog-{stamp}.db"
    temporary = destination_dir / f".{destination.name}.tmp"

    source_connection = sqlite3.connect(
        f"file:{source.resolve()}?mode=ro", uri=True, timeout=10
    )
    destination_connection = sqlite3.connect(temporary, timeout=10)
    try:
        source_connection.backup(destination_connection)
        result = destination_connection.execute("PRAGMA quick_check").fetchone()
        if result != ("ok",):
            raise RuntimeError(f"backup integrity check failed: {result!r}")
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise
    finally:
        destination_connection.close()
        source_connection.close()

    temporary.replace(destination)
    backups = sorted(
        destination_dir.glob("blog-*.db"),
        key=lambda path: path.stat().st_mtime_ns,
        reverse=True,
    )
    for expired in backups[keep:]:
        expired.unlink()
    return destination


def main() -> int:
    if len(sys.argv) not in (3, 4):
        print(
            "usage: backup_database.py SOURCE_DB DESTINATION_DIR [COPIES_TO_KEEP]",
            file=sys.stderr,
        )
        return 2

    keep = int(sys.argv[3]) if len(sys.argv) == 4 else 7
    destination = backup_database(Path(sys.argv[1]), Path(sys.argv[2]), keep)
    print(destination)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
