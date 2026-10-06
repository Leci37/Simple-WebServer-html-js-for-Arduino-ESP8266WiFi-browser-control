/* 🎤 El sonómetro: una aguja, una gráfica, dos juegos y la alarma con bloques.
   Mientras esta página está abierta, las luces de la placa enseñan el ruido. */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  var $ = Lab.$;
  var CX = 150;
  var CY = 150;
  var R = 118;
  var HISTORY_MS = 30000;
  var history = [];
  var editing = false;
  var lastMood = "";
  var editor = null;

  Lab.poll(250);

  var first = true;
  Lab.onState(function (state) {
    if (first) {
      first = false;
      if (state.mode !== "sound") Lab.api("mode", { set: "sound" });
    }
    var now = Date.now();
    history.push({ t: now, level: state.sound.level });
    while (history.length && now - history[0].t > HISTORY_MS + 1000) history.shift();
    paint(state);
    games(state);
  });

  // ---------- La aguja ----------

  function point(value, radius) {
    var angle = Math.PI - (value / 100) * Math.PI;
    return [CX + radius * Math.cos(angle), CY - radius * Math.sin(angle)];
  }

  function arc(from, to) {
    var a = point(from, R);
    var b = point(to, R);
    return "M" + a[0].toFixed(1) + " " + a[1].toFixed(1) + " A" + R + " " + R + " 0 0 1 " + b[0].toFixed(1) + " " + b[1].toFixed(1);
  }

  var ticks = "";
  [0, 25, 50, 75, 100].forEach(function (value) {
    var p = point(value, R - 34);
    ticks += '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 5).toFixed(1) + '" text-anchor="middle">' + value + "</text>";
  });
  $("#ticks").innerHTML = ticks;

  function moodFor(level, settings) {
    if (level >= settings.soundRed) return ["🙉", "¡Demasiado ruido!", "¡Uf, qué jaleo! ¡Me tapo los oídos!", "wow"];
    if (level >= settings.soundYellow) return ["😮", "¡Cuánto jaleo!", "Eso ya es bastante ruido… ¡amarillo!", "wow"];
    if (level >= settings.soundYellow / 2) return ["🙂", "Ruido tranquilo", "Se oye algo, pero tranquilo: verde.", "happy"];
    return ["🤫", "Silencio", "Shhh… qué silencio. ¡Da una palmada a ver qué pasa!", "happy"];
  }

  function paint(state) {
    var s = state.settings;
    var level = state.sound.level;
    $("#zone-green").setAttribute("d", arc(0, s.soundYellow));
    $("#zone-yellow").setAttribute("d", arc(s.soundYellow, s.soundRed));
    $("#zone-red").setAttribute("d", arc(s.soundRed, 100));
    $("#needle").style.transform = "rotate(" + level * 1.8 + "deg)";
    $("#peak").style.transform = "rotate(" + (state.sound.peak - 50) * 1.8 + "deg)";

    var mood = moodFor(level, s);
    $("#face").textContent = mood[0];
    $("#level").textContent = level;
    $("#level-label").textContent = mood[1];
    if (mood[1] !== lastMood && !(editor && editor.running)) {
      lastMood = mood[1];
      Lab.say(mood[2], mood[3]);
    }

    ["red", "yellow", "green"].forEach(function (color) {
      $("#traffic .lamp." + color).classList.toggle("on", state.leds[color]);
    });
    $("#no-mic").hidden = state.sound.mic;

    if (!editing) {
      $("#sound-yellow").value = s.soundYellow;
      $("#sound-red").value = s.soundRed;
      $("#sound-gain").value = s.soundGain;
      $("#sound-alarm").checked = s.soundAlarm;
      outputs();
    }
    drawHistory(s);
  }

  // ---------- La gráfica ----------

  function drawHistory(s) {
    var canvas = $("#history");
    var ratio = window.devicePixelRatio || 1;
    var w = canvas.clientWidth;
    var h = 170;
    if (!w) return;
    if (canvas.width !== Math.round(w * ratio)) {
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
    }
    var ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var top = 10;
    var bottom = h - 6;
    function y(level) {
      return bottom - (level / 100) * (bottom - top);
    }
    var now = Date.now();
    function x(t) {
      return w - ((now - t) / HISTORY_MS) * w;
    }

    // Las rayas de los colores: a partir de aquí, amarillo; y de aquí, rojo.
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    [
      [s.soundYellow, "#e0a800"],
      [s.soundRed, "#ff4f4f"],
    ].forEach(function (line) {
      ctx.strokeStyle = line[1];
      ctx.beginPath();
      ctx.moveTo(0, y(line[0]));
      ctx.lineTo(w, y(line[0]));
      ctx.stroke();
    });
    ctx.setLineDash([]);
    if (history.length < 2) return;

    var fill = ctx.createLinearGradient(0, bottom, 0, top);
    var yellow = s.soundYellow / 100;
    var red = s.soundRed / 100;
    fill.addColorStop(0, "#22d47b");
    fill.addColorStop(yellow, "#22d47b");
    fill.addColorStop(yellow, "#ffc83d");
    fill.addColorStop(red, "#ffc83d");
    fill.addColorStop(red, "#ff4f4f");
    fill.addColorStop(1, "#ff4f4f");

    ctx.beginPath();
    ctx.moveTo(x(history[0].t), bottom);
    history.forEach(function (p) {
      ctx.lineTo(x(p.t), y(p.level));
    });
    ctx.lineTo(x(history[history.length - 1].t), bottom);
    ctx.closePath();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#6a3bd8";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    history.forEach(function (p, i) {
      if (i === 0) ctx.moveTo(x(p.t), y(p.level));
      else ctx.lineTo(x(p.t), y(p.level));
    });
    ctx.stroke();
  }

  // ---------- Los ajustes ----------

  function outputs() {
    $("#sound-yellow-out").textContent = $("#sound-yellow").value;
    $("#sound-red-out").textContent = $("#sound-red").value;
    $("#sound-gain-out").textContent = $("#sound-gain").value + " %";
  }

  function sendSettings() {
    Lab.api("settings", {
      soundYellow: $("#sound-yellow").value,
      soundRed: $("#sound-red").value,
      soundGain: $("#sound-gain").value,
      soundAlarm: $("#sound-alarm").checked ? 1 : 0,
    })
      .catch(function (err) {
        Lab.toast("😕 " + err.message);
      })
      .then(function () {
        editing = false;
      });
  }

  ["sound-yellow", "sound-red", "sound-gain"].forEach(function (id) {
    var input = $("#" + id);
    input.addEventListener("input", function () {
      editing = true;
      // El amarillo siempre por debajo del rojo.
      var yellow = $("#sound-yellow");
      var red = $("#sound-red");
      if (Number(yellow.value) >= Number(red.value)) {
        if (id === "sound-yellow") red.value = Number(yellow.value) + 1;
        else yellow.value = Number(red.value) - 1;
      }
      outputs();
    });
    input.addEventListener("change", sendSettings);
  });
  $("#sound-alarm").addEventListener("change", function () {
    editing = true;
    sendSettings();
  });

  // ---------- Juegos ----------

  var silence = null;
  var clap = null;
  var record = Lab.store.get("sonometro.record", null);
  $("#clap-record").textContent = record === null ? "—" : record;

  $("#silence-btn").addEventListener("click", function () {
    if (silence || (duel && duel.phase !== "end")) return;
    var btn = this;
    btn.disabled = true;
    silence = { phase: "count", count: 3 };
    $("#silence-bar").style.width = "0%";
    (function countdown() {
      if (!silence) return;
      if (silence.count > 0) {
        $("#silence-text").textContent = silence.count + "…";
        silence.count -= 1;
        return setTimeout(countdown, 800);
      }
      $("#silence-text").textContent = "¡Silencio! 🤫";
      silence = { phase: "run", start: Date.now() };
    })();
  });

  function endSilence(text, won) {
    silence = null;
    $("#silence-btn").disabled = false;
    $("#silence-btn").textContent = "¡Otra vez!";
    $("#silence-text").textContent = text;
    if (won) {
      Lab.confetti();
      Lab.toast("¡10 segundos de silencio! 🏆");
    }
  }

  $("#clap-btn").addEventListener("click", function () {
    if (clap || (duel && duel.phase !== "end")) return;
    this.disabled = true;
    clap = { start: Date.now(), best: 0 };
    $("#clap-text").textContent = "¡Ahora! ¡Una palmada fuerte! 👏";
  });

  function games(state) {
    var level = state.sound.level;
    duelHear(level);
    if (silence && silence.phase === "run") {
      var elapsed = Date.now() - silence.start;
      $("#silence-bar").style.width = Math.min(100, elapsed / 100) + "%";
      if (level >= state.settings.soundYellow) endSilence("¡Uy! Se oyó algo (" + level + "). ¿Otra vez?", false);
      else if (elapsed >= 10000) endSilence("¡Conseguido! Diez segundos en verde. 🏆", true);
    }
    if (clap) {
      clap.best = Math.max(clap.best, level, state.sound.peak);
      if (Date.now() - clap.start > 3000) {
        var best = clap.best;
        clap = null;
        $("#clap-btn").disabled = false;
        if (record === null || best > record) {
          record = best;
          Lab.store.set("sonometro.record", record);
          $("#clap-text").innerHTML = "¡Nuevo récord! <b>" + best + "</b> 🎉";
          Lab.confetti();
        } else {
          $("#clap-text").innerHTML = "Tu palmada: <b>" + best + "</b>. Récord: <b>" + record + "</b>";
        }
      }
    }
  }

  // ---------- v3 (idea 10): Duelo de palmadas ----------
  // Dos equipos se turnan: en cada turno, 2,5 segundos para la palmada más
  // fuerte. Tres rondas, y gana quien se lleve dos. La luz de la placa dice
  // quién va ganando: roja, verde o amarilla si van empatados.

  var duel = null;
  var TEAM = { red: "rojo", green: "verde" };

  function duelSay(html) {
    $("#duel-status").innerHTML = html;
  }

  function leader() {
    var p = duel.points;
    return p.red > p.green ? "red" : p.green > p.red ? "green" : "yellow";
  }

  function duelLight(color) {
    return Lab.api("light", { color: "all", on: 0 })
      .then(function () {
        return Lab.api("light", { color: color, on: 1 });
      })
      .catch(function () {});
  }

  function paintDuel() {
    ["red", "green"].forEach(function (team, i) {
      var tile = $("#team-" + team);
      tile.classList.toggle("turn", !!duel && duel.phase !== "end" && duel.turn === i);
      tile.classList.toggle("lead", !!duel && leader() === team);
      $("#" + team + "-points").textContent = duel ? duel.points[team] : 0;
      var claps = duel ? duel.claps[team] : [];
      $("#" + team + "-last").textContent = claps.length ? "Palmadas: " + claps.join(" · ") : "Todavía sin palmadas";
    });
  }

  $("#duel-btn").addEventListener("click", function () {
    if (duel && duel.phase !== "end") return;
    if (silence || clap) return Lab.toast("Espera a que acabe el otro juego 😉");
    duel = { round: 1, turn: 0, phase: "wait", points: { red: 0, green: 0 }, claps: { red: [], green: [] }, best: 0 };
    this.disabled = true;
    Lab.poll(100);
    duelLight("yellow");
    duelTurn();
  });

  function duelTurn() {
    var team = duel.turn ? "green" : "red";
    var count = 3;
    duel.phase = "count";
    paintDuel();
    (function tick() {
      if (!duel || duel.phase !== "count") return;
      if (count > 0) {
        duelSay("Ronda " + duel.round + " de 3 · Equipo " + TEAM[team] + ", preparados… <b>" + count + "</b>");
        count -= 1;
        return setTimeout(tick, 700);
      }
      duel.phase = "go";
      duel.best = 0;
      duel.goAt = Date.now();
      duelSay("¡Equipo " + TEAM[team] + ", <b>AHORA</b>! 👏");
      $("#" + team + "-last").textContent = "¡Ahora!";
      setTimeout(duelEndTurn, 2500);
    })();
  }

  // Lo que se oye durante el turno: cuenta la palmada más fuerte.
  function duelHear(level) {
    if (!duel || duel.phase !== "go") return;
    duel.best = Math.max(duel.best, level);
    $("#" + (duel.turn ? "green" : "red") + "-last").textContent = "¡Ahora! " + duel.best;
    $("#duel-bar").style.width = Math.min(100, (Date.now() - duel.goAt) / 25) + "%";
  }

  function duelEndTurn() {
    if (!duel) return;
    var team = duel.turn ? "green" : "red";
    duel.claps[team].push(duel.best);
    duel.phase = "wait";
    $("#duel-bar").style.width = "0%";
    if (duel.turn === 0) {
      duel.turn = 1;
      paintDuel();
      duelSay("🔴 El rojo ha hecho <b>" + duel.best + "</b>. Ahora, el verde…");
      return setTimeout(duelTurn, 1400);
    }
    var r = duel.claps.red[duel.round - 1];
    var v = duel.claps.green[duel.round - 1];
    var text;
    if (r > v) {
      duel.points.red += 1;
      text = "Ronda " + duel.round + " para el <b>rojo</b>, " + r + " a " + v;
    } else if (v > r) {
      duel.points.green += 1;
      text = "Ronda " + duel.round + " para el <b>verde</b>, " + v + " a " + r;
    } else {
      text = "Ronda " + duel.round + ": ¡empate a " + r + "!";
    }
    paintDuel();
    duelLight(leader());
    var p = duel.points;
    if (p.red === 2 || p.green === 2 || duel.round === 3) {
      duelSay(text + ".");
      return setTimeout(duelEnd, 1500);
    }
    duel.round += 1;
    duel.turn = 0;
    duelSay(text + ". Siguiente ronda…");
    setTimeout(duelTurn, 1900);
  }

  function duelEnd() {
    var p = duel.points;
    var champ = leader();
    var end = duel;
    duel.phase = "end";
    paintDuel();
    $("#duel-btn").disabled = false;
    $("#duel-btn").textContent = "¡La revancha!";
    Lab.poll(250);
    var chain = Promise.resolve();
    if (champ !== "yellow") {
      duelSay("🏆 ¡Gana el equipo <b>" + TEAM[champ] + "</b>, " + Math.max(p.red, p.green) + " a " + Math.min(p.red, p.green) + "!");
      Lab.confetti();
      Lab.toast("¡Gana el equipo " + TEAM[champ] + "! 🏆");
      // La luz del equipo que gana parpadea.
      for (var i = 0; i < 4; i++) {
        chain = chain
          .then(function () {
            return Lab.api("light", { color: champ, on: 0 });
          })
          .then(function () {
            return Lab.sleep(220);
          })
          .then(function () {
            return Lab.api("light", { color: champ, on: 1 });
          })
          .then(function () {
            return Lab.sleep(220);
          });
      }
    } else {
      duelSay("🤝 ¡Empate, " + p.red + " a " + p.green + "! ¿La revancha?");
    }
    chain
      .catch(function () {})
      .then(function () {
        return Lab.sleep(1600);
      })
      .then(function () {
        // Al acabar, las luces vuelven a enseñar el ruido.
        if (duel === end) Lab.api("mode", { set: "sound" }).catch(function () {});
      });
  }

  // ---------- Programar ----------

  editor = Bloques.mount($("#editor"), {
    key: "sonometro",
    blocks: ["light_on", "light_off", "lights_off", "wait", "repeat", "forever", "beep", "note", "wait_sound", "if_sound"],
    example: [
      {
        type: "forever",
        body: [
          { type: "light_on", params: { color: "green" } },
          { type: "wait_sound", params: { cmp: "gt", value: 70 } },
          { type: "light_off", params: { color: "green" } },
          { type: "light_on", params: { color: "red" } },
          { type: "note", params: { note: "la", secs: 0.5 } },
          { type: "wait", params: { secs: 2 } },
          { type: "light_off", params: { color: "red" } },
        ],
      },
    ],
    exampleText: "La alarma de jaleo: verde hasta que el ruido pasa de 70… ¡y entonces rojo y pitido!",
    // Al acabar, las luces vuelven a enseñar el ruido.
    onStop: function () {
      return Lab.api("mode", { set: "sound" }).catch(function () {});
    },
  });

  Esquema.draw($("#wiring"), {
    show: ["mic", "leds"],
    dim: ["buzzer", "sonar"],
    focusX: 250,
    label: "El micrófono en A0, 3V3 y GND, y las luces del semáforo",
  });
});
