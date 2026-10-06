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
    // Al acabar «Luz roja, luz verde», Chispa celebra hasta que el semáforo vuelve a ir solo.
    var cheering = rl && rl.phase === "end" && Date.now() < rl.quietUntil;
    if (!(editor && editor.running) && !rlBusy() && !cheering) chat(state, go);
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

  // ---------- v3 (idea 12): Luz roja, luz verde ----------
  // En verde se avanza hacia la placa; en rojo, quieto. El sensor de distancia
  // hace de árbitro: si en rojo la distancia cambia más de 6 cm, a la salida.

  var GOAL_CM = 12;
  var MOVE_CM = 6;
  var BACK_TO_AUTO_MS = 2500; // al acabar, el semáforo vuelve a ir solo
  var rl = null;
  var rlRecord = Lab.store.get("semaforo.luzroja", null);
  paintRlRecord();

  function rlBusy() {
    return !!rl && rl.phase !== "end";
  }

  function paintRlRecord() {
    $("#rl-record").textContent = rlRecord === null ? "—" : String(rlRecord).replace(".", ",") + " s";
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function rlLight(color) {
    Lab.api("light", { color: "all", on: 0 })
      .then(function () {
        return Lab.api("light", { color: color, on: 1 });
      })
      .catch(function () {});
  }

  function rlShow(cls, text) {
    var box = $("#rl-state");
    box.className = "rl-state" + (cls ? " " + cls : "");
    box.textContent = text;
  }

  function rlPhase(phase, now) {
    rl.phase = phase;
    if (phase === "go") {
      rl.until = now + rand(2000, 4500);
      rlLight("green");
      rlShow("go", "🟢 ¡Avanza!");
      Lab.say("¡Verde! Avanza hacia la placa… 🚶", "happy");
    } else if (phase === "wait") {
      rl.until = now + 800;
      rlLight("yellow");
      rlShow("wait", "🟡 ¡Atento!");
    } else if (phase === "stop") {
      rl.until = now + rand(2000, 3500);
      rl.grace = now + 450;
      rl.ref = null;
      rlLight("red");
      Lab.api("beep", { hz: 330, ms: 200 }).catch(function () {});
      rlShow("stop", "🔴 ¡Quieto!");
      Lab.say("¡Rojo! Ni un pelo… 👀", "wow");
    } else if (phase === "back") {
      rlLight("red");
      Lab.api("beep", { hz: 196, ms: 400 }).catch(function () {});
      rlShow("back", "👀 ¡Te he visto! Vuelve a la salida (" + rl.startCm + " cm)");
      Lab.say("¡Te he visto moverte! A la salida…", "scared");
    }
  }

  $("#rl-btn").addEventListener("click", function () {
    if (rlBusy()) return rlEnd(null);
    var cm = Lab.state ? Lab.state.ghost.cm : -1;
    if (cm < 0) return Lab.toast("📏 No te veo: ponte delante del sensor de distancia");
    if (cm <= 40) return Lab.toast("📏 Aléjate un poco: a más de 40 cm de la placa");
    rl = { startCm: cm, t0: Date.now(), caught: 0, phase: "" };
    this.textContent = "■ Parar";
    Lab.poll(150);
    rlPhase("go", Date.now());
    rlWalker(cm);
  });

  function rlWalker(cm) {
    $("#rl-cm").textContent = cm >= 0 ? "📏 " + cm + " cm" : "📏 —";
    if (!rl) return;
    var k = Math.max(0, Math.min(1, (rl.startCm - cm) / (rl.startCm - GOAL_CM)));
    $("#rl-walker").style.left = 6 + k * 84 + "%";
  }

  Lab.onState(function (state) {
    var cm = state.ghost.cm;
    rlWalker(cm);
    if (!rlBusy() || cm < 0) return;
    var now = Date.now();
    if (rl.phase === "back") {
      if (cm >= rl.startCm - 10) rlPhase("go", now);
      return;
    }
    if (rl.phase === "stop") {
      // Un respiro para pararse; después, cualquier cambio cuenta.
      if (now < rl.grace || rl.ref === null) rl.ref = cm;
      else if (Math.abs(cm - rl.ref) > MOVE_CM) {
        rl.caught += 1;
        return rlPhase("back", now);
      }
    }
    if (cm <= GOAL_CM) return rlEnd((now - rl.t0) / 1000);
    if (now >= rl.until) rlPhase(rl.phase === "go" ? "wait" : rl.phase === "wait" ? "stop" : "go", now);
  });

  function rlEnd(secs) {
    var was = rl;
    rl.phase = "end";
    rl.quietUntil = Date.now() + BACK_TO_AUTO_MS;
    $("#rl-btn").textContent = "¡Otra vez!";
    Lab.poll(350);
    if (secs === null) {
      rlShow("", "Parado. Cuando quieras, ¡otra vez!");
    } else {
      var s = Math.round(secs * 10) / 10;
      var best = rlRecord === null || s < rlRecord;
      if (best) {
        rlRecord = s;
        Lab.store.set("semaforo.luzroja", s);
        paintRlRecord();
      }
      var times = was.caught ? " · te pilló " + was.caught + (was.caught === 1 ? " vez" : " veces") : "";
      rlShow("end", "🏁 ¡Has llegado en " + String(s).replace(".", ",") + " s!" + (best ? " 🏆 Récord" : "") + times);
      rlLight("green");
      Lab.confetti();
      Lab.say("¡Has llegado a la placa! 🏁", "wow");
    }
    // Al acabar, el semáforo vuelve a ir solo.
    setTimeout(function () {
      if (rl === was) Lab.api("mode", { set: "auto" }).catch(function () {});
    }, BACK_TO_AUTO_MS);
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
