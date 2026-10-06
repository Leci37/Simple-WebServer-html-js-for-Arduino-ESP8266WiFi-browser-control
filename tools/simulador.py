#!/usr/bin/env python3
"""Simulador de la placa: la web y la API, sin NodeMCU.

Sirve la carpeta web/ igual que la placa y contesta a /api/... con la misma
lógica que el firmware (laboratorio/lights.h y compañía), con un micrófono y
un sensor de distancia de mentira. Sirve para tocar la web desde el
ordenador, sin subir nada a la placa, y para las pruebas.

    python tools/simulador.py               # http://localhost:8080
    python tools/simulador.py --port 9000 --quiet

Con --quiet los sensores no se mueven solos (silencio y nada cerca); se
cambian con /sim?sound=80&cm=15 (sólo existe en el simulador).
"""
from __future__ import annotations

import argparse
import json
import math
import random
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_web import TYPES, WEB, url_for, web_files  # noqa: E402

MODES = ["manual", "auto", "night", "sound", "ghost"]
VERSION = "1.2.0"

# Los récords de la clase (laboratorio/records.h y alias.h).
RECORDS_MAX = 5
RECORD_METERS_MAX = 999999
WORLD_NAMES = ["campo", "granja", "luna"]
ALIAS_CHARS = 12
ALIAS_DROPS = '<>"&'


def now_ms() -> int:
    return int(time.monotonic() * 1000)


def clean_alias(raw: str) -> str:
    """Como cleanAlias() de alias.h: sin <>"&, sin caracteres de control, sin
    espacios a los lados y con 12 letras como mucho. Lo que no era UTF-8 llega
    aquí como U+FFFD, y la placa lo tira: aquí también."""
    kept = "".join(c for c in raw if c not in ALIAS_DROPS and c != "\ufffd" and ord(c) >= 0x20 and ord(c) != 0x7F)
    return kept.strip(" ")[:ALIAS_CHARS]


