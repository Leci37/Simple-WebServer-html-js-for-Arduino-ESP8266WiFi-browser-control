"""Lo que comparten las pruebas: el simulador de la placa, levantado en un puerto libre."""
from __future__ import annotations

import json
import sys
import threading
import urllib.error
import urllib.request
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))

import simulador  # noqa: E402


class Sim:
    """Un simulador en marcha y cómo hablarle."""

    def __init__(self, server) -> None:
        self.server = server
        self.board = server.board
        self.url = f"http://127.0.0.1:{server.server_address[1]}"

    def get(self, path: str) -> tuple[int, dict]:
        try:
            with urllib.request.urlopen(self.url + path, timeout=5) as res:
                return res.status, json.loads(res.read())
        except urllib.error.HTTPError as err:
            return err.code, json.loads(err.read())

    def api(self, path: str) -> dict:
        code, body = self.get(path)
        assert code == 200, body
        return body


@pytest.fixture()
def sim():
    """Simulador con los sensores quietos: silencio y nada cerca."""
    server = simulador.serve(0, quiet=True)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield Sim(server)
    server.shutdown()
    server.server_close()
