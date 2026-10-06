# CAMBIOS · el diseño del 6 de octubre de 2026

| | |
|---|---|
| **Qué llegó** | El export de Claude Design [`laboratorio-design-2026-10-06.zip`](laboratorio-design-2026-10-06.zip), aquí al lado y tal cual (sha256 `b983b389…36b79df`). |
| **Con qué se compara** | La app 1.2.0 de `_ztool_dev` (`f8f853e`): el `web/` del zip contra el `web/` de la app, fichero a fichero, y su `FLUJO_USUARIO.md` paso a paso contra el código. |
| **Qué sale** | La **1.2.1**: los cuatro cambios del diseño, nada más. |
| **Núcleo** | Ninguno: el Laboratorio no usa `zlecitool-core`. Todo lo de aquí es de la herramienta. |

## Resumen

- El zip trae los **mismos 15 ficheros** que `web/`, ninguno nuevo ni quitado.
- Su `STATUS.md` marca **final** todas las páginas menos ¡Salta, Chispa!
  («in progress»: sólo por los umbrales de las estrellas, que no cambia).
- El diseño cambia **cuatro cosas**, todas en páginas «final»: se aplican.
- La app tiene **arreglos que el diseño no**, hechos al llevar el diseño anterior
  a la placa: se quedan. Por eso el `web/` del zip **no se copia** encima.
- El resto no es de diseño: **cómo se enlaza** (el diseño se abre como ficheros
  sueltos y la placa sirve direcciones), la versión del pie y un `favicon.svg`
  con metadatos: se queda lo de la app.
- **Cómo se ve:** igual. Comparadas en Chromium las cinco páginas con sus tres
  pestañas, a 1366 y a 390 px, el diseño y la app no tienen ni un estilo
  distinto; sólo se mueve la tarjeta del semáforo.
- **API de la placa:** nada nuevo, nada cambiado. El firmware sólo cambia de versión.

## 1. Lo que cambia el diseño (aplicado en la 1.2.1)

| # | Página | Fichero | Cambio | Prueba |
|---|---|---|---|---|
| 1 | 🚦 Semáforo | `semaforo.html` | «🟢🔴 Luz roja, luz verde» baja: debajo del semáforo y de «¿Quién manda?», a todo lo ancho (la tarjeta ya ocupaba toda la fila, `.rl { grid-column: 1 / -1 }`). Así el bocadillo «Toca una luz…» queda junto a las luces y, en el móvil, el semáforo se ve sin bajar. | `test_red_light_green_light_goes_below_the_traffic_light` (1280 y 390 px) |
| 2 | 🎤 Sonómetro | `sonometro.js` | En el duelo, cada turno cuenta también el pico de la placa (`sound.peak`, lo más alto de los últimos 2 s), si ha subido después del «AHORA» (`duel.peak0` se toma en el «AHORA»). La página pregunta cada 100 ms y una palmada corta podía caer entre dos preguntas. | `test_a_short_clap_counts_by_the_peak_but_not_one_before_now` |
| 3 | 🎤 Sonómetro | `sonometro.js` | Durante un duelo, «¡Empezar!» (silencio) y «¡Medir!» (palmada) avisan «Espera a que acabe el duelo 😉» en vez de no hacer nada. | `test_the_clap_duel_takes_turns_and_the_board_shows_who_leads` |
| 4 | 👻 Detector | `fantasmas.js` | Al acabar la caza contrarreloj, el reloj grande se queda 4 s con el resultado y se esconde, salvo que ya haya empezado otra caza. Antes se quedaba en «⏱ 0:00» hasta recargar. | `test_the_ghost_race_counts_catches_for_a_minute_and_keeps_the_record` |

Cada prueba falla con la web de la 1.2.0 y pasa con la de la 1.2.1. Después
de los cambios, `semaforo.html`, `sonometro.js` y `fantasmas.js` son los del
zip salvo lo de las secciones 2 y 3.

## 2. Lo que la app ya tiene y el diseño no (se queda lo de la app)

El propio README del zip lo pide; comprobado en el código:

- **`juego.js`**
  - los mundos van a la placa en inglés (`WORLD_API`: `field`, `farm`, `moon`); el diseño aún manda `campo`, `granja`, `luna`, y la placa los rechaza (400: «w tiene que ser field, farm o moon»);
  - al acabar se vuelven a pedir los récords de la clase, con el aviso «Esta vez no entras: mientras jugabas, otros han llegado más lejos»;
  - el alias se limpia como en `laboratorio/alias.h`;
  - con dos jugadores, la mano no cuenta y la placa no pita;
  - las esquinas del inicio y su cartel se encogen si no caben (`fitCorners`, `data-width`); en el diseño, a 390 px, «👤 1 jugador» queda tapado por «🐢 Tortuga · 5 vidas»;
  - al esconder un cartel, el botón suelta el foco, y un botón escondido no recibe Enter ni espacio;
  - la pegatina de los tres escudos sale después del cartel del poder.
