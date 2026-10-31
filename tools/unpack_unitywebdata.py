#!/usr/bin/env python3
"""Unpack a Unity WebGL .data / .data.br file.

    python tools/unpack_unitywebdata.py 95d6....data.br out/

A Unity WebGL build ships one "data" file which is *not* a plain Unity file: it is
an Emscripten filesystem image with this layout (straight from the loader's
`preRun` handler):

    "UnityWebData1.0\\0"
    uint32  header_end            <- offset where the payload begins
    repeat until header_end:
        uint32  file_offset
        uint32  file_size
        uint32  name_length
        bytes   name              <- e.g. "Data/sharedassets0.assets"

Each entry is a file inside the player's virtual filesystem. After unpacking you
get the real Unity serialized files, which UnityPy / AssetStudio can read.
"""
from __future__ import annotations

import argparse
import struct
import sys
from pathlib import Path

MAGIC = b"UnityWebData1.0\0"


def decompress(raw: bytes) -> bytes:
    """Brotli if it is still compressed, otherwise pass through."""
    if raw.startswith(MAGIC):
        return raw
    try:
        import brotli
    except ImportError:
        sys.exit("file is not raw UnityWebData - install brotli:  pip install brotli")
    try:
        return brotli.decompress(raw)
    except Exception:
        return raw        # some browsers hand you the decompressed body already


def unpack(buf: bytes, outdir: Path) -> list[tuple[str, int]]:
    outdir.mkdir(parents=True, exist_ok=True)
    if not buf.startswith(MAGIC):
        (outdir / "payload.bin").write_bytes(buf)
        return [("payload.bin", len(buf))]

    header_end = struct.unpack_from("<I", buf, len(MAGIC))[0]
    pos = len(MAGIC) + 4
    written: list[tuple[str, int]] = []

    while pos < header_end:
        start, size, name_len = struct.unpack_from("<III", buf, pos)
        pos += 12
        name = buf[pos:pos + name_len].decode("utf-8", "replace")
        pos += name_len
        rel = name.lstrip("/").replace("\\", "/")
        dest = outdir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(buf[start:start + size])
        written.append((rel, size))

    return written


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("source", help="the .data or .data.br file")
    ap.add_argument("outdir", nargs="?", default="unpacked")
    args = ap.parse_args()

    raw = Path(args.source).read_bytes()
    buf = decompress(raw)
    print(f"read      : {len(raw):,} bytes")
    print(f"data image: {len(buf):,} bytes")

    files = unpack(buf, Path(args.outdir))
    print(f"extracted : {len(files)} files -> {args.outdir}/")
    for name, size in files:
        print(f"  {size:>10,}  {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
