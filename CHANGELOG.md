# CHANGELOG

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
