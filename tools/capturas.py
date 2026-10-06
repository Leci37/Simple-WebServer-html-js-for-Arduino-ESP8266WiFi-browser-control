#!/usr/bin/env python3
"""Rehace las capturas del README (docs/img/) con el simulador.

Como en la plataforma: Chromium a 1280 px de ancho (el móvil, a 390) y PNG de
256 colores. Necesita Playwright con Chromium y Pillow:

    python tools/capturas.py
"""
from __future__ import annotations

import glob
import io
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image
from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "docs" / "img"
QUIET = 8791  # sensores quietos: se mueven a mano con /sim
LIVELY = 8792  # sensores que se mueven solos (la gráfica del sonómetro)


def launch(p):
    try:
        return p.chromium.launch()
    except PlaywrightError:
        found = sorted(glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome"))
        if not found:
            raise
        return p.chromium.launch(executable_path=found[-1])


def url(port: int, path: str) -> str:
    return f"http://127.0.0.1:{port}{path}"


def sim(path: str) -> None:
    urllib.request.urlopen(url(QUIET, path)).read()


def to_256_colors(name: str) -> None:
    path = IMG / f"{name}.png"
    image = Image.open(path).convert("RGB")
    image.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)


def main() -> int:
    servers = [
        subprocess.Popen([sys.executable, str(ROOT / "tools" / "simulador.py"), "--port", str(QUIET), "--quiet"]),
        subprocess.Popen([sys.executable, str(ROOT / "tools" / "simulador.py"), "--port", str(LIVELY)]),
    ]
    time.sleep(1.2)
    done = []
    try:
        with sync_playwright() as p:
            browser = launch(p)

            def page(port, path, width=1280, height=900):
                pg = browser.new_page(viewport={"width": width, "height": height})
                pg.on("dialog", lambda dialog: dialog.accept())
                pg.goto(url(port, path))
                pg.wait_for_selector("[data-conn].online")
                return pg

            def shot(pg, name, element=None):
                if element:
                    # La barra de arriba es fija: en la captura de un trozo, taparía su principio.
                    pg.add_style_tag(content=".topbar{position:static}")
                (pg.locator(element) if element else pg).screenshot(path=str(IMG / f"{name}.png"))
                done.append(name)

            pg = page(QUIET, "/", height=940)
            pg.wait_for_timeout(700)
            shot(pg, "portada")
            pg.close()

            # El semáforo y los modos; «Luz roja, luz verde», debajo, tiene su captura.
            pg = page(QUIET, "/semaforo", height=860)
            pg.click("[data-mode='auto']")
            pg.click("#walk-btn")
            pg.wait_for_selector("#walk-light.go", timeout=8000)
            pg.evaluate("window.scrollTo(0, 0)")
            pg.wait_for_timeout(400)
            shot(pg, "semaforo")
            pg.close()

            pg = page(QUIET, "/semaforo#programar", height=860)
            pg.get_by_role("button", name="Ejemplo").click()
            pg.get_by_role("button", name="¡Ejecutar!").click()
            pg.wait_for_selector(".bk-lap:has-text('1 de 3')")
            pg.wait_for_timeout(1500)  # que brille «esperar 3 segundos»
            shot(pg, "bloques")
            pg.get_by_role("button", name="Parar").click()
            pg.close()

            pg = page(QUIET, "/semaforo#montar")
            shot(pg, "montar", "#panel-montar .card >> nth=1")
            pg.close()

            pg = page(LIVELY, "/sonometro", height=860)
            pg.wait_for_timeout(9000)  # que la gráfica tenga una palmada
            shot(pg, "sonometro")
            pg.close()

            # Los otros dos juegos del sonómetro: el reto del silencio, a medias,
            # y el récord de palmada (con uno ya hecho).
            sim("/sim?sound=12")
            pg = page(QUIET, "/sonometro", height=900)
            pg.evaluate("localStorage.setItem('lab.sonometro.record', '91')")
            pg.reload()
            pg.wait_for_selector("[data-conn].online")
            pg.click("#silence-btn")
            pg.wait_for_timeout(2400 + 6000)  # la cuenta atrás y seis segundos de silencio
            shot(pg, "sonometro-juegos", ".card.games")
            sim("/sim?sound=0")
            pg.close()

            pg = page(QUIET, "/fantasmas", height=820)
            sim("/sim?cm=9")
            pg.wait_for_timeout(3600)  # que se vaya el aviso de «cazado»
            shot(pg, "fantasmas")
            sim("/sim?cm=-1")
            pg.close()

            pg = page(QUIET, "/fantasmas#montar")
            shot(pg, "esquema", "#wiring svg")
            pg.close()

            pg = page(QUIET, "/juego?prueba=1&semilla=11", height=760)
            pg.click("#start-btn")
            pg.evaluate("Juego.prueba.piloto(true); Juego.prueba.invencible(true); Juego.prueba.skipTo(440)")
            for _ in range(60):
                pg.wait_for_timeout(250)
                if "examen" in pg.evaluate("Juego.state()")["things"]:
                    break
            pg.evaluate("Juego.prueba.poder('cohete')")
            pg.wait_for_timeout(700)
            shot(pg, "juego", "#frame")
            pg.evaluate("Juego.prueba.rapido(2); Juego.prueba.skipTo(799)")
            for _ in range(80):
                pg.wait_for_timeout(250)
                if "cosechadora" in pg.evaluate("Juego.state()")["things"]:
                    break
            pg.evaluate("Juego.prueba.rapido(1)")
            pg.wait_for_timeout(1300)
            shot(pg, "juego-cosechadora", "#frame")
            pg.close()

            # v3: el inicio, en la luna (con todo abierto, como si ya se hubieran ganado).
            pg = page(QUIET, "/juego?prueba=1&semilla=5", height=760)
            pg.evaluate("Juego.abrirTodo()")
            pg.click("#world-next")
            pg.click("#world-next")
            pg.wait_for_timeout(1500)
            shot(pg, "juego-inicio", "#frame")
            pg.close()

            # v3: dos jugadores, al empezar (cada uno con su cartel).
            pg = page(QUIET, "/juego?prueba=1&semilla=7", height=900)
            pg.click("[data-players='2']")
            pg.click("#start-btn")
            pg.evaluate("Juego.prueba.invencible(true)")
            pg.wait_for_timeout(1300)
            shot(pg, "juego-dos", "#frame")
            pg.close()

            # Dos jugadores, al acabar: quién ha llegado más lejos.
            pg = page(QUIET, "/juego?prueba=1&semilla=7", height=900)
            pg.click("[data-players='2']")
            pg.click("#start-btn")
            pg.wait_for_function("Juego.state().duo !== null")
            pg.evaluate("Juego.prueba.poder('escudo'); Juego.prueba.skipTo(300)")
            pg.evaluate(
                "() => { for (let i = 0; i < 120 * 60 && !Juego.state().duo.every((p) => p.mode !== 'play'); i++) Juego.prueba.actualiza(1 / 60); }"
            )
            pg.wait_for_selector("#screen-duo:not([hidden])")
            pg.wait_for_timeout(3000)  # que acabe de caer el confeti
            shot(pg, "juego-duo-fin", "#frame")
            pg.close()

            # v3: el final de una partida que entra en los récords de la clase.
            for alias, m, extra in (("Rayo", 906, ""), ("Cometa", 640, "&t=1"), ("Trueno", 512, "&w=farm"), ("Pulga", 330, "")):
                sim(f"/api/record?alias={alias}&m={m}{extra}")
            pg = page(QUIET, "/juego?prueba=1&semilla=3", height=760)
            pg.click("#start-btn")
            pg.evaluate("Juego.prueba.skipTo(290); Juego.prueba.rapido(2)")
            pg.wait_for_selector("#screen-over:not([hidden])", timeout=40000)
            pg.locator("[data-class-form] input").fill("Canguro")
            pg.wait_for_timeout(600)
            shot(pg, "juego-fin", "#frame")
            pg.close()
            sim("/api/records?clear=1")

            # Y el otro final: la Súper Cosechadora saltada, con sus estrellas. Con
            # el campo ya ganado otra vez, sin avisos de pegatina ni de mundo nuevo:
            # así el cartel cabe entero.
            pg = page(QUIET, "/juego?prueba=1&semilla=3", height=760)
            pg.evaluate(
                "localStorage.setItem('lab.juego.pegatinas', JSON.stringify({cosechadora: 1}));"
                "localStorage.setItem('lab.juego.mundos', JSON.stringify({campo: true}))"
            )
            pg.reload()
            pg.wait_for_selector("[data-conn].online")
            pg.click("#start-btn")
            pg.evaluate("Juego.prueba.invencible(true); Juego.prueba.piloto(true); Juego.prueba.skipTo(795)")
            pg.evaluate(
                "() => { for (let i = 0; i < 120 * 60 && Juego.state().mode !== 'win'; i++) Juego.prueba.actualiza(1 / 60); }"
            )
            pg.wait_for_selector("#screen-win:not([hidden])")
            pg.wait_for_timeout(3000)  # que acabe de caer el confeti
            shot(pg, "juego-victoria", "#frame")
            pg.close()

            # v3: la pestaña Jugar, con algunos colores y pegatinas ya ganados.
            pg = page(QUIET, "/juego?prueba=1&semilla=3", height=900)
            pg.evaluate(
                "localStorage.setItem('lab.juego.rayosTotal', '64');"
                "localStorage.setItem('lab.juego.pegatinas', JSON.stringify({deberes: 1, brocoli: 1, escudos: 1, cosechadora: 1}))"
            )
            pg.reload()
            pg.wait_for_selector("[data-conn].online")
            pg.click("[data-mando='mano']")
            sim("/sim?sound=52&cm=22")
            pg.wait_for_timeout(1200)
            shot(pg, "juego-jugar", ".play-grid")
            sim("/sim?sound=0&cm=-1")
            pg.close()

            # v3: programar el juego, con los bloques «⚡ cuando…» del ejemplo.
            pg = page(QUIET, "/juego?prueba=1&semilla=3#programar", height=900)
            pg.get_by_role("button", name="Ejemplo").click()
            pg.wait_for_timeout(500)
            shot(pg, "juego-bloques", "#editor")
            pg.close()

            # v3: el duelo de palmadas, en el turno del verde.
            pg = page(QUIET, "/sonometro", height=900)
            pg.click("#duel-btn")
            # «:has-text» no distingue mayúsculas: «Ahora, el verde…» también sería «AHORA».
            pg.wait_for_selector("#duel-status:has-text('Equipo rojo, AHORA')", timeout=8000)
            sim("/sim?sound=88")
            pg.wait_for_timeout(500)
            sim("/sim?sound=0")
            pg.wait_for_selector("#duel-status:has-text('Equipo verde, AHORA')", timeout=12000)
            sim("/sim?sound=64")
            pg.wait_for_timeout(700)
            shot(pg, "duelo", ".card.duel")
            sim("/sim?sound=0")
            pg.close()

            # v3: la caza contrarreloj, con tres fantasmas cazados.
            pg = page(QUIET, "/fantasmas", height=820)
            pg.click("#race-btn")
            for _ in range(3):
                sim("/sim?cm=8")
                pg.wait_for_timeout(1300)
                sim("/sim?cm=-1")
                pg.wait_for_timeout(900)
            sim("/sim?cm=35")
            pg.wait_for_timeout(1500)
            shot(pg, "contrarreloj", ".card:has(#hunt-clock)")
            sim("/sim?cm=-1")
            pg.close()

            # v3: luz roja, luz verde, a medio camino hacia la placa.
            sim("/sim?cm=90")
            pg = page(QUIET, "/semaforo", height=900)
            pg.wait_for_timeout(800)
            pg.click("#rl-btn")
            for cm in (80, 66, 54):
                pg.wait_for_timeout(300)
                sim(f"/sim?cm={cm}")
            pg.wait_for_timeout(500)
            shot(pg, "luzroja", ".card.rl")
            sim("/sim?cm=-1")
            pg.close()

            # El móvil: tres pantallas de 390 una al lado de otra.
            phones = []
            for path in ("/semaforo", "/semaforo#programar", "/juego"):
                pg = page(QUIET, path, width=390, height=844)
                if "programar" in path:
                    pg.locator("[data-palette='light_on']").click()
                    pg.locator(".bk-cat-tab.cat-control").click()
                    pg.locator("[data-palette='wait']").click()
                    pg.locator(".bk-cat-tab.cat-luces").click()
                    pg.locator("[data-palette='light_off']").click()
                    pg.evaluate("window.scrollTo(0, 250)")
                pg.wait_for_timeout(900)
                phones.append(Image.open(io.BytesIO(pg.screenshot())).convert("RGB"))
                pg.close()
            gap = 40
            strip = Image.new("RGB", (sum(i.width for i in phones) + gap * (len(phones) - 1), phones[0].height), (255, 246, 230))
            x = 0
            for phone in phones:
                strip.paste(phone, (x, 0))
                x += phone.width + gap
            strip.save(IMG / "movil.png")
            done.append("movil")
            browser.close()
        for name in done:
            to_256_colors(name)
        print("Capturas hechas:", ", ".join(done))
        return 0
    finally:
        for server in servers:
            server.terminate()


if __name__ == "__main__":
    sys.exit(main())
