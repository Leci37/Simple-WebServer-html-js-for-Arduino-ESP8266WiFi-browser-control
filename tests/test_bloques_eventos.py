"""Los bloques «⚡ cuando…» del editor, en Chromium contra el simulador.

Sólo el juego los tiene (pestaña Programar): se ponen en marcha cada vez que
pasa algo en la partida, a la vez que el resto del programa, y «Parar» los
para todos. Las páginas sin ellos siguen como antes.

La partida se congela con los trucos de ?prueba=1 (invencible y velocidad 0):
así sólo salta Chispa cuando la prueba lo pide.
"""
from __future__ import annotations

import pytest

pytest.importorskip("playwright.sync_api")

from conftest import wait_for  # noqa: E402

PROGRAM = "/juego?prueba=1&semilla=3#programar"
OFF = {"red": False, "yellow": False, "green": False}
YELLOW = {"red": False, "yellow": True, "green": False}
RED = {"red": True, "yellow": False, "green": False}
GREEN = {"red": False, "yellow": False, "green": True}


def state(page):
    return page.evaluate("Juego.state()")


def add(page, *blocks: str):
    for block in blocks:
        page.locator(f"[data-palette='{block}']").click()


def choose(page, index: int, value: str):
    """Elegir en el desplegable número `index` del programa, de arriba abajo."""
    page.locator(".bk-script select").nth(index).select_option(value)


def set_number(page, index: int, value: str):
    field = page.locator(".bk-script .bk-num").nth(index)
    field.fill(value)
    field.press("Enter")
    field.blur()


def shape(page):
    """El programa guardado, sólo con los tipos: un bloque con hueco es
    [tipo, [lo de dentro]]."""

    def walk(nodes):
        return [[n["type"], walk(n["body"])] if "body" in n else n["type"] for n in nodes]

    return walk(page.evaluate("JSON.parse(localStorage.getItem('lab.programa.juego'))") or [])


def run(page):
    page.get_by_role("button", name="¡Ejecutar!").click()
    wait_for(lambda: state(page)["program"])


def stop(page):
    page.get_by_role("button", name="Parar").click()
    page.wait_for_selector(".bk-status:has-text('Parado')")
    wait_for(lambda: not state(page)["program"])


def play_frozen(page, sim) -> int:
    """Empieza una partida y la congela. Devuelve por dónde va el registro de
    luces, para mirar sólo lo que encienda el programa."""
    running = state(page)["program"]
    page.locator("#start-btn").click()
    wait_for(lambda: state(page)["mode"] == "play")
    page.evaluate("Juego.prueba.invencible(true); Juego.prueba.rapido(0)")
    # Al empezar, el juego apaga todo y enciende el verde (si no hay un
    # programa en marcha: entonces las luces son del programa).
    if not running:
        wait_for(lambda: sim.board.light_log[-2:] == [OFF, GREEN])
    return len(sim.board.light_log)


def jump(page):
    jumps = state(page)["jumps"]
    if not state(page)["ground"]:
        page.evaluate("Juego.prueba.actualiza(1 / 60, 90)")  # que aterrice antes
    page.locator("#jump-btn").dispatch_event("pointerdown")
    wait_for(lambda: state(page)["jumps"] == jumps + 1)


def test_when_blocks_always_go_to_the_top_and_new_blocks_go_inside_the_last_one(open_page):
    page = open_page(PROGRAM, width=1280)
    add(page, "light_on", "when_game")
    assert shape(page) == ["light_on", ["when_game", []]]
    add(page, "wait")
    assert shape(page) == ["light_on", ["when_game", ["wait"]]]
    # Otro «cuando» no cae dentro del primero: va suelto, y lo nuevo, dentro de él.
    add(page, "when_game", "light_off", "forever")
    assert shape(page) == ["light_on", ["when_game", ["wait"]], ["when_game", ["light_off", ["forever", []]]]]
    # Ni debajo de un «por siempre», ni en el hueco que se haya elegido tocándolo.
    page.locator(".bk-c.cat-control .bk-mouth .bk-stack").click()
    page.wait_for_selector(".bk-script.has-target")
    add(page, "when_game")
    assert shape(page)[-1] == ["when_game", []]
    assert len(shape(page)) == 4
    assert page.locator(".bk-script .bk-hat-top").count() == 3
    # Y así se guarda: al volver, cada bloque sigue en su sitio.
    saved = shape(page)
    page.reload()
    page.wait_for_selector("[data-conn].online")
    assert page.locator(".bk-script .bk-hat-top").count() == 3
    assert shape(page) == saved


def test_dragging_a_when_block_into_a_repeat_keeps_it_at_the_top(open_page):
    page = open_page(PROGRAM, width=1280)
    add(page, "repeat")
    page.locator("[data-palette='when_game']").drag_to(page.locator(".bk-mouth .bk-stack"))
    # Dentro de un «repetir», el «cuando» se quedaría esperando y el resto no seguiría.
    assert shape(page) in (
        [["repeat", []], ["when_game", []]],
        [["when_game", []], ["repeat", []]],
    )


