"""Lo que comparten las pruebas: el simulador de la placa, levantado en un puerto libre."""
from __future__ import annotations

import glob
import json
import sys
import threading
import time
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


def wait_for(check, timeout: float = 5.0):
    """Espera a que algo pase (el navegador va a su ritmo)."""
    end = time.time() + timeout
    while time.time() < end:
        if check():
            return
        time.sleep(0.05)
    raise AssertionError("no llegó a pasar")


@pytest.fixture(scope="session")
def browser():
    """Un Chromium para todas las pruebas de páginas (sin Playwright, se saltan)."""
    sync_api = pytest.importorskip("playwright.sync_api")
    with sync_api.sync_playwright() as p:
        try:
            browser = p.chromium.launch()
        except sync_api.Error:
            # Un Chromium ya instalado que no es el de esta versión de Playwright.
            found = sorted(glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome"))
            if not found:
                raise
            browser = p.chromium.launch(executable_path=found[-1])
        yield browser
        browser.close()


@pytest.fixture()
def open_page(browser, sim):
    """Abre páginas del simulador; al acabar, ningún error de JavaScript."""
    pages = []
    errors = []

    def go(path: str, width: int = 390):
        page = browser.new_page(viewport={"width": width, "height": 844})
        page.on("pageerror", lambda err: errors.append(str(err)))
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.on("dialog", lambda dialog: dialog.accept())
        page.goto(sim.url + path)
        page.wait_for_selector("[data-conn].online")
        pages.append(page)
        return page

    yield go
    for page in pages:
        page.close()
    assert errors == []
