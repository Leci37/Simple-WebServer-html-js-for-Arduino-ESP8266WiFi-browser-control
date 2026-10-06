# Programar con bloques

Cómo está hecho el editor de bloques del Laboratorio y por dónde se podría
seguir: qué herramientas «tipo Scratch» podrían programar la placa y qué pide
cada una. Lo segundo son notas para decidir, no algo hecho.

## Lo que hay

Un editor propio, pequeño (`web/bloques.js`, unos 8 kB comprimido), que vive
dentro de la placa como el resto de la web. Por eso funciona sin internet, en la
wifi de la placa, y en tabletas (los bloques se tocan o se arrastran con el dedo).

- **Cómo se ejecuta.** El programa lo recorre el navegador, bloque a bloque; cada
  bloque de luces o sonido es una orden a la placa (`/api/light`, `/api/beep`), y
  los de sensores miran el estado que la placa manda varias veces por segundo. La
  placa sólo obedece: así el firmware sigue siendo sencillo y el bloque que se
  ejecuta puede brillar en la pantalla, como en Scratch.
- **Por pasos, como se enseña:** secuencias (luces y esperas), bucles («repetir»,
  «por siempre»), sensores («esperar a que…») y condiciones («si…»). Cada invento
  enseña sólo los bloques que le sirven, trae un ejemplo y sus retos.
- **Eventos, en ¡Salta, Chispa!:** «⚡ cuando Chispa salte, choque, coja un
  rayo…». Son bloques «sombrero» (`hat: true` en su definición): van siempre
  sueltos arriba, guardan dentro sus bloques y cada uno espera su evento a la
  vez que el resto del programa (`Promise.all`); «■ Parar» los para todos. Una
  página sin sombreros funciona como antes. El juego añade sus bloques
  (`when_game`, `wait_game`, `if_power`) desde `web/juego.js`.
- **Detalles para niños:** cada «▶» empieza con las luces apagadas; los bloques
  que nunca se ejecutarán (debajo de un «por siempre») salen en gris; los bucles
  dicen por qué vuelta van; los números se pueden cambiar mientras el programa va.
- **El programa es JSON** y se guarda en el navegador:

```json
[{"type": "repeat", "params": {"times": 3}, "body": [
  {"type": "light_on", "params": {"color": "green"}},
  {"type": "wait", "params": {"secs": 3}},
  {"type": "light_off", "params": {"color": "green"}}
]}]
```

Un bloque nuevo es una entrada en `BLOCKS` (`web/bloques.js`): su familia (el
color), sus partes (texto, desplegables, números) y qué hace al ejecutarse.

## La puerta para otras herramientas: la API

Cualquier programa que sepa hacer una petición HTTP puede mandar en la placa:
`/api/light?color=red&on=1`, `/api/state`… (la lista, en el
[README](../README.md#la-api)). Contesta en JSON y lleva CORS
(`Access-Control-Allow-Origin: *`), así que también se puede usar desde una web
que no sea la de la placa.

Hay una pega que afecta a todas las herramientas web: la placa habla `http://` y
las webs de Scratch, TurboWarp o Snap! son `https://`. El navegador no deja que una
página segura llame a una dirección sin cifrar de la red de casa (contenido
mixto). Por eso, con esas herramientas hace falta su **versión de escritorio** o
abrirlas desde un fichero o servidor local.

## Otras herramientas, una a una

| Herramienta | Cómo se conectaría | A favor | En contra |
|---|---|---|---|
| **Scratch** (scratch.mit.edu) | No se puede: la web oficial no admite extensiones propias. | Es la que conocen. | Sin extensiones, no hay forma. |
| **TurboWarp** (Scratch con extensiones) | Una extensión propia de unas 30 líneas que llama a la API (boceto abajo). | Es Scratch de verdad, con sus disfraces y escenarios. | Hace falta **TurboWarp Desktop** por el contenido mixto. |
| **Snap!** | Su bloque «url» puede leer `/api/state` y mandar órdenes. | Gratis, muy completo, en español. | La versión web choca con el contenido mixto: usar la descargada. |
| **MicroBlocks** | Sustituye el firmware: los bloques corren **dentro** de la placa, por USB. Admite la NodeMCU y la D1 mini. | Programa en vivo, sin wifi, funciona aunque se cierre el ordenador. | Se pierde esta web y los tres inventos tal como están. |
| **ArduinoBlocks** | Genera código de Arduino a partir de bloques. Muy usado en los coles de España. | En español, pensado para clase. | Comprobar si su versión actual admite la NodeMCU; también sustituiría el firmware. |
| **Blockly** (la librería de Google con la que se hizo Scratch) | Cambiar nuestro editor por Blockly. | Variables, operaciones, funciones… | Pesa cerca de 1 MB: no cabe a gusto en la placa y desde internet no carga en su wifi. |

**Lo que propongo:** el editor propio para empezar (sin internet, al momento, en
la tableta), y para los mayores una **extensión de TurboWarp** sobre la misma
API, con TurboWarp Desktop. Como los programas son JSON, más adelante una IA
(GPT o Claude) podría proponer uno a partir de una frase («haz que el amarillo
parpadee») y el editor lo enseñaría como bloques para entenderlo y cambiarlo.

## Boceto: extensión de TurboWarp

Sin probar: es el punto de partida si se elige este camino. Se carga en TurboWarp
Desktop como extensión propia («Custom Extension»), sin el modo «sandbox».

```js
(function (Scratch) {
  "use strict";
  const PLACA = "http://192.168.4.1";

  class Laboratorio {
    getInfo() {
      return {
        id: "laboratorio",
        name: "Laboratorio",
        blocks: [
          {
            opcode: "luz",
            blockType: Scratch.BlockType.COMMAND,
            text: "luz [COLOR] [ESTADO]",
            arguments: {
              COLOR: { type: Scratch.ArgumentType.STRING, menu: "colores", defaultValue: "red" },
              ESTADO: { type: Scratch.ArgumentType.STRING, menu: "estados", defaultValue: "1" },
            },
          },
          { opcode: "ruido", blockType: Scratch.BlockType.REPORTER, text: "ruido" },
          { opcode: "distancia", blockType: Scratch.BlockType.REPORTER, text: "distancia (cm)" },
        ],
        menus: {
          colores: { acceptReporters: true, items: ["red", "yellow", "green", "all"] },
          estados: { acceptReporters: true, items: ["1", "0"] },
        },
      };
    }

    async luz({ COLOR, ESTADO }) {
      await Scratch.fetch(`${PLACA}/api/light?color=${COLOR}&on=${ESTADO}`);
    }

    async estado() {
      const res = await Scratch.fetch(`${PLACA}/api/state`);
      return res.json();
    }

    async ruido() {
      return (await this.estado()).sound.level;
    }

    async distancia() {
      return (await this.estado()).ghost.cm;
    }
  }

  Scratch.extensions.register(new Laboratorio());
})(Scratch);
```
