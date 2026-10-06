"""Los récords de la clase de ¡Salta, Chispa!: /api/records y /api/record.

La placa los guarda en la flash (laboratorio/records.h) y limpia los alias con
alias.h; el simulador hace lo mismo en Python. Además de probar el simulador,
se compila alias.h en el ordenador y se compara con clean_alias() byte a byte.
"""
from __future__ import annotations

import random
import re
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote

import pytest

ROOT = Path(__file__).resolve().parent.parent
FIRMWARE = ROOT / "laboratorio"
sys.path.insert(0, str(ROOT / "tools"))

import simulador  # noqa: E402


def record(sim, alias: str, m: int, **extra) -> tuple[int, dict]:
    query = f"alias={quote(alias)}&m={m}" + "".join(f"&{k}={v}" for k, v in extra.items())
    return sim.get("/api/record?" + query)


def test_the_board_starts_with_no_records(sim):
    assert sim.api("/api/records") == {"records": []}


def test_a_record_says_its_place_and_only_the_best_five_stay(sim):
    code, body = record(sim, "Rayo", 300)
    assert code == 200 and body["place"] == 1
    assert body["records"] == [{"alias": "Rayo", "m": 300, "t": 0, "w": "campo"}]
    for alias, m in (("Pulga", 100), ("Trueno", 500), ("Muelle", 200), ("Turbo", 400)):
        record(sim, alias, m)
    code, body = record(sim, "Cometa", 250, t=1, w="luna")
    assert body["place"] == 4
    assert [(r["alias"], r["m"]) for r in body["records"]] == [
        ("Trueno", 500), ("Turbo", 400), ("Rayo", 300), ("Cometa", 250), ("Muelle", 200)
    ]
    assert body["records"][3] == {"alias": "Cometa", "m": 250, "t": 1, "w": "luna"}
    # Con menos metros que el quinto no entra, y la lista no cambia.
    code, body = record(sim, "Lento", 150)
    assert code == 200 and body["place"] == 0
    assert len(body["records"]) == 5 and "Lento" not in [r["alias"] for r in body["records"]]
    assert sim.api("/api/records")["records"] == body["records"]


def test_with_the_same_meters_the_new_one_goes_behind(sim):
    record(sim, "Primero", 300)
    code, body = record(sim, "Segundo", 300)
    assert body["place"] == 2
    assert [r["alias"] for r in body["records"]] == ["Primero", "Segundo"]


def test_aliases_are_cleaned_like_the_game_does(sim):
    cases = {
        '  <b>Rayo & "co"</b>  ': "bRayo  co/b",
        "ñandú 🦖 saltamontes": "ñandú 🦖 salt",  # se cuentan letras, no bytes
        "Supersaltamontes": "Supersaltamo",
        "abcdefghijk   z": "abcdefghijk ",  # como .trim().slice(0, 12) en el juego
        "abcdefghijkl    ": "abcdefghijkl",
        "Tab\tEnter\n": "TabEnter",
    }
    for alias, clean in cases.items():
        sim.api("/api/records?clear=1")
        code, body = record(sim, alias, 10)
        assert code == 200, alias
        assert body["records"][0]["alias"] == clean, alias


def test_a_record_needs_an_alias_meters_and_a_known_world(sim):
    error = "hace falta un alias y los metros"
    assert record(sim, "", 100) == (400, {"error": error})
    assert record(sim, ' <>"& ', 100) == (400, {"error": error})  # limpio, no queda nada
    assert record(sim, "Rayo", 0) == (400, {"error": error})
    assert record(sim, "Rayo", -5) == (400, {"error": error})
    assert sim.get("/api/record?alias=Rayo")[0] == 400
    assert record(sim, "Rayo", 10, w="marte") == (400, {"error": "w tiene que ser campo, granja o luna"})
    # Sin mundo es el campo; los metros, como mucho 999999.
    code, body = record(sim, "Rayo", 10**9)
    assert code == 200 and body["records"][0] == {"alias": "Rayo", "m": 999999, "t": 0, "w": "campo"}


def test_records_can_be_cleared(sim):
    record(sim, "Rayo", 10)
    assert len(sim.api("/api/records")["records"]) == 1
    assert sim.api("/api/records?clear=1") == {"records": []}
    assert sim.api("/api/records") == {"records": []}


