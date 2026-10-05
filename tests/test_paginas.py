"""Las páginas en un navegador de verdad (Chromium), contra el simulador.

Se juega, se programan bloques y se ejecutan: lo que haría un niño con la tableta.
Sin Playwright estas pruebas se saltan; en el CI se instala y corren siempre.
"""
from __future__ import annotations

import time

import pytest

pytest.importorskip("playwright.sync_api")

from conftest import wait_for  # noqa: E402


def add_block(page, block_type: str):
    """Tocar un bloque de la paleta (como con el dedo): se añade al programa."""
    palette_block = page.locator(f"[data-palette='{block_type}']")
    if not palette_block.is_visible():
        # En el móvil se ve una familia cada vez: primero, su pestaña.
        family = palette_block.locator("xpath=ancestor::div[contains(@class,'bk-cat')]").get_attribute("class")
        cat = [c for c in family.split() if c.startswith("cat-")][0]
        page.locator(f".bk-cat-tab.{cat}").click()
    palette_block.click()


def program_blocks(page):
    return page.locator(".bk-script [data-id]")


def set_number(page, index: int, value: str):
    field = page.locator(".bk-script .bk-num").nth(index)
    field.fill(value)
    field.press("Enter")
    field.blur()


@pytest.mark.parametrize("path", ["/", "/semaforo", "/sonometro", "/fantasmas", "/juego"])
def test_every_page_opens_and_finds_the_board(open_page, path):
    page = open_page(path)
    assert page.locator("[data-board-name]").first.inner_text() == "Laboratorio-SIM"


def test_the_home_page_leads_to_the_three_inventions(open_page):
    page = open_page("/")
    links = page.locator(".invento").evaluate_all("(els) => els.map((a) => a.getAttribute('href'))")
    assert links == ["/semaforo", "/sonometro", "/fantasmas", "/juego"]


def test_touching_a_lamp_lights_the_real_one(open_page, sim):
    page = open_page("/semaforo")
    page.locator("#traffic .lamp.red").click()
    wait_for(lambda: sim.board.leds["red"] and sim.board.mode == "manual")
    page.wait_for_selector("#traffic .lamp.red.on")
    page.locator("[data-mode='auto']").click()
    wait_for(lambda: sim.board.mode == "auto")
    page.wait_for_selector("#speed-box:not([hidden])")


def test_a_sequence_of_blocks_runs_on_the_board(open_page, sim):
    page = open_page("/semaforo#programar")
    for block in ("light_on", "wait", "light_off"):
        add_block(page, block)
    assert program_blocks(page).count() == 3
    page.locator(".bk-script select").first.select_option("green")
    page.locator(".bk-script select").nth(1).select_option("green")
    set_number(page, 0, "0,3")

    page.get_by_role("button", name="¡Ejecutar!").click()
    page.wait_for_selector(".bk-status:has-text('Terminado')")
    lights = sim.api("/sim")["lights"]
    # Primero todo apagado (así empieza siempre), luego el verde, luego nada.
    assert [lit for lit in lights] == [
        {"red": False, "yellow": False, "green": False},
        {"red": False, "yellow": False, "green": True},
        {"red": False, "yellow": False, "green": False},
    ]


def test_repeat_runs_its_blocks_several_times(open_page, sim):
    page = open_page("/semaforo#programar", width=1280)
    add_block(page, "repeat")
    # Tocar el hueco del «repetir» hace que lo nuevo caiga dentro.
    page.locator(".bk-mouth .bk-stack").click()
    for block in ("light_on", "wait", "light_off"):
        add_block(page, block)
    assert page.locator(".bk-mouth [data-id]").count() == 3
    set_number(page, 0, "2")
    set_number(page, 1, "0,2")

    page.get_by_role("button", name="¡Ejecutar!").click()
    page.wait_for_selector(".bk-status:has-text('Terminado')", timeout=8000)
    reds = [lit["red"] for lit in sim.api("/sim")["lights"]]
    assert reds.count(True) == 2


def test_dragging_puts_blocks_in_and_takes_them_out(open_page):
    page = open_page("/semaforo#programar", width=1280)
    source = page.locator("[data-palette='light_on']")
    target = page.locator(".bk-script")
    source.drag_to(target)
    assert program_blocks(page).count() == 1
    # Sacarlo del programa lo quita.
    program_blocks(page).first.locator(".bk-text").first.drag_to(page.locator(".bk-palette"))
    assert program_blocks(page).count() == 0