def test_a_when_block_runs_alongside_the_main_sequence(open_page, sim):
    page = open_page(PROGRAM, width=1280)
    add(page, "light_on", "wait", "light_off", "when_game", "light_on")
    choose(page, 0, "yellow")
    choose(page, 1, "yellow")
    choose(page, 2, "jump")
    choose(page, 3, "red")
    set_number(page, 0, "1,5")
    assert shape(page) == ["light_on", "wait", "light_off", ["when_game", ["light_on"]]]
    before = play_frozen(page, sim)

    run(page)
    wait_for(lambda: sim.board.light_log[before:] == [OFF, YELLOW])
    jump(page)
    # El rojo del «cuando» se enciende mientras el amarillo aún espera…
    wait_for(lambda: {"red": True, "yellow": True, "green": False} in sim.board.light_log[before:])
    # …y el amarillo se apaga a su hora, sin esperar al «cuando».
    wait_for(lambda: sim.board.light_log[-1] == RED)
    assert sim.board.light_log[before:] == [OFF, YELLOW, {"red": True, "yellow": True, "green": False}, RED]
    page.wait_for_selector(".bk-lap:has-text('1 vez')")

    # Lo de arriba ya acabó, pero el «cuando» sigue esperando otro salto.
    page.wait_for_timeout(300)
    assert "Terminado" not in page.locator(".bk-status").inner_text()
    assert state(page)["program"] is True
    jump(page)
    page.wait_for_selector(".bk-lap:has-text('2 veces')")
    wait_for(lambda: len(sim.board.light_log) == before + 5)
    assert sim.board.light_log[-1] == RED
    stop(page)


def test_stop_ends_the_main_sequence_and_every_when_block_at_once(open_page, sim):
    page = open_page(PROGRAM, width=1280)
    add(page, "light_on", "wait", "light_off", "when_game", "light_on", "when_game", "light_on")
    choose(page, 0, "yellow")
    choose(page, 1, "yellow")
    choose(page, 2, "jump")
    choose(page, 3, "green")
    choose(page, 4, "hit")
    choose(page, 5, "red")
    set_number(page, 0, "1")
    before = play_frozen(page, sim)

    run(page)
    wait_for(lambda: sim.board.light_log[before:] == [OFF, YELLOW])
    stop(page)
    assert page.get_by_role("button", name="¡Ejecutar!").is_enabled()
    assert page.get_by_role("button", name="Parar").is_disabled()
    jump(page)
    # Ni el amarillo se apaga (la espera se cortó) ni el «cuando» del salto enciende el verde.
    page.wait_for_timeout(1500)
    assert sim.board.light_log[before:] == [OFF, YELLOW]
    assert page.locator(".bk-lap").all_text_contents() == ["", ""]


def test_a_program_with_only_when_blocks_waits_for_the_game_until_stopped(open_page, sim):
    page = open_page(PROGRAM, width=1280)
    add(page, "when_game", "light_on", "wait", "light_off")
    choose(page, 0, "jump")
    choose(page, 1, "green")
    choose(page, 2, "green")
    set_number(page, 0, "0,2")
    before = len(sim.board.light_log)

    run(page)
    # La demo salta sola, pero eso no es Chispa jugando: el «cuando» no se entera.
    jumps = state(page)["jumps"]
    wait_for(lambda: state(page)["jumps"] > jumps, timeout=10)
    assert state(page)["mode"] == "demo"
    assert sim.board.light_log[before:] == [OFF]
    assert "Ejecutando" in page.locator(".bk-status").inner_text()

    play_frozen(page, sim)
    page.wait_for_timeout(300)
    assert sim.board.light_log[before:] == [OFF]  # el juego no toca las luces del programa
    jump(page)
    wait_for(lambda: sim.board.light_log[before:] == [OFF, GREEN, OFF])
    page.wait_for_selector(".bk-lap:has-text('1 vez')")
    page.wait_for_timeout(500)
    assert state(page)["program"] is True
    assert page.get_by_role("button", name="Parar").is_enabled()
    stop(page)


def test_a_program_without_when_blocks_ends_on_its_own_in_the_game(open_page, sim):
    page = open_page(PROGRAM, width=1280)
    add(page, "light_on", "wait", "light_off")
    choose(page, 0, "green")
    choose(page, 1, "green")
    set_number(page, 0, "0,3")
    before = len(sim.board.light_log)
    page.get_by_role("button", name="¡Ejecutar!").click()
    page.wait_for_selector(".bk-status:has-text('Terminado')")
    assert sim.board.light_log[before:] == [OFF, GREEN, OFF]
    wait_for(lambda: not state(page)["program"])


def test_stop_and_run_again_leave_nothing_of_the_old_run_on_a_slow_board(open_page, sim):
    page = open_page(PROGRAM, width=1280)
    add(page, "light_on", "light_on", "when_game")
    choose(page, 0, "green")
    choose(page, 1, "yellow")
    # Una placa lenta: la respuesta al verde tarda 1 s en llegar (la orden sí llega).
    page.evaluate(
        """() => {
            const real = window.fetch;
            window.fetch = function (url, options) {
                const answer = real.call(this, url, options);
                if (String(url).indexOf("color=green") < 0) return answer;
                return answer.then((res) => new Promise((done) => setTimeout(() => done(res), 1000)));
            };
        }"""
    )
    before = len(sim.board.light_log)
    page.get_by_role("button", name="¡Ejecutar!").click()
    wait_for(lambda: sim.board.light_log[before:] == [OFF, GREEN])
    page.get_by_role("button", name="Parar").click()
    page.wait_for_selector(".bk-status:has-text('Parado')")
    page.get_by_role("button", name="¡Ejecutar!").click()
    wait_for(lambda: any(lit["yellow"] for lit in sim.board.light_log[before:]))
    page.wait_for_timeout(1500)
    # El amarillo, sólo una vez: la ejecución parada no sigue cuando le contestan.
    assert [lit["yellow"] for lit in sim.board.light_log[before:]].count(True) == 1
    stop(page)


@pytest.mark.parametrize("invento", ["semaforo", "sonometro", "fantasmas"])
def test_pages_without_when_blocks_have_no_events_family(open_page, invento):
    page = open_page(f"/{invento}#programar", width=1280)
    assert page.locator(".bk-palette .bk-cat").count() >= 3
    assert page.locator(".bk-palette .cat-eventos").count() == 0
    assert page.locator(".bk-cat-tab", has_text="Eventos").count() == 0
