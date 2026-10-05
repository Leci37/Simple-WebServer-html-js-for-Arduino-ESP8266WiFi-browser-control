/* 🚦 El semáforo: las luces se tocan, el automático tiene botón de peatones y
   la secuencia se programa con bloques. */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  var $ = Lab.$;
  var $$ = Lab.$$;
  var COLORS = ["red", "yellow", "green"];
  var last = null;

  Lab.poll(350);

  // Si las luces las tenía otro invento (sonómetro, fantasmas), vuelven a ser
  // un semáforo.
  var first = true;
  Lab.onState(function (state) {
    if (first) {
      first = false;
      if (state.mode === "sound" || state.mode === "ghost") Lab.api("mode", { set: "auto" });
    }
    paint(state);
  });

  function paint(state) {
    COLORS.forEach(function (color) {
      var lamp = $("#traffic .lamp." + color);
      lamp.classList.toggle("on", state.leds[color]);
      lamp.setAttribute("aria-pressed", state.leds[color] ? "true" : "false");
    });

    var go = state.mode === "auto" ? state.walk : state.mode === "manual" && state.leds.red;
    var walk = $("#walk-light");
    walk.classList.toggle("go", go);
    walk.classList.toggle("stop", !go && state.mode !== "night");

    $$("[data-mode]").forEach(function (btn) {
      btn.classList.toggle("selected", btn.getAttribute("data-mode") === state.mode);
    });
    $$("[data-speed]").forEach(function (btn) {
      btn.classList.toggle("selected", Number(btn.getAttribute("data-speed")) === state.settings.trafficSpeed);
    });
    $("#speed-box").hidden = state.mode !== "auto";
    if (!(editor && editor.running)) chat(state, go);
    last = state;
  }

  function chat(state, go) {
    if (state.mode === "auto" && go) return Lab.say("¡Rojo para los coches: ya pueden cruzar los peatones! 🚶", "wow");
    if (state.mode === "auto") return Lab.say("Automático: verde, amarillo, rojo… ¿Quieres cruzar? ¡Pulsa el botón!", "happy");
    if (state.mode === "night") return Lab.say("Modo noche: el amarillo parpadea. Quiere decir «¡cuidado!».", "happy");
    if (state.mode === "manual") return Lab.say("Tú mandas: toca las luces para encenderlas y apagarlas.", "happy");
    Lab.say("Las luces las tiene otro invento. Elige un modo para recuperarlas.", "wow");
  }

  $$("#traffic .lamp").forEach(function (lamp) {
    lamp.addEventListener("click", function () {
      var color = lamp.getAttribute("data-color");
      var on = last ? !(last.mode === "manual" && last.leds[color]) : true;
      Lab.api("light", { color: color, on: on ? 1 : 0 }).catch(problem);
    });
  });

  $("#walk-btn").addEventListener("click", function () {
    if (last && last.mode !== "auto") {
      Lab.toast("El botón de peatones funciona en automático 🔄");
      return;
    }
    Lab.api("walk").catch(problem);
  });

  $$("[data-mode]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      Lab.api("mode", { set: btn.getAttribute("data-mode") }).catch(problem);
    });
  });

  $$("[data-speed]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      Lab.api("settings", { trafficSpeed: btn.getAttribute("data-speed") }).catch(problem);
    });
  });

  function problem(err) {
    Lab.toast("😕 " + err.message);
  }

  var editor = Bloques.mount($("#editor"), {
    key: "semaforo",
    blocks: ["light_on", "light_off", "lights_off", "wait", "repeat", "forever", "beep", "note", "wait_button"],
    example: [
      {
        type: "repeat",
        params: { times: 3 },
        body: [
          { type: "light_on", params: { color: "green" } },
          { type: "wait", params: { secs: 3 } },
          { type: "light_off", params: { color: "green" } },
          { type: "light_on", params: { color: "yellow" } },
          { type: "wait", params: { secs: 1 } },
          { type: "light_off", params: { color: "yellow" } },
          { type: "light_on", params: { color: "red" } },
          { type: "wait", params: { secs: 3 } },
          { type: "light_off", params: { color: "red" } },
        ],
      },
    ],
    exampleText: "El semáforo de siempre, 3 veces. ¿Te atreves a hacerlo más rápido?",
  });

  Esquema.draw($("#wiring"), {
    show: ["leds", "buzzer"],
    dim: ["mic", "sonar"],
    focusX: 560,
    label: "Los LEDs en D5, D6 y D7 con sus resistencias, y el zumbador en D8",
  });
});
