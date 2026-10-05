# Laboratorio de inventos

Tres inventos y un juego para niños y niñas con una placa **NodeMCU
(ESP8266)**, de la familia de herramientas **zlecitool** de **tuisku**
([tuisku.eu](https://tuisku.eu)): un **semáforo**, un **sonómetro**, un
**detector de fantasmas** y **¡Salta, Chispa!**, un juego que se juega con la
placa. Todo se maneja desde el móvil, la tableta o el ordenador, y se
**programa con bloques, como en Scratch**. La web vive dentro de la placa: no
hace falta internet, ni cuentas, ni instalar nada.

![La portada, servida por la placa: los tres inventos y el juego](docs/img/portada.png)

*La portada, tal como la sirve la placa en su propia wifi. Chispa, la
bombilla, es la mascota. Toda la web (62 kB comprimidos) está dentro del
firmware.*

Este README va con la versión **1.1.0** (ver [CHANGELOG.md](CHANGELOG.md)).
Hoy el Laboratorio funciona solo, sin el núcleo `zlecitool-core`; cómo
entraría en la plataforma está en [docs/PLATAFORMA.md](docs/PLATAFORMA.md).

| Documento | Para quién |
|---|---|
| [docs/PLATAFORMA.md](docs/PLATAFORMA.md) | Quien lo vaya a meter en tuisku: qué se queda en la placa, qué iría a una herramienta `lab` y qué pone ya el núcleo (cuentas, colegios, máquinas, IA). |
| [docs/BLOQUES.md](docs/BLOQUES.md) | Quien quiera programarla con bloques o con otra herramienta (TurboWarp, Snap!, MicroBlocks…). |
| [docs/NUEVO_INVENTO.md](docs/NUEVO_INVENTO.md) | Quien añada un invento: pines, firmware, simulador y web. |
| [CHANGELOG.md](CHANGELOG.md) | Qué trae cada versión. |
| [CLAUDE.md](CLAUDE.md) | Las reglas para trabajar en este repo, también para la IA. |

## Qué hace, pieza a pieza

Cada invento tiene tres pestañas: **Jugar**, **Programar** (con cinco retos) y
**Montar** (con el dibujo de los cables). En cada pieza, «Se monta» dice lo
que hay que conectar a la placa. Todo vive a la vez en la misma placa y con
las mismas tres luces: se monta una vez y se pasa de un invento a otro sin
desmontar nada.

### 🚦 El semáforo

Las luces de la pantalla son las de verdad: se tocan y se encienden en la
placa. Tres modos: **Yo** (a mano), **Automático** (verde, amarillo, rojo, a
tres velocidades) y **Noche** (el amarillo parpadea). En automático, «Quiero
cruzar» (o el botón FLASH de la placa) adelanta el rojo, el semáforo de
peatones se pone verde y el zumbador pita para quien no ve.

![El semáforo con el rojo y el peatón en verde, y los modos](docs/img/semaforo.png)

**Se monta:** tres LEDs, cada uno con su resistencia de 220 Ω, en D5 (rojo),
D6 (amarillo) y D7 (verde); el zumbador en D8, si se quiere sonido. El botón
de peatones ya está en la placa.

### 🧩 Programar con bloques

Los bloques se tocan (o se arrastran) para hacer una secuencia, y
**▶ ¡Ejecutar!** la recorre paso a paso: la placa hace cada cosa y el bloque
que va por ahí brilla, como en Scratch. Por familias y con sus colores:
💡 luces (encender, apagar, apagar todas), 🔊 sonido (pitar, tocar una nota),
🔁 control (esperar, repetir, por siempre) y 📡 sensores (esperar a que pulsen
el botón, a que haya ruido o a que algo se acerque; «si el ruido es…», «si
algo está a menos de…»). Los bucles dicen por qué vuelta van; lo que nunca
llegará a ejecutarse (debajo de un «por siempre») sale en gris. Cada invento
enseña sus bloques, trae un ejemplo y cinco retos con estrellas. El programa
se guarda en el navegador.

![El editor de bloques ejecutando el semáforo de ejemplo: «esperar 3 segundos» brilla y el bucle va por la vuelta 1 de 3](docs/img/bloques.png)

**Se monta:** nada más; se programa lo que haya montado.

### 🎤 El sonómetro

Una aguja de 0 a 100 (como los decibelios: el oído va a saltos), la cara de
Chispa, una gráfica de los últimos 30 segundos y, en la placa, las luces del
semáforo: verde, amarillo o rojo según el ruido. Los colores y la
sensibilidad se ajustan con deslizadores. Dos juegos: el **reto del
silencio** (diez segundos sin llegar al amarillo) y el **récord de palmada**.

![El sonómetro: la aguja, la gráfica con una palmada y las luces de la placa](docs/img/sonometro.png)

**Se monta:** un micrófono con amplificador (MAX4466 o MAX9814; también valen
los KY-038, que oyen menos): OUT en A0, VCC en 3V3 y GND en GND.

### 👻 El detector de fantasmas

Un radar de ultrasonidos: cuanto más cerca está algo, más **energía
espectral** (de 0 a 5), más se deja ver el fantasma y más deprisa pita la
placa. A 5, «¡BUUU!» y un fantasma cazado (con su flash). Las distancias de
«cerca» y «lejos» se ajustan.

![El detector a 9 cm: el radar, la energía al máximo y el fantasma](docs/img/fantasmas.png)

**Se monta:** un sensor HC-SR04: VCC en VIN (5 V), GND en GND, TRIG en D1 y
ECHO en D2 pasando por una resistencia de 1 kΩ, con otra de 2 kΩ de D2 a GND
(el ECHO da 5 V y la placa aguanta 3,3 V). Con un HC-SR04P no hacen falta:
VCC en 3V3 y ECHO directo a D2.

### 🎮 ¡Salta, Chispa!

Como el dinosaurio de Chrome cuando no hay internet, pero con Chispa, dibujos
de colores, día y noche, y **mandos de verdad**: el **botón FLASH** de la
placa, una **palmada** o la **mano** a menos de 15 cm del sensor (y siempre
tocando la pantalla o con la barra espaciadora). Salen cosas que no apetecen:
cactus, deberes, brócoli, el libro de mates, un coche con prisa y el
**Nubarrón**, que tira exámenes desde arriba. Ayudan tres poderes (escudo,
cohete y cámara lenta) y hay rayos para coger; tres vidas. A los 800 m llega
la **Súper Cosechadora**: sólo se salta con el cohete, y es el final de la
demo. Mientras nadie juega, la pantalla de inicio juega sola. Las luces de la
placa van con la partida: verde corriendo, amarillo con un poder, rojo al
chocar.

<p>
<img src="docs/img/juego.png" width="420" alt="De noche, con el cohete: Chispa vuela entre rayos">
<img src="docs/img/juego-cosechadora.png" width="420" alt="El final: la Súper Cosechadora y «¡Ahora! ¡Salta con el cohete!»">
</p>

**Se monta:** nada para el botón. Para la palmada, el micrófono del
sonómetro; para la mano, el sensor del detector.

### 🔌 Montar

Cada invento trae su lista de piezas, el **esquema** de la NodeMCU con sus
pines de verdad (lo de ese invento en color; lo de los otros, en gris), la
tabla de qué pata va a qué pin y los pasos, con lo que hay que saber (la pata
larga del LED, para qué la resistencia). Al arrancar, cada luz se enciende con
su nota (do, mi, sol): si una no lo hace, ese LED está del revés.

![«Cómo se conecta» del semáforo: el esquema y la tabla de pines](docs/img/montar.png)

**Se monta:** lo que diga cada invento. El esquema completo, abajo
([Cómo se monta](#cómo-se-monta)).

### 📶 La wifi de la placa

La placa crea su wifi, **Laboratorio-XXXX** (las cuatro letras salen de cada
placa: en una clase con varias no se mezclan), sin contraseña o con la de
`config.h`. Es un **portal cautivo**: al conectarse, el móvil abre la web
solo, como en la wifi de un hotel; si no, `http://192.168.4.1` o
`http://laboratorio.local`. También puede entrar en la wifi de casa
(`config.h`); si no lo consigue en 15 segundos, crea la suya.

**Se monta:** nada.

### 📱 En el móvil

Todo se adapta a un móvil de 360 px y a las tabletas: la paleta de bloques
enseña una familia cada vez y se queda arriba mientras se baja por el
programa; el esquema se desliza de lado; el juego pide girar el móvil.

![En el móvil: el semáforo, el editor de bloques y el juego](docs/img/movil.png)

### Lo que no se ve

- **Sin librerías:** el firmware sólo usa lo que trae el núcleo ESP8266
  (`ESP8266WebServer`, `DNSServer`, `ESP8266mDNS`): cargarlo es abrir el
  `.ino` y pulsar «Subir». Compila con la 3.1.2 y con la 2.7.4.
- **La web, dentro del firmware:** se escribe en `web/` como ficheros normales
  y `tools/build_web.py` la comprime (211 kB → 62 kB) en
  `laboratorio/web_pages.h`, con su ETag (el móvil no la vuelve a bajar si no
  ha cambiado). Nada viene de internet: ni fuentes ni librerías.
- **Las palmadas,** en cada lectura del micrófono (no cada 150 ms): en el
  juego, saltar tarde es chocar.
- **El simulador** (`tools/simulador.py`): la misma lógica que el firmware, en
  Python, con un micrófono y un sensor de mentira. Sirve para tocar la web sin
  placa y para las pruebas.
- **Las pruebas:** 78, con pytest y Chromium: que el firmware, el simulador y
  la web dicen lo mismo (las órdenes, la forma del estado, los ajustes), los
  bloques ejecutándose, el juego con cada mando (hasta ganar a la
  cosechadora), y que nada se sale de un móvil de 360 px.
- **La API,** para programarla desde fuera ([abajo](#la-api)).

## Cómo se monta

![El esquema completo: la NodeMCU con las luces, el zumbador, el micrófono y el sensor](docs/img/esquema.png)

| Pieza | Pata | Pin de la NodeMCU |
|---|---|---|
| 🔴 LED rojo / 🟡 amarillo / 🟢 verde | pata larga (+), cada una con su resistencia de 220 Ω | **D5** / **D6** / **D7** |
| Los tres LEDs | patas cortas (−) | **GND** |
| 🔊 Zumbador pasivo (opcional) | + / − | **D8** / **GND** |
| 🎤 Micrófono (MAX4466, MAX9814, KY-038…) | OUT (o AO) / VCC / GND | **A0** / **3V3** / **GND** |
| 👻 Sensor HC-SR04 | VCC / GND / TRIG | **VIN** (5 V) / **GND** / **D1** |
| 👻 Sensor HC-SR04 | ECHO, por una resistencia de 1 kΩ (y otra de 2 kΩ de D2 a GND) | **D2** |
| 🔘 Botón de peatones y del juego | ya viene en la placa: el botón **FLASH** | D3 |

Siempre **con la placa desenchufada** al cambiar cables. Los pines se cambian
en [`laboratorio/config.h`](laboratorio/config.h); la chuleta de la placa, en
[docs/img/nodemcu-pinout.jpg](docs/img/nodemcu-pinout.jpg).

## Cargar la placa

1. En el **IDE de Arduino**, *Preferencias → URLs adicionales del gestor de
   placas*: `https://arduino.esp8266.com/stable/package_esp8266com_index.json`.
   En el *Gestor de placas*, **esp8266** (3.1.2; también vale la 2.7.4).
2. Abrir [`laboratorio/laboratorio.ino`](laboratorio/laboratorio.ino), elegir
   **NodeMCU 1.0 (ESP-12E Module)** y su puerto, y **Subir**. No hace falta
   ninguna librería.
3. El monitor serie (115200) dice el nombre de la wifi y la dirección.

O con `arduino-cli`:

```
arduino-cli core install esp8266:esp8266 --additional-urls https://arduino.esp8266.com/stable/package_esp8266com_index.json
arduino-cli compile --fqbn esp8266:esp8266:nodemcuv2 laboratorio
arduino-cli upload --fqbn esp8266:esp8266:nodemcuv2 -p /dev/ttyUSB0 laboratorio
```

## Probarlo sin placa

```
pip install -r requirements-dev.txt
python tools/simulador.py        # http://localhost:8080: la web con una placa de mentira
```

Con `--quiet`, los sensores no se mueven solos y se mueven a mano:
`/sim?sound=80`, `/sim?cm=15`, `/sim?clap=1` (sólo en el simulador).

## La API

Todo lo que hace la web lo hace con estas órdenes, y cualquier otro programa
puede usarlas: contestan en JSON y admiten CORS. Son GET para que se puedan
probar escribiéndolas en el navegador.

| Orden | Qué hace |
|---|---|
| `/api/state` | Todo lo que sabe la placa: modo, luces, ruido, palmadas, distancia, ajustes y la placa. |
| `/api/input` | Lo justo para jugar: pulsaciones del botón, palmadas, distancia y ruido. |
| `/api/mode?set=manual\|auto\|night\|sound\|ghost` | Quién manda en las luces. |
| `/api/light?color=red\|yellow\|green\|all&on=1\|0` | Enciende o apaga (sin `on`, cambia). Pone el modo manual. |
| `/api/beep?hz=880&ms=200` | Un pitido o una nota en el zumbador. |
| `/api/walk` | Como pulsar el botón FLASH. |
| `/api/settings?soundRed=80&ghostNear=25…` | Cambia los ajustes que se nombran. |
| `/api` | Esta lista. |

```python
import json, urllib.request
placa = "http://192.168.4.1"
urllib.request.urlopen(placa + "/api/light?color=green&on=1")
estado = json.load(urllib.request.urlopen(placa + "/api/state"))
print(estado["sound"]["level"], estado["ghost"]["cm"])
```

## Pruebas

```
pip install -r requirements-dev.txt
python -m playwright install chromium
pytest
```

Sin Playwright, las de las páginas y el juego se saltan en vez de fallar: no
las des por probadas si se saltaron. Si se toca `web/`, antes
`python tools/build_web.py` (una prueba falla si `web_pages.h` no está al día).

**Las capturas de este README** (`docs/img/`) son del simulador, en Chromium
a 1280 px de ancho (el móvil, a 390), en PNG de 256 colores. Al cambiar algo
que se ve, se rehacen: `python tools/capturas.py`.

## Qué hay aquí

```
laboratorio/           el firmware (una pestaña del IDE por parte)
├── laboratorio.ino    setup() y loop(): sólo arranca y reparte
├── config.h           ⚙️ lo que se puede cambiar: la wifi y los pines
├── settings.h         los ajustes de la web (deslizadores)
├── lights.h           🚦 las luces, sus modos, el semáforo y el botón
├── sound.h            🎤 el micrófono: nivel, pico y palmadas
├── ghost.h            👻 el sensor de distancia
├── buzzer.h           🔊 el zumbador
├── network.h          📶 la wifi, el portal cautivo y laboratorio.local
├── web_api.h          🌐 la web y la API
└── web_pages.h        la web comprimida (generada: no se toca)
web/                   la web: una página por invento, el juego y lo común
├── app.css, app.js    estilos, Chispa, pestañas, retos, hablar con la placa
├── bloques.js         el editor de bloques y su ejecutor
├── esquema.js         los esquemas de «Montar»
└── juego.js           ¡Salta, Chispa!
tools/
├── build_web.py       web/ → laboratorio/web_pages.h (y --check)
├── simulador.py       la placa en Python, para probar sin ella
└── capturas.py        las capturas de este README
tests/                 firmware ↔ simulador ↔ web, las páginas y el juego en Chromium
docs/                  PLATAFORMA, BLOQUES, NUEVO_INVENTO; docs/img/, las capturas
.github/workflows/     las pruebas y la compilación del firmware en cada push
```

## Ramas

Como el resto de herramientas zlecitool, el trabajo va en **`_ztool_main`**.
`main` sólo recibe lo que el dueño pida fusionar (por pull request). El
proyecto de antes (el autómata del carro de bolas, con ESPAsyncWebServer) está
archivado en **`main_2024-03-13`**, la fecha de su último cambio.

## CI

`.github/workflows/pruebas.yml`, en cada push a `_ztool_main` o `main` y en
cada pull request: las pruebas (pytest con Chromium) y la compilación del
firmware para la NodeMCU con `arduino-cli`. En rojo no se sube nada encima.

---

**English summary.** A kids' lab for a NodeMCU (ESP8266) board, part of the
tuisku zlecitool family: a traffic light, a sound meter and a "ghost
detector" (an ultrasonic distance sensor), all on the same board and the same
three LEDs, plus a Chrome-dino-style runner game played with the board's
FLASH button, a clap or a hand over the sensor. The board hosts its own Wi-Fi
with a captive portal and serves a kid-friendly web app (Spanish) with live
controls, wiring diagrams and a Scratch-like block editor that runs sequences
on the board. No external Arduino libraries are needed. A JSON/CORS API makes
it scriptable; a Python simulator and 78 pytest/Playwright tests cover the
web, the API and the game. How it would join the zlecitool platform (boards
as core "devices", schools as organisations, AI that writes block programs):
docs/PLATAFORMA.md.