class Board:
    """Lo mismo que hace el firmware, en Python. Si cambias uno, cambia el otro."""

    def __init__(self, quiet: bool = False) -> None:
        self.lock = threading.Lock()
        self.quiet = quiet
        self.start = now_ms()
        self.mode = "auto"
        self.leds = {"red": False, "yellow": False, "green": False}
        self.phase = "green"
        self.phase_at = now_ms()
        self.walk_requested = False
        self.walk_beeps = False
        self.button = 0
        self.beeps: list[tuple[int, int]] = []
        # Lo que han ido mandando las órdenes de luces, para las pruebas.
        self.light_log: list[dict] = []
        self.sound = {"level": 0, "peak": 0, "raw": 0, "mic": True, "claps": 0}
        self.peak_at = 0
        self.clap_at = -1000
        self.was_loud = False
        self.ghost = {"cm": -1, "level": 0, "sensor": True}
        self.forced_sound: int | None = 0 if quiet else None
        self.forced_cm: int | None = -1 if quiet else None
        self.settings = {
            "soundYellow": 45,
            "soundRed": 70,
            "soundGain": 100,
            "soundAlarm": False,
            "ghostNear": 20,
            "ghostFar": 60,
            "ghostSound": True,
            "trafficSpeed": 2,
        }
        # La placa los guarda en la flash; aquí duran lo que dura el simulador.
        self.records: list[dict] = []

    # --- Las luces (lights.h) ---------------------------------------------------

    def set_mode(self, mode: str) -> None:
        if mode == self.mode:
            return
        self.mode = mode
        self.leds = {"red": False, "yellow": False, "green": False}
        self.phase = "green"
        self.phase_at = now_ms()
        self.walk_requested = False
        self.walk_beeps = False

    def press_button(self) -> None:
        self.button += 1
        self.beep(1200, 40)
        if self.mode == "auto" and self.phase != "red":
            self.walk_requested = True

    def beep(self, hz: int, ms: int) -> None:
        self.beeps = (self.beeps + [(hz, ms)])[-20:]

    def duration(self, phase: str) -> int:
        speed = min(3, max(1, self.settings["trafficSpeed"])) - 1
        table = {"green": (8000, 5000, 3000), "yellow": (3000, 2000, 1000), "red": (8000, 5000, 3000)}
        return table[phase][speed]

    def ghost_level(self, cm: int) -> int:
        near, far = self.settings["ghostNear"], self.settings["ghostFar"]
        if cm < 0 or cm > far:
            return 0
        if cm <= near // 2:
            return 5
        if cm <= near:
            return 4
        return 1 + (far - cm) * 3 // (far - near + 1)

    def tick(self) -> None:
        now = now_ms()
        self.read_sensors(now)
        if self.mode == "auto":
            elapsed = now - self.phase_at
            if self.phase == "green" and (
                elapsed >= self.duration("green") or (self.walk_requested and elapsed >= 1000)
            ):
                self.phase, self.phase_at = "yellow", now
            elif self.phase == "yellow" and elapsed >= self.duration("yellow"):
                self.phase, self.phase_at = "red", now
                self.walk_beeps, self.walk_requested = self.walk_requested, False
            elif self.phase == "red" and elapsed >= self.duration("red"):
                self.phase, self.phase_at, self.walk_beeps = "green", now, False
            self.leds = {c: self.phase == c for c in ("red", "yellow", "green")}
        elif self.mode == "night":
            self.leds = {"red": False, "yellow": (now // 500) % 2 == 0, "green": False}
        elif self.mode == "sound":
            level, s = self.sound["level"], self.settings
            red = level >= s["soundRed"]
            yellow = not red and level >= s["soundYellow"]
            self.leds = {"red": red, "yellow": yellow, "green": not red and not yellow}
        elif self.mode == "ghost":
            level = self.ghost["level"]
            if level == 0:
                self.leds = {"red": False, "yellow": False, "green": True}
            elif level <= 3:
                self.leds = {"red": False, "yellow": True, "green": False}
            else:
                half = 120 if level == 5 else 300
                self.leds = {"red": (now // half) % 2 == 0, "yellow": False, "green": False}

    # --- Los sensores de mentira ----------------------------------------------

    def read_sensors(self, now: int) -> None:
        t = (now - self.start) / 1000
        if self.forced_sound is not None:
            level = self.forced_sound
        else:
            # Charla de fondo y, cada 7 segundos, una palmada.
            level = 22 + 8 * math.sin(t * 1.3) + random.uniform(-4, 4)
            since_clap = t % 7
            if since_clap < 1.2:
                level = max(level, 92 - since_clap * 40)
        level = int(max(0, min(100, level * self.settings["soundGain"] / 100)))
        self.sound["level"] = level
        self.sound["raw"] = int(4 * 10 ** (level / 100 * math.log10(700 / 4)))
        if level >= self.sound["peak"] or now - self.peak_at > 2000:
            self.sound["peak"], self.peak_at = level, now
        # Como detectClap() de sound.h: llegar al rojo es una palmada (con 300 ms sordos).
        loud = level >= self.settings["soundRed"]
        if loud and not self.was_loud and now - self.clap_at >= 300:
            self.sound["claps"] += 1
            self.clap_at = now
        self.was_loud = loud
        if self.forced_cm is not None:
            cm = self.forced_cm
        else:
            # Un fantasma que se acerca y se aleja despacio.
            cm = int(70 + 62 * math.sin(t * 0.45))
        self.ghost["cm"] = cm
        self.ghost["level"] = self.ghost_level(cm)

    # --- La API (web_api.h) ------------------------------------------------------

    def state(self) -> dict:
        return {
            "mode": self.mode,
            "leds": dict(self.leds),
            "walk": self.mode == "auto" and self.phase == "red",
            "button": self.button,
            "sound": dict(self.sound),
            "ghost": dict(self.ghost),
            "settings": dict(self.settings),
            "board": {
                "name": "Laboratorio-SIM",
                "address": "localhost",
                "accessPoint": True,
                "version": VERSION,
                "uptime": now_ms() - self.start,
            },
        }

    def handle(self, path: str, args: dict[str, str]) -> tuple[int, dict]:
        with self.lock:
            self.tick()
            if path == "/api/state":
                return 200, self.state()
            if path == "/api/input":
                return 200, {
                    "button": self.button,
                    "claps": self.sound["claps"],
                    "cm": self.ghost["cm"],
                    "level": self.sound["level"],
                }
            if path == "/api/mode":
                if args.get("set") not in MODES:
                    return 400, {"error": "set tiene que ser manual, auto, night, sound o ghost"}
                self.set_mode(args["set"])
                return 200, self.state()
            if path == "/api/light":
                color = args.get("color")
                if color not in ("red", "yellow", "green", "all"):
                    return 400, {"error": "color tiene que ser red, yellow, green o all"}
                self.set_mode("manual")
                if color == "all":
                    on = arg_bool(args, "on", not any(self.leds.values()))
                    self.leds = {c: on for c in self.leds}
                else:
                    self.leds[color] = arg_bool(args, "on", not self.leds[color])
                self.light_log = (self.light_log + [dict(self.leds)])[-100:]
                return 200, self.state()
            if path == "/api/beep":
                hz, ms = arg_int(args, "hz", 880), arg_int(args, "ms", 200)
                if not (0 <= hz <= 10000 and 0 <= ms <= 5000):
                    return 400, {"error": "hz va de 0 a 10000 y ms de 0 a 5000"}
                self.beep(hz, ms)
                return 200, self.state()
            if path == "/api/walk":
                self.press_button()
                return 200, self.state()
            if path == "/api/settings":
                return self.change_settings(args)
            if path == "/api/records":
                if arg_bool(args, "clear", False):
                    self.records = []
                return 200, {"records": [dict(r) for r in self.records]}
            if path == "/api/record":
                return self.add_record(args)
            if path == "/api":
                return 200, {"api": ["GET /api/state", "…"]}
            return 404, {"error": "esa orden no existe: mira /api"}

    def change_settings(self, args: dict[str, str]) -> tuple[int, dict]:
        s = dict(self.settings)
        limits = {
            "soundYellow": (0, 100),
            "soundRed": (0, 100),
            "soundGain": (10, 1000),
            "ghostNear": (2, 400),
            "ghostFar": (3, 400),
            "trafficSpeed": (1, 3),
        }
        for key, (low, high) in limits.items():
            s[key] = min(high, max(low, arg_int(args, key, s[key])))
        for key in ("soundAlarm", "ghostSound"):
            s[key] = arg_bool(args, key, s[key])
        if s["soundYellow"] >= s["soundRed"]:
            return 400, {"error": "soundYellow tiene que ser menor que soundRed"}
        if s["ghostNear"] >= s["ghostFar"]:
            return 400, {"error": "ghostNear tiene que ser menor que ghostFar"}
        self.settings = s
        return 200, self.state()

    def add_record(self, args: dict[str, str]) -> tuple[int, dict]:
        """Como handleRecord() y recordsAdd(): con los mismos metros que otro, va detrás."""
        alias, meters = clean_alias(args.get("alias", "")), arg_int(args, "m", 0)
        if not alias or meters <= 0:
            return 400, {"error": "hace falta un alias y los metros"}
        world = args.get("w", WORLD_NAMES[0])
        if world not in WORLD_NAMES:
            return 400, {"error": "w tiene que ser campo, granja o luna"}
        record = {"alias": alias, "m": min(meters, RECORD_METERS_MAX), "t": 1 if arg_bool(args, "t", False) else 0, "w": world}
        at = 0
        while at < len(self.records) and self.records[at]["m"] >= record["m"]:
            at += 1
        place = 0
        if at < RECORDS_MAX:
            self.records = (self.records[:at] + [record] + self.records[at:])[:RECORDS_MAX]
            place = at + 1
        return 200, {"records": [dict(r) for r in self.records], "place": place}

    def simulate(self, args: dict[str, str]) -> dict:
        """/sim?sound=80&cm=15&clap=1&auto=1: mover los sensores a mano."""
        with self.lock:
            if "sound" in args:
                self.forced_sound = arg_int(args, "sound", 0)
            if args.get("clap") == "1":
                self.sound["claps"] += 1
            if "cm" in args:
                self.forced_cm = arg_int(args, "cm", -1)
            if args.get("auto") == "1":
                self.forced_sound = self.forced_cm = None
            self.tick()
            return {
                "sound": self.forced_sound,
                "cm": self.forced_cm,
                "beeps": self.beeps,
                "lights": self.light_log,
            }


def arg_int(args: dict[str, str], name: str, fallback: int) -> int:
    if name not in args:
        return fallback
    try:
        return int(float(args[name]))
    except ValueError:
        return 0


def arg_bool(args: dict[str, str], name: str, fallback: bool) -> bool:
    if name not in args:
        return fallback
    return args[name].lower() in ("1", "true", "on")


def make_handler(board: Board):
    files = {url_for(f): f for f in web_files()}

    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, format, *args):  # noqa: A002 - la firma es de la librería
            pass

        def send_json(self, code: int, body: dict) -> None:
            data = json.dumps(body, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self) -> None:  # noqa: N802 - nombre de la librería
            url = urlparse(self.path)
            args = {k: v[-1] for k, v in parse_qs(url.query).items()}
            if url.path == "/sim":
                return self.send_json(200, board.simulate(args))
            if url.path == "/api" or url.path.startswith("/api/"):
                return self.send_json(*board.handle(url.path, args))
            file = files.get(url.path)
            if file is None:
                self.send_response(302)
                self.send_header("Location", "/")
                self.end_headers()
                return
            data = file.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", TYPES[file.suffix])
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    return Handler


def serve(port: int, quiet: bool) -> ThreadingHTTPServer:
    board = Board(quiet=quiet)
    server = ThreadingHTTPServer(("127.0.0.1", port), make_handler(board))
    server.board = board  # type: ignore[attr-defined]
    return server


def main() -> int:
    parser = argparse.ArgumentParser(description="Simulador del Laboratorio de inventos")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--quiet", action="store_true", help="sensores quietos (para pruebas)")
    args = parser.parse_args()
    server = serve(args.port, args.quiet)
    print(f"Simulador listo: abre http://localhost:{args.port} (web de {WEB})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
