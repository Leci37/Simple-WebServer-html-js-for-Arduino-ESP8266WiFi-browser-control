"""¡Salta, Chispa! v3 en Chromium, contra el simulador: dos jugadores, mundos,
modo tortuga, agacharse, récords de la clase, Chispas de colores, pegatinas,
el final en fases y las pestañas Programar y Montar.

Para no esperar al reloj, la partida se adelanta con Juego.prueba.actualiza a
pasos de 1/60 s: una partida entera tarda una fracción de segundo. Lo que se
dibuja en el lienzo (el marcador, los carteles) no está en la página, así que
se apunta lo que escribe un fotograma.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

pytest.importorskip("playwright.sync_api")

from conftest import wait_for  # noqa: E402

GAME = "/juego?prueba=1&semilla=3"
SOURCE = (Path(__file__).resolve().parent.parent / "web" / "juego.js").read_text(encoding="utf-8")
# Los umbrales de las estrellas no están decididos: se leen del juego.
WIN_STARS = [int(n) for n in re.search(r"var WIN_STARS = \[(\d+), (\d+)\]", SOURCE).groups()]
PHASES = ["Pacas de paja", "Tres saltos seguidos", "¡Con el cohete!"]
ALL_OFF = {"red": False, "yellow": False, "green": False}


def state(page):
    return page.evaluate("Juego.state()")


def stored(page, key: str):
    """Lo que el juego guarda con Lab.store (en localStorage, con «lab.» delante)."""
    return page.evaluate("(key) => JSON.parse(localStorage.getItem('lab.' + key))", key)


def start(page):
    page.locator("#start-btn").click()
    wait_for(lambda: state(page)["mode"] == "play")


def use_controller(page, name: str, on: bool):
    button = page.locator(f"[data-mando='{name}']")
    if (button.get_attribute("aria-pressed") == "true") != on:
        button.click()


def fast_forward(page, condition: str, seconds: float = 120) -> dict:
    """Adelanta la partida hasta que se cumpla `condition` (JavaScript, con `s`
    el estado). Va a pasos de 1/60 s, como los fotogramas, sin esperarlos."""
    found = page.evaluate(
        f"""() => {{
            for (let i = 0; i < {int(seconds * 60)}; i++) {{
                Juego.prueba.actualiza(1 / 60);
                const s = Juego.state();
                if ({condition}) return s;
            }}
            return null;
        }}"""
    )
    assert found is not None, f"en {seconds} s de juego no pasó: {condition}"
    return found


def drawn_texts(page) -> list:
    """Los textos de un fotograma: el marcador y los carteles van en el lienzo."""
    return page.evaluate(
        """() => {
            const proto = CanvasRenderingContext2D.prototype;
            const original = proto.fillText;
            const seen = [];
            proto.fillText = function (text) {
                seen.push(String(text));
                return original.apply(this, arguments);
            };
            try {
                Juego.prueba.dibuja();
            } finally {
                proto.fillText = original;
            }
            return seen;
        }"""
    )


def lose(page) -> dict:
    """Sin saltar, lo primero que llega pilla a Chispa hasta quedarse sin vidas."""
    s = fast_forward(page, "s.mode === 'over'")
    page.wait_for_selector("#screen-over:not([hidden])")
    return s


def win_the_final(page) -> dict:
    page.evaluate("Juego.prueba.invencible(true); Juego.prueba.piloto(true); Juego.prueba.skipTo(795)")
    s = fast_forward(page, "s.mode === 'win'")
    page.wait_for_selector("#screen-win:not([hidden])")
    return s


def meters_in(page, seconds: float) -> int:
    """Cuántos metros corre Chispa en ese rato de juego."""
    return page.evaluate(
        f"""() => {{
            const before = Juego.state().meters;
            Juego.prueba.actualiza(1 / 60, {int(seconds * 60)});
            return Juego.state().meters - before;
        }}"""
    )


def cell_texts(locator) -> list:
    """El texto de cada fila de una lista o tabla, celda a celda."""
    return locator.evaluate_all(
        "(rows) => rows.map((row) => Array.from(row.children).map((cell) => cell.textContent.trim()))"
    )


# ---------- Idea 1: dos jugadores ----------


def test_two_players_jump_with_the_button_and_a_clap_and_the_farthest_wins(open_page, sim):
    page = open_page(GAME, width=1280)
    assert page.locator("#jump2-btn").is_hidden()
    page.locator("[data-players='2']").click()
    assert "J2 · 👏 palmada" in page.locator("#start-mandos").inner_text()
    assert stored(page, "juego.jugadores") == 2
    use_controller(page, "mano", True)  # jugando solo, la mano saltaría
    page.locator("#start-btn").click()
    wait_for(lambda: state(page)["duo"] is not None)
    assert [p["mode"] for p in state(page)["duo"]] == ["play", "play"]
    assert "duo" in page.locator("#frame").get_attribute("class")
    assert page.locator("#jump2-btn").is_visible()
    texts = drawn_texts(page)
    assert "🔘 Jugador 1" in texts and "👏 Jugador 2" in texts

    # Invencibles mientras se prueban los mandos: así nadie se queda fuera antes.
    page.evaluate("Juego.prueba.invencible(true)")
    page.wait_for_selector("#mando-live:has-text('Placa lista')")
    sim.api("/api/walk")  # el botón FLASH
    wait_for(lambda: state(page)["jumps"] == 1)  # el estado es el del jugador 1
    page.wait_for_selector("#mando-live:has-text('Jugador 1')")
    wait_for(lambda: state(page)["ground"])
    sim.api("/sim?clap=1")
    wait_for(lambda: state(page)["events"]["jump"] == 2)
    assert state(page)["jumps"] == 1  # ese salto ha sido del jugador 2
    page.wait_for_selector("#mando-live:has-text('Jugador 2')")

    sim.api("/sim?cm=8")  # la mano, cerquísima
    page.wait_for_selector("#sig-hand-out:has-text('8 cm')")
    page.wait_for_timeout(200)
    assert state(page)["events"]["jump"] == 2
    # Con dos jugadores la mano no cuenta: tampoco agacha (aunque «Mano» esté encendida).
    sim.api("/sim?cm=20")
    page.wait_for_selector("#sig-hand-out:has-text('20 cm')")
    page.wait_for_timeout(200)
    assert state(page)["duck"] is False and state(page)["events"]["duck"] == 0
    sim.api("/sim?cm=-1")

    # Con el teclado, la A es del 1 y la L del 2; y el botón «Jugador 2».
    page.evaluate("Juego.prueba.actualiza(1 / 60, 60)")  # que aterricen los dos
    page.keyboard.press("l")
    assert state(page)["events"]["jump"] == 3 and state(page)["jumps"] == 1
    page.keyboard.press("a")
    assert state(page)["events"]["jump"] == 4 and state(page)["jumps"] == 2
    page.evaluate("Juego.prueba.actualiza(1 / 60, 60)")
    page.locator("#jump2-btn").dispatch_event("pointerdown")
    assert state(page)["events"]["jump"] == 5 and state(page)["jumps"] == 2

    # Para acabar pronto: el jugador 1 se va lejos, con un escudo, y nadie salta más.
    page.evaluate("Juego.prueba.invencible(false); Juego.prueba.poder('escudo'); Juego.prueba.skipTo(300)")
    s = fast_forward(page, "s.duo.some((p) => p.mode !== 'play')")
    out = [p for p in s["duo"] if p["mode"] == "over"]
    assert len(out) == 1  # el otro sigue jugando…
    assert f"💥 ¡Fuera! · {out[0]['meters']} m" in drawn_texts(page)  # …y el que ha caído, con su cartel

    s = fast_forward(page, "s.duo.every((p) => p.mode !== 'play')")
    page.wait_for_selector("#screen-duo:not([hidden])")
    first, second = s["duo"]
    assert first["meters"] >= 300 > second["meters"]
    assert page.locator("#duo-title").inner_text() == "¡Gana el jugador 1!"
    assert page.locator("#duo-crown").inner_text() == "🔘🏆"
    assert "win" in page.locator("#duo-p1").get_attribute("class")
    assert f"{first['meters']} m" in page.locator("#duo-p1").inner_text()
    assert f"{second['meters']} m" in page.locator("#duo-p2").inner_text()

    page.locator("#duo-again").click()  # ¡Revancha!
    wait_for(lambda: [p["mode"] for p in state(page)["duo"]] == ["play", "play"])


def test_with_two_players_the_board_does_not_beep(open_page, sim):
    # El jugador 2 salta con palmadas: un pitido junto al micrófono contaría como una.
    hit = (196, 250)
    page = open_page(GAME, width=1280)
    start(page)
    lose(page)
    wait_for(lambda: hit in sim.board.beeps)  # jugando solo (y sin palmada), sí pita
    # Las órdenes de la partida van en fila: la última, la luz roja del final.
    wait_for(lambda: sim.board.leds == {"red": True, "yellow": False, "green": False})
    page.wait_for_timeout(300)

    sim.board.beeps.clear()
    page.locator("#over-menu").click()
    page.locator("[data-players='2']").click()
    page.locator("#start-btn").click()
    wait_for(lambda: state(page)["duo"] is not None)
    fast_forward(page, "s.duo.every((p) => p.mode !== 'play')")
    page.wait_for_selector("#screen-duo:not([hidden])")
    wait_for(lambda: sim.board.leds["red"])  # las luces sí van con la partida
    page.wait_for_timeout(600)
    assert sim.board.beeps == []


# ---------- Idea 3: mundos ----------


def cast(page) -> list:
    return page.locator("#cast-list b").all_inner_texts()


def test_worlds_two_and_three_stay_locked_until_opened(open_page, sim):
    page = open_page(GAME, width=1280)
    assert page.locator("#world-name").inner_text() == "Mundo 1 · El campo 🌵"
    assert page.locator("#world-lock").is_hidden()
    assert cast(page)[:5] == ["Cactus", "Deberes", "Brócoli", "Libro de mates", "Coche"]

    page.locator("#world-next").click()
    assert page.locator("#world-name").inner_text() == "Mundo 2 · La granja 🐔"
    assert page.locator("#world-lock").inner_text() == "🔒 Se abre ganando a la Cosechadora en El campo"
    assert page.locator("#start-btn").is_disabled()
    assert page.locator("#cast-world").inner_text() == "· La granja"
    assert cast(page)[:5] == ["Valla", "Deberes", "Gallina", "Cerdo", "Libro de mates"]
    assert state(page)["world"] == "granja"  # la demo de detrás, también

    page.locator("#world-next").click()
    assert page.locator("#world-name").inner_text() == "Mundo 3 · La luna 🌙"
    assert page.locator("#world-lock").inner_text() == "🔒 Se abre ganando a la Cosechadora en La granja"
    assert cast(page)[:4] == ["Roca lunar", "Cráter", "Deberes", "Marciano"]
    assert "Coche" not in cast(page)
    # Pulsar el botón de la placa en un mundo cerrado no empieza nada.
    page.wait_for_selector("#mando-live:has-text('Placa lista')")
    sim.api("/api/walk")
    page.wait_for_selector("#mando-live:has-text('¡Botón!')")
    assert state(page)["mode"] == "demo"
    assert page.locator("#screen-start").is_visible()

    page.evaluate("Juego.abrirTodo()")
    assert page.locator("#world-lock").is_hidden()
    assert page.locator("#start-btn").is_enabled()
    start(page)
    assert state(page)["world"] == "luna"


def test_winning_the_first_world_opens_the_second(open_page):
    page = open_page(GAME, width=1280)
    start(page)
    win_the_final(page)
    assert stored(page, "juego.mundos") == {"campo": True}
    assert "🔓 ¡Nuevo mundo: La granja!" in page.locator("#win-news").inner_text()
    go = page.locator("#win-world")
    assert go.is_visible() and "Ir a La granja" in go.inner_text()

    page.evaluate("Juego.prueba.invencible(false); Juego.prueba.piloto(false)")
    go.click()
    wait_for(lambda: state(page)["mode"] == "play")
    assert state(page)["world"] == "granja"
    assert page.locator("#cast-world").inner_text() == "· La granja"

    # Al volver, el mundo 2 sigue abierto y el 3, todavía no.
    page.reload()
    page.wait_for_selector("[data-conn].online")
    assert page.locator("#world-name").inner_text() == "Mundo 2 · La granja 🐔"
    assert page.locator("#world-lock").is_hidden()
    page.locator("#world-next").click()
    assert page.locator("#world-lock").is_visible()


# ---------- Idea 9: modo tortuga ----------


def test_turtle_mode_has_five_lives_runs_slower_and_marks_its_records(open_page, sim):
    page = open_page(GAME, width=1280)
    start(page)
    page.evaluate("Juego.prueba.invencible(true)")
    normal = meters_in(page, 5)
    page.evaluate("Juego.prueba.invencible(false)")
    record = lose(page)["meters"]
    page.locator("#over-menu").click()

    page.locator("[data-turtle='1']").click()
    assert page.locator("[data-turtle='1']").get_attribute("aria-pressed") == "true"
    assert stored(page, "juego.tortuga") is True
    start(page)
    s = state(page)
    assert s["turtle"] is True and s["lives"] == 5
    texts = drawn_texts(page)
    assert "🐢 Modo tortuga: 5 vidas" in texts
    assert f"🐢 Récord {record} m" in texts
    page.evaluate("Juego.prueba.invencible(true)")
    turtle = meters_in(page, 5)
    assert 0.7 * normal < turtle < 0.85 * normal  # TURTLE = 0.78

    # Su récord de la clase lleva la tortuga, en la placa y en la tabla.
    page.evaluate("Juego.prueba.invencible(false)")
    meters = lose(page)["meters"]
    side = page.locator("#screen-over .ov-side")
    side.locator("input").fill("Tortuga")
    side.get_by_role("button", name="Guardar").click()
    wait_for(lambda: len(sim.board.records) == 1)
    assert sim.board.records == [{"alias": "Tortuga", "m": meters, "t": 1, "w": "field"}]
    page.wait_for_selector("#class-table li:has-text('Tortuga 🐢')")


# ---------- Idea 8: agacharse ----------


def test_a_hand_halfway_makes_chispa_duck_and_close_makes_her_jump(open_page, sim):
    page = open_page(GAME, width=1280)
    start(page)
    page.evaluate("Juego.prueba.invencible(true)")
    sim.api("/sim?cm=20")
    page.wait_for_selector("#sig-hand-out:has-text('20 cm')")
    assert "duck" in page.locator("#sig-hand").get_attribute("class")  # la zona morada
    page.wait_for_timeout(200)
    assert state(page)["duck"] is False  # la mano viene apagada

    use_controller(page, "mano", True)
    wait_for(lambda: state(page)["duck"])
    assert state(page)["events"]["duck"] == 1
    sim.api("/sim?cm=-1")
    wait_for(lambda: not state(page)["duck"])
    sim.api("/sim?cm=8")
    wait_for(lambda: state(page)["jumps"] == 1)


def test_the_down_arrow_and_the_duck_button_duck_only_on_the_ground(open_page):
    page = open_page(GAME, width=1280)
    start(page)
    page.evaluate("Juego.prueba.invencible(true)")
    page.keyboard.down("ArrowDown")
    wait_for(lambda: state(page)["duck"])
    page.keyboard.up("ArrowDown")
    wait_for(lambda: not state(page)["duck"])

    duck = page.locator("#duck-btn")
    duck.dispatch_event("pointerdown")
    wait_for(lambda: state(page)["duck"])
    duck.dispatch_event("pointerup")
    wait_for(lambda: not state(page)["duck"])

    # En el aire no se agacha; al tocar el suelo, sí (si se sigue pidiendo).
    page.locator("#jump-btn").dispatch_event("pointerdown")
    wait_for(lambda: not state(page)["ground"])
    page.keyboard.down("ArrowDown")
    page.wait_for_timeout(100)
    s = state(page)
    assert s["ground"] is False and s["duck"] is False
    wait_for(lambda: state(page)["ground"] and state(page)["duck"])
    page.keyboard.up("ArrowDown")


def test_ducking_lets_the_flying_exam_go_over(open_page):
    page = open_page(GAME, width=1280)
    start(page)
    # Recién empezada, el avión llega antes que el primer obstáculo del suelo.
    page.evaluate("Juego.prueba.nube()")
    fast_forward(page, "s.things.includes('avion')")
    assert "¡Un examen volador! ✋ Agáchate… o salta" in drawn_texts(page)
    s = fast_forward(page, "s.events.hit === 1")
    assert "avion" in s["things"] and s["lives"] == 2  # de pie, le da en la cabeza
    s = fast_forward(page, "!s.things.includes('avion')")
    assert s["events"]["hit"] == 1

    # Agachada pasa por debajo: cuenta para la pegatina (tocarla no contaría,
    # ni siendo invencible, que aquí sólo evita que se acabe la partida).
    page.evaluate("Juego.prueba.invencible(true)")
    page.keyboard.down("ArrowDown")
    page.evaluate("Juego.prueba.nube()")
    fast_forward(page, "(JSON.parse(localStorage.getItem('lab.juego.cuentas')) || {}).agachado === 1", seconds=20)
    page.keyboard.up("ArrowDown")


# ---------- Idea 5: récords de la clase ----------


def test_a_game_in_the_top_five_saves_its_alias_on_the_board(open_page, sim):
    page = open_page(GAME, width=1280)
    assert "guardados en la placa" in page.locator("#class-where").inner_text()
    start(page)
    meters = lose(page)["meters"]
    side = page.locator("#screen-over .ov-side")
    assert "¡Entras en el puesto 1!" in side.inner_text()
    side.locator("input").fill("<Rayo>")  # lo que no vale, fuera
    side.get_by_role("button", name="Guardar").click()

    wait_for(lambda: len(sim.board.records) == 1)
    assert sim.board.records == [{"alias": "Rayo", "m": meters, "t": 0, "w": "field"}]
    page.wait_for_selector("#screen-over .ov-side :text('✓ Guardado en la placa.')")
    assert side.locator("form").count() == 0
    assert cell_texts(side.locator("li.me")) == [["1", "Rayo", f"{meters} m"]]
    assert cell_texts(page.locator("#class-table li")) == [["1", "Rayo", f"{meters} m"]]
    assert stored(page, "juego.alias") == "Rayo"

    # La próxima vez, el alias ya viene escrito.
    page.locator("#over-again").click()
    wait_for(lambda: state(page)["mode"] == "play")
    lose(page)
    assert side.locator("input").input_value() == "Rayo"


def test_no_thanks_skips_the_alias_and_nothing_starts_meanwhile(open_page, sim):
    page = open_page(GAME, width=1280)
    page.wait_for_selector("#mando-live:has-text('Placa lista')")
    start(page)
    lose(page)
    side = page.locator("#screen-over .ov-side")
    side.locator("[data-dice]").click()
    assert side.locator("input").input_value() in [
        "Rayo", "Cometa", "Trueno", "Pulga", "Bólido", "Canguro", "Petardo", "Saltamontes",
        "Chispazo", "Relámpago", "Muelle", "Turbo",
    ]
    # Mientras se escribe el alias, el botón de la placa no empieza otra partida
    # (ni pasado el respiro de 0,9 s del final).
    page.wait_for_timeout(1000)
    sim.api("/api/walk")
    page.wait_for_selector("#mando-live:has-text('¡Botón!')")
    assert state(page)["mode"] == "over"

    side.get_by_role("button", name="No, gracias").click()
    assert side.locator("form").count() == 0
    assert "Todavía nadie" in side.inner_text()
    sim.api("/api/walk")
    wait_for(lambda: state(page)["mode"] == "play")
    assert sim.board.records == []


def test_a_game_out_of_the_top_five_gets_no_form(open_page, sim):
    for query in (
        "alias=Trueno&m=900",
        "alias=Turbo&m=880&t=1",
        "alias=Cometa&m=860&w=moon",
        "alias=Muelle&m=840&t=1&w=farm",
        "alias=Pulga&m=820",
    ):
        sim.api("/api/record?" + query)
    page = open_page(GAME, width=1280)
    # 🐢 para el modo tortuga y el emoji del mundo si no es el campo.
    assert cell_texts(page.locator("#class-table li")) == [
        ["1", "Trueno", "900 m"],
        ["2", "Turbo 🐢", "880 m"],
        ["3", "Cometa 🌙", "860 m"],
        ["4", "Muelle 🐢 🐔", "840 m"],
        ["5", "Pulga", "820 m"],
    ]
    start(page)
    lose(page)
    side = page.locator("#screen-over .ov-side")
    assert side.locator("form").count() == 0
    assert "Para entrar, hay que pasar de 820 m." in side.inner_text()


def test_if_others_got_further_meanwhile_the_game_does_not_say_saved(open_page, sim):
    for alias, m in (("Trueno", 900), ("Turbo", 880), ("Cometa", 860), ("Muelle", 840)):
        sim.api(f"/api/record?alias={alias}&m={m}")
    page = open_page(GAME, width=1280)
    start(page)
    meters = lose(page)["meters"]
    side = page.locator("#screen-over .ov-side")
    assert "¡Entras en el puesto 5!" in side.inner_text()
    # Mientras se escribe el alias, desde otra tableta entra uno mejor.
    sim.api(f"/api/record?alias=Pulga&m={meters + 100}")
    side.locator("input").fill("Rayo")
    side.get_by_role("button", name="Guardar").click()
    page.wait_for_selector(".toast:has-text('Esta vez no entras')")
    assert "Guardado" not in side.inner_text()
    assert f"Para entrar, hay que pasar de {meters + 100} m." in side.inner_text()
    assert "Rayo" not in [r["alias"] for r in sim.board.records]


def test_the_list_is_asked_again_when_the_game_ends(open_page, sim):
    for alias, m in (("Trueno", 900), ("Turbo", 880), ("Cometa", 860), ("Muelle", 840)):
        sim.api(f"/api/record?alias={alias}&m={m}")
    page = open_page(GAME, width=1280)
    start(page)
    # Mientras se juega, desde otra tableta se llena la lista.
    sim.api("/api/record?alias=Pulga&m=820")
    lose(page)
    side = page.locator("#screen-over .ov-side")
    page.wait_for_selector("#screen-over .ov-side :text('Para entrar, hay que pasar de 820 m.')")
    assert side.locator("form").count() == 0


def test_if_the_records_are_cleared_meanwhile_the_game_offers_to_save(open_page, sim):
    for alias, m in (("Trueno", 900), ("Turbo", 880), ("Cometa", 860), ("Muelle", 840), ("Pulga", 820)):
        sim.api(f"/api/record?alias={alias}&m={m}")
    page = open_page(GAME, width=1280)
    start(page)
    sim.api("/api/records?clear=1")  # la profe empieza de cero mientras se juega
    lose(page)
    page.wait_for_selector("#screen-over .ov-side :text('¡Entras en el puesto 1!')")


def test_an_alias_made_only_of_invisible_characters_is_not_sent(open_page, sim):
    # La placa lo dejaría vacío y contestaría 400: mejor pedirlo otra vez.
    page = open_page(GAME, width=1280)
    start(page)
    lose(page)
    side = page.locator("#screen-over .ov-side")
    side.locator("input").fill("\u0007\u0007")
    side.get_by_role("button", name="Guardar").click()
    page.wait_for_selector(".toast:has-text('Escribe un alias')")
    assert side.locator("form").count() == 1
    assert sim.board.records == []
    assert "guardados en la placa" in page.locator("#class-where").inner_text()


# ---------- Idea 2: Chispas de colores ----------


def skins(page) -> dict:
    """Cada Chispa: si está cerrada y lo que pone debajo."""
    return {
        b.get_attribute("data-skin"): ("locked" in b.get_attribute("class"), b.locator("small").inner_text())
        for b in page.locator("#skins [data-skin]").all()
    }


def test_chispa_colours_open_with_bolts_and_the_choice_is_remembered(open_page):
    page = open_page(GAME, width=1280)
    assert skins(page) == {
        "chispa": (False, "✓ La tuya"),
        "menta": (True, "🔒 20 ⚡"),
        "uva": (True, "🔒 50 ⚡"),
        "fresa": (True, "🔒 100 ⚡"),
        "hielo": (True, "🔒 160 ⚡"),
    }
    page.locator("[data-skin='menta']").click()
    page.wait_for_selector(".toast:has-text('Menta se abre con 20 rayos')")
    assert page.locator("[data-skin='chispa']").get_attribute("aria-pressed") == "true"

    # Los rayos se juntan entre partidas; con 100, se abren tres.
    page.evaluate("localStorage.setItem('lab.juego.rayosTotal', '100')")
    page.reload()
    page.wait_for_selector("[data-conn].online")
    assert [name for name, (locked, _) in skins(page).items() if locked] == ["hielo"]
    assert page.locator("#bank").inner_text() == "Llevas 100 ⚡ juntados en todas tus partidas. La siguiente, Hielo, con 160."
    page.locator("[data-skin='fresa']").click()
    assert skins(page)["fresa"] == (False, "✓ La tuya")
    assert stored(page, "juego.skin") == "fresa"

    page.reload()
    page.wait_for_selector("[data-conn].online")
    assert page.locator("[data-skin='fresa']").get_attribute("aria-pressed") == "true"


# ---------- Idea 6: pegatinas ----------


def test_the_tenth_homework_jumped_earns_a_sticker(open_page):
    page = open_page(GAME, width=1280)
    assert page.locator("#sticker-count").inner_text() == "⭐ 0 de 9"
    # Los deberes se cuentan entre partidas: ya lleva nueve.
    page.evaluate("localStorage.setItem('lab.juego.cuentas', JSON.stringify({deberes: 9, agachado: 0}))")
    page.reload()
    page.wait_for_selector("[data-conn].online")
    start(page)
    page.evaluate("Juego.prueba.invencible(true); Juego.prueba.piloto(true)")
    s = fast_forward(page, "s.stickers.includes('deberes')")
    assert s["stickers"] == ["deberes"]
    assert "¡Pegatina nueva! 📚 10 deberes" in drawn_texts(page)
    got = page.locator("#stickers li.got")
    assert got.count() == 1 and "10 deberes" in got.inner_text() and "¡Conseguida!" in got.inner_text()
    assert page.locator("#sticker-count").inner_text() == "⭐ 1 de 9"
    assert list(stored(page, "juego.pegatinas")) == ["deberes"]
    assert stored(page, "juego.cuentas")["deberes"] == 10

    # Y sale en las novedades del final.
    page.evaluate("Juego.prueba.invencible(false); Juego.prueba.piloto(false)")
    lose(page)
    assert "🆕 Pegatina: 📚 10 deberes" in page.locator("#over-news").inner_text()


def test_the_third_shield_shows_its_sticker_sign(open_page):
    # El cartel del escudo no puede tapar el de la pegatina nueva.
    page = open_page(GAME, width=1280)
    start(page)
    for _ in range(3):
        page.evaluate("Juego.prueba.poder('escudo')")
    assert state(page)["stickers"] == ["escudos"]
    assert "¡Pegatina nueva! 🛡️ 3 escudos" in drawn_texts(page)


# ---------- Idea 4: el final en fases ----------


def test_the_final_has_three_phases_and_stars_for_the_bolts(open_page):
    page = open_page(GAME, width=1280)
    start(page)
    page.evaluate("Juego.prueba.invencible(true); Juego.prueba.piloto(true); Juego.prueba.skipTo(795)")
    fast_forward(page, "s.boss !== null")
    assert "¡Cuidado! ¡Llega la Súper Cosechadora! 🚜" in drawn_texts(page)
    # Lo que tira la Cosechadora en cada fase.
    thrown = ["paca", "pacaMini", "cosechadora"]
    for n, name in enumerate(PHASES, 1):
        fast_forward(page, f"s.step === {n}")
        texts = drawn_texts(page)
        assert any(t.startswith(f"Fase {n} de 3 · {name}") for t in texts)
        # Los tres carteles, con ✓ en las fases ya pasadas.
        for i, phase in enumerate(PHASES, 1):
            assert f"{i} · {phase}" + (" ✓" if i < n else "") in texts
        s = fast_forward(page, f"s.things.includes('{thrown[n - 1]}')")
        assert s["step"] == n

    s = fast_forward(page, "s.mode === 'win'")
    assert s["events"]["phase"] == 3
    page.wait_for_selector("#screen-win:not([hidden])")
    stars = 3 if s["bolts"] >= WIN_STARS[1] else 2 if s["bolts"] >= WIN_STARS[0] else 1
    assert page.locator("#win-stars span").count() == 3
    assert page.locator("#win-stars span:not(.off)").count() == stars
    next_star = "¡Las tres estrellas! Eres una chispa de verdad." if stars == 3 else (
        f"La siguiente estrella, con {WIN_STARS[stars - 1]} rayos. ¿Te atreves?"
    )
    assert page.locator("#win-next").inner_text() == next_star
    assert f"⚡ {s['bolts']} rayos" in page.locator("#win-score").inner_text()


# ---------- Lo de la v2: el cartel de inicio, la señal en directo y el final ----------


def test_the_start_screen_shows_which_controls_jump(open_page):
    page = open_page(GAME, width=1280)

    def chips():
        return page.locator("#start-mandos span").evaluate_all(
            "(spans) => spans.map((el) => [el.textContent, el.classList.contains('on')])"
        )

    assert chips() == [["👆 Tocar", True], ["🔘 Botón", True], ["👏 Palmada", False], ["👋 Mano", False]]
    use_controller(page, "boton", False)
    use_controller(page, "palmada", True)
    assert chips() == [["👆 Tocar", True], ["🔘 Botón", False], ["👏 Palmada", True], ["👋 Mano", False]]
    page.reload()
    page.wait_for_selector("[data-conn].online")
    assert chips()[1:3] == [["🔘 Botón", False], ["👏 Palmada", True]]


def test_the_live_signal_moves_even_with_the_controls_off(open_page, sim):
    # La palmada y la mano vienen apagadas, y aun así se ve lo que llega.
    page = open_page(GAME, width=1280)
    mark = page.locator("#sig-sound-mark")
    sim.api("/sim?sound=80")
    page.wait_for_selector("#sig-sound-out:has-text('80')")
    assert "hot" in page.locator("#sig-sound").get_attribute("class")  # pasa el rojo del sonómetro
    assert mark.evaluate("(el) => el.style.left") == "70%"
    sim.api("/sim?sound=40")
    page.wait_for_selector("#sig-sound-out:has-text('40')")
    assert "hot" not in page.locator("#sig-sound").get_attribute("class")

    hand = page.locator("#sig-hand")
    sim.api("/sim?cm=20")
    page.wait_for_selector("#sig-hand-out:has-text('20 cm')")
    assert "duck" in hand.get_attribute("class") and "hot" not in hand.get_attribute("class")
    sim.api("/sim?cm=8")
    page.wait_for_selector("#sig-hand-out:has-text('8 cm')")
    assert "hot" in hand.get_attribute("class") and "duck" not in hand.get_attribute("class")

    # La raya del ruido sigue al rojo que se elija en el sonómetro.
    sim.api("/api/settings?soundRed=60")
    page.wait_for_function("document.querySelector('#sig-sound-mark').style.left === '60%'", timeout=6000)


# Cómo se llama cada obstáculo y si es plural, sacado del juego.
KILLERS = {
    kind: (name, "plural: true" in rest)
    for kind, name, rest in re.findall(r'^ {4}(\w+): \{[^}\n]*?name: "([^"]+)"([^}\n]*)\}', SOURCE, re.M)
}


def test_game_over_says_what_caught_you_and_how_far_the_harvester_was(open_page):
    page = open_page(GAME, width=1280)
    start(page)
    meters = lose(page)["meters"]
    kind = page.locator("#over-sprite").get_attribute("data-sprite")
    name, plural = KILLERS[kind]
    assert page.locator("#over-title").inner_text() == f"¡Te {'han' if plural else 'ha'} pillado {name}!"
    chips = page.locator("#over-score span").all_inner_texts()
    assert chips[0] == f"📏 {meters} m" and chips[1].startswith("⚡ ") and chips[2] == "⤴ 0 saltos"
    assert page.locator("#over-road-text").inner_text() == f"Te faltaban {800 - meters} m para la Súper Cosechadora 🚜"
    width = page.locator("#over-road").evaluate("(el) => parseFloat(el.style.width)")
    assert width == pytest.approx(meters / 800 * 100)
    assert page.locator("#over-record").inner_text() == "🏆 ¡Récord nuevo!"
    page.locator("#over-menu").click()
    page.wait_for_selector("#screen-start:not([hidden])")
    assert state(page)["mode"] == "demo"


# ---------- Programar y Montar ----------


def test_the_example_program_lights_green_when_chispa_jumps(open_page, sim):
    page = open_page(GAME + "#programar", width=1280)
    events = page.locator(".bk-cat.cat-eventos")
    assert events.locator(".bk-cat-title").inner_text() == "⚡ Eventos"
    assert events.locator("[data-palette='when_game']").count() == 1
    # Seis retos; el 6 (las fases) va antes que el 5, el más difícil.
    ids = page.locator(".challenges[data-key='juego'] .challenge").evaluate_all("(b) => b.map((el) => el.dataset.id)")
    assert ids == ["1", "2", "3", "4", "6", "5"]
    page.get_by_role("button", name="Ejemplo").click()
    hats = page.locator(".bk-script .bk-hat-top")
    assert hats.count() == 2
    assert hats.locator("select").evaluate_all("(s) => s.map((el) => el.value)") == ["jump", "hit"]

    page.get_by_role("button", name="¡Ejecutar!").click()
    wait_for(lambda: state(page)["program"])
    wait_for(lambda: sim.board.light_log == [ALL_OFF])  # el programa empieza con todo apagado
    start(page)
    page.wait_for_timeout(300)
    # Mientras corre el programa, las luces son suyas: el juego no enciende nada.
    assert sim.board.light_log == [ALL_OFF]

    page.locator("#jump-btn").dispatch_event("pointerdown")
    wait_for(lambda: {"red": False, "yellow": False, "green": True} in sim.board.light_log)
    wait_for(lambda: sim.board.light_log[-1] == ALL_OFF)  # y se apaga a los 0,3 s
    page.wait_for_selector(".bk-lap:has-text('1 vez')")

    # El otro «cuando»: al chocar, rojo con su «do»; el juego no pita por su cuenta.
    fast_forward(page, "s.events.hit === 1")
    wait_for(lambda: {"red": True, "yellow": False, "green": False} in sim.board.light_log)
    wait_for(lambda: (523, 300) in sim.board.beeps)
    assert (196, 250) not in sim.board.beeps
    page.get_by_role("button", name="Parar").click()
    page.wait_for_selector(".bk-status:has-text('Parado')")
    wait_for(lambda: not state(page)["program"])


def test_the_build_tab_draws_the_game_wiring_and_its_pins(open_page):
    page = open_page(GAME + "#montar")
    svg = page.locator("#wiring svg")
    assert "Los mandos del juego" in svg.get_attribute("aria-label")
    labels = svg.locator("text").all_text_contents()
    assert {"D3", "A0", "D1", "D2", "FLASH"} <= set(labels)  # el botón FLASH ya está en la placa
    # Los pines que usa el juego, en amarillo.
    used = svg.locator("text[fill='#ffd84d']").all_text_contents()
    assert {"A0", "D1", "D2", "D5", "D6", "D7"} <= set(used)
    assert cell_texts(page.locator("table.pins tbody tr")) == [
        ["🔘 Botón", "el botón FLASH de la placa", "D3"],
        ["👏 Palmada", "OUT del micrófono", "A0"],
        ["👋 Mano", "TRIG y ECHO del sensor", "D1 D2"],
        ["🚦 Las luces", "igual que en el semáforo", "D5 D6 D7"],
    ]


# ---------- En un móvil pequeño ----------


def two_players_chosen(page):
    page.locator("[data-players='2']").click()
    assert page.locator("[data-players='2']").get_attribute("aria-pressed") == "true"


def two_players_playing(page):
    two_players_chosen(page)
    page.locator("#start-btn").click()
    wait_for(lambda: state(page)["duo"] is not None)


def two_players_result(page):
    two_players_playing(page)
    page.evaluate("Juego.prueba.skipTo(300)")
    fast_forward(page, "s.duo.every((p) => p.mode !== 'play')")
    page.wait_for_selector("#screen-duo:not([hidden])")


def game_over_with_alias(page):
    start(page)
    lose(page)
    page.wait_for_selector("#screen-over [data-class-form]")


def win_screen(page):
    start(page)
    win_the_final(page)


def example_program(page):
    page.get_by_role("button", name="Ejemplo").click()


SMALL_SCREENS = {
    "two-players-chosen": (GAME, two_players_chosen),
    "two-players-playing": (GAME, two_players_playing),
    "two-players-result": (GAME, two_players_result),
    "game-over-alias": (GAME, game_over_with_alias),
    "win": (GAME, win_screen),
    "programar": (GAME + "#programar", example_program),
    "montar": (GAME + "#montar", None),
}


@pytest.mark.parametrize("width", [320, 360, 390, 412, 480])
def test_the_start_choices_can_be_tapped_on_a_phone(open_page, width):
    # En vertical, «¿Cuántos jugáis?» y «¿A qué velocidad?» llegaron a pisarse y
    # «2 jugadores» quedaba debajo: en el centro de cada botón tiene que estar él.
    page = open_page(GAME, width=width)
    found = page.evaluate(
        """() => {
            const box = (sel) => document.querySelector(sel).getBoundingClientRect();
            const covered = Array.from(document.querySelectorAll('[data-players], [data-turtle]')).filter((b) => {
                const r = b.getBoundingClientRect();
                const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                return !top || !b.contains(top);
            });
            return {
                overlap: box('.ov-corner.left').right > box('.ov-corner.right').left,
                covered: covered.map((b) => b.textContent),
            };
        }"""
    )
    assert found == {"overlap": False, "covered": []}
    # Y el cartel del inicio, con las flechas del mundo, cabe dentro del juego.
    frame = page.locator("#frame").bounding_box()
    for part in ("#screen-start", "#world-prev", "#world-next"):
        r = page.locator(part).bounding_box()
        assert frame["x"] <= r["x"] and r["x"] + r["width"] <= frame["x"] + frame["width"], part
    page.locator("[data-players='2']").click()
    page.locator("[data-turtle='1']").click()
    assert page.locator("[data-players='2']").get_attribute("aria-pressed") == "true"
    assert page.locator("[data-turtle='1']").get_attribute("aria-pressed") == "true"


@pytest.mark.parametrize("screen", list(SMALL_SCREENS))
def test_the_new_screens_fit_a_small_phone(open_page, screen):
    # Un móvil pequeño (360 px): nada se sale por los lados. Los carteles del
    # juego se deslizan dentro del marco, y el esquema, dentro de su caja.
    path, get_there = SMALL_SCREENS[screen]
    page = open_page(path, width=360)
    if get_there:
        get_there(page)
    assert page.evaluate("document.documentElement.scrollWidth") <= 360
