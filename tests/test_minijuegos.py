"""Los tres juegos nuevos dentro de los inventos, en Chromium y contra el simulador:
el duelo de palmadas (sonómetro), la caza contrarreloj (fantasmas) y «Luz roja,
luz verde» (semáforo).

Duran de verdad medio minuto o un minuto, así que la página lleva un reloj de
mentira y parado (page.clock): la prueba lo adelanta a pasitos y, entre paso y
paso, la página sigue preguntando a la placa a tiempo real. Así los turnos y
las fases no dependen de lo rápido que vaya el ordenador.
"""
from __future__ import annotations

import json
import time

import pytest

pytest.importorskip("playwright.sync_api")

from conftest import wait_for  # noqa: E402


# ---------- Ayudas ----------


def stopped_clock(page):
    """Pone a la página un reloj de mentira y lo para: desde aquí, el tiempo de
    la página sólo pasa con run_until() o page.clock.run_for()."""
    page.clock.install()
    page.reload()  # que todo, desde el principio, use el reloj de mentira
    page.wait_for_selector("[data-conn].online")
    page.clock.pause_at(page.evaluate("Date.now()") / 1000 + 1)


def run_until(page, check, limit: int = 15000, step: int = 100):
    """Adelanta el reloj de la página a pasitos hasta que pase algo.

    El respiro entre paso y paso deja contestar a la placa: si el reloj
    corriera sin él, las preguntas en vuelo caducarían (a los 4 s de la página).
    """
    spent = 0
    while not check():
        if spent >= limit:
            raise AssertionError(f"no llegó a pasar en {limit} ms de la página")
        page.clock.run_for(step)
        time.sleep(0.01)
        spent += step


def text(page, selector: str) -> str:
    return page.locator(selector).inner_text()


def has_class(page, selector: str, name: str) -> bool:
    return name in (page.locator(selector).get_attribute("class") or "").split()


def lit(leds: dict) -> str:
    """Las luces encendidas en una palabra: «red», «red+green» o «-» (ninguna)."""
    return "+".join(c for c in ("red", "yellow", "green") if leds[c]) or "-"


def stored(page, key: str):
    raw = page.evaluate(f"localStorage.getItem('lab.{key}')")
    return None if raw is None else json.loads(raw)


def assert_fits(page, card: str):
    """Nada se sale por los lados: ni de la página ni de la tarjeta del juego."""
    assert page.evaluate("document.documentElement.scrollWidth") <= page.viewport_size["width"]
    sticking_out = page.locator(card).evaluate(
        """(card) => {
          const box = card.getBoundingClientRect();
          return Array.from(card.querySelectorAll('*'))
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && (r.left < box.left - 1 || r.right > box.right + 1);
            })
            .map((el) => el.id || el.className || el.tagName);
        }"""
    )
    assert sticking_out == []


# ---------- ⚔️ Duelo de palmadas (sonómetro) ----------


def duel_status(page) -> str:
    return text(page, "#duel-status")


def open_duel(open_page, sim, width: int = 390):
    page = open_page("/sonometro", width=width)
    wait_for(lambda: sim.board.mode == "sound")
    stopped_clock(page)
    return page


def clap_turn(page, sim, team: str, loud: int, claps: list) -> int:
    """Un turno del duelo: se espera al «AHORA», una palmada y luego casi silencio.
    Devuelve cuánto ha durado el turno, en milisegundos de la página."""
    # «3, 2, 1…»: lo que suene antes del «AHORA» no cuenta, así que se espera.
    run_until(page, lambda: "AHORA" in duel_status(page) and has_class(page, f"#team-{team}", "turn"), step=200)
    start = page.evaluate("Date.now()")
    sim.api(f"/sim?sound={loud}")
    run_until(page, lambda: text(page, f"#{team}-last") == f"¡Ahora! {loud}")
    # Lo que se oye después es más flojo: cuenta la palmada más fuerte, no la última.
    sim.api("/sim?sound=5")
    run_until(page, lambda: page.evaluate("Lab.state.sound.level") == 5)
    assert text(page, f"#{team}-last") == f"¡Ahora! {loud}"  # oído aún dentro del turno
    claps.append(str(loud))
    run_until(page, lambda: text(page, f"#{team}-last") == "Palmadas: " + " · ".join(claps))
    return page.evaluate("Date.now()") - start