- **`juego.html`:** los botones de las esquinas con `aria-label` y su `.word`; la nota de Montar dice que los récords los guarda la placa (el diseño aún dice que hace falta otro firmware).
- **`app.css`:** las reglas `[data-width]`: las de las esquinas (`.ov-corner`) y las del cartel del inicio (`.overlay-box`, `.world-pick`, `.wp-arrow`), que en el móvil se salía por los lados.
- **`semaforo.js`:** a 40 cm justos tampoco se puede empezar (`<= 40`), y Chispa sigue celebrando hasta que el semáforo vuelve a automático (`BACK_TO_AUTO_MS`).
- **`sonometro.js`:** si empieza la revancha, el parpadeo del ganador se corta.
- **`bloques.js`:** un «⚡ cuando…» soltado dentro de otro bloque va arriba, suelto; y si una rama falla o se para, se paran todas y se espera a que acaben antes del siguiente ▶.

## 3. Diferencias que no son de diseño (se queda lo de la app)

| Qué | En el zip | En la app |
|---|---|---|
| Ficheros de cada página (CSS, JS, favicon) | relativos: `app.css`, `app.js`… | absolutos: `/app.css`, `/app.js`… |
| Enlaces entre páginas | `semaforo.html`, `index.html`, `semaforo.html#montar` | `/semaforo`, `/`, `/semaforo#montar` (la placa sirve las páginas sin `.html`) |
| Enlace a la lista de órdenes | `#` | `/api` |
| Versión en el pie, antes de que conteste la placa | `1.1.0` | la de la app (ahora `1.2.1`); la placa la pone igual |
| `favicon.svg` | con unos 8 kB de metadatos (C2PA) | limpio |
| Simulador en el navegador (`simulador.js`) | no está en `web/`; sí en `preview/` y en las versiones viejas de `versions/` | no va: la placa contesta de verdad, y para probar está `tools/simulador.py` |

## 4. Lo que trae el zip y no va a `web/`

- `preview/`: el diseño con una placa de mentira dentro del navegador, para abrirlo sin placa.
- `design/`: el escaparate v4 de los cuatro juegos y la página de las 12 ideas (prototipos). Los juegos del escaparate son las mismas páginas de `web/`, metidas en un solo script (`lab-v4/paginas.js`); lo único suyo son los paneles «La placa», que hacen de placa de mentira (botón FLASH, palmada, mano), y su cabecera. No son interfaz de la app.
- `versions/`: versiones anteriores (la 1.1.0, la v2, el primer handoff, la página «Mejoras») y capturas de revisión.
- `texts.json`: todos los textos, con su clave, en español y en inglés.

## 5. Lo que el handoff dice mal (para el próximo export)

Nada de esto cambia lo que se aplica; es para que el próximo export empiece
bien. Las 47 diferencias del `web/` se han clasificado una a una: 7 son los
cuatro cambios, 23 lo que la app ya tiene y 17 de cómo se enlaza; ninguna
queda sin explicar.

**En su `README.md`**
- Dice que la ← de la app es `href=""` y que enlaza `semaforo` y `api`. Es `href="/"`, `/semaforo` y `/api`; un `href=""` recargaría la página en vez de volver.
- No cuenta que la app pide sus CSS y JS con ruta absoluta (`/app.css`) y el diseño con relativa (`app.css`).
- Los tamaños: la app no ocupa 85,76 kB sino 85,28 (87 328 bytes, lo que dice `build_web.py`); 85,76 sale si se pasan los ficheros a CRLF. Con los cuatro cambios, 85,47 kB y no ≈ 86,0; su `web/`, 85,91 y no 86,4. La diferencia que da, +0,2 kB, sí está bien.
- Llama al repositorio `Leci37/Simple-WebServer-html-js-for-Arduino-ESP8266WiFi-browser-control`, su nombre de antes; hoy es `Leci37/tuisku_kids_lab`.
- Lo que la app tiene de más está bien, pero corto: las reglas `[data-width]` no son sólo de las esquinas (también del cartel), y los mundos en inglés también se traducen de vuelta al enseñar los récords.

**En su `MANIFEST.md`**
- `versions/design_handoff_laboratorio_v3/lab-v3/` no es «la copia del primer handoff»: es igual que el `web/` de este zip (con los cuatro cambios) más la línea del simulador.

