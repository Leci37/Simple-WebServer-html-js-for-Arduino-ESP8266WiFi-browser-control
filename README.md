# 🧪 Laboratorio de inventos

Tres inventos para niños y niñas con una placa **NodeMCU (ESP8266)**: un
**semáforo**, un **sonómetro** y un **detector de fantasmas**. Se juega con
ellos y se **programan con bloques, como en Scratch**, desde el móvil, la
tableta o el ordenador. La web vive dentro de la placa: no hace falta internet
ni instalar nada.

<p align="center">
  <img src="docs/img/portada.png" width="200" alt="La portada: elige un invento" />
  <img src="docs/img/semaforo.png" width="200" alt="El semáforo, con el de peatones" />
  <img src="docs/img/sonometro.png" width="200" alt="El sonómetro: aguja, número y luces" />
  <img src="docs/img/fantasmas.png" width="200" alt="El detector de fantasmas: radar y energía espectral" />
</p>

## Los tres inventos

| | Qué hace | Qué se aprende | Piezas |
|---|---|---|---|
| 🚦 **Semáforo** | Las luces se encienden tocándolas, en automático (con botón de peatones) o en modo noche. | **Secuencias**: el orden de las cosas y las esperas. | 3 LEDs y 3 resistencias de 220 Ω (y un zumbador, si se quiere sonido) |
| 🎤 **Sonómetro** | Una aguja, una gráfica y las luces del semáforo dicen cuánto ruido hay. Con dos juegos: el reto del silencio y el récord de palmada. | **Sensores** y **bucles**: la placa escucha sin parar. | Un micrófono con amplificador (MAX4466 o MAX9814) en A0 |
| 👻 **Detector de fantasmas** | Un radar de ultrasonidos: cuanto más cerca está algo, más «energía espectral», más pitidos y más se ve el fantasma. | **Condiciones**: «si está cerca, entonces…». | Un sensor HC-SR04 y dos resistencias (1 kΩ y 2 kΩ) |

Los tres viven a la vez en la misma placa y comparten las tres luces: se monta
una vez y se pasa de uno a otro sin desmontar nada. Cada invento tiene tres
pestañas: **Jugar**, **Programar** (con sus retos) y **Montar** (con el dibujo
de los cables).

## Programar con bloques

<p align="center"><img src="docs/img/bloques.png" width="760" alt="El editor de bloques ejecutando el semáforo: el bloque que va brilla" /></p>

Los bloques se tocan (o se arrastran) para hacer una secuencia, y
**▶ ¡Ejecutar!** la recorre paso a paso: la placa hace cada cosa y el bloque
que va por ahí brilla, como en Scratch. Los colores son los de Scratch:

- 💡 **Luces**: encender, apagar, apagar todas.
- 🔊 **Sonido**: pitar, tocar una nota (do, re, mi…).
- 🔁 **Control**: esperar, repetir, por siempre.
- 📡 **Sensores**: esperar a que pulsen el botón, a que haya ruido o a que algo
  se acerque; y «si el ruido es…», «si algo está a menos de…».

Cada invento enseña los bloques que le sirven, trae un ejemplo y cinco retos
con estrellas. El programa se guarda en el navegador. Cómo está hecho, y qué
otras herramientas (TurboWarp, Snap!, MicroBlocks…) podrían programar la
placa: [docs/BLOQUES.md](docs/BLOQUES.md).

## Cómo se monta

<p align="center"><img src="docs/img/esquema.png" width="560" alt="Esquema: la NodeMCU con las luces, el zumbador y el sensor de distancia" /></p>

| Pieza | Pata | Pin de la NodeMCU |
|---|---|---|
| 🔴 LED rojo / 🟡 amarillo / 🟢 verde | pata larga (+), cada una con su resistencia de 220 Ω | **D5** / **D6** / **D7** |
| Los tres LEDs | patas cortas (−) | **GND** |
| 🔊 Zumbador pasivo (opcional) | + / − | **D8** / **GND** |
| 🎤 Micrófono (MAX4466, MAX9814, KY-038…) | OUT (o AO) / VCC / GND | **A0** / **3V3** / **GND** |
| 👻 Sensor HC-SR04 | VCC / GND / TRIG | **VIN** (5 V) / **GND** / **D1** |
| 👻 Sensor HC-SR04 | ECHO, por una resistencia de 1 kΩ (y otra de 2 kΩ de D2 a GND) | **D2** |
| 🔘 Botón de peatones | ya viene en la placa: el botón **FLASH** | D3 |

- **Siempre con la placa desenchufada** al cambiar cables.
- El ECHO del HC-SR04 da 5 V y la placa aguanta 3,3 V: por eso el divisor de
  dos resistencias. Con un **HC-SR04P** (pone 3.3V–5V) no hace falta: VCC a 3V3
  y ECHO directo a D2.