def test_the_clap_duel_takes_turns_and_the_board_shows_who_leads(open_page, sim):
    page = open_duel(open_page, sim)
    red, green = [], []
    page.locator("#duel-btn").click()
    assert page.locator("#duel-btn").is_disabled()
    assert "Ronda 1 de 3 · Equipo rojo" in duel_status(page)
    assert has_class(page, "#team-red", "turn") and not has_class(page, "#team-green", "turn")
    # Empatados a cero: la luz de la placa, amarilla.
    wait_for(lambda: lit(sim.board.leds) == "yellow")
    assert sim.board.mode == "manual"

    # Mientras dura el duelo, los otros dos juegos esperan.
    page.locator("#clap-btn").click()
    page.locator("#silence-btn").click()
    assert text(page, "#clap-text") == "Récord: —"
    assert text(page, "#silence-text") == "¿Aguantáis 10 segundos sin llegar al amarillo?"

    # Ronda 1, para el rojo: la luz se pone roja. Cada turno, dos segundos y medio
    # (lo que se tarda en ver el «AHORA» y el final, a pasitos, da un margen).
    assert clap_turn(page, sim, "red", 80, red) == pytest.approx(2500, abs=200)
    assert clap_turn(page, sim, "green", 60, green) == pytest.approx(2500, abs=200)
    assert "Ronda 1 para el rojo, 80 a 60" in duel_status(page)
    assert (text(page, "#red-points"), text(page, "#green-points")) == ("1", "0")
    assert has_class(page, "#team-red", "lead") and not has_class(page, "#team-green", "lead")
    wait_for(lambda: lit(sim.board.leds) == "red")

    # Ronda 2, para el verde: van empatados y vuelve el amarillo.
    clap_turn(page, sim, "red", 50, red)
    clap_turn(page, sim, "green", 75, green)
    assert "Ronda 2 para el verde, 75 a 50" in duel_status(page)
    assert (text(page, "#red-points"), text(page, "#green-points")) == ("1", "1")
    assert not has_class(page, "#team-red", "lead") and not has_class(page, "#team-green", "lead")
    wait_for(lambda: lit(sim.board.leds) == "yellow")

    # Ronda 3, para el verde: gana dos a uno.
    clap_turn(page, sim, "red", 40, red)
    clap_turn(page, sim, "green", 90, green)
    assert "Ronda 3 para el verde, 90 a 40" in duel_status(page)
    wait_for(lambda: lit(sim.board.leds) == "green")
    run_until(page, lambda: "¡Gana el equipo verde, 2 a 1!" in duel_status(page))
    assert has_class(page, "#team-green", "lead")
    assert page.locator("#duel-btn").is_enabled()
    assert text(page, "#duel-btn") == "¡La revancha!"

    # La luz del que gana parpadea y, al acabar, las luces vuelven a enseñar el ruido.
    run_until(page, lambda: sim.board.mode == "sound")
    assert [lit(leds) for leds in sim.board.light_log] == (
        ["-", "yellow", "-", "red", "-", "yellow", "-", "green"] + ["-", "green"] * 4
    )


def test_a_team_that_wins_two_rounds_wins_the_duel_without_a_third(open_page, sim):
    page = open_duel(open_page, sim)
    red, green = [], []
    page.locator("#duel-btn").click()
    clap_turn(page, sim, "red", 85, red)
    clap_turn(page, sim, "green", 30, green)
    clap_turn(page, sim, "red", 90, red)
    clap_turn(page, sim, "green", 30, green)
    assert "Ronda 2 para el rojo, 90 a 30" in duel_status(page)
    # Amarilla al empezar, roja tras cada ronda (dos órdenes cada vez).
    wait_for(lambda: len(sim.board.light_log) == 6)
    run_until(page, lambda: "¡Gana el equipo rojo, 2 a 0!" in duel_status(page))
    run_until(page, lambda: sim.board.mode == "sound")
    # No hubo tercera ronda: dos palmadas por equipo, y parpadea el rojo.
    assert text(page, "#red-last") == "Palmadas: 85 · 90"
    assert text(page, "#green-last") == "Palmadas: 30 · 30"
    assert [lit(leds) for leds in sim.board.light_log][-8:] == ["-", "red"] * 4


