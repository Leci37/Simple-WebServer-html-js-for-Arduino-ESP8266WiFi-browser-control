"""¡Salta, Chispa! en Chromium, contra el simulador: se salta con la placa, se
pierde y se gana a la Súper Cosechadora.

La página abre con ?prueba=1 (unos trucos para las pruebas: piloto
automático, invencible, saltar metros…) y una semilla, para que los
obstáculos salgan siempre igual.
"""
from __future__ import annotations

import pytest

pytest.importorskip("playwright.sync_api")

from conftest import wait_for  # noqa: E402

GAME = "/juego?prueba=1&semilla=3"


def state(page):
    return page.evaluate("Juego.state()")


def start(page):
    page.locator("#start-btn").click()
    wait_for(lambda: state(page)["mode"] == "play")


def use_controller(page, name: str, on: bool):
    button = page.locator(f"[data-mando='{name}']")
    if (button.get_attribute("aria-pressed") == "true") != on:
        button.click()


def test_the_start_screen_shows_a_demo_that_plays_itself(open_page):
    page = open_page(GAME, width=1280)
    assert page.locator("#screen-start").is_visible()
    first = state(page)
    assert first["mode"] == "demo"
    wait_for(lambda: state(page)["meters"] > first["meters"] + 10)


def test_the_space_bar_starts_and_jumps(open_page):
    page = open_page(GAME, width=1280)
    page.locator("body").press("ArrowUp")
    wait_for(lambda: state(page)["mode"] == "play")
    assert page.locator("#overlay").is_hidden()
    page.keyboard.press("Space")
    wait_for(lambda: state(page)["jumps"] == 1)


def test_the_board_button_makes_chispa_jump(open_page, sim):
    page = open_page(GAME, width=1280)
    start(page)
    page.wait_for_selector("#mando-live:has-text('Placa lista')")
    sim.api("/api/walk")  # como pulsar el botón FLASH
    wait_for(lambda: state(page)["jumps"] == 1)
    assert "Botón" in page.locator("#mando-live").inner_text()


def test_a_clap_or_a_hand_jump_only_when_chosen(open_page, sim):
    page = open_page(GAME, width=1280)
    start(page)
    page.wait_for_selector("#mando-live:has-text('Placa lista')")
    sim.api("/sim?clap=1")
    page.wait_for_timeout(400)
    assert state(page)["jumps"] == 0  # la palmada viene apagada

    use_controller(page, "palmada", True)
    sim.api("/sim?clap=1")
    wait_for(lambda: state(page)["jumps"] == 1)

    use_controller(page, "mano", True)
    page.wait_for_timeout(1000)  # que aterrice
    sim.api("/sim?cm=8")
    wait_for(lambda: state(page)["jumps"] == 2)


def test_three_hits_end_the_game_and_the_board_turns_red(open_page, sim):
    page = open_page(GAME, width=1280)
    start(page)
    page.evaluate("Juego.prueba.rapido(2)")
    wait_for(lambda: state(page)["mode"] == "over", timeout=40)
    assert state(page)["lives"] == 0
    assert page.locator("#over-title").inner_text().startswith("¡Te ha pillado")
    wait_for(lambda: sim.board.leds == {"red": True, "yellow": False, "green": False})
    # Y se puede volver a empezar.
    page.locator("#over-again").click()
    wait_for(lambda: state(page)["mode"] == "play")
    assert state(page)["lives"] == 3


def test_the_rocket_makes_jumps_fly(open_page):
    page = open_page(GAME, width=1280)
    start(page)
    page.evaluate("Juego.prueba.invencible(true); Juego.prueba.poder('cohete')")
    assert state(page)["rocket"] > 7
    page.locator("#jump-btn").dispatch_event("pointerdown")
    wait_for(lambda: state(page)["jumps"] == 1)
    # Un salto normal dura 0,6 s; con el cohete, Chispa sigue arriba al segundo.
    page.wait_for_timeout(1000)
    assert state(page)["ground"] is False


def test_jumping_over_the_super_harvester_wins_the_demo(open_page):
    page = open_page(GAME, width=1280)
    start(page)
    page.evaluate(
        "Juego.prueba.invencible(true); Juego.prueba.piloto(true); Juego.prueba.rapido(2); Juego.prueba.skipTo(795)"
    )
    wait_for(lambda: state(page)["boss"] is not None, timeout=10)
    wait_for(lambda: "cosechadora" in state(page)["things"], timeout=40)
    wait_for(lambda: state(page)["mode"] == "win", timeout=20)
    assert page.locator("#screen-win").is_visible()
    assert "Súper Cosechadora" in page.locator("#screen-win h2").inner_text()


def test_the_record_is_remembered(open_page):
    page = open_page(GAME, width=1280)
    start(page)
    page.evaluate("Juego.prueba.skipTo(123); Juego.prueba.rapido(2)")
    wait_for(lambda: state(page)["mode"] == "over", timeout=40)
    meters = state(page)["meters"]
    assert meters >= 123
    page.reload()
    page.wait_for_selector("[data-conn].online")
    assert page.evaluate("JSON.parse(localStorage.getItem('lab.juego.record'))") == meters
