# CHANGELOG

## 1.1.0 — 2026-10-05

- **¡Salta, Chispa!**: un juego de correr y saltar como el del dinosaurio de
  Chrome, con Chispa y gráficos dibujados con código (colinas, día y noche,
  partículas). Se salta con el **botón FLASH** de la placa, con una
  **palmada**, con la **mano** delante del sensor de distancia o tocando la
  pantalla. Obstáculos que no gustan: cactus, deberes, brócoli, el libro de
  mates, un coche con prisa y el Nubarrón, que tira exámenes desde arriba.
  Poderes: escudo, cohete y cámara lenta; rayos para coger. A los 800 m llega
  la **Súper Cosechadora**: se salta con el cohete y es el final de la demo.
  La pantalla de inicio juega sola (modo demo). Las luces y el zumbador de la
  placa acompañan la partida.
- La placa cuenta **palmadas** (`sound.claps`) mirando cada lectura del
  micrófono, y tiene una orden pequeña, `/api/input`, para jugar sin retraso.
- El README, como los de la plataforma: pieza a pieza, cada una con su
  captura y lo que se monta. Capturas nuevas (1280 px, el móvil a 390, PNG de
  256 colores) que rehace `tools/capturas.py`.
- [docs/PLATAFORMA.md](docs/PLATAFORMA.md): la propuesta para meter el
  Laboratorio en tuisku (las placas como máquinas del núcleo, el colegio como
  empresa, la IA que escribe programas de bloques).

## 1.0.0 — 2026-10-05

El proyecto se rehace como **Laboratorio de inventos**, para niños y niñas. Lo
de antes (el autómata del carro de bolas) queda archivado en la rama
`main_2024-03-13`.

- Tres inventos en la misma placa y con las mismas tres luces: **semáforo** (con
  botón de peatones, modo noche y tres velocidades), **sonómetro** (aguja,
  gráfica, reto del silencio y récord de palmada) y **detector de fantasmas**
  (radar de ultrasonidos, energía espectral y pitidos que se aceleran).
- **Editor de bloques** como Scratch para programar secuencias, bucles,
  esperas a sensores y condiciones; el bloque que se ejecuta brilla.
- Pestaña **Montar** en cada invento: lista de piezas, esquema de cables y pasos.
- La placa crea su wifi con **portal cautivo** (la web se abre sola) y también
  puede entrar en la de casa. Sin librerías externas: sólo el núcleo ESP8266.
- **API** JSON con CORS para programarla desde otras herramientas.
- Simulador en Python, pruebas (pytest y Chromium) y CI que compila el firmware.
