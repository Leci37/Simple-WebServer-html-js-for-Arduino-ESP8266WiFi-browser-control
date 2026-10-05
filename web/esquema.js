/* 🔌 Los esquemas de «Montar»: la placa NodeMCU con sus pines, como es de
   verdad, y cada pieza con sus cables. Las tres páginas usan el mismo dibujo:
   lo de su invento va en color y lo de los otros, en gris clarito (todo vive
   a la vez en la misma placa, no hay que desmontar nada).

   Esquema.draw(contenedor, { show: ["leds", "buzzer"], dim: ["mic", "sonar"] }) */
(function () {
  "use strict";

  // Los pines de la NodeMCU, de arriba (la antena) abajo (el USB).
  var LEFT = ["A0", "RSV", "RSV", "SD3", "SD2", "SD1", "CMD", "SD0", "CLK", "GND", "3V3", "EN", "RST", "GND", "VIN"];
  var RIGHT = ["D0", "D1", "D2", "D3", "D4", "3V3", "GND", "D5", "D6", "D7", "D8", "RX", "TX", "GND", "3V3"];
  var BOARD = { x: 300, y: 130, w: 200, h: 470 };
  var PIN_Y0 = 166;
  var PIN_STEP = 26;
  var LX = BOARD.x + 14;
  var RX = BOARD.x + BOARD.w - 14;
  var RAIL_X = 750;
  var RES_X = 565;
  var PART_X = 660;
  var BUZZER_X = 702;
  var WIDTH = 810;

  var C = {
    wire: "#23214a",
    gnd: "#23214a",
    power: "#e53935",
    signal: "#1e88e5",
    trig: "#fb8c00",
    echo: "#8e24aa",
    mic: "#00897b",
    red: "#ff4f4f",
    yellow: "#ffc83d",
    green: "#22d47b",
  };

  function pinY(side, name, nth) {
    var list = side === "L" ? LEFT : RIGHT;
    var seen = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i] === name && seen++ === (nth || 0)) return PIN_Y0 + i * PIN_STEP;
    }
    throw new Error("No existe el pin " + name);
  }

  function attrs(obj) {
    return Object.keys(obj)
      .map(function (k) {
        return k + '="' + obj[k] + '"';
      })
      .join(" ");
  }

  function wire(points, color, width) {
    var line =
      '<polyline points="' +
      points
        .map(function (p) {
          return p[0] + "," + p[1];
        })
        .join(" ") +
      '" fill="none" stroke-linecap="round" stroke-linejoin="round" ';
    var out = "";
    // Los cables negros (GND) llevan un borde claro: si no, de noche no se ven.
    if (color === C.gnd) out += line + 'stroke="#ffffff" stroke-opacity=".6" stroke-width="' + ((width || 5) + 4) + '"/>';
    return out + line + 'stroke="' + color + '" stroke-width="' + (width || 5) + '"/>';
  }

  function dot(x, y, color) {
    return '<circle cx="' + x + '" cy="' + y + '" r="6" fill="' + (color || C.wire) + '" stroke="#ffffff" stroke-opacity=".6" stroke-width="2"/>';
  }

  function label(x, y, text, opts) {
    opts = opts || {};
    return (
      "<text " +
      attrs({
        x: x,
        y: y,
        "font-size": opts.size || 15,
        "text-anchor": opts.anchor || "start",
        fill: opts.fill || "currentColor",
      }) +
      ">" +
      text +
      "</text>"
    );
  }

  // Una resistencia: el cuerpo beis con sus rayas de colores.
  function resistor(x, y, bands, vertical) {
    var w = 46;
    var h = 16;
    var out = "";
    if (vertical) {
      out += '<rect x="' + (x - h / 2) + '" y="' + (y - w / 2) + '" width="' + h + '" height="' + w + '" rx="7" fill="#e8d3a7" stroke="#23214a" stroke-width="2"/>';
      bands.forEach(function (color, i) {
        out += '<rect x="' + (x - h / 2 + 1) + '" y="' + (y - w / 2 + 9 + i * 8) + '" width="' + (h - 2) + '" height="4" fill="' + color + '"/>';
      });
      return out;
    }
    out += '<rect x="' + (x - w / 2) + '" y="' + (y - h / 2) + '" width="' + w + '" height="' + h + '" rx="7" fill="#e8d3a7" stroke="#23214a" stroke-width="2"/>';
    bands.forEach(function (color, i) {
      out += '<rect x="' + (x - w / 2 + 9 + i * 8) + '" y="' + (y - h / 2 + 1) + '" width="4" height="' + (h - 2) + '" fill="' + color + '"/>';
    });
    return out;
  }

  // Un LED visto de lado: la cúpula de color; la pata larga (+) va hacia el pin.
  function led(x, y, color) {
    return (
      '<path d="M' + (x - 11) + " " + (y + 8) + "v-8a11 11 0 0 1 22 0v8z" + '" fill="' + color + '" stroke="#23214a" stroke-width="2.5"/>' +
      '<rect x="' + (x - 13) + '" y="' + (y + 6) + '" width="26" height="5" rx="2" fill="' + color + '" stroke="#23214a" stroke-width="2"/>' +
      label(x - 22, y - 6, "+", { size: 14, anchor: "middle" }) +
      label(x + 22, y - 6, "−", { size: 14, anchor: "middle" })
    );
  }

  function drawBoard(used) {
    var b = BOARD;
    var out = "";
    out += '<rect x="' + b.x + '" y="' + b.y + '" width="' + b.w + '" height="' + b.h + '" rx="14" fill="#2b3445" stroke="#161b26" stroke-width="3"/>';
    // El módulo ESP-12, con su antena, entre las dos filas de pines.
    var cx = b.x + b.w / 2;
    out += '<rect x="' + (cx - 32) + '" y="' + (b.y + 10) + '" width="64" height="100" rx="4" fill="#c9ced8" stroke="#8b93a3" stroke-width="2"/>';
    out += '<path d="M' + (cx - 26) + " " + (b.y + 32) + "h8v-12h8v12h8v-12h8v12h8v-12h8" + '" fill="none" stroke="#e0b44c" stroke-width="3"/>';
    out += label(cx, b.y + 76, "ESP", { size: 13, anchor: "middle", fill: "#4a5266" });
    out += label(cx, b.y + 140, "NodeMCU", { size: 14, anchor: "middle", fill: "#ffffff" });
    // Los botones RST y FLASH, y el USB.
    var by = b.y + b.h - 44;
    out += '<rect x="' + (b.x + 40) + '" y="' + by + '" width="24" height="24" rx="5" fill="#d6d9e0" stroke="#5c6475" stroke-width="2"/>';
    out += '<rect x="' + (b.x + b.w - 64) + '" y="' + by + '" width="24" height="24" rx="5" fill="#d6d9e0" stroke="#5c6475" stroke-width="2"/>';
    out += label(b.x + 52, by + 40, "RST", { size: 11, anchor: "middle", fill: "#c3c8d4" });
    out += label(b.x + b.w - 52, by + 40, "FLASH", { size: 11, anchor: "middle", fill: "#c3c8d4" });
    out += '<rect x="' + (cx - 22) + '" y="' + (b.y + b.h - 14) + '" width="44" height="28" rx="4" fill="#9aa3b5" stroke="#5c6475" stroke-width="2"/>';
    out += label(cx, b.y + b.h + 34, "USB", { size: 12, anchor: "middle" });

    function pins(list, x, side) {
      list.forEach(function (name, i) {
        var y = PIN_Y0 + i * PIN_STEP;
        var key = side + name + (name === "GND" || name === "3V3" ? "@" + i : "");
        var on = used[key];
        out += '<circle cx="' + x + '" cy="' + y + '" r="' + (on ? 8 : 6) + '" fill="' + (on ? "#ffd84d" : "#8a8f9c") + '" stroke="' + (on ? "#23214a" : "none") + '" stroke-width="2"/>';
        out += label(side === "L" ? x + 14 : x - 14, y + 5, name, {
          size: 13,
          anchor: side === "L" ? "start" : "end",
          fill: on ? "#ffd84d" : "#aeb4c2",
        });
      });
    }
    pins(LEFT, LX, "L");
    pins(RIGHT, RX, "R");
    return out;
  }

  // Cada pieza: su dibujo y qué pines usa (para pintarlos en amarillo).
  var PARTS = {
    leds: {
      pins: ["RD5", "RD6", "RD7", "RGND@6"],
      draw: function () {
        var out = "";
        var rows = [
          ["D5", C.red, "rojo"],
          ["D6", C.yellow, "amarillo"],
          ["D7", C.green, "verde"],
        ];
        var gy = pinY("R", "GND");
        out += wire([[RX, gy], [RAIL_X, gy], [RAIL_X, pinY("R", "D8") + 30]], C.gnd);
        out += label(RAIL_X + 8, gy - 8, "GND", { size: 14 });
        rows.forEach(function (row) {
          var y = pinY("R", row[0]);
          out += wire([[RX, y], [RAIL_X, y]], row[1] === C.yellow ? "#e0a800" : row[1]);
          out += resistor(RES_X, y, ["#d32f2f", "#d32f2f", "#6d4c41", "#c9a227"]);
          out += led(PART_X, y, row[1]);
          out += dot(RAIL_X, y);
        });
        out += label(RX + 44, pinY("R", "D5") - 8, "220 Ω", { size: 12, anchor: "middle" });
        return out;
      },
    },
    buzzer: {
      pins: ["RD8"],
      draw: function () {
        var y = pinY("R", "D8");
        var out = wire([[RX, y], [BUZZER_X - 20, y]], "#7e57c2");
        out += wire([[BUZZER_X + 20, y], [RAIL_X, y], [RAIL_X, y + 30]], C.gnd);
        out += '<circle cx="' + BUZZER_X + '" cy="' + y + '" r="20" fill="#23214a" stroke="#ffffff" stroke-opacity=".6" stroke-width="3"/>';
        out += '<circle cx="' + BUZZER_X + '" cy="' + y + '" r="5" fill="#555a70"/>';
        out += label(BUZZER_X, y + 40, "zumbador", { size: 14, anchor: "middle" });
        out += dot(RAIL_X, y);
        return out;
      },
    },
    mic: {
      pins: ["LA0", "LGND@9", "L3V3@10"],
      draw: function () {
        var out = "";
        var a0 = pinY("L", "A0");
        var gnd = pinY("L", "GND");
        var vcc = pinY("L", "3V3");
        out += '<rect x="70" y="' + (a0 - 26) + '" width="150" height="100" rx="10" fill="#7b2ff7" stroke="#23214a" stroke-width="3"/>';
        out += '<circle cx="118" cy="' + (a0 + 24) + '" r="26" fill="#2b2b2b" stroke="#c0c0c0" stroke-width="5"/>';
        out += '<circle cx="118" cy="' + (a0 + 24) + '" r="12" fill="#444"/>';
        out += label(145, a0 + 98, "micrófono", { size: 15, anchor: "middle" });
        var pins = [
          ["OUT", a0, C.mic, a0],
          ["GND", a0 + 26, C.gnd, gnd],
          ["VCC", a0 + 52, C.power, vcc],
        ];
        pins.forEach(function (p, i) {
          var x0 = 220;
          var lane = 268 - i * 16;
          out += label(212, p[1] + 5, p[0], { size: 12, anchor: "end", fill: "#ffffff" });
          if (p[1] === p[3]) out += wire([[x0, p[1]], [LX, p[3]]], p[2]);
          else out += wire([[x0, p[1]], [lane, p[1]], [lane, p[3]], [LX, p[3]]], p[2]);
        });
        return out;
      },
    },
    sonar: {
      pins: ["RD1", "RD2", "LVIN", "RGND@6"],
      draw: function () {
        var out = "";
        var top = 10;
        var py = top + 86;
        // El sensor, de frente: sus dos «ojos» y las cuatro patas abajo.
        out += '<rect x="530" y="' + top + '" width="200" height="86" rx="8" fill="#1565c0" stroke="#0d3c78" stroke-width="3"/>';
        out += '<circle cx="580" cy="' + (top + 38) + '" r="28" fill="#cfd5df" stroke="#7d8696" stroke-width="4"/>';
        out += '<circle cx="680" cy="' + (top + 38) + '" r="28" fill="#cfd5df" stroke="#7d8696" stroke-width="4"/>';
        out += '<circle cx="580" cy="' + (top + 38) + '" r="14" fill="#6e7787"/>';
        out += '<circle cx="680" cy="' + (top + 38) + '" r="14" fill="#6e7787"/>';
        out += label(630, top + 42, "HC-SR04", { size: 11, anchor: "middle", fill: "#ffffff" });
        var legs = [
          ["VCC", 570],
          ["TRIG", 610],
          ["ECHO", 650],
          ["GND", 690],
        ];
        legs.forEach(function (leg) {
          out += label(leg[1], top + 80, leg[0], { size: 10, anchor: "middle", fill: "#ffffff" });
        });
        var d1 = pinY("R", "D1");
        var d2 = pinY("R", "D2");
        var gnd = pinY("R", "GND");
        out += wire([[610, py], [610, d1], [RX, d1]], C.trig);
        out += wire([[650, py], [650, d2], [RX, d2]], C.echo);
        // El divisor: ECHO da 5 V y la placa sólo aguanta 3,3 V.
        out += resistor(580, d2, ["#6d4c41", "#111111", "#d32f2f", "#c9a227"]);
        out += label(580, d2 + 26, "1 kΩ", { size: 12, anchor: "middle" });
        out += wire([[530, d2], [530, gnd]], C.echo);
        out += dot(530, d2, C.echo);
        out += dot(530, gnd);
        out += resistor(530, (d2 + gnd) / 2, ["#d32f2f", "#111111", "#d32f2f", "#c9a227"], true);
        out += label(544, (d2 + gnd) / 2 + 5, "2 kΩ", { size: 12 });
        out += wire([[690, py], [690, py + 16], [RAIL_X, py + 16], [RAIL_X, gnd]], C.gnd);
        out += dot(RAIL_X, gnd);
        // VCC va a VIN (los 5 V del USB), que está abajo a la izquierda.
        var vin = pinY("L", "VIN");
        out += wire([[570, py], [570, py + 8], [24, py + 8], [24, vin], [LX, vin]], C.power);
        out += label(32, vin - 10, "5 V", { size: 13 });
        return out;
      },
    },
  };

  function draw(container, options) {
    var show = options.show || [];
    var dim = options.dim || [];
    var used = {};
    show.forEach(function (name) {
      PARTS[name].pins.forEach(function (key) {
        used[key] = true;
      });
    });
    var body = "";
    // Primero lo apagado, para que lo de este invento quede por encima.
    dim.forEach(function (name) {
      body += '<g opacity="0.22">' + PARTS[name].draw() + "</g>";
    });
    show.forEach(function (name) {
      body += "<g>" + PARTS[name].draw() + "</g>";
    });
    // El aviso va fuera del dibujo: si no, se desliza con él y no se lee.
    if (!container.previousElementSibling || container.previousElementSibling.className !== "wiring-hint") {
      var hint = document.createElement("p");
      hint.className = "wiring-hint";
      hint.textContent = "↔ Desliza el dibujo para verlo entero.";
      container.parentNode.insertBefore(hint, container);
    }
    container.innerHTML =
      '<svg viewBox="0 0 ' + WIDTH + ' 660" role="img" aria-label="' +
      (options.label || "Esquema de conexiones") +
      '">' +
      drawBoard(used) +
      body +
      "</svg>";

    // En el móvil el dibujo no cabe: se desliza hasta lo de este invento
    // cuando se abre la pestaña «Montar».
    function focus() {
      var svg = container.querySelector("svg");
      var scale = svg.getBoundingClientRect().width / WIDTH;
      container.scrollLeft = Math.max(0, (options.focusX || WIDTH / 2) * scale - container.clientWidth / 2);
    }
    document.addEventListener("lab:tab", function (e) {
      if (e.detail === "montar") requestAnimationFrame(focus);
    });
    if (container.offsetParent) focus();
  }

  window.Esquema = { draw: draw };
})();