def test_stop_ends_a_forever_loop(open_page, sim):
    page = open_page("/semaforo#programar", width=1280)
    add_block(page, "forever")
    for block in ("light_on", "wait", "light_off", "wait"):
        add_block(page, block)  # debajo de «por siempre» no se llega: van dentro
    assert page.locator(".bk-mouth [data-id]").count() == 4
    set_number(page, 0, "0,1")
    set_number(page, 1, "0,1")
    page.get_by_role("button", name="¡Ejecutar!").click()
    page.wait_for_selector(".bk-lap:has-text('vuelta 3')", timeout=8000)
    page.get_by_role("button", name="Parar").click()
    page.wait_for_selector(".bk-status:has-text('Parado')")
    count = len(sim.api("/sim")["lights"])
    time.sleep(0.5)
    assert len(sim.api("/sim")["lights"]) == count


def test_a_program_can_wait_for_noise(open_page, sim):
    page = open_page("/sonometro#programar")
    wait_for(lambda: sim.board.mode == "sound")
    add_block(page, "wait_sound")
    add_block(page, "light_on")
    page.get_by_role("button", name="¡Ejecutar!").click()
    page.wait_for_selector(".bk-run")
    time.sleep(0.5)
    assert not sim.board.leds["red"]  # todavía esperando el ruido
    sim.api("/sim?sound=85")
    page.wait_for_selector(".bk-status:has-text('Terminado')")
    assert sim.api("/sim")["lights"][-1]["red"] is True
    # Al acabar, las luces vuelven a enseñar el ruido.
    wait_for(lambda: sim.board.mode == "sound")


def test_the_example_program_loads(open_page):
    page = open_page("/fantasmas#programar", width=1280)
    page.get_by_role("button", name="Ejemplo").click()
    assert page.locator(".bk-script .bk-c").count() == 2  # «por siempre» y «repetir»
    # por siempre (verde, esperar, apagar, repetir 3 (rojo, nota, apagar, esperar), esperar)
    assert page.locator(".bk-script [data-id]").count() == 10


def test_the_program_is_remembered(open_page, browser, sim):
    page = open_page("/semaforo#programar")
    add_block(page, "light_on")
    page.reload()
    page.wait_for_selector("[data-conn].online")
    assert program_blocks(page).count() == 1


def test_challenges_can_be_ticked(open_page):
    page = open_page("/semaforo#programar")
    page.locator(".challenge[data-id='1']").click()
    page.wait_for_selector(".challenge[data-id='1'].done")
    assert "1 de 5" in page.locator("[data-challenge-count='semaforo']").inner_text()


def test_the_ghost_page_reacts_to_distance(open_page, sim):
    page = open_page("/fantasmas")
    wait_for(lambda: sim.board.mode == "ghost")
    sim.api("/sim?cm=8")
    page.wait_for_selector("#stage.boo-on")
    assert page.locator("#emf span.on").count() == 5
    assert page.locator("#caught").inner_text() == "1"
    sim.api("/sim?cm=-1")
    page.wait_for_selector("#stage:not(.boo-on)")
    assert page.locator("#distance").inner_text() == "—"


def test_the_sound_meter_settings_reach_the_board(open_page, sim):
    page = open_page("/sonometro")
    slider = page.locator("#sound-red")
    slider.evaluate("(el) => { el.value = 80; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); }")
    wait_for(lambda: sim.board.settings["soundRed"] == 80)


def test_the_wiring_diagram_draws_the_board(open_page):
    page = open_page("/fantasmas#montar")
    svg = page.locator("#wiring svg")
    assert svg.locator("text", has_text="D1").count() >= 1
    assert "VIN" in svg.inner_html()


@pytest.mark.parametrize(
    "path", ["/", "/semaforo", "/semaforo#programar", "/semaforo#montar", "/sonometro", "/fantasmas", "/fantasmas#programar", "/juego"]
)
def test_nothing_sticks_out_on_a_small_phone(open_page, path):
    # Un móvil pequeño (360 px): la página no se puede salir por los lados.
    # El esquema de cables se desliza dentro de su caja, a propósito.
    page = open_page(path, width=360)
    assert page.evaluate("document.documentElement.scrollWidth") <= 360


def test_blocks_can_be_added_with_the_keyboard(open_page):
    page = open_page("/semaforo#programar", width=1280)
    page.locator("[data-palette='light_on']").focus()
    page.keyboard.press("Enter")
    assert program_blocks(page).count() == 1
