# CHANGELOG

## 1.2.0 — 2026-10-06

La web v3, la del diseño hecho en Claude Design: ¡Salta, Chispa! se rediseña
y crece con nueve ideas, y cada invento trae un juego nuevo.

- **¡Salta, Chispa!**: marcador nuevo (vidas y rayos juntos, los metros dentro
  de la barra del camino, un anillo que se vacía por cada poder), pantallas
  nuevas de inicio, de fin y de victoria, y las pestañas **Jugar · Programar ·
  Montar** debajo del juego. Y además:
  - **Dos jugadores** a la vez, con la pantalla partida: el 1 salta con el
    botón FLASH y el 2, con palmadas.
  - **Tres mundos**: el campo, la granja y la luna (donde se salta más alto),
    cada uno con sus obstáculos. Ganar uno abre el siguiente.
  - **Un final por fases**: pacas de paja, tres saltos seguidos y, por fin, el
    cohete. Al ganar, de una a tres estrellas según los rayos.
  - **Récords de la clase**: los cinco mejores, con un alias.
  - **Colores de Chispa**, que se abren juntando rayos, y **nueve pegatinas**.
  - **Agacharse**: con la mano entre 15 y 30 cm del sensor, la flecha ↓ o el
    botón «Agáchate». Así pasa por encima el examen volador (o se salta).
  - **Modo tortuga**: más despacio y con cinco vidas.
  - **Programar el juego** con bloques: los nuevos «⚡ cuando Chispa salte,
    choque, coja un rayo…» funcionan a la vez que el resto del programa.
- **Duelo de palmadas** en el sonómetro, **caza contrarreloj** en el detector
  de fantasmas y **luz roja, luz verde** en el semáforo (con el sensor de
  distancia). El duelo y la caza traen su reto.
- **La placa guarda los récords de la clase** en su memoria flash: duran
  aunque se desenchufe o se vuelva a cargar el firmware, y se escribe como
  mucho una vez cada 10 segundos. Órdenes nuevas: `/api/records` (con
  `clear=1`, los borra) y `/api/record` (los mundos, en inglés: `field`,
  `farm` y `moon`). El alias se limpia igual en la placa y en el simulador:
  una prueba compila el del firmware en el ordenador y los compara.
- **Arreglado sobre el diseño**, con su prueba cada uno:
  - en el móvil, los botones de las esquinas del inicio se pisaban (ahora se
    mide si caben, de todo el texto a sólo los dibujos, porque cada aparato
    tiene sus letras) y el cartel se salía por los lados;
  - al empezar, el botón «¡A jugar!» se quedaba con el foco, y la barra
    espaciadora podía volver a empezar la partida en vez de saltar;
  - con dos jugadores, la placa pitaba (y el micrófono lo oía como palmadas
    del jugador 2) y la mano agachaba al jugador 1;
  - si mientras jugabas otros llegaban más lejos, el final decía «Guardado en
    la placa» sin estarlo; ahora la lista se pide otra vez al acabar;
  - un «⚡ cuando…» arrastrado se quedaba dentro de un bucle, y «Parar» y
    «Ejecutar» seguidos dejaban vivo un trozo del programa anterior;
  - el cartel de la pegatina de los tres escudos no se veía;
  - en el duelo, una revancha justo al acabar heredaba el parpadeo del
    ganador; en «Luz roja, luz verde», a 40 cm justos se podía empezar y
    Chispa no llegaba a celebrar la llegada.
- La web en la placa pasa de 62 a 87 kB comprimidos. Con el núcleo 3.1.2, el
  código en la flash pasa del 34 % al 37 % de su mega, y la RAM sigue en el
  39 %.
- Pruebas para todo lo nuevo; capturas y README al día.

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