def test_a_rematch_right_away_starts_tied_with_only_the_yellow_light(open_page, sim):
    page = open_duel(open_page, sim)
    red, green = [], []
    page.locator("#duel-btn").click()
    clap_turn(page, sim, "red", 85, red)
    clap_turn(page, sim, "green", 30, green)
    clap_turn(page, sim, "red", 90, red)
    clap_turn(page, sim, "green", 30, green)
    run_until(page, lambda: "¡Gana el equipo rojo, 2 a 0!" in duel_status(page))
    # «¡La revancha!» se puede pulsar ya, mientras la luz del rojo aún parpadea.
    page.locator("#duel-btn").click()
    assert "Ronda 1 de 3 · Equipo rojo" in duel_status(page)
    assert (text(page, "#red-points"), text(page, "#green-points")) == ("0", "0")
    run_until(page, lambda: "AHORA" in duel_status(page))
    page.wait_for_timeout(300)  # que acaben de llegar las órdenes de luces
    # Cero a cero: sólo la amarilla, sin la roja del duelo de antes.
    assert lit(sim.board.leds) == "yellow"


@pytest.mark.parametrize("other", ["#silence-btn", "#clap-btn"])
def test_the_duel_waits_while_the_silence_or_clap_game_is_on(open_page, sim, other):
    page = open_page("/sonometro")
    page.locator(other).click()
    page.locator("#duel-btn").click()
    page.wait_for_selector(".toast:has-text('Espera a que acabe el otro juego')")
    assert page.locator("#duel-btn").is_enabled()
    assert "Ronda" not in duel_status(page)
    page.wait_for_timeout(300)
    assert sim.board.light_log == []


# ---------- ⏱ Caza contrarreloj (fantasmas) ----------


def catch_ghost(page, sim, score: str):
    """Acercar la mano hasta el 5 y retirarla: un fantasma cazado."""
    sim.api("/sim?cm=9")
    run_until(page, lambda: text(page, "#hunt-score") == score)
    sim.api("/sim?cm=-1")
    run_until(page, lambda: not has_class(page, "#stage", "boo-on"))


def seconds_left(page) -> int:
    minutes, seconds = text(page, "#hunt-time").replace("⏱", "").strip().split(":")
    return int(minutes) * 60 + int(seconds)


def test_the_ghost_race_counts_catches_for_a_minute_and_keeps_the_record(open_page, sim):
    page = open_page("/fantasmas")
    wait_for(lambda: sim.board.mode == "ghost")
    stopped_clock(page)
    assert page.locator("#hunt-clock").is_hidden()
    assert text(page, "#race-record") == "—"

    page.locator("#race-btn").click()
    assert page.locator("#race-btn").is_disabled()
    assert page.locator("#hunt-clock").is_visible()
    assert text(page, "#hunt-time") == "⏱ 1:00"
    assert text(page, "#hunt-score") == "👻 0 cazados"

    catch_ghost(page, sim, "👻 1 cazado")
    # Si vuelve enseguida, es el mismo fantasma: no cuenta otra vez.
    sim.api("/sim?cm=9")
    run_until(page, lambda: has_class(page, "#stage", "boo-on"))
    sim.api("/sim?cm=-1")
    run_until(page, lambda: not has_class(page, "#stage", "boo-on"))
    assert text(page, "#hunt-score") == "👻 1 cazado"
    page.clock.run_for(2000)
    catch_ghost(page, sim, "👻 2 cazados")

    # Los últimos diez segundos, el reloj se pone rojo.
    run_until(page, lambda: seconds_left(page) <= 15, limit=60000, step=500)
    assert not has_class(page, "#hunt-time", "hurry")
    run_until(page, lambda: seconds_left(page) <= 10, limit=6000, step=250)
    assert has_class(page, "#hunt-time", "hurry")

    run_until(page, lambda: text(page, "#race-text").startswith("¡Tiempo!"), limit=11000, step=500)
    assert text(page, "#race-text") == "¡Tiempo! 2 fantasmas en un minuto. 🏆 ¡Récord nuevo!"
    assert text(page, "#race-record") == "2"
    assert stored(page, "fantasmas.contrarreloj") == 2
    assert page.locator("#race-btn").is_enabled()
    assert text(page, "#race-btn") == "¡Otra vez!"

    # Otra vuelta con menos fantasmas: el récord se queda como estaba.
    page.locator("#race-btn").click()
    assert text(page, "#hunt-time") == "⏱ 1:00"
    assert not has_class(page, "#hunt-time", "hurry")
    assert text(page, "#hunt-score") == "👻 0 cazados"
    catch_ghost(page, sim, "👻 1 cazado")
    run_until(page, lambda: text(page, "#race-text").startswith("¡Tiempo!"), limit=61000, step=500)
    assert text(page, "#race-text") == "¡Tiempo! 1 fantasma en un minuto."
    assert text(page, "#race-record") == "2"
    assert stored(page, "fantasmas.contrarreloj") == 2


