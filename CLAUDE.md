# CLAUDE.md — Laboratorio de inventos

Firmware para NodeMCU (ESP8266) y su web para niños: semáforo, sonómetro y
detector de fantasmas, con un editor de bloques tipo Scratch. Lee el
[README](README.md); para crecer, [docs/NUEVO_INVENTO.md](docs/NUEVO_INVENTO.md).

## Reglas

1. **Sin librerías externas en el firmware.** Sólo lo que trae el núcleo ESP8266
   (`ESP8266WebServer`, `DNSServer`, `ESP8266mDNS`…): cargar la placa tiene que
   ser abrir el `.ino` y pulsar «Subir».
2. **La web no carga nada de internet.** La placa no tiene: nada de CDN ni de
   fuentes de fuera. Y JavaScript sólo en ficheros (`<script src>`), nunca en
   línea ni con `onclick=`.
3. **`laboratorio/web_pages.h` no se toca a mano.** Se edita `web/` y se ejecuta
   `python tools/build_web.py`; la cabecera generada se sube.
4. **El simulador es el firmware en Python.** Lo que cambie en la lógica o en la
   API (`lights.h`, `sound.h`, `ghost.h`, `web_api.h`) cambia en
   `tools/simulador.py` en el mismo commit; las pruebas comparan los dos.
5. **Cada cambio, con su prueba**, `pytest` en verde (sin saltadas: las de las
   páginas necesitan Playwright y Chromium) y el firmware compilando:
   `arduino-cli compile --fqbn esp8266:esp8266:nodemcuv2 laboratorio`.
6. **En el bucle no se espera.** Nada de `delay()` en `loop()`: la placa tiene
   que atender la wifi; los tiempos se llevan con `millis()`.
7. **Para niños.** Textos de la web en español, de tú, cortos y que digan qué
   hacer; botones grandes; tiene que ir en un móvil de 360 px y en tabletas
   viejas (JavaScript sencillo, sin `?.` ni `??`).
8. **Idioma:** documentación y comentarios en español; nombres en el código y en
   la API, en inglés. Los comentarios explican **por qué**, no qué.
9. **Versión y CHANGELOG van juntos:** `LAB_VERSION` en `laboratorio/config.h`
   (y `VERSION` en el simulador) y una entrada en `CHANGELOG.md`.

## Ramas

Se trabaja en `_ztool_main`, como en el resto de herramientas zlecitool. `main`
no se toca sin que lo pida el dueño; `main_2024-03-13` es el archivo del
proyecto anterior.

## Comandos

```
pip install -r requirements-dev.txt
python -m playwright install chromium
python tools/simulador.py
python tools/build_web.py
pytest
```
