"""Qawi PostgreSQL backups and non-destructive restore drills. Credentials use standard PG* environment variables."""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys


def run(program, *args, input_text=None):
    result = subprocess.run([program, *args], input=input_text, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(f"{program} failed (exit {result.returncode}): {result.stderr.strip()}")
    return result.stdout.strip()


def counts(database):
    sql = r"""BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT format('SELECT %L, count(*) FROM %I.%I;', table_name, table_schema, table_name)
FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name
\gexec
COMMIT;
"""
    output = run("psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "--dbname", database, input_text=sql)
    return {line.split("|")[0]: int(line.split("|")[1]) for line in output.splitlines() if "|" in line}


def checksum(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def backup(output):
    source = os.environ.get("PGDATABASE", "")
    if not re.fullmatch(r"[A-Za-z0-9_]+", source):
        raise ValueError("Set PGDATABASE to a database name, not a connection URI")
    output = output.resolve()
    manifest = Path(str(output) + ".manifest.json")
    if output.exists() or manifest.exists():
        raise ValueError("Backup destination already exists; choose a new path")
    output.parent.mkdir(parents=True, exist_ok=True)
    before = counts(source)
    with output.open("xb"):
        pass
    os.chmod(output, 0o600)
    run("pg_dump", "--format=custom", "--no-owner", "--no-privileges", "--dbname", source, "--file", str(output))
    after = counts(source)
    metadata = {"sha256": checksum(output), "sourceDatabase": source,
                "createdAt": dt.datetime.now(dt.timezone.utc).isoformat(),
                "expectedCounts": before if before == after else None}
    with manifest.open("x", encoding="utf-8") as stream:
        json.dump(metadata, stream, indent=2)
    os.chmod(manifest, 0o600)
    return {"archive": str(output), "manifest": str(manifest), "sourceCountsStable": before == after}


def drill(archive, target):
    archive = archive.resolve()
    metadata = json.loads(Path(str(archive) + ".manifest.json").read_text(encoding="utf-8"))
    if checksum(archive) != metadata["sha256"]:
        raise ValueError("Backup checksum mismatch; restore refused")
    if not re.fullmatch(r"qawi_drill_[a-z0-9_]{1,48}", target) or target == metadata["sourceDatabase"]:
        raise ValueError("Drill target must be a NEW qawi_drill_* database, different from the source")
    # createdb fails if the database exists. Never use --clean, --create, DROP, or a live target.
    run("createdb", "--", target)
    run("pg_restore", "--exit-on-error", "--single-transaction", "--no-owner", "--no-privileges",
        "--dbname", target, str(archive))
    restored = counts(target)
    expected = metadata.get("expectedCounts")
    if expected is None:
        raise ValueError(f"Source changed during backup. Restored {target}, but count validation needs a reviewed snapshot")
    if restored != expected:
        raise ValueError(f"Row counts differ after restore into {target}; retain the database for investigation")
    migration_status = run("psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "--dbname", target,
                           "-c", "SELECT count(*) FROM flyway_schema_history WHERE NOT success")
    if migration_status != "0":
        raise ValueError("Restored database has failed migration records")
    return {"restoredDatabase": target, "tablesVerified": len(restored), "rowsVerified": sum(restored.values()),
            "sha256": metadata["sha256"], "cleanup": "Drill database retained for application checks"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    dump = sub.add_parser("backup")
    dump.add_argument("--output", type=Path, required=True)
    restore = sub.add_parser("drill")
    restore.add_argument("--archive", type=Path, required=True)
    restore.add_argument("--target-db", required=True)
    args = parser.parse_args()
    try:
        result = backup(args.output) if args.command == "backup" else drill(args.archive, args.target_db)
        print(json.dumps(result, indent=2))
    except (OSError, ValueError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