**En su `FLUJO_USUARIO.md`** (se han mirado sus 279 pasos y filas; lo demás coincide con el código)
- 0.2: el aviso «No encuentro la placa…» está en cuatro páginas, no en ¡Salta, Chispa!
- 0.4: el ejemplo `semaforo.html#montar` es el enlace del diseño; en la placa no abre Montar.
- 0.5 y 0.8: el texto de 💡 Ejemplo sale en la línea de estado del editor, no en el bocadillo; y con el programa en marcha los números y los desplegables sí se pueden cambiar.
- 2.4: la velocidad del automático no se guarda en la placa al apagarla (va en la RAM).
- 2.5: la celebración de 2,5 s sigue también tras «■ Parar»; «a menos de 10 cm de la salida» es «a 10 cm o menos»; un tiempo redondo sale «12 s», no «12,0 s».
- 3.4: una palmada corta, en la app, contaba de menos más que «nada»: el nivel de la placa baja despacio.
- 4.3: el reloj se quedaba en «⏱ 0:00» hasta recargar… o hasta otra caza.
- 4.4: el rojo no queda siempre 5 cm por encima del amarillo: el deslizador va de 5 en 5 y el hueco puede quedar en 3 o 4 cm.
- 5.6: con dos jugadores describe el diseño (la mano agacha al jugador 1); en la app la mano no cuenta con dos.
- 5.7: de la pantalla completa no se sale con su botón (ver «Visto de paso»).
- 5.10: la nota de Montar que cita es la vieja del diseño.

## 6. Preguntas para el dueño

1. **Las estrellas al ganar** (`STATUS.md`, la única página «in progress»):
   ¿con cuántos rayos? Hoy, 10 y 25, puestos de muestra en el diseño y en la
   app. No se ha tocado.
2. **«Mejoras» 6 y 7** del diseño, sólo bocetos: la pantalla grande del
   silencio con las tres mejores palmadas del día, y el álbum de fantasmas.
   ¿Se hacen? Necesitan pantalla y memoria nuevas.
3. ¿Se le pide a Claude Design que ponga sus ficheros al día con la app (lo que
   la app tiene de más) y que corrija lo de la sección 5? Así el próximo export
   se compara contra lo que hay de verdad.
4. **Visto de paso**, igual en la app y en el diseño, y fuera de este cambio.
   ¿Se arregla aparte?
   - ⛶ **Pantalla completa:** sólo entra el juego; la barra, con el botón para
     salir, «¡Salta!» y «Agáchate», se queda fuera. Se sale con Esc o con el
     gesto del navegador.
   - **Fin de partida:** con el foco en «¡Otra vez!», el espacio o Intro se
     saltan el respiro de 0,9 s (y el hueco del alias).
   - **Récord de palmada:** cuenta el pico de la placa sin mirar cuándo subió,
     así que un ruido de hasta 2 s antes de «¡Medir!» puede ser el récord. El
     duelo lo arregla en este diseño; el récord, no.
   - **Detector, ajustes:** el hueco entre amarillo y rojo puede quedar en 3 o 4
     cm (ver 4.4).
   - En el duelo, una palmada dada en la cuenta atrás más fuerte que la del
     turno tapa el pico de la buena, y se cuenta como en la 1.2.0 (por el
     nivel); y la del último instante antes del «AHORA» (lo que tarda una
     pregunta a la placa) sí cuenta. Es como lo pensó el diseño.

## 7. Comprobado

- `pytest`: 163 pruebas, ninguna saltada (con Chromium).
- Las pruebas de los cuatro cambios fallan con la web de la 1.2.0, y la del
  reloj de la caza también si se esconde a los 2 s en vez de a los 4.
- `python tools/build_web.py --check`: `web_pages.h` al día. En la placa, de
  87 328 a 87 523 bytes comprimidos (+195).
- Firmware: `arduino-cli compile --fqbn esp8266:esp8266:nodemcuv2` con el
  núcleo ESP8266 3.1.2: compila; flash al 37 % (394 720 bytes), RAM al 39 %.
- Capturas: `python tools/capturas.py`; cambian `semaforo.png` (más baja: el
  semáforo y los modos, sin «Luz roja, luz verde», que tiene la suya) y
  `movil.png`. Las demás salen iguales (sólo cambian la animación y el
  suavizado) y se quedan como estaban.
- Cómo se ve: el diseño (`preview/lab-v3/`) y la app, página a página, pestaña
  a pestaña, a 1366 y a 390 px, con capturas y con los estilos calculados de
  cada elemento.
