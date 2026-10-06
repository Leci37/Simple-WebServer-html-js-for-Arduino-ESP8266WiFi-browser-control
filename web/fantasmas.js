/* 👻 El detector de fantasmas: un radar, la «energía espectral» de 0 a 5 y un
   fantasma que se deja ver más cuanto más cerca está.
   Mientras esta página está abierta, las luces de la placa avisan de fantasmas. */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  var $ = Lab.$;
  var $$ = Lab.$$;
  var SENSOR_X = 160;
  var SENSOR_Y = 196;
  var RADIUS = 168;
  var editing = false;
  var lastLevel = -1;
  var lastCatch = 0;
  var caught = Lab.store.get("fantasmas.cazados", 0);
  var editor = null;

  var MESSAGES = [
    ["Todo tranquilo… 😴", "Todo tranquilo. Apunta el sensor a la puerta y espera…", "happy"],
    ["Algo se mueve a lo lejos… 👀", "Mmm… algo se mueve a lo lejos.", "wow"],
    ["Se acerca algo… 👀", "¡Se acerca algo! ¿Lo ves?", "wow"],
    ["¡Está cerca! 😨", "¡Está cerca, está cerca!", "scared"],
    ["¡Fantasma cerca! 😱", "¡¡Un fantasma!! ¡Que no se escape!", "scared"],
    ["¡¡ESPECTRO DETECTADO!! 👻", "¡¡BUUU!! ¡Foto, foto! 📸", "scared"],
  ];

  Lab.poll(250);
  $("#caught").textContent = caught;

  var first = true;
  Lab.onState(function (state) {
    if (first) {
      first = false;
      if (state.mode !== "ghost") Lab.api("mode", { set: "ghost" });
    }
    paint(state);
  });

  function maxCm(settings) {
    return Math.max(100, settings.ghostFar * 2);
  }

  function radiusFor(cm, settings) {
    return Math.min(1, cm / maxCm(settings)) * RADIUS;
  }

  function drawRings(settings) {
    var html = "";
    [
      [settings.ghostFar, "#ffc83d"],
      [settings.ghostNear, "#ff4f4f"],
    ].forEach(function (ring) {
      var r = radiusFor(ring[0], settings);
      var a = 45 * (Math.PI / 180);
      var x1 = SENSOR_X - r * Math.cos(a);
      var x2 = SENSOR_X + r * Math.cos(a);
      var y = SENSOR_Y - r * Math.sin(a);
      html +=
        '<path d="M' + x1.toFixed(1) + " " + y.toFixed(1) + " A" + r.toFixed(1) + " " + r.toFixed(1) + " 0 0 1 " +
        x2.toFixed(1) + " " + y.toFixed(1) + '" fill="none" stroke="' + ring[1] + '" stroke-width="3" stroke-dasharray="7 6"/>' +
        '<text x="' + (x2 + 4).toFixed(1) + '" y="' + (y + 4).toFixed(1) + '" fill="' + ring[1] + '">' + ring[0] + " cm</text>";
    });
    $("#rings").innerHTML = html;
  }

  function paint(state) {
    var s = state.settings;
    var ghost = state.ghost;
    var level = ghost.level;
    drawRings(s);

    var blip = $("#blip");
    var visible = ghost.cm >= 0 && ghost.cm <= maxCm(s);
    blip.style.opacity = visible ? 1 : 0;
    if (visible) {
      blip.setAttribute("transform", "translate(" + SENSOR_X + " " + (SENSOR_Y - radiusFor(ghost.cm, s)).toFixed(1) + ")");
    }
    $("#distance").textContent = ghost.cm >= 0 ? ghost.cm + " cm" : "—";
    $("#status").textContent = MESSAGES[level][0];
    $$("#emf span").forEach(function (bar, i) {
      bar.classList.toggle("on", i < level);
    });

    var big = $("#big-ghost");
    big.style.opacity = [0.06, 0.25, 0.45, 0.65, 0.85, 1][level];
    big.style.transform = "scale(" + (0.6 + level * 0.08) + ")";
    $("#stage").classList.toggle("boo-on", level === 5);

    ["red", "yellow", "green"].forEach(function (color) {
      $("#traffic .lamp." + color).classList.toggle("on", state.leds[color]);
    });
    $("#no-sensor").hidden = ghost.sensor;

    if (level !== lastLevel) {
      if (level === 5 && lastLevel < 5 && Date.now() - lastCatch > 2000) gotcha();
      if (!(editor && editor.running)) Lab.say(MESSAGES[level][1], MESSAGES[level][2]);
      lastLevel = level;
    }

    if (!editing) {
      $("#ghost-near").value = s.ghostNear;
      $("#ghost-far").value = s.ghostFar;
      $("#ghost-sound").checked = s.ghostSound;
      outputs();
    }
  }

  // Un fantasma cazado: ¡flash!
  function gotcha() {
    lastCatch = Date.now();
    caught += 1;
    Lab.store.set("fantasmas.cazados", caught);
    $("#caught").textContent = caught;
    var flash = document.createElement("div");
    flash.className = "flash";
    document.body.appendChild(flash);
    setTimeout(function () {
      flash.parentNode.removeChild(flash);
    }, 700);
    if (race) {
      race.caught += 1;
      paintRace();
    }
    Lab.toast(race ? "📸 ¡Uno más! Llevas " + race.caught + " en este minuto." : "📸 ¡Fantasma cazado! Ya llevas " + caught + ".");
  }

  $("#reset-caught").addEventListener("click", function () {
    caught = 0;
    Lab.store.set("fantasmas.cazados", 0);
    $("#caught").textContent = 0;
  });

  // ---------- v3 (idea 11): caza contrarreloj ----------
  // Un minuto para cazar todos los fantasmas que se pueda, con el tiempo y el
  // marcador bien grandes.

  var race = null;
  var raceRecord = Lab.store.get("fantasmas.contrarreloj", null);
  $("#race-record").textContent = raceRecord === null ? "—" : raceRecord;

  $("#race-btn").addEventListener("click", function () {
    if (race) return;
    race = { start: Date.now(), caught: 0, timer: 0 };
    this.disabled = true;
    $("#hunt-clock").hidden = false;
    $("#race-text").textContent = "¡A cazar! Lleva el detector hasta el 5, una y otra vez.";
    paintRace();
  });

  function paintRace() {
    if (!race) return;
    var left = Math.max(0, 60 - (Date.now() - race.start) / 1000);
    var s = Math.ceil(left);
    $("#hunt-time").textContent = "⏱ " + Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
    $("#hunt-time").classList.toggle("hurry", left <= 10);
    $("#hunt-score").textContent = "👻 " + race.caught + (race.caught === 1 ? " cazado" : " cazados");
    clearTimeout(race.timer);
    if (left <= 0) return raceEnd();
    race.timer = setTimeout(paintRace, 200);
  }

  function raceEnd() {
    var n = race.caught;
    race = null;
    $("#race-btn").disabled = false;
    $("#race-btn").textContent = "¡Otra vez!";
    var best = n > 0 && (raceRecord === null || n > raceRecord);
    if (best || raceRecord === null) {
      raceRecord = Math.max(n, raceRecord || 0);
      Lab.store.set("fantasmas.contrarreloj", raceRecord);
      $("#race-record").textContent = raceRecord;
    }
    $("#race-text").textContent = "¡Tiempo! " + n + (n === 1 ? " fantasma" : " fantasmas") + " en un minuto." + (best ? " 🏆 ¡Récord nuevo!" : "");
    if (best) Lab.confetti();
    Lab.toast("⏱ ¡Tiempo! " + n + (n === 1 ? " cazado" : " cazados"));
  }

  // ---------- Ajustes ----------

  function outputs() {
    $("#ghost-near-out").textContent = $("#ghost-near").value + " cm";
    $("#ghost-far-out").textContent = $("#ghost-far").value + " cm";
  }

  function sendSettings() {
    Lab.api("settings", {
      ghostNear: $("#ghost-near").value,
      ghostFar: $("#ghost-far").value,
      ghostSound: $("#ghost-sound").checked ? 1 : 0,
    })
      .catch(function (err) {
        Lab.toast("😕 " + err.message);
      })
      .then(function () {
        editing = false;
      });
  }

  ["ghost-near", "ghost-far"].forEach(function (id) {
    var input = $("#" + id);
    input.addEventListener("input", function () {
      editing = true;
      // «Cerca» siempre por debajo de «lejos».
      var near = $("#ghost-near");
      var far = $("#ghost-far");
      if (Number(near.value) + 5 > Number(far.value)) {
        if (id === "ghost-near") far.value = Number(near.value) + 5;
        else near.value = Math.max(5, Number(far.value) - 5);
      }
      outputs();
    });
    input.addEventListener("change", sendSettings);
  });
  $("#ghost-sound").addEventListener("change", function () {
    editing = true;
    sendSettings();
  });

  // ---------- Programar ----------

  editor = Bloques.mount($("#editor"), {
    key: "fantasmas",
    blocks: ["light_on", "light_off", "lights_off", "wait", "repeat", "forever", "beep", "note", "wait_ghost", "if_ghost"],
    example: [
      {
        type: "forever",
        body: [
          { type: "light_on", params: { color: "green" } },
          { type: "wait_ghost", params: { cm: 30 } },
          { type: "light_off", params: { color: "green" } },
          {
            type: "repeat",
            params: { times: 3 },
            body: [
              { type: "light_on", params: { color: "red" } },
              { type: "note", params: { note: "do2", secs: 0.15 } },
              { type: "light_off", params: { color: "red" } },
              { type: "wait", params: { secs: 0.15 } },
            ],
          },
          { type: "wait", params: { secs: 1 } },
        ],
      },
    ],
    exampleText: "La trampa: verde hasta que algo se acerca a menos de 30 cm… ¡y entonces alarma!",
    onStop: function () {
      return Lab.api("mode", { set: "ghost" }).catch(function () {});
    },
  });

  Esquema.draw($("#wiring"), {
    show: ["sonar", "leds", "buzzer"],
    dim: ["mic"],
    focusX: 540,
    label: "El sensor HC-SR04: VCC a VIN, TRIG a D1, ECHO a D2 con dos resistencias, GND a GND",
  });
});
