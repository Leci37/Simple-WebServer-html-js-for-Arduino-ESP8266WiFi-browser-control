#!/usr/bin/env python3
"""Mete la web (carpeta web/) dentro del firmware: genera laboratorio/web_pages.h.

Cada fichero va comprimido con gzip en la memoria flash de la placa, con su
tipo y su ETag. Hay que ejecutarlo después de tocar algo de web/:

    python tools/build_web.py           # escribe laboratorio/web_pages.h
    python tools/build_web.py --check   # falla si web_pages.h no está al día

La cabecera generada se sube al repositorio: así, para cargar el firmware en
la placa basta con el IDE de Arduino, sin Python.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
HEADER = ROOT / "laboratorio" / "web_pages.h"

TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".json": "application/json",
    ".png": "image/png",
    ".ico": "image/x-icon",
}

ENTRY = re.compile(r'^\s*\{"(?P<path>[^"]+)", "[^"]+", WEB_DATA_\d+, \d+, "\\"(?P<etag>[0-9a-f]+)\\""\},$')


def url_for(file: Path) -> str:
    """index.html es la portada (/); el resto de páginas, sin .html (/semaforo)."""
    rel = file.relative_to(WEB).as_posix()
    if rel == "index.html":
        return "/"
    if rel.endswith(".html"):
        return "/" + rel[: -len(".html")]
    return "/" + rel


def web_files() -> list[Path]:
    files = sorted(p for p in WEB.rglob("*") if p.is_file() and not p.name.startswith("."))
    unknown = [p for p in files if p.suffix not in TYPES]
    if unknown:
        names = ", ".join(str(p.relative_to(ROOT)) for p in unknown)
        raise SystemExit(f"No sé qué tipo tienen estos ficheros: {names} (añádelo a TYPES)")
    return files


def etag_for(data: bytes) -> str:
    # La ETag sale del fichero sin comprimir: así no depende de la versión de
    # zlib de cada ordenador y --check sirve en cualquiera.
    return hashlib.sha256(data).hexdigest()[:16]


def expected_entries() -> dict[str, str]:
    return {url_for(f): etag_for(f.read_bytes()) for f in web_files()}


def render() -> str:
    lines = [
        "// ⚠️ No lo toques a mano: lo genera tools/build_web.py desde la carpeta web/.",
        "// Cada página va comprimida con gzip para que llegue rápido al navegador.",
        "#pragma once",
        "",
        "#include <Arduino.h>",
        "",
        "struct WebPage {",
        "  const char* path;",
        "  const char* type;",
        "  const uint8_t* data;",
        "  uint32_t length;",
        "  const char* etag;",
        "};",
        "",
    ]
    entries = []
    total_raw = total_gz = 0
    for i, file in enumerate(web_files()):
        raw = file.read_bytes()
        # mtime=0: la misma web da siempre los mismos bytes.
        packed = gzip.compress(raw, compresslevel=9, mtime=0)
        total_raw += len(raw)
        total_gz += len(packed)
        rel = file.relative_to(ROOT).as_posix()
        lines.append(f"// {url_for(file)} ← {rel}: {len(raw)} bytes, {len(packed)} comprimidos")
        lines.append(f"static const uint8_t WEB_DATA_{i}[] PROGMEM = {{")
        for start in range(0, len(packed), 16):
            chunk = packed[start : start + 16]
            lines.append("  " + ", ".join(f"0x{b:02x}" for b in chunk) + ",")
        lines.append("};")
        lines.append("")
        etag = etag_for(raw)
        entries.append(
            f'  {{"{url_for(file)}", "{TYPES[file.suffix]}", WEB_DATA_{i}, {len(packed)}, "\\"{etag}\\""}},'
        )
    lines.append(f"// En total: {total_raw} bytes de web, {total_gz} en la placa.")
    lines.append("const WebPage WEB_PAGES[] = {")
    lines.extend(entries)
    lines.append("};")
    lines.append("const size_t WEB_PAGE_COUNT = sizeof(WEB_PAGES) / sizeof(WEB_PAGES[0]);")
    lines.append("")
    return "\n".join(lines)


def header_entries() -> dict[str, str]:
    if not HEADER.exists():
        return {}
    found = {}
    for line in HEADER.read_text(encoding="utf-8").splitlines():
        match = ENTRY.match(line)
        if match:
            found[match["path"]] = match["etag"]
    return found


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="sólo comprueba que web_pages.h está al día")
    args = parser.parse_args()

    if args.check:
        if header_entries() != expected_entries():
            print("laboratorio/web_pages.h no está al día: ejecuta python tools/build_web.py", file=sys.stderr)
            return 1
        print("laboratorio/web_pages.h está al día.")
        return 0

    HEADER.write_text(render(), encoding="utf-8")
    print(f"Escrito {HEADER.relative_to(ROOT)} con {len(web_files())} ficheros.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