# ---------- 🟢🔴 Luz roja, luz verde (semáforo) ----------


def rl_state(page) -> str:
    """La fase del juego, por la clase del cartel: go, wait, stop, back o end."""
    classes = page.locator("#rl-state").get_attribute("class").split()
    return " ".join(c for c in classes if c != "rl-state")


def stand_at(page, sim, cm: int, step: int = 100):
    """Ponerse a cm del sensor y esperar a que la página lo vea."""
    sim.api(f"/sim?cm={cm}")
    shown = f"📏 {cm} cm" if cm >= 0 else "📏 —"
    run_until(page, lambda: text(page, "#rl-cm") == shown, step=step)


def toast(page) -> str:
    return page.locator(".toast").text_content()


def test_red_light_green_light_refuses_to_start_too_close_or_without_echo(open_page, sim):
    page = open_page("/semaforo")
    stopped_clock(page)
    stand_at(page, sim, -1)
    page.locator("#rl-btn").click()
    assert toast(page) == "📏 No te veo: ponte delante del sensor de distancia"

    # «Más de 40 cm»: a 40 justos, tampoco.
    for cm in (30, 40):
        stand_at(page, sim, cm)
        page.locator("#rl-btn").click()
        assert toast(page) == "📏 Aléjate un poco: a más de 40 cm de la placa"
        assert rl_state(page) == ""
    assert text(page, "#rl-btn") == "¡Empezar!"
    assert sim.board.light_log == [] and sim.board.mode == "auto"


def test_red_light_green_light_sends_you_back_if_you_move_in_red(open_page, sim):
    page = open_page("/semaforo")
    stopped_clock(page)
    stand_at(page, sim, 80)
    page.locator("#rl-btn").click()
    assert text(page, "#rl-btn") == "■ Parar"
    assert rl_state(page) == "go"
    assert text(page, "#rl-state") == "🟢 ¡Avanza!"
    wait_for(lambda: lit(sim.board.leds) == "green")
    assert sim.board.mode == "manual"

    # En verde se avanza, y el muñeco avanza por la pista.
    stand_at(page, sim, 50)
    left = page.locator("#rl-walker").evaluate("(el) => parseFloat(el.style.left)")
    assert left == pytest.approx(6 + 84 * (80 - 50) / (80 - 12), abs=0.1)
    assert rl_state(page) == "go"

    # Luego amarillo y, después, rojo con un pitido.
    run_until(page, lambda: rl_state(page) == "wait", limit=5000)
    wait_for(lambda: lit(sim.board.leds) == "yellow")
    run_until(page, lambda: rl_state(page) == "stop", limit=2000, step=50)
    wait_for(lambda: lit(sim.board.leds) == "red")
    wait_for(lambda: (330, 200) in sim.board.beeps)
    assert text(page, "#rl-state") == "🔴 ¡Quieto!"

    # Un respiro para pararse (450 ms): lo que se mueve justo al ponerse rojo no cuenta.
    stand_at(page, sim, 40, step=50)
    assert rl_state(page) == "stop"
    page.clock.run_for(500)
    # Después, temblar un poco (6 cm o menos) tampoco…
    stand_at(page, sim, 35)
    assert rl_state(page) == "stop"
    # … pero moverse más, sí: a la salida.
    stand_at(page, sim, 30)
    assert rl_state(page) == "back"
    assert text(page, "#rl-state") == "👀 ¡Te he visto! Vuelve a la salida (80 cm)"
    wait_for(lambda: (196, 400) in sim.board.beeps)
    wait_for(lambda: len(sim.board.light_log) == 8)  # otra vez «todas apagadas, roja»
    assert lit(sim.board.leds) == "red"

    # Vuelta a la salida (o casi: 10 cm de margen), y otra vez verde.
    stand_at(page, sim, 72)
    assert rl_state(page) == "go"
    wait_for(lambda: lit(sim.board.leds) == "green")

    # A 12 cm de la placa, ha llegado: récord de tiempo guardado.
    stand_at(page, sim, 12)
    assert rl_state(page) == "end"
    secs = stored(page, "semaforo.luzroja")
    assert isinstance(secs, (int, float)) and secs > 0
    shown = str(secs).replace(".", ",")
    assert text(page, "#rl-state") == f"🏁 ¡Has llegado en {shown} s! 🏆 Récord · te pilló 1 vez"
    assert text(page, "#rl-record") == f"{shown} s"
    assert text(page, "#rl-btn") == "¡Otra vez!"
    wait_for(lambda: lit(sim.board.leds) == "green")
    # Las luces del final dejan la placa en manual, pero Chispa sigue celebrándolo.
    run_until(page, lambda: sim.board.mode == "manual" and len(sim.board.light_log) == 12)
    page.clock.run_for(400)
    assert text(page, "[data-say]") == "¡Has llegado a la placa! 🏁"
    assert [lit(leds) for leds in sim.board.light_log] == [
        "-", "green", "-", "yellow", "-", "red", "-", "red", "-", "green", "-", "green"
    ]

    # Al acabar, el semáforo vuelve a ir solo.
    run_until(page, lambda: sim.board.mode == "auto", limit=4000)