def test_the_records_rules_are_the_same_in_firmware_and_simulator():
    records_h = (FIRMWARE / "records.h").read_text(encoding="utf-8")
    alias_h = (FIRMWARE / "alias.h").read_text(encoding="utf-8")
    api_h = (FIRMWARE / "web_api.h").read_text(encoding="utf-8")

    def const(text: str, name: str) -> int:
        return int(re.search(rf"const \w+ {name} = (\d+);", text).group(1))

    assert const(records_h, "RECORDS_MAX") == simulador.RECORDS_MAX
    assert const(records_h, "RECORD_METERS_MAX") == simulador.RECORD_METERS_MAX
    assert const(alias_h, "ALIAS_CHARS") == simulador.ALIAS_CHARS
    worlds = re.search(r"WORLD_NAMES\[\] = \{([^}]*)\}", records_h).group(1)
    assert re.findall(r'"(\w+)"', worlds) == simulador.WORLD_NAMES
    assert 'strchr("<>\\"&"' in alias_h and simulador.ALIAS_DROPS == '<>"&'
    # Los mensajes de error, los mismos.
    sim_py = (ROOT / "tools" / "simulador.py").read_text(encoding="utf-8")
    for message in re.findall(r'sendError\(400, "([^"]+)"\)', api_h[api_h.index("void handleRecord()") :]):
        assert message in sim_py


HARNESS = r"""
#include <stdio.h>
#include <string.h>
#include "alias.h"

// Una línea en hexadecimal por alias; contesta el alias limpio, también en hexadecimal.
int main() {
  static char line[8192];
  static unsigned char raw[4096];
  while (fgets(line, sizeof(line), stdin)) {
    size_t n = 0;
    for (char* p = line; p[0] && p[1] && p[0] != '\n'; p += 2) {
      unsigned int byte;
      sscanf(p, "%2x", &byte);
      raw[n++] = (unsigned char)byte;
    }
    char out[ALIAS_SIZE];
    size_t length = cleanAlias((const char*)raw, n, out, sizeof(out));
    for (size_t i = 0; i < length; i++) printf("%02x", (unsigned char)out[i]);
    printf("\n");
  }
  return 0;
}
"""


def corpus() -> list[bytes]:
    words = [
        "Rayo", "  Cometa  ", "ñandú", "Bólido", "🦖🦖🦖🦖🦖🦖🦖🦖🦖🦖🦖🦖🦖", "a&b<c>d\"e", "uno dos tres cuatro",
        "abcdefghijk   z", "abcdefghijkl    ", "      ", "", "�hola", "Tab\tEnter\n\x7f", "日本語のエイリアスです",
    ]
    cases = [w.encode("utf-8") for w in words]
    # Lo que no es UTF-8: cortado, demasiado largo, mitades de UTF-16, más allá de U+10FFFF…
    cases += [
        b"\xff\xfeRayo", b"Ra\xc3", b"\xe2\x82Rayo", b"\xc0\xafx", b"\xed\xa0\x80z", b"\xf4\x90\x80\x80y",
        b"\xf0\x9f\xa6x", b"a\x00b", b"\xe0\x80\xafq", b"\xc2\xa0nbsp\xc2\xa0",
    ]
    rnd = random.Random(37)
    pieces = [b" ", b"<", b"&", b"a", b"Z", b"\xc3\xb1", b"\xf0\x9f\xa6\x96", b"\xe2\x82\xac", b"\x80", b"\xc3", b"\xff", b"\x01"]
    for _ in range(400):
        cases.append(b"".join(rnd.choice(pieces) for _ in range(rnd.randint(0, 24))))
    for _ in range(300):
        cases.append(bytes(rnd.randint(0, 255) for _ in range(rnd.randint(0, 40))))
    return cases


def test_the_firmware_cleans_aliases_exactly_like_the_simulator(tmp_path):
    compiler = shutil.which("g++") or shutil.which("clang++")
    if compiler is None:
        pytest.skip("sin compilador de C++ (en el CI siempre hay)")
    (tmp_path / "harness.cpp").write_text(HARNESS, encoding="utf-8")
    program = tmp_path / "harness"
    subprocess.run(
        [compiler, "-std=c++11", "-Wall", "-Werror", "-I", str(FIRMWARE), str(tmp_path / "harness.cpp"), "-o", str(program)],
        check=True,
    )
    cases = corpus()
    result = subprocess.run([str(program)], input="".join(c.hex() + "\n" for c in cases), capture_output=True, text=True, check=True)
    outputs = result.stdout.splitlines()
    assert len(outputs) == len(cases)
    for raw, out in zip(cases, outputs):
        # El simulador recibe el alias ya decodificado, con U+FFFD en lo que no es UTF-8.
        expected = simulador.clean_alias(raw.decode("utf-8", "replace")).encode("utf-8")
        assert bytes.fromhex(out) == expected, raw