- Al arrancar, cada luz se enciende con su nota (do, mi, sol). Si una no se
  enciende, ese LED está del revés.
- Los pines se cambian en [`laboratorio/config.h`](laboratorio/config.h). La
  chuleta de la placa: [docs/img/nodemcu-pinout.jpg](docs/img/nodemcu-pinout.jpg).

## Cómo se carga en la placa

1. En el **IDE de Arduino**, en *Preferencias → URLs adicionales del gestor de
   placas*, añade `https://arduino.esp8266.com/stable/package_esp8266com_index.json`,
   y en el *Gestor de placas* instala **esp8266** (probado con la 3.1.2 y con la 2.7.4).
2. Abre [`laboratorio/laboratorio.ino`](laboratorio/laboratorio.ino), elige la placa
   **NodeMCU 1.0 (ESP-12E Module)** y su puerto, y pulsa **Subir**.
   **No hace falta ninguna librería**: todo viene con las placas ESP8266.
3. La placa crea su wifi, **Laboratorio-XXXX** (las cuatro letras cambian en cada
   placa: en una clase con varias no se mezclan). Al conectarte, el móvil abre la
   web solo (como en la wifi de un hotel); si no, ve a **http://192.168.4.1**
   o **http://laboratorio.local**.

El monitor serie (115200 baudios) dice el nombre de la wifi y la dirección. En
[`config.h`](laboratorio/config.h) se puede poner contraseña a la wifi de la
placa o hacer que entre en la wifi de casa.

## La API (para mayores)

Todo lo que hace la web, lo hace con estas órdenes, y cualquier otro programa
puede usarlas (contestan en JSON y admiten CORS). Son GET para que se puedan
probar escribiéndolas en el navegador:

| Orden | Qué hace |
|---|---|
| `/api/state` | Todo lo que sabe la placa: modo, luces, ruido, distancia, ajustes… |
| `/api/mode?set=manual\|auto\|night\|sound\|ghost` | Quién manda en las luces. |
| `/api/light?color=red\|yellow\|green\|all&on=1\|0` | Enciende o apaga (sin `on`, cambia). Pone el modo manual. |
| `/api/beep?hz=880&ms=200` | Un pitido o una nota en el zumbador. |
| `/api/walk` | Como pulsar el botón de los peatones. |
| `/api/settings?soundRed=80&ghostNear=25…` | Cambia los ajustes que se nombran. |
| `/api` | Esta lista. |

```python
import json, urllib.request
placa = "http://192.168.4.1"
urllib.request.urlopen(placa + "/api/light?color=green&on=1")
estado = json.load(urllib.request.urlopen(placa + "/api/state"))
print(estado["sound"]["level"], estado["ghost"]["cm"])
```

## Para desarrollar

```
pip install -r requirements-dev.txt
python -m playwright install chromium
python tools/simulador.py        # la web y una placa de mentira en http://localhost:8080
pytest                           # firmware ↔ simulador ↔ web, y los bloques en Chromium
python tools/build_web.py        # después de tocar web/: regenera laboratorio/web_pages.h
```

- [`laboratorio/`](laboratorio/): el firmware, una pestaña por parte (`lights.h`,
  `sound.h`, `ghost.h`, `network.h`, `web_api.h`…).
- [`web/`](web/): la web, en ficheros normales. `tools/build_web.py` la comprime
  dentro de `laboratorio/web_pages.h`, que se sube al repositorio para que cargar
  la placa sólo necesite el IDE de Arduino.
- [`tools/simulador.py`](tools/simulador.py): la misma lógica que el firmware,
  en Python, con un micrófono y un sensor de mentira.
- El CI ([`.github/workflows/pruebas.yml`](.github/workflows/pruebas.yml)) pasa
  las pruebas y compila el firmware para la NodeMCU.
- ¿Un invento nuevo? [docs/NUEVO_INVENTO.md](docs/NUEVO_INVENTO.md).

## Ramas

Como el resto de herramientas zlecitool, el trabajo va en **`_ztool_main`**. El
proyecto de antes (el autómata del carro de bolas, con ESPAsyncWebServer) está
archivado en **`main_2024-03-13`**, la fecha de su último cambio; `main` no se ha
tocado.

---

**English summary.** A kids' lab for a NodeMCU (ESP8266) board: a traffic light,
a sound meter and a "ghost detector" (an ultrasonic distance sensor), all on the
same board and the same three LEDs. The board hosts its own Wi-Fi with a captive
portal and serves a kid-friendly web app (Spanish) with live controls, wiring
diagrams and a Scratch-like block editor that runs sequences on the board. No
external Arduino libraries are needed. A JSON/CORS API makes it scriptable from
other tools; a Python simulator and a pytest suite (with Playwright) cover the web
and the API.