# ---------- Retos ----------


@pytest.mark.parametrize(
    "invento, words",
    [("sonometro", "Duelo de palmadas"), ("fantasmas", "Caza contrarreloj: ¿llegas a 5 fantasmas")],
    ids=["sonometro", "fantasmas"],
)
def test_challenge_six_is_listed_and_can_be_ticked(open_page, invento, words):
    page = open_page(f"/{invento}#programar")
    ids = page.locator(f".challenges[data-key='{invento}'] .challenge").evaluate_all(
        "(els) => els.map((el) => el.getAttribute('data-id'))"
    )
    assert ids == ["1", "2", "3", "4", "5", "6"]
    reto = page.locator(f".challenges[data-key='{invento}'] .challenge[data-id='6']")
    assert words in reto.inner_text()
    reto.click()
    page.wait_for_selector(f".challenges[data-key='{invento}'] .challenge[data-id='6'].done")
    assert "1 de 6" in text(page, f"[data-challenge-count='{invento}']")


# ---------- En un móvil pequeño ----------


def test_the_clap_duel_fits_a_small_phone_while_running(open_page, sim):
    page = open_duel(open_page, sim, width=360)
    page.locator("#duel-btn").click()
    assert_fits(page, ".card.duel")
    red, green = [], []
    clap_turn(page, sim, "red", 100, red)
    run_until(page, lambda: "AHORA" in duel_status(page))
    assert_fits(page, ".card.duel")
    clap_turn(page, sim, "green", 100, green)
    assert "¡empate a 100!" in duel_status(page)
    assert_fits(page, ".card.duel")


def test_the_ghost_race_fits_a_small_phone_while_running(open_page, sim):
    page = open_page("/fantasmas", width=360)
    stopped_clock(page)
    page.locator("#race-btn").click()
    assert_fits(page, ".ghost-card")
    catch_ghost(page, sim, "👻 1 cazado")
    run_until(page, lambda: has_class(page, "#hunt-time", "hurry"), limit=60000, step=500)
    assert_fits(page, ".ghost-card")


def test_red_light_green_light_fits_a_small_phone_while_running(open_page, sim):
    page = open_page("/semaforo", width=360)
    stopped_clock(page)
    stand_at(page, sim, 80)
    page.locator("#rl-btn").click()
    assert_fits(page, ".card.rl")
    run_until(page, lambda: rl_state(page) == "stop", limit=8000)
    page.clock.run_for(500)
    stand_at(page, sim, 60)
    assert rl_state(page) == "back"
    assert_fits(page, ".card.rl")
    stand_at(page, sim, 75)
    stand_at(page, sim, 12)
    assert rl_state(page) == "end"
    assert_fits(page, ".card.rl")
