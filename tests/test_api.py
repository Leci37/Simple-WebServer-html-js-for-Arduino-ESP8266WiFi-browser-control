"""La API de la placa: el firmware, el simulador y la web tienen que decir lo mismo.

El firmware no se puede ejecutar aquí, así que se compara su código (web_api.h)
con el simulador, y el simulador se prueba de verdad.
"""
from __future__ import annotations

import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API_H = (ROOT / "laboratorio" / "web_api.h").read_text(encoding="utf-8")
WEB_JS = "\n".join(p.read_text(encoding="utf-8") for p in (ROOT / "web").glob("*.js"))


def firmware_routes() -> set[str]:
    return set(re.findall(r'server\.on\("(/api[^"]*)"', API_H))


def firmware_state_keys() -> set[str]:
    body = API_H[API_H.index("String stateJson()") : API_H.index("// --- Las órdenes")]
    return set(re.findall(r'\\"(\w+)\\":', body))


def flat_keys(data: dict) -> set[str]:
    keys = set()
    for key, value in data.items():
        keys.add(key)
        if isinstance(value, dict):
            keys |= flat_keys(value)
    return keys


def test_the_web_only_calls_orders_the_firmware_has():
    used = set(re.findall(r'(?:api|call)\("(\w+)"', WEB_JS))
    assert used, "la web no llama a la API"
    assert {"/api/" + name for name in used} <= firmware_routes()


# Lo mínimo que piden las órdenes que no van solas.
EXAMPLE_ARGS = {"/api/mode": "?set=auto", "/api/light": "?color=red", "/api/record": "?alias=Rayo&m=10"}


def test_the_simulator_answers_every_firmware_order(sim):
    for route in firmware_routes():
        code, _ = sim.get(route + EXAMPLE_ARGS.get(route, ""))
        assert code == 200, route


def test_the_state_has_the_same_shape_in_firmware_and_simulator(sim):
    assert flat_keys(sim.api("/api/state")) == firmware_state_keys()


def test_settings_have_the_same_names_everywhere(sim):
    start = API_H.index("void handleSettings()")
    in_firmware = set(re.findall(r'arg(?:Int|Bool)\("(\w+)"', API_H[start : API_H.index("\n}\n", start)]))
    in_simulator = set(sim.api("/api/state")["settings"])
    assert in_firmware == in_simulator
    sent_by_web = set(re.findall(r"(sound\w+|ghost\w+|trafficSpeed):", WEB_JS))
    assert sent_by_web <= in_firmware


def test_lights_by_hand_take_over_the_mode(sim):
    state = sim.api("/api/light?color=red&on=1")
    assert state["mode"] == "manual"
    assert state["leds"] == {"red": True, "yellow": False, "green": False}
    # Sin «on», la luz cambia.
    assert sim.api("/api/light?color=red")["leds"]["red"] is False
    assert sim.api("/api/light?color=all&on=1")["leds"] == {"red": True, "yellow": True, "green": True}
    assert sim.api("/api/light?color=all")["leds"] == {"red": False, "yellow": False, "green": False}


def test_wrong_orders_get_a_clear_error(sim):
    assert sim.get("/api/light?color=blue")[0] == 400
    assert sim.get("/api/mode?set=disco")[0] == 400
    assert sim.get("/api/beep?hz=99999")[0] == 400
    code, body = sim.get("/api/nada")
    assert code == 404 and "error" in body


def test_settings_refuse_yellow_above_red_and_near_above_far(sim):
    assert sim.get("/api/settings?soundYellow=80&soundRed=60")[0] == 400
    assert sim.get("/api/settings?ghostNear=90&ghostFar=50")[0] == 400
    state = sim.api("/api/settings?soundYellow=30&soundRed=50&ghostSound=0&trafficSpeed=9")
    assert state["settings"]["soundYellow"] == 30
    assert state["settings"]["ghostSound"] is False
    assert state["settings"]["trafficSpeed"] == 3  # recortado a lo que existe


def test_the_sound_meter_lights_follow_the_noise(sim):
    sim.api("/api/mode?set=sound")
    for level, lit in ((10, "green"), (50, "yellow"), (90, "red")):
        sim.api(f"/sim?sound={level}")
        leds = sim.api("/api/state")["leds"]
        assert [color for color, on in leds.items() if on] == [lit], level


def test_the_ghost_level_grows_as_it_gets_closer(sim):
    sim.api("/api/mode?set=ghost")
    levels = []
    for cm in (-1, 200, 59, 40, 21, 20, 10):
        sim.api(f"/sim?cm={cm}")
        levels.append(sim.api("/api/state")["ghost"]["level"])
    assert levels == [0, 0, 1, 2, 3, 4, 5]
    sim.api("/sim?cm=45")
    assert sim.api("/api/state")["leds"]["yellow"] is True


def test_the_walk_button_brings_the_red_light_sooner(sim):
    sim.api("/api/settings?trafficSpeed=3")
    sim.api("/api/mode?set=manual")
    state = sim.api("/api/mode?set=auto")
    assert state["leds"]["green"] is False  # el ciclo empieza al primer tic
    time.sleep(0.1)
    assert sim.api("/api/state")["leds"]["green"] is True
    presses = sim.api("/api/walk")["button"]
    assert presses == 1
    # Con la liebre, verde 3 s; pidiendo cruzar, el amarillo llega al segundo.
    time.sleep(1.2)
    assert sim.api("/api/state")["leds"]["yellow"] is True
    time.sleep(1.1)
    state = sim.api("/api/state")
    assert state["leds"]["red"] is True and state["walk"] is True


def test_the_game_input_is_small_and_the_same_in_firmware_and_simulator(sim):
    body = API_H[API_H.index("void handleInput()") : API_H.index("// /api/mode")]
    assert set(re.findall(r'\\"(\w+)\\":', body)) == set(sim.api("/api/input"))


def test_claps_are_counted_once_per_loud_sound(sim):
    assert sim.api("/api/input")["claps"] == 0
    sim.api("/sim?clap=1")
    assert sim.api("/api/input")["claps"] == 1
    # Llegar al rojo cuenta como palmada; quedarse en rojo, no cuenta más.
    sim.api("/sim?sound=95")
    sim.api("/api/state")
    sim.api("/api/state")
    assert sim.api("/api/input")["claps"] == 2
    assert sim.api("/api/state")["sound"]["claps"] == 2
