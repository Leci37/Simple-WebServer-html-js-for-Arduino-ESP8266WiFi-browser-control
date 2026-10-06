# Añadir un invento

El Laboratorio está pensado para crecer: cada invento es una pieza del firmware,
una página con sus tres pestañas y, si hace falta, bloques nuevos. Los tres de
ahora sirven de modelo (el sonómetro es el más completo).

## 1. Los pines

Los libres en la NodeMCU son **D0** (sin PWM ni interrupciones) y **D4** (lleva la
lucecita azul de la placa y tiene que estar en alto al arrancar). D3 es el botón
FLASH y D8 tiene que estar en bajo al arrancar: lo que se conecte ahí, que no lo
cambie. Si hace falta más, un expansor I²C usaría D1 y D2 (hoy, el sensor de
distancia). Se apuntan en [`laboratorio/config.h`](../laboratorio/config.h).

## 2. El firmware

- Una pestaña nueva, `laboratorio/<pieza>.h`, con su `…Begin()` y su `…Loop()`
  sin esperas largas (nada de `delay()` en el bucle: la placa tiene que atender la
  wifi). Si lee un sensor, guarda lo último en una estructura, como `sound` o
  `ghost`.
- Se incluye y se llama desde [`laboratorio.ino`](../laboratorio/laboratorio.ino).
- Lo que tenga que ver la web va en `stateJson()` de
  [`web_api.h`](../laboratorio/web_api.h); sus ajustes, en `Settings`
  ([`settings.h`](../laboratorio/settings.h)) y en `handleSettings()`; una orden
  nueva, con su `server.on("/api/…")`.
- Si el invento usa las luces a su manera, un modo nuevo en
  [`lights.h`](../laboratorio/lights.h) (`LightMode`, `MODE_NAMES` y su caso en
  `lightsLoop()`).

## 3. El simulador

Lo mismo en [`tools/simulador.py`](../tools/simulador.py): su estado, su sensor
de mentira y sus órdenes. Las pruebas comparan el JSON del firmware con el del
simulador y fallan si no coinciden.

## 4. La web

- Una página copiando una de las de ahora (`web/sonometro.html` y
  `web/sonometro.js`): barra de arriba, pestañas **Jugar / Programar / Montar**,
  Chispa en su bocadillo y retos. Al abrirse, pide su modo de luces; al acabar un
  programa de bloques, lo recupera (`onStop`).
- Sus bloques, si los necesita: una entrada en `BLOCKS` de
  [`web/bloques.js`](../web/bloques.js), y su nombre en la lista `blocks` de la
  página.
- Su dibujo en el esquema: una entrada en `PARTS` de
  [`web/esquema.js`](../web/esquema.js) con sus pines.
- Su tarjeta en la portada ([`web/index.html`](../web/index.html)).
- Un juego dentro de un invento (como el duelo de palmadas del sonómetro) es
  una tarjeta más en «Jugar», con su reto en «Programar»; al acabar, devuelve
  las luces al modo de su página.
- Los textos, en español y para niños: frases cortas, de tú, y que digan qué hacer.

## 5. Antes de subir

```
python tools/build_web.py     # mete la web en laboratorio/web_pages.h
pytest                        # en verde
arduino-cli compile --fqbn esp8266:esp8266:nodemcuv2 laboratorio
```

Y una línea en el [CHANGELOG](../CHANGELOG.md), subiendo `LAB_VERSION` en
`config.h`.
