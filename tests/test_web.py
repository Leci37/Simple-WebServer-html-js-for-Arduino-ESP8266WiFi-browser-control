"""La web que va dentro de la placa: que esté al día, completa y sin nada de internet."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
FIRMWARE = ROOT / "laboratorio"
PAGES = sorted(WEB.glob("*.html"))


def test_the_header_in_the_firmware_is_up_to_date():
    # Si falla: python tools/build_web.py, y sube laboratorio/web_pages.h.
    result = subprocess.run(
        [sys.executable, str(ROOT / "tools" / "build_web.py"), "--check"], capture_output=True, text=True
    )
    assert result.returncode == 0, result.stderr


def test_every_page_links_only_to_files_that_exist():
    sys.path.insert(0, str(ROOT / "tools"))
    from build_web import url_for, web_files

    served = {url_for(f) for f in web_files()}
    for page in PAGES:
        html = page.read_text(encoding="utf-8")
        for ref in re.findall(r'(?:src|href)="(/[^"#?]*)', html):
            if ref.startswith("/api"):
                continue
            assert ref in served, f"{page.name} enlaza {ref}, que no existe en web/"


@pytest.mark.parametrize("file", sorted(WEB.iterdir()), ids=lambda p: p.name)
def test_nothing_comes_from_the_internet(file):
    # La placa no tiene internet: una fuente o un script de fuera no cargaría.
    text = file.read_text(encoding="utf-8")
    assert not re.search(r"(?:src|href)=[\"']https?://", text), file.name
    assert "@import" not in text and "url(http" not in text, file.name


@pytest.mark.parametrize("page", PAGES, ids=lambda p: p.name)
def test_pages_keep_javascript_in_files(page):
    html = page.read_text(encoding="utf-8")
    for tag in re.findall(r"<script[^>]*>", html):
        assert "src=" in tag, f"{page.name}: JavaScript en línea: {tag}"
    assert not re.search(r"\son[a-z]+=", html), f"{page.name}: un onclick= o parecido"


@pytest.mark.parametrize("page", PAGES, ids=lambda p: p.name)
def test_pages_are_in_spanish_and_fit_a_phone(page):
    html = page.read_text(encoding="utf-8")
    assert '<html lang="es">' in html
    assert 'name="viewport"' in html
    assert "<title>" in html


def test_the_web_fits_in_the_board():
    sys.path.insert(0, str(ROOT / "tools"))
    from build_web import HEADER

    sizes = [int(n) for n in re.findall(r"WEB_DATA_\d+, (\d+),", HEADER.read_text(encoding="utf-8"))]
    # El firmware tiene 1 MB para todo: la web comprimida, que no pase de 150 kB.
    assert 0 < sum(sizes) < 150_000


def test_block_examples_only_use_blocks_that_exist():
    blocks = set(re.findall(r"^    (\w+): \{\n      cat:", (WEB / "bloques.js").read_text(encoding="utf-8"), re.M))
    assert {"light_on", "wait", "repeat", "forever", "wait_sound", "if_ghost"} <= blocks
    for script in ("semaforo.js", "sonometro.js", "fantasmas.js"):
        text = (WEB / script).read_text(encoding="utf-8")
        palette = re.search(r"blocks: \[([^\]]*)\]", text).group(1)
        used = set(re.findall(r'"(\w+)"', palette)) | set(re.findall(r'type: "(\w+)"', text))
        assert used <= blocks, f"{script} usa bloques que no existen: {used - blocks}"
    # El juego trae sus propios bloques (B.when_game = {…}), los suma a los de
    # bloques.js antes de montar su editor y los usa en su paleta y su ejemplo.
    game = (WEB / "juego.js").read_text(encoding="utf-8")
    own = set(re.findall(r"^    B\.(\w+) = \{\n      cat:", game, re.M))
    assert {"when_game", "wait_game", "if_power"} <= own
    # Sólo lo que va a Bloques.mount: en el resto del juego, «type:» es otra cosa.
    mount = re.search(r"Bloques\.mount\(.*?\n    \}\);", game, re.S).group(0)
    palette = re.search(r"blocks: \[([^\]]*)\]", mount).group(1)
    used = set(re.findall(r'"(\w+)"', palette)) | set(re.findall(r'type: "(\w+)"', mount))
    assert own <= used, f"juego.js define bloques que su paleta no ofrece: {own - used}"
    assert used <= blocks | own, f"juego.js usa bloques que no existen: {used - blocks - own}"


def test_the_version_is_the_same_everywhere():
    firmware = re.search(r'#define LAB_VERSION "([\d.]+)"', (FIRMWARE / "config.h").read_text(encoding="utf-8"))
    simulator = re.search(r'VERSION = "([\d.]+)"', (ROOT / "tools" / "simulador.py").read_text(encoding="utf-8"))
    changelog = re.search(r"^## ([\d.]+)", (ROOT / "CHANGELOG.md").read_text(encoding="utf-8"), re.M)
    assert firmware.group(1) == simulator.group(1) == changelog.group(1)


def test_the_readme_only_shows_pictures_that_exist_and_uses_them_all():
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    shown = set(re.findall(r"docs/img/([\w.-]+\.(?:png|jpg))", readme))
    on_disk = {p.name for p in (ROOT / "docs" / "img").iterdir()}
    assert shown <= on_disk, f"el README enseña capturas que no existen: {shown - on_disk}"
    assert on_disk <= shown, f"capturas que nadie enseña: {on_disk - shown}"
