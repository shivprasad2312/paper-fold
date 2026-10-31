#!/usr/bin/env python3
"""Survey an unpacked Unity build and write a small JSON report.

    pip install unitypy brotli
    python tools/unpack_unitywebdata.py 95d6....data.br unpacked
    python tools/survey_assets.py unpacked survey.json

`survey.json` is the thing to send back: it lists every asset type, every named
asset (levels in Unity are usually ScriptableObjects, prefabs or TextAssets) and
the size of each file, without shipping any of the game's bytes.

Any TextAsset (a .json/.txt/.csv file baked into the build) is written out to
`text_assets/` as well, because if the levels are data files that folder *is* the
level table.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    import UnityPy
except ImportError:
    sys.exit("missing dependency:  pip install unitypy brotli")


def survey(root: Path, out_json: Path) -> dict:
    counts: dict[str, int] = {}
    rows: list[dict] = []
    errors: list[dict] = []
    text_dir = root.parent / "text_assets"
    text_total = 0

    for f in sorted(root.rglob("*")):
        if not f.is_file():
            continue
        rel = str(f.relative_to(root))
        try:
            env = UnityPy.load(str(f))
            objects = list(env.objects)
        except Exception as exc:                      # not a Unity file, or truncated
            errors.append({"file": rel, "error": str(exc)[:200]})
            continue

        for obj in objects:
            try:
                kind = obj.type.name
            except Exception:
                kind = "Unknown"
            counts[kind] = counts.get(kind, 0) + 1

            name = None
            try:
                name = obj.peek_name()
            except Exception:
                pass

            rows.append({"file": rel, "path_id": obj.path_id, "type": kind,
                         "name": name, "size": obj.byte_size})

            if kind == "TextAsset":
                try:
                    ta = obj.read()
                    body = ta.m_Script if isinstance(ta.m_Script, bytes) else str(ta.m_Script).encode()
                    text_dir.mkdir(parents=True, exist_ok=True)
                    safe = (name or f"text_{obj.path_id}").replace("/", "_").replace("\\", "_")
                    (text_dir / f"{safe}.txt").write_bytes(body)
                    text_total += len(body)
                except Exception as exc:
                    errors.append({"file": rel, "path_id": obj.path_id, "error": str(exc)[:200]})

    report = {
        "root": str(root),
        "files": [str(p.relative_to(root)) for p in sorted(root.rglob("*")) if p.is_file()],
        "counts": dict(sorted(counts.items(), key=lambda kv: -kv[1])),
        "object_count": len(rows),
        "objects": rows[:40000],
        "text_assets_bytes": text_total,
        "errors": errors[:200],
    }
    out_json.write_text(json.dumps(report, indent=1))
    return report


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "unpacked")
    out = Path(sys.argv[2] if len(sys.argv) > 2 else "survey.json")
    if not root.is_dir():
        sys.exit(f"not a directory: {root}")

    report = survey(root, out)

    print(f"files      : {len(report['files'])}")
    print(f"objects    : {report['object_count']}")
    print("by type    :")
    for kind, n in list(report["counts"].items())[:25]:
        print(f"   {n:>7,}  {kind}")
    print(f"text assets: {report['text_assets_bytes']:,} bytes -> text_assets/")
    if report["errors"]:
        print(f"errors     : {len(report['errors'])} (see survey.json)")
    print(f"\nwrote {out}  ({out.stat().st_size:,} bytes) - send this file back")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
