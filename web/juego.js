/* 🦖 ¡Salta, Chispa! Un juego de correr y saltar, como el del dinosaurio de
   Chrome, pero con Chispa y que se juega con la placa: el botón FLASH, una
   palmada o la mano delante del sensor de distancia (y también tocando la
   pantalla o con la barra espaciadora).

   Todo se dibuja con código, sin imágenes: la placa tiene poca memoria.
   El mundo mide 800 × 300 «píxeles de juego»; la pantalla lo escala. */
(function () {
  "use strict";

  // ---------- Las reglas del mundo ----------

  var W = 800;
  var H = 300;
  var GY = 252; // el suelo
  var PX_PER_M = 40;
  var FINAL_M = 800; // aquí llega la Súper Cosechadora
  var GRAVITY = 2600;
  var JUMP_V = 830; // un salto normal sube unos 130
  var ROCKET_UP = 150; // con el cohete se vuela a esta altura (bajo el marcador)…
  var ROCKET_FLIGHT = 1.25; // …durante este rato (segundos)
  var BASE_SPEED = 330;
  var MAX_SPEED = 560;
  var BOSS_SPEED = 300; // al final, un poco más despacio: es para ganar
  var PLAYER_X = 110;
  var PLAYER_W = 44;
  var PLAYER_H = 58;
  var HAND_CM = 15; // la mano, más cerca que esto, salta
  var POLL_MS = 70; // la placa se pregunta ~15 veces por segundo
  var DEMO_SECS = 45;

  // Lo que no hay que tocar. «from»: a partir de qué metro aparece.
  // «extra»: lo que corre por su cuenta, además del suelo.
  var KINDS = {
    cactus: { w: 30, h: 50, from: 0, weight: 3, name: "un cactus", emoji: "🌵" },
    deberes: { w: 46, h: 36, from: 0, weight: 3, name: "los deberes", emoji: "📚" },
    cactus2: { w: 60, h: 46, from: 80, weight: 2, name: "dos cactus", emoji: "🌵" },
    brocoli: { w: 38, h: 48, from: 120, weight: 2, name: "el brócoli", emoji: "🥦" },
    mates: { w: 46, h: 64, from: 200, weight: 2, name: "el libro de mates", emoji: "📕" },
    coche: { w: 78, h: 42, from: 320, weight: 1.5, extra: 150, name: "un coche con prisa", emoji: "🚗" },
    examen: { w: 36, h: 20, name: "un examen sorpresa", emoji: "📝" },
    paca: { w: 44, h: 44, extra: 90, name: "una paca de paja", emoji: "🌾" },
    cosechadora: { w: 200, h: 140, name: "la Súper Cosechadora", emoji: "🚜", box: [24, 34, 160, 106] },
  };

  var POWERS = {
    escudo: { color: "#4cb2ff", dark: "#1d7fd1", label: "¡Escudo! Aguanta un golpe 🛡️" },
    cohete: { color: "#ff9f1c", dark: "#c77300", label: "¡Cohete! Tus saltos vuelan 🚀" },
    reloj: { color: "#a77bff", dark: "#7a4fe0", label: "¡Cámara lenta! ⏱️" },
  };

  var params = new URLSearchParams(location.search);
  var TESTING = params.get("prueba") === "1";

  // ---------- Azar con semilla (para las pruebas, siempre igual) ----------

  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s += 0x6d2b79f5;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var seedParam = params.get("semilla");
  var nextSeed = seedParam ? Number(seedParam) : Date.now();

  // ---------- La partida ----------

  var g = null;
  var invincible = false;
  var autopilot = false;
  var testSpeed = 1;

  function newGame(mode) {
    return {
      mode: mode, // "demo", "play", "over" o "win"
      t: 0,
      dist: 0,
      speed: BASE_SPEED,
      player: { y: GY - PLAYER_H, vy: 0, ground: true, fly: 0, hurt: 0, run: 0, squash: 0, buffered: 0 },
      lives: 3,
      bolts: 0,
      jumps: 0,
      shield: false,
      rocket: 0,
      slow: 0,
      things: [],
      falling: [],
      items: [],
      fx: [],
      cloud: null,
      nextThing: 700,
      nextPower: 170 * PX_PER_M,
      nextCloudM: 430,
      boss: null,
      banner: null,
      shake: 0,
      killer: null,
      lightsPower: false,
      rng: makeRng(nextSeed++),
    };
  }

  function meters() {
    return Math.floor(g.dist / PX_PER_M);
  }

  function pick(list) {
    return list[Math.floor(g.rng() * list.length)];
  }

  function banner(text, secs) {
    g.banner = { text: text, t: secs || 2 };
  }

  // ---------- Saltar ----------

  function jump() {
    if (g.mode === "over" || g.mode === "win") return;
    var p = g.player;
    // Pulsar un poco antes de tocar el suelo también vale: se guarda el salto.
    if (!p.ground) {
      p.buffered = 0.15;
      return;
    }
    p.ground = false;
    p.squash = -1;
    g.jumps += 1;
    if (g.rocket > 0) {
      p.fly = ROCKET_FLIGHT;
      p.vy = 0;
      sfx("rocket");
    } else {
      p.vy = -JUMP_V;
      sfx("jump");
    }
  }

  function updatePlayer(d) {
    var p = g.player;
    p.run += d * (g.speed / 28);
    p.hurt = Math.max(0, p.hurt - d);
    p.squash *= Math.max(0, 1 - d * 8);
    p.buffered = Math.max(0, p.buffered - d);
    if (p.fly > 0) {
      p.fly -= d;
      var target = GY - PLAYER_H - ROCKET_UP;
      p.y += (target - p.y) * Math.min(1, d * 7);
      if (g.t % 0.04 < d) puff(PLAYER_X + 8, p.y + PLAYER_H - 8, "flame");
      return;
    }
    if (p.ground) return;
    p.vy += GRAVITY * d;
    p.y += p.vy * d;
    if (p.y >= GY - PLAYER_H) {
      p.y = GY - PLAYER_H;
      p.vy = 0;
      p.ground = true;
      p.squash = 1;
      for (var i = 0; i < 5; i++) puff(PLAYER_X + 10 + i * 6, GY - 2, "dust");
      if (p.buffered > 0) {
        p.buffered = 0;
        jump();
      }
    }
  }

  // ---------- Lo que va saliendo ----------

  function addThing(kind, x) {
    var k = KINDS[kind];
    var thing = { kind: kind, x: x, y: GY - k.h, w: k.w, h: k.h, spin: 0, touched: false };
    g.things.push(thing);
    return thing;
  }

  function pickKind() {
    var m = meters();
    var total = 0;
    var list = [];
    Object.keys(KINDS).forEach(function (kind) {
      var k = KINDS[kind];
      if (k.weight && k.from <= m) {
        list.push(kind);
        total += k.weight;
      }
    });
    var r = g.rng() * total;
    for (var i = 0; i < list.length; i++) {
      r -= KINDS[list[i]].weight;
      if (r <= 0) return list[i];
    }
    return list[0];
  }

  // Cuánto hasta el siguiente: al principio, más hueco; y tras algo que corre
  // por su cuenta (el coche), más todavía, porque llega antes.
  function gapAfter(kind) {
    var ease = Math.max(0, 1 - meters() / 300);
    var k = KINDS[kind];
    var min = g.speed * (0.95 + ease * 0.6) + k.w + (k.extra ? 170 : 0);
    return min + g.rng() * g.speed * 0.9;
  }

  function addBoltArc(cx) {
    for (var i = -2; i <= 2; i++) {
      var lift = 1 - (i * i) / 6.25;
      g.items.push({ type: "bolt", x: cx + i * 30, y: GY - 70 - lift * 70, t: g.rng() * 6 });
    }
  }

  function addPower(type, x, y) {
    g.items.push({ type: "power", power: type, x: x, y: y, t: 0 });
  }

  function spawn(dx) {
    if (!g.boss && meters() >= FINAL_M && g.mode !== "demo") startBoss();
    if (g.boss) return updateBossSpawns(dx);

    g.nextThing -= dx;
    g.nextPower -= dx;
    if (g.nextThing > 0) return;
    var kind = pickKind();
    var thing = addThing(kind, W + 40);
    var gap = gapAfter(kind);
    g.nextThing = gap;
    if (kind !== "coche" && g.rng() < 0.35) addBoltArc(thing.x + thing.w / 2);
    if (g.nextPower <= 0) {
      var options = ["escudo", "cohete", "reloj"].filter(function (p) {
        return !(p === "escudo" && g.shield);
      });
      // En medio del hueco y en alto: hay que saltar para cogerla.
      addPower(pick(options), thing.x + thing.w + gap / 2, GY - 92);
      g.nextPower = (150 + g.rng() * 110) * PX_PER_M;
    }
    if (meters() >= g.nextCloudM && !g.cloud) {
      g.cloud = { x: W + 90, y: 48, drops: 3, dropT: 0.8, t: 0 };
      g.nextCloudM = meters() + 190 + g.rng() * 90;
      banner("¡Cuidado! ¡El Nubarrón tira exámenes! ☁️", 2.4);
    }
  }

  // ---------- El final: la Súper Cosechadora ----------

  function startBoss() {
    g.boss = { phase: "aviso", timer: 2.4, round: 1, sent: 0, machine: null };
    g.nextThing = 0;
    banner("¡Cuidado! ¡Llega la Súper Cosechadora! 🚜", 2.6);
  }

  function updateBossSpawns(dx) {
    var b = g.boss;
    g.nextThing -= dx;
    if (b.phase === "aviso") {
      if (g.nextThing <= -W) {
        b.phase = "pacas";
        b.sent = 0;
        g.nextThing = 0;
      }
    } else if (b.phase === "pacas") {
      if (g.nextThing <= 0) {
        addThing("paca", W + 40);
        b.sent += 1;
        g.nextThing = g.speed * 1.35 + 150;
        if (b.sent === 3) b.phase = "cohete";
      }
    } else if (b.phase === "cohete") {
      if (g.nextThing <= 0) {
        // A ras de suelo: se coge sin saltar. Sin él no hay quien la salte.
        addPower("cohete", W + 40, GY - 46);
        b.phase = "maquina";
        g.nextThing = g.speed * 2.4;
      }
    } else if (b.phase === "maquina") {
      if (g.nextThing <= 0) {
        b.machine = addThing("cosechadora", W + 20);
        b.phase = "final";
        banner("¡Ahora! ¡Salta con el cohete! 🚀", 2.4);
      }
    } else if (b.phase === "final") {
      var m = b.machine;
      if (m.x + m.w < 0) {
        if (!m.touched) return win();
        b.round += 1;
        b.phase = "pacas";
        b.sent = 0;
        g.nextThing = g.speed;
        banner("¡Vuelve! ¡Otra vez! 🚜", 2);
      }
    }
  }

  // ---------- El Nubarrón y sus exámenes ----------

  function updateCloud(d, dx) {
    var c = g.cloud;
    if (!c) return;
    c.t += d;
    c.x -= g.speed * 0.35 * d;
    c.dropT -= d;
    // Suelta el examen sólo si va a caer delante de Chispa: así se puede saltar.
    var landsAt = c.x - g.speed * 0.62;
    if (c.drops > 0 && c.dropT <= 0 && landsAt > PLAYER_X + PLAYER_W + 90 && c.x < W - 30) {
      g.falling.push({ x: c.x - 18, y: c.y + 24, vy: 0, rot: 0 });
      c.drops -= 1;
      c.dropT = 1.1;
    }
    if (c.x < -140) g.cloud = null;
    for (var i = g.falling.length - 1; i >= 0; i--) {
      var f = g.falling[i];
      f.x -= dx;
      f.vy += 900 * d;
      f.y += f.vy * d;
      f.rot += d * 5;
      if (f.y + 20 >= GY) {
        addThing("examen", f.x);
        g.falling.splice(i, 1);
      } else if (overlaps(playerBox(), [f.x + 4, f.y + 4, 28, 14])) {
        g.falling.splice(i, 1);
        hurt("examen", null);
      }
    }
  }

  // ---------- Choques ----------

  function playerBox() {
    var p = g.player;
    return [PLAYER_X + 9, p.y + 8, PLAYER_W - 18, PLAYER_H - 11];
  }

  function thingBox(t) {
    var box = KINDS[t.kind].box;
    if (box) return [t.x + box[0], t.y + box[1], box[2], box[3]];
    return [t.x + 5, t.y + 5, t.w - 10, t.h - 6];
  }

  function overlaps(a, b) {
    return a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
  }

  function hurt(kind, thing) {
    if (thing) thing.touched = true;
    if (g.mode === "demo" || invincible || g.player.hurt > 0) return;
    if (g.shield) {
      g.shield = false;
      g.player.hurt = 1;
      burst(PLAYER_X + 22, g.player.y + 28, "#4cb2ff");
      sfx("shield");
      return;
    }
    g.lives -= 1;
    g.player.hurt = 1.5;
    g.shake = 0.35;
    burst(PLAYER_X + 22, g.player.y + 28, "#ff7a59");
    sfx("hit");
    boardEvent("hit");
    if (g.lives <= 0) gameOver(kind);
  }

  function collect(item) {
    if (item.type === "bolt") {
      g.bolts += 1;
      sparkle(item.x, item.y, "#ffd84d");
      sfx("bolt");
      return;
    }
    if (item.power === "escudo") g.shield = true;
    if (item.power === "cohete") g.rocket = g.boss ? 14 : 8;
    if (item.power === "reloj") g.slow = 6;
    sparkle(item.x, item.y, POWERS[item.power].color);
    banner(POWERS[item.power].label, 1.8);
    sfx("power");
  }

  // ---------- Cada fotograma ----------

  function update(dt) {
    updateFx(dt);
    if (g.banner) {
      g.banner.t -= dt;
      if (g.banner.t <= 0) g.banner = null;
    }
    if (g.mode === "over" || g.mode === "win") return;

    g.slow = Math.max(0, g.slow - dt);
    g.rocket = Math.max(0, g.rocket - dt);
    g.shake = Math.max(0, g.shake - dt);
    var d = dt * (g.slow > 0 ? 0.6 : 1);
    g.t += d;

    var target = g.boss ? BOSS_SPEED : Math.min(MAX_SPEED, BASE_SPEED + (g.dist / PX_PER_M) * 0.28);
    g.speed += (target - g.speed) * Math.min(1, d * 1.5);
    var dx = g.speed * d;
    g.dist += dx;

    if (autopilot || g.mode === "demo") drive();
    updatePlayer(d);
    spawn(dx);
    updateCloud(d, dx);

    var box = playerBox();
    for (var i = g.things.length - 1; i >= 0; i--) {
      var t = g.things[i];
      t.x -= dx + (KINDS[t.kind].extra || 0) * d;
      t.spin += dx + (KINDS[t.kind].extra || 0) * d;
      if (t.x + t.w < -60 && t !== (g.boss && g.boss.machine)) {
        g.things.splice(i, 1);
        continue;
      }
      if (!t.touched && overlaps(box, thingBox(t))) hurt(t.kind, t);
    }
    for (var j = g.items.length - 1; j >= 0; j--) {
      var item = g.items[j];
      item.x -= dx;
      item.t += d;
      if (item.x < -40) {
        g.items.splice(j, 1);
      } else if (overlaps([box[0] - 6, box[1] - 6, box[2] + 12, box[3] + 12], [item.x - 12, item.y - 12, 24, 24])) {
        g.items.splice(j, 1);
        collect(item);
      }
    }
    if (g.boss && g.boss.machine && g.t % 0.15 < d) {
      puff(g.boss.machine.x + 160, g.boss.machine.y - 8, "smoke");
    }

    if (g.mode === "play") {
      var powered = g.rocket > 0 || g.slow > 0 || g.shield;
      if (powered !== g.lightsPower) {
        g.lightsPower = powered;
        boardEvent(powered ? "power" : "powerEnd");
      }
    }
    if (g.mode === "demo" && g.t > DEMO_SECS) g = newGame("demo");
  }

  // El piloto automático (la demo de la portada y las pruebas): salta cuando
  // lo siguiente está a punto de llegar.
  function drive() {
    var p = g.player;
    if (!p.ground) return;
    for (var i = 0; i < g.things.length; i++) {
      var t = g.things[i];
      var speed = g.speed + (KINDS[t.kind].extra || 0);
      var ahead = t.x - (PLAYER_X + PLAYER_W);
      var lead = t.kind === "cosechadora" ? speed * 0.55 : speed * 0.2 + 8;
      if (!t.touched && ahead > -10 && ahead < lead) {
        if (t.kind !== "cosechadora" || g.rocket > 0) jump();
        return;
      }
    }
  }

  // ---------- Partículas ----------

  function puff(x, y, kind) {
    var r = g.rng;
    var dust = kind === "dust";
    g.fx.push({
      kind: kind,
      x: x,
      y: y,
      vx: dust ? -60 - r() * 60 : kind === "flame" ? -40 : -30 - r() * 20,
      vy: dust ? -30 - r() * 40 : kind === "flame" ? 90 + r() * 60 : -40 - r() * 20,
      life: dust ? 0.45 : kind === "flame" ? 0.3 : 1.4,
      max: dust ? 0.45 : kind === "flame" ? 0.3 : 1.4,
      r: dust ? 3 + r() * 3 : kind === "flame" ? 5 + r() * 3 : 8 + r() * 6,
      color: dust ? "#c79a6b" : kind === "flame" ? (r() < 0.5 ? "#ffb703" : "#ff6b35") : "#9aa3b5",
    });
  }

  function sparkle(x, y, color) {
    for (var i = 0; i < 10; i++) {
      var a = (i / 10) * Math.PI * 2;
      g.fx.push({ kind: "spark", x: x, y: y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.5, max: 0.5, r: 3, color: color });
    }
  }

  function burst(x, y, color) {
    for (var i = 0; i < 16; i++) {
      var a = g.rng() * Math.PI * 2;
      var v = 120 + g.rng() * 200;
      g.fx.push({ kind: "spark", x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6, max: 0.6, r: 4, color: color });
    }
  }

  function confetti() {
    var colors = ["#ff4f4f", "#ffc83d", "#22d47b", "#4cb2ff", "#a77bff", "#ff9bd2"];
    for (var i = 0; i < 90; i++) {
      g.fx.push({
        kind: "confetti",
        x: g.rng() * W,
        y: -20 - g.rng() * 160,
        vx: -40 + g.rng() * 80,
        vy: 90 + g.rng() * 120,
        life: 3.5,
        max: 3.5,
        r: 4,
        spin: g.rng() * 6,
        color: colors[i % colors.length],
      });
    }
  }

  function updateFx(dt) {
    for (var i = g.fx.length - 1; i >= 0; i--) {
      var f = g.fx[i];
      f.life -= dt;
      if (f.life <= 0) {
        g.fx.splice(i, 1);
        continue;
      }
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.kind === "spark") f.vy += 300 * dt;
      if (f.kind === "confetti") f.spin += dt * 8;
    }
  }

  // ---------- Fin de partida ----------

  function gameOver(kind) {
    g.mode = "over";
    g.killer = kind;
    sfx("over");
    boardEvent("over");
    saveRecord();
    showScreen("over");
  }

  function win() {
    g.mode = "win";
    confetti();
    sfx("win");
    boardEvent("win");
    saveRecord();
    showScreen("win");
  }

  var record = Lab.store.get("juego.record", 0);

  function saveRecord() {
    var m = meters();
    g.newRecord = m > record;
    if (g.newRecord) {
      record = m;
      Lab.store.set("juego.record", record);
    }
  }

  // ---------- Dibujar ----------

  var canvas = null;
  var ctx = null;
  var view = { scale: 1, ox: 0, oy: 0, ratio: 1 };
  var BULB = typeof Path2D === "function"
    ? new Path2D("M60 22c-22 0-38 16-38 37 0 13 6 22 13 29 5 5 7 9 7 14v6h36v-6c0-5 2-9 7-14 7-7 13-16 13-29 0-21-16-37-38-37z")
    : null;

  function hex(c) {
    var n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Mezcla dos colores #rrggbb y devuelve otro #rrggbb (así se puede volver a mezclar).
  function mix(a, b, k) {
    var x = hex(a);
    var y = hex(b);
    var out = "#";
    for (var i = 0; i < 3; i++) {
      var v = Math.round(x[i] + (y[i] - x[i]) * k);
      out += (v < 16 ? "0" : "") + v.toString(16);
    }
    return out;
  }

  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function fillRR(c, x, y, w, h, r, fill, stroke, lw) {
    rr(c, x, y, w, h, r);
    c.fillStyle = fill;
    c.fill();
    if (stroke) {
      c.lineWidth = lw || 2;
      c.strokeStyle = stroke;
      c.stroke();
    }
  }

  function circle(c, x, y, r, fill, stroke, lw) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    if (stroke) {
      c.lineWidth = lw || 2;
      c.strokeStyle = stroke;
      c.stroke();
    }
  }

  // Ojos gruñones que miran a Chispa (a la izquierda).
  function grumpy(c, x, y, gap, r) {
    circle(c, x - gap, y, r, "#fff", "#23214a", 1.5);
    circle(c, x + gap, y, r, "#fff", "#23214a", 1.5);
    circle(c, x - gap - r * 0.35, y + r * 0.2, r * 0.5, "#23214a");
    circle(c, x + gap - r * 0.35, y + r * 0.2, r * 0.5, "#23214a");
    c.strokeStyle = "#23214a";
    c.lineWidth = 2;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x - gap - r, y - r - 3);
    c.lineTo(x - gap + r, y - r);
    c.moveTo(x + gap + r, y - r - 3);
    c.lineTo(x + gap - r, y - r);
    c.stroke();
  }

  // Los momentos del día según los metros: día, tarde, noche y otra vez día.
  function daylight() {
    var k = (g.dist / PX_PER_M / 700) % 1;
    var keys = [
      [0, 0, 0],
      [0.38, 0, 0],
      [0.48, 1, 0],
      [0.58, 0, 1],
      [0.85, 0, 1],
      [0.97, 0, 0],
      [1, 0, 0],
    ];
    for (var i = 1; i < keys.length; i++) {
      if (k <= keys[i][0]) {
        var a = keys[i - 1];
        var b = keys[i];
        var f = (k - a[0]) / (b[0] - a[0] || 1);
        return { sunset: a[1] + (b[1] - a[1]) * f, night: a[2] + (b[2] - a[2]) * f };
      }
    }
    return { sunset: 0, night: 0 };
  }

  function sky(top, mid, night) {
    return mix(mix(top[0], top[1], mid), top[2], night);
  }

  var STARS = [];
  (function () {
    var r = makeRng(7);
    for (var i = 0; i < 46; i++) STARS.push([r() * W, r() * 150, 0.6 + r() * 1.4, r() * 6]);
  })();

  var CLOUDS = [
    [80, 60, 1],
    [330, 40, 0.8],
    [560, 80, 1.1],
    [760, 50, 0.7],
  ];

  function drawSky(dl) {
    var grad = ctx.createLinearGradient(0, 0, 0, GY);
    grad.addColorStop(0, sky(["#5ec2ff", "#ff7e5f", "#160f38"], dl.sunset, dl.night));
    grad.addColorStop(1, sky(["#d6f1ff", "#ffd59e", "#3a2c88"], dl.sunset, dl.night));
    ctx.fillStyle = grad;
    // Más allá de 0..300 también hay cielo: en pantallas altas, el juego no
    // queda con bandas negras.
    ctx.fillRect(0, -1000, W, H + 1000);

    if (dl.night > 0.05) {
      STARS.forEach(function (s) {
        ctx.globalAlpha = dl.night * (0.55 + 0.45 * Math.sin(g.t * 3 + s[3]));
        circle(ctx, s[0], s[1], s[2], "#fff6c9");
      });
      ctx.globalAlpha = 1;
    }
    // El sol y la luna en el mismo sitio: uno se va y la otra llega.
    if (dl.night < 0.95) {
      ctx.globalAlpha = 1 - dl.night;
      circle(ctx, 660, 72 + dl.sunset * 40, 40, "rgba(255,216,77,0.25)");
      circle(ctx, 660, 72 + dl.sunset * 40, 28, mix("#ffd84d", "#ff9a4d", dl.sunset));
      ctx.globalAlpha = 1;
    }
    if (dl.night > 0.05) {
      ctx.globalAlpha = dl.night;
      circle(ctx, 660, 66, 24, "#fff6c9");
      circle(ctx, 670, 58, 21, sky(["#5ec2ff", "#ff7e5f", "#160f38"], dl.sunset, dl.night));
      ctx.globalAlpha = 1;
    }
    var cloudColor = mix(mix("#ffffff", "#ffe2cf", dl.sunset), "#5b5a96", dl.night);
    CLOUDS.forEach(function (cl) {
      var x = ((cl[0] - g.dist * 0.08 - g.t * 6) % (W + 160) + W + 160) % (W + 160) - 80;
      var s = cl[2];
      ctx.fillStyle = cloudColor;
      ctx.beginPath();
      ctx.arc(x, cl[1], 18 * s, 0, Math.PI * 2);
      ctx.arc(x + 20 * s, cl[1] - 10 * s, 22 * s, 0, Math.PI * 2);
      ctx.arc(x + 44 * s, cl[1], 18 * s, 0, Math.PI * 2);
      ctx.fill();
      fillRR(ctx, x - 18 * s, cl[1], 80 * s, 18 * s, 9 * s, cloudColor);
    });
  }

  function drawHills(dl) {
    // Montañas lejanas: se mueven poco (parallax), parecen lejos.
    var far = mix(mix("#a9c7ff", "#d99ab0", dl.sunset), "#2b2470", dl.night);
    ctx.fillStyle = far;
    ctx.beginPath();
    ctx.moveTo(0, GY);
    for (var x = 0; x <= W; x += 10) {
      var wx = x + g.dist * 0.12;
      ctx.lineTo(x, GY - 70 - Math.sin(wx * 0.006) * 28 - Math.sin(wx * 0.017 + 1) * 14);
    }
    ctx.lineTo(W, GY);
    ctx.fill();

    var near = mix(mix("#7cd36b", "#b8b25e", dl.sunset), "#24584a", dl.night);
    var tree = mix("#3f9f4f", "#1b3f37", dl.night);
    ctx.fillStyle = near;
    ctx.beginPath();
    ctx.moveTo(0, GY);
    for (var x2 = 0; x2 <= W; x2 += 10) {
      var wx2 = x2 + g.dist * 0.4;
      ctx.lineTo(x2, GY - 26 - Math.sin(wx2 * 0.01) * 12 - Math.sin(wx2 * 0.023) * 6);
    }
    ctx.lineTo(W, GY);
    ctx.fill();
    // Árboles redonditos sobre las colinas.
    var step = 170;
    var shift = (g.dist * 0.4) % step;
    for (var tx = -shift; tx < W + step; tx += step) {
      var n = Math.floor((tx + g.dist * 0.4) / step);
      if (n % 3 === 1) continue;
      var wx3 = tx + g.dist * 0.4;
      var ty = GY - 26 - Math.sin(wx3 * 0.01) * 12 - Math.sin(wx3 * 0.023) * 6;
      ctx.fillStyle = mix("#8a5a3b", "#3b2a2a", dl.night);
      ctx.fillRect(tx - 3, ty - 18, 6, 18);
      circle(ctx, tx, ty - 26, 15, tree);
      circle(ctx, tx - 9, ty - 18, 10, tree);
      circle(ctx, tx + 9, ty - 19, 11, tree);
    }
  }

  function drawGround(dl) {
    ctx.fillStyle = mix("#e0a96d", "#5d4037", dl.night);
    ctx.fillRect(0, GY, W, H - GY + 1000);
    ctx.fillStyle = mix("#5cc45a", "#2f6b45", dl.night);
    ctx.fillRect(0, GY - 2, W, 10);
    // Piedrecitas y briznas que pasan a la velocidad del suelo.
    var step = 46;
    var shift = g.dist % step;
    for (var x = -shift; x < W + step; x += step) {
      var n = Math.floor((x + g.dist) / step);
      var h = (n * 9301 + 49297) % 233;
      ctx.fillStyle = mix("#c4884f", "#4a3229", dl.night);
      circle(ctx, x + (h % 30), GY + 18 + (h % 22), 2 + (h % 3), ctx.fillStyle);
      if (h % 4 === 0) {
        ctx.strokeStyle = mix("#47a845", "#24533a", dl.night);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 10, GY - 2);
        ctx.lineTo(x + 7, GY - 9);
        ctx.moveTo(x + 13, GY - 2);
        ctx.lineTo(x + 15, GY - 10);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = mix("#f5c99a", "#7a5a4a", dl.night);
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 22]);
    ctx.lineDashOffset = g.dist % 40;
    ctx.beginPath();
    ctx.moveTo(0, GY + 30);
    ctx.lineTo(W, GY + 30);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ---------- Chispa ----------

  function drawChispa(c, x, y, p, extras) {
    var flying = p.fly > 0;
    var inAir = !p.ground;
    c.save();
    c.translate(x + PLAYER_W / 2, y + PLAYER_H);
    c.scale(1 + p.squash * 0.12, 1 - p.squash * 0.12);
    c.translate(0, -PLAYER_H);

    if (extras.rocket) {
      fillRR(c, -24, 14, 11, 22, 5, "#ff9f1c", "#23214a", 2);
      circle(c, -18.5, 18, 2.5, "#fff");
      if (flying) {
        var f = 10 + Math.sin(g.t * 50) * 4;
        c.fillStyle = "#ffb703";
        c.beginPath();
        c.moveTo(-23, 36);
        c.lineTo(-18.5, 36 + f);
        c.lineTo(-14, 36);
        c.fill();
      }
    }

    // Las piernas: corren en el suelo y se recogen en el aire.
    c.strokeStyle = "#23214a";
    c.lineWidth = 3.5;
    c.lineCap = "round";
    var swing = inAir ? 0 : Math.sin(p.run) * 6;
    [-5, 5].forEach(function (lx, i) {
      var s = i === 0 ? swing : -swing;
      var footX = lx + (inAir ? 4 : s);
      var footY = inAir ? 50 : 56 - Math.max(0, -s) * 0.5;
      c.beginPath();
      c.moveTo(lx, 43);
      c.lineTo(footX, footY);
      c.stroke();
      fillRR(c, footX - 2, footY - 2, 9, 5, 2.5, "#23214a");
    });

    if (BULB) {
      c.save();
      c.scale(0.42, 0.42);
      c.translate(-60, -22);
      c.fillStyle = "#ffd84d";
      c.fill(BULB);
      c.lineWidth = 6;
      c.strokeStyle = "#23214a";
      c.lineJoin = "round";
      c.stroke(BULB);
      c.restore();
    } else {
      circle(c, 0, 16, 16, "#ffd84d", "#23214a", 2.5);
    }
    c.strokeStyle = "rgba(255,255,255,0.85)";
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(0, 16, 10, Math.PI * 1.1, Math.PI * 1.45);
    c.stroke();
    fillRR(c, -8, 36, 16, 4, 2, "#a7b0c2", "#23214a", 1.5);
    fillRR(c, -7, 39.5, 14, 4, 2, "#a7b0c2", "#23214a", 1.5);

    // La cara, mirando hacia delante.
    var scared = extras.hurt;
    circle(c, -2, 13, 2.2, "#23214a");
    circle(c, 7, 13, 2.2, "#23214a");
    circle(c, -1.4, 12.2, 0.8, "#fff");
    circle(c, 7.6, 12.2, 0.8, "#fff");
    circle(c, -7, 19, 2.4, "rgba(255,155,155,0.8)");
    circle(c, 11, 19, 2.4, "rgba(255,155,155,0.8)");
    c.strokeStyle = "#23214a";
    c.lineWidth = 2;
    c.beginPath();
    if (scared || inAir) {
      c.arc(3, 21, 2.6, 0, Math.PI * 2);
    } else {
      c.arc(3, 18.5, 4, 0.15 * Math.PI, 0.85 * Math.PI);
    }
    c.stroke();

    if (extras.shield) {
      var pulse = 1 + Math.sin(g.t * 6) * 0.04;
      circle(c, 0, 26, 34 * pulse, "rgba(76,178,255,0.16)", "rgba(76,178,255,0.85)", 3);
      c.strokeStyle = "rgba(255,255,255,0.8)";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 26, 27, Math.PI * 1.15, Math.PI * 1.4);
      c.stroke();
    }
    c.restore();
  }

  // ---------- Los obstáculos ----------

  var DRAW = {
    cactus: function (c, x, y, w, h) {
      var green = "#3fb563";
      var dark = "#23824a";
      fillRR(c, x + 9, y, 12, h, 6, green, dark, 2);
      fillRR(c, x, y + 14, 9, 7, 3, green, dark, 2);
      fillRR(c, x, y + 4, 7, 16, 3.5, green, dark, 2);
      fillRR(c, x + 21, y + 22, 9, 7, 3, green, dark, 2);
      fillRR(c, x + 23, y + 12, 7, 17, 3.5, green, dark, 2);
      circle(c, x + 15, y + 1, 3.5, "#ff7eb6");
      grumpy(c, x + 15, y + 16, 3.2, 2.4);
    },
    cactus2: function (c, x, y, w, h, t) {
      DRAW.cactus(c, x, y + 8, 30, h - 8, t);
      DRAW.cactus(c, x + 28, y, 30, h, t);
    },
    deberes: function (c, x, y, w, h) {
      fillRR(c, x, y + 24, w, 12, 3, "#4c97ff", "#23214a", 2);
      fillRR(c, x + 3, y + 12, w - 5, 12, 3, "#ffc83d", "#23214a", 2);
      fillRR(c, x + 1, y, w - 3, 12, 3, "#ff5a5a", "#23214a", 2);
      for (var i = 0; i < 3; i++) {
        circle(c, x + 4, y + 6 + i * 12, 1.6, "#23214a");
        circle(c, x + 4, y + 3 + i * 12, 1.2, "#fff");
      }
      fillRR(c, x + 13, y + 3, 26, 6, 2, "#fff");
      c.fillStyle = "#23214a";
      c.font = "bold 6px " + FONT;
      c.textAlign = "center";
      c.fillText("DEBERES", x + 26, y + 8);
      grumpy(c, x + 24, y + 29, 4.5, 2.3);
    },
    mates: function (c, x, y, w, h) {
      fillRR(c, x + 36, y + 3, 9, h - 6, 2, "#fff6e0", "#23214a", 2);
      fillRR(c, x, y, 40, h, 5, "#e53935", "#23214a", 2);
      c.fillStyle = "#b71c1c";
      c.fillRect(x + 2, y + 2, 6, h - 4);
      c.fillStyle = "#fff";
      c.font = "bold 12px " + FONT;
      c.textAlign = "center";
      c.fillText("2+2", x + 24, y + 16);
      c.font = "bold 10px " + FONT;
      c.fillText("π  ÷  √", x + 24, y + 28);
      grumpy(c, x + 24, y + 44, 5, 3);
      c.strokeStyle = "#23214a";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x + 18, y + 55);
      c.quadraticCurveTo(x + 24, y + 50, x + 30, y + 55);
      c.stroke();
    },
    brocoli: function (c, x, y, w, h) {
      fillRR(c, x + 13, y + 24, 12, h - 24, 5, "#9be27a", "#3c8a3a", 2);
      var g1 = "#3c9d4e";
      circle(c, x + 9, y + 18, 10, g1, "#23714a", 2);
      circle(c, x + 29, y + 18, 10, g1, "#23714a", 2);
      circle(c, x + 19, y + 11, 12, g1, "#23714a", 2);
      circle(c, x + 19, y + 21, 10, g1);
      circle(c, x + 13, y + 9, 2, "#5cc45a");
      circle(c, x + 26, y + 13, 2, "#5cc45a");
      grumpy(c, x + 19, y + 19, 4, 2.4);
    },
    coche: function (c, x, y, w, h, t) {
      // Va hacia Chispa: los faros, delante (a la izquierda).
      var light = c.createLinearGradient(x, 0, x - 60, 0);
      light.addColorStop(0, "rgba(255,240,150,0.55)");
      light.addColorStop(1, "rgba(255,240,150,0)");
      c.fillStyle = light;
      c.beginPath();
      c.moveTo(x + 2, y + 20);
      c.lineTo(x - 60, y + 8);
      c.lineTo(x - 60, y + 36);
      c.fill();
      c.strokeStyle = "rgba(255,255,255,0.7)";
      c.lineWidth = 2;
      for (var i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(x + w + 6 + i * 4, y + 12 + i * 9);
        c.lineTo(x + w + 20 + i * 4, y + 12 + i * 9);
        c.stroke();
      }
      fillRR(c, x, y + 16, w, 18, 8, "#ff4f4f", "#23214a", 2);
      fillRR(c, x + 18, y + 2, 42, 20, 9, "#ff4f4f", "#23214a", 2);
      fillRR(c, x + 22, y + 6, 15, 11, 4, "#bfe9ff");
      fillRR(c, x + 41, y + 6, 15, 11, 4, "#bfe9ff");
      grumpy(c, x + 29.5, y + 12, 3.2, 2.1);
      circle(c, x + 4, y + 22, 3.5, "#ffe066", "#23214a", 1.5);
      [18, 60].forEach(function (wx) {
        circle(c, x + wx, y + 35, 8.5, "#23214a");
        circle(c, x + wx, y + 35, 3.5, "#c3c8d4");
        var a = -t.spin / 9;
        c.strokeStyle = "#c3c8d4";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(x + wx + Math.cos(a) * 7, y + 35 + Math.sin(a) * 7);
        c.lineTo(x + wx - Math.cos(a) * 7, y + 35 - Math.sin(a) * 7);
        c.stroke();
      });
    },
    examen: function (c, x, y, w, h) {
      paper(c, x + w / 2, y + h / 2, 0.15);
    },
    paca: function (c, x, y, w, h, t) {
      var cx = x + w / 2;
      var cy = y + h / 2;
      circle(c, cx, cy, w / 2, "#f2c14e", "#b58a1d", 2.5);
      c.save();
      c.translate(cx, cy);
      c.rotate(-t.spin / (w / 2));
      c.strokeStyle = "#c99a2e";
      c.lineWidth = 2.5;
      c.beginPath();
      for (var a = 0; a < Math.PI * 6; a += 0.3) {
        var r = a * 3.3;
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.stroke();
      c.restore();
    },
    cosechadora: function (c, x, y, w, h, t) {
      // Chimenea y cabina.
      fillRR(c, x + 152, y - 6, 12, 40, 3, "#7d8296", "#23214a", 2);
      fillRR(c, x + 108, y + 4, 64, 46, 10, "#e53935", "#23214a", 2.5);
      fillRR(c, x + 116, y + 10, 48, 30, 7, "#bfe9ff", "#23214a", 2);
      grumpy(c, x + 140, y + 24, 8, 4.5);
      c.strokeStyle = "#23214a";
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(x + 132, y + 36);
      c.lineTo(x + 148, y + 36);
      c.stroke();
      // El cuerpo.
      fillRR(c, x + 44, y + 44, 150, 66, 12, "#e53935", "#23214a", 2.5);
      c.fillStyle = "#ffd84d";
      c.fillRect(x + 50, y + 76, 138, 8);
      c.fillStyle = "#fff";
      c.font = "bold 17px " + FONT;
      c.textAlign = "center";
      c.fillText("SÚPER", x + 128, y + 70);
      // La barra de corte y el molinete que da vueltas.
      fillRR(c, x, y + 98, 80, 20, 5, "#9aa3b5", "#23214a", 2);
      c.fillStyle = "#5c6475";
      for (var i = 0; i < 8; i++) {
        c.beginPath();
        c.moveTo(x + 2 + i * 10, y + 118);
        c.lineTo(x + 7 + i * 10, y + 126);
        c.lineTo(x + 12 + i * 10, y + 118);
        c.fill();
      }
      var cx = x + 38;
      var cy = y + 78;
      var a0 = -t.spin / 25;
      c.strokeStyle = "#ffc83d";
      c.lineWidth = 5;
      for (var k = 0; k < 5; k++) {
        var a = a0 + (k * Math.PI * 2) / 5;
        c.beginPath();
        c.moveTo(cx, cy);
        c.lineTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
        c.stroke();
      }
      circle(c, cx, cy, 30, null, "#e0a800", 3);
      circle(c, cx, cy, 6, "#23214a");
      // Las ruedas.
      [
        [x + 168, y + 112, 27],
        [x + 92, y + 118, 21],
      ].forEach(function (wh) {
        circle(c, wh[0], wh[1], wh[2], "#23214a");
        circle(c, wh[0], wh[1], wh[2] * 0.45, "#ffd84d", "#23214a", 2);
      });
    },
  };

  function paper(c, cx, cy, rot) {
    c.save();
    c.translate(cx, cy);
    c.rotate(rot);
    fillRR(c, -17, -11, 34, 22, 3, "#fff", "#23214a", 2);
    c.strokeStyle = "#b9c3d6";
    c.lineWidth = 1.5;
    for (var i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(-12, -5 + i * 5);
      c.lineTo(8, -5 + i * 5);
      c.stroke();
    }
    c.fillStyle = "#ff4f4f";
    c.font = "bold 12px " + FONT;
    c.textAlign = "center";
    c.fillText("?", 12, 4);
    c.restore();
  }

  function drawCloudEnemy(c, cl) {
    var x = cl.x;
    var y = cl.y + Math.sin(cl.t * 3) * 4;
    var body = "#6b7a99";
    c.fillStyle = body;
    c.beginPath();
    c.arc(x - 34, y + 6, 22, 0, Math.PI * 2);
    c.arc(x - 8, y - 8, 28, 0, Math.PI * 2);
    c.arc(x + 22, y + 2, 24, 0, Math.PI * 2);
    c.arc(x + 44, y + 10, 16, 0, Math.PI * 2);
    c.fill();
    fillRR(c, x - 52, y + 6, 110, 22, 11, body);
    grumpy(c, x - 6, y + 2, 9, 5);
    c.strokeStyle = "#23214a";
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(x - 6, y + 22, 7, 1.15 * Math.PI, 1.85 * Math.PI);
    c.stroke();
    if (Math.sin(cl.t * 7) > 0.7) {
      c.fillStyle = "#ffd84d";
      c.beginPath();
      c.moveTo(x + 30, y + 26);
      c.lineTo(x + 22, y + 44);
      c.lineTo(x + 30, y + 42);
      c.lineTo(x + 25, y + 58);
      c.lineTo(x + 38, y + 38);
      c.lineTo(x + 30, y + 40);
      c.closePath();
      c.fill();
    }
  }

  // ---------- Rayos y burbujas de poder ----------

  function drawBolt(c, x, y, t) {
    var bob = Math.sin(t * 5) * 3;
    c.save();
    c.translate(x, y + bob);
    c.fillStyle = "#ffd84d";
    c.strokeStyle = "#c99a00";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(2, -11);
    c.lineTo(-7, 2);
    c.lineTo(0, 2);
    c.lineTo(-3, 11);
    c.lineTo(7, -2);
    c.lineTo(0, -2);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }

  function drawPower(c, x, y, type, t) {
    var p = POWERS[type];
    var bob = Math.sin(t * 4) * 4;
    c.save();
    c.translate(x, y + bob);
    circle(c, 0, 0, 22, "rgba(255,255,255,0.35)");
    circle(c, 0, 0, 17, p.color, p.dark, 2.5);
    c.fillStyle = "#fff";
    c.strokeStyle = "#fff";
    c.lineWidth = 2.2;
    if (type === "escudo") {
      c.beginPath();
      c.moveTo(0, -9);
      c.lineTo(8, -6);
      c.quadraticCurveTo(8, 5, 0, 10);
      c.quadraticCurveTo(-8, 5, -8, -6);
      c.closePath();
      c.fill();
    } else if (type === "cohete") {
      fillRR(c, -4, -9, 8, 15, 4, "#fff");
      c.fillStyle = "#ff4f4f";
      c.beginPath();
      c.moveTo(-4, 4);
      c.lineTo(-8, 9);
      c.lineTo(-4, 8);
      c.moveTo(4, 4);
      c.lineTo(8, 9);
      c.lineTo(4, 8);
      c.fill();
      c.fillStyle = "#ffe066";
      c.beginPath();
      c.moveTo(-3, 7);
      c.lineTo(0, 12 + Math.sin(t * 30) * 2);
      c.lineTo(3, 7);
      c.fill();
    } else {
      circle(c, 0, 0, 9, null, "#fff", 2.2);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(0, -6);
      c.moveTo(0, 0);
      c.lineTo(4, 2);
      c.stroke();
    }
    circle(c, -6, -7, 3.5, "rgba(255,255,255,0.7)");
    c.restore();
  }

  // ---------- El marcador ----------

  var FONT = getComputedStyle(document.documentElement).getPropertyValue("--font").trim() || "sans-serif";

  function heart(c, x, y, full) {
    c.save();
    c.translate(x, y);
    c.beginPath();
    c.moveTo(0, 5);
    c.bezierCurveTo(-11, -3, -6, -12, 0, -6);
    c.bezierCurveTo(6, -12, 11, -3, 0, 5);
    c.fillStyle = full ? "#ff4f6d" : "rgba(255,255,255,0.35)";
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = "#23214a";
    c.stroke();
    c.restore();
  }

  function pill(c, x, y, w, h) {
    fillRR(c, x, y, w, h, h / 2, "rgba(255,255,255,0.82)", "rgba(35,33,74,0.15)", 2);
  }

  function drawHud() {
    pill(ctx, 10, 10, 96, 28);
    for (var i = 0; i < 3; i++) heart(ctx, 28 + i * 28, 25, i < g.lives);
    pill(ctx, 112, 10, 74, 28);
    drawBolt(ctx, 128, 24, 0);
    ctx.fillStyle = "#23214a";
    ctx.font = "900 16px " + FONT;
    ctx.textAlign = "left";
    ctx.fillText(String(g.bolts), 142, 30);

    // La barra del camino: hasta la Súper Cosechadora.
    var bx = 270;
    var bw = 260;
    pill(ctx, bx - 14, 10, bw + 28, 28);
    var k = Math.min(1, g.dist / PX_PER_M / FINAL_M);
    fillRR(ctx, bx, 20, bw, 8, 4, "rgba(35,33,74,0.15)");
    fillRR(ctx, bx, 20, Math.max(8, bw * k), 8, 4, "#22d47b");
    circle(ctx, bx + bw * k, 24, 7, "#ffd84d", "#23214a", 2);
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🚜", bx + bw + 2, 29);
    pill(ctx, bx + bw / 2 - 42, 42, 84, 24);
    ctx.fillStyle = "#23214a";
    ctx.font = "900 15px " + FONT;
    ctx.fillText(meters() + " m", bx + bw / 2, 59);

    pill(ctx, W - 136, 10, 126, 28);
    ctx.fillStyle = "#23214a";
    ctx.font = "800 13px " + FONT;
    ctx.textAlign = "center";
    ctx.fillText(g.mode === "demo" ? "DEMO" : "Récord " + record + " m", W - 73, 29);

    // Los poderes que hay ahora, con lo que les queda.
    var px = 10;
    [
      ["escudo", g.shield ? 1 : 0, 1],
      ["cohete", g.rocket, g.boss ? 14 : 8],
      ["reloj", g.slow, 6],
    ].forEach(function (pw) {
      if (pw[1] <= 0) return;
      drawPower(ctx, px + 18, 62, pw[0], 0);
      if (pw[0] !== "escudo") fillRR(ctx, px + 2, 84, 32 * Math.min(1, pw[1] / pw[2]), 5, 2.5, POWERS[pw[0]].color);
      px += 42;
    });

    if (g.banner) {
      ctx.globalAlpha = Math.min(1, g.banner.t * 3);
      ctx.font = "900 20px " + FONT;
      var tw = ctx.measureText(g.banner.text).width + 36;
      fillRR(ctx, W / 2 - tw / 2, 96, tw, 38, 19, "rgba(35,33,74,0.86)");
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.fillText(g.banner.text, W / 2, 122);
      ctx.globalAlpha = 1;
    }
  }

  function drawFx() {
    g.fx.forEach(function (f) {
      var a = Math.max(0, f.life / f.max);
      ctx.globalAlpha = f.kind === "confetti" ? 1 : a;
      if (f.kind === "confetti") {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.spin);
        ctx.fillStyle = f.color;
        ctx.fillRect(-4, -2.5, 8, 5);
        ctx.restore();
      } else {
        circle(ctx, f.x, f.y, f.kind === "smoke" ? f.r * (1.6 - a) : f.r, f.color);
      }
    });
    ctx.globalAlpha = 1;
  }

  function render() {
    var dl = daylight();
    ctx.setTransform(view.ratio, 0, 0, view.ratio, 0, 0);
    ctx.fillStyle = "#17123a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var shakeX = g.shake > 0 ? (Math.random() - 0.5) * 12 * g.shake * 3 : 0;
    var shakeY = g.shake > 0 ? (Math.random() - 0.5) * 8 * g.shake * 3 : 0;
    ctx.setTransform(view.ratio * view.scale, 0, 0, view.ratio * view.scale, view.ratio * (view.ox + shakeX), view.ratio * (view.oy + shakeY));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, -1000, W, H + 2000);
    ctx.clip();

    drawSky(dl);
    drawHills(dl);
    drawGround(dl);
    if (g.cloud) drawCloudEnemy(ctx, g.cloud);
    g.falling.forEach(function (f) {
      paper(ctx, f.x + 17, f.y + 10, f.rot);
    });
    g.items.forEach(function (item) {
      if (item.type === "bolt") drawBolt(ctx, item.x, item.y, item.t);
      else drawPower(ctx, item.x, item.y, item.power, item.t);
    });
    g.things.forEach(function (t) {
      DRAW[t.kind](ctx, t.x, t.y, t.w, t.h, t);
    });
    var p = g.player;
    var blink = p.hurt > 0 && Math.floor(p.hurt * 12) % 2 === 0;
    if (!blink) drawChispa(ctx, PLAYER_X, p.y, p, { rocket: g.rocket > 0, shield: g.shield, hurt: p.hurt > 0 });
    drawFx();
    if (g.slow > 0) {
      ctx.fillStyle = "rgba(120,90,255,0.12)";
      ctx.fillRect(0, -1000, W, H + 2000);
    }
    drawHud();
    ctx.restore();
  }

  // El mundo mide 800 × 300: se escala a la pantalla sin deformarse.
  function resize() {
    var box = canvas.getBoundingClientRect();
    var ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(box.width * ratio));
    canvas.height = Math.max(1, Math.round(box.height * ratio));
    var scale = Math.min(box.width / W, box.height / H);
    view = { scale: scale, ox: (box.width - W * scale) / 2, oy: (box.height - H * scale) / 2, ratio: ratio };
  }

  // ---------- Sonidos (en el móvil o el ordenador) ----------

  var SFX = {
    jump: [[440, 0.12, "square", 880]],
    rocket: [[260, 0.35, "sawtooth", 900]],
    bolt: [
      [988, 0.05, "square"],
      [1319, 0.08, "square"],
    ],
    power: [
      [523, 0.07, "triangle"],
      [659, 0.07, "triangle"],
      [784, 0.07, "triangle"],
      [1047, 0.16, "triangle"],
    ],
    hit: [[200, 0.28, "sawtooth", 60]],
    shield: [[800, 0.18, "sine", 300]],
    over: [
      [392, 0.16, "triangle"],
      [330, 0.16, "triangle"],
      [262, 0.4, "triangle"],
    ],
    win: [
      [523, 0.12, "square"],
      [659, 0.12, "square"],
      [784, 0.12, "square"],
      [1047, 0.28, "square"],
      [784, 0.12, "square"],
      [1047, 0.45, "square"],
    ],
  };
  var audio = null;
  var muted = Lab.store.get("juego.mudo", false);

  function sfx(name) {
    if (muted || g.mode === "demo") return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
    } catch (e) {
      return;
    }
    var at = audio.currentTime;
    SFX[name].forEach(function (n) {
      var osc = audio.createOscillator();
      var gain = audio.createGain();
      osc.type = n[2];
      osc.frequency.setValueAtTime(n[0], at);
      if (n[3]) osc.frequency.exponentialRampToValueAtTime(n[3], at + n[1]);
      gain.gain.setValueAtTime(0.12, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + n[1]);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(at);
      osc.stop(at + n[1] + 0.02);
      at += n[1];
    });
  }

  // ---------- La placa: sus luces y su zumbador ----------

  var mandos = Lab.store.get("juego.mandos", { boton: true, palmada: false, mano: false });
  var boardChain = Promise.resolve();

  function boardEvent(event) {
    if (!Lab.online || g.mode === "demo") return;
    // Con la palmada encendida, la placa no pita: el micrófono se oiría a sí mismo.
    var beeps = !mandos.palmada;
    var steps = {
      start: [["light", { color: "all", on: 0 }], ["light", { color: "green", on: 1 }]],
      power: [["light", { color: "yellow", on: 1 }]].concat(beeps ? [["beep", { hz: 1047, ms: 120 }]] : []),
      powerEnd: [["light", { color: "yellow", on: 0 }]],
      hit: [["light", { color: "red", on: 1 }]].concat(beeps ? [["beep", { hz: 196, ms: 250 }]] : [], [["wait", 350], ["light", { color: "red", on: 0 }]]),
      over: [["light", { color: "all", on: 0 }], ["light", { color: "red", on: 1 }]],
      win: [],
    }[event];
    if (event === "win") {
      ["green", "yellow", "red", "green", "yellow", "red"].forEach(function (color, i) {
        steps.push(["light", { color: "all", on: 0 }], ["light", { color: color, on: 1 }]);
        if (beeps) steps.push(["beep", { hz: [523, 659, 784, 1047, 784, 1047][i], ms: 150 }]);
        steps.push(["wait", 180]);
      });
      steps.push(["light", { color: "all", on: 1 }]);
    }
    steps.forEach(function (step) {
      boardChain = boardChain.then(function () {
        if (step[0] === "wait") return Lab.sleep(step[1]);
        return Lab.api(step[0], step[1]).catch(function () {});
      });
    });
  }

  // Lo que llega de la placa: el botón, las palmadas y la mano.
  var lastInput = null;
  var boardOk = null;

  function pollInput() {
    Lab.api("input")
      .then(function (s) {
        var near = s.cm >= 0 && s.cm < HAND_CM;
        if (lastInput) {
          if (s.button !== lastInput.button) press("boton");
          if (s.claps !== lastInput.claps) press("palmada");
          if (near && !lastInput.near) press("mano");
        }
        lastInput = { button: s.button, claps: s.claps, near: near };
        setBoard(true);
      })
      .catch(function () {
        setBoard(false);
      })
      .then(function () {
        // Sin placa (o con la pestaña escondida), se pregunta una vez por segundo.
        setTimeout(pollInput, document.hidden || boardOk === false ? 1000 : POLL_MS);
      });
  }

  var NAMES = { boton: "🔘 ¡Botón!", palmada: "👏 ¡Palmada!", mano: "👋 ¡Mano!", pantalla: "👆 ¡Toque!" };
  var flashTimer = null;

  function press(source) {
    if (source !== "pantalla" && !mandos[source]) return;
    var live = Lab.$("#mando-live");
    live.textContent = NAMES[source];
    live.classList.add("hit");
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () {
      live.classList.remove("hit");
    }, 400);
    if (g.mode === "play") return jump();
    // En las pantallas de inicio y de fin, saltar es empezar (con un respiro
    // al acabar, para no empezar otra sin querer).
    if (Date.now() - screenAt > 900) start();
  }

  function setBoard(ok) {
    if (ok === boardOk) return;
    boardOk = ok;
    if (!ok) Lab.$("#mando-live").textContent = "Sin placa: juega tocando la pantalla o con la barra espaciadora.";
    else Lab.$("#mando-live").textContent = "Placa lista: ¡prueba tu mando!";
  }

  // ---------- Pantallas ----------

  var screenAt = 0;

  function showScreen(name) {
    // El respiro antes de poder empezar es sólo al acabar una partida.
    screenAt = name === "start" ? 0 : Date.now();
    var overlay = Lab.$("#overlay");
    overlay.hidden = !name;
    Lab.$$(".overlay-box").forEach(function (box) {
      box.hidden = box.id !== "screen-" + name;
    });
    if (name === "over") {
      var k = KINDS[g.killer] || KINDS.cactus;
      Lab.$("#over-title").textContent = "¡Te ha pillado " + k.name + "! " + k.emoji;
      Lab.$("#over-score").textContent = meters() + " m · " + g.bolts + " rayos";
      Lab.$("#over-record").textContent = g.newRecord ? "🏆 ¡Récord nuevo!" : "Récord: " + record + " m";
      Lab.$("#over-again").focus();
    }
    if (name === "win") {
      Lab.$("#win-score").textContent = meters() + " m · " + g.bolts + " rayos · " + Math.round(g.t) + " s";
      Lab.confetti();
      Lab.$("#win-again").focus();
    }
    if (name === "start") Lab.$("#start-btn").focus();
  }

  function start() {
    g = newGame("play");
    showScreen(null);
    boardEvent("start");
    banner("¡Corre, Chispa! ⚡", 1.6);
    sfx("power");
  }

  // ---------- Bucle ----------

  var lastFrame = 0;
  var paused = false;

  function frame(now) {
    var dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    if (!paused) update(dt * testSpeed);
    render();
    requestAnimationFrame(frame);
  }

  // ---------- Los dibujos de «Lo que te vas a encontrar» ----------

  function drawCast() {
    Lab.$$("canvas[data-sprite]").forEach(function (cv) {
      var ratio = Math.min(2, window.devicePixelRatio || 1);
      cv.width = 72 * ratio;
      cv.height = 72 * ratio;
      var c = cv.getContext("2d");
      c.setTransform(ratio, 0, 0, ratio, 0, 0);
      var kind = cv.getAttribute("data-sprite");
      var keep = ctx;
      ctx = c;
      var fake = { spin: 0, t: 0, x: 0 };
      if (KINDS[kind]) {
        var k = KINDS[kind];
        var s = Math.min(1, 60 / Math.max(k.w, k.h + 10));
        c.translate(36 - (k.w * s) / 2, 66 - k.h * s);
        c.scale(s, s);
        if (kind === "cosechadora") c.translate(0, 10);
        DRAW[kind](c, 0, 0, k.w, k.h, fake);
      } else if (POWERS[kind]) {
        drawPower(c, 36, 36, kind, 0);
      } else if (kind === "bolt") {
        c.translate(36, 36);
        c.scale(1.8, 1.8);
        drawBolt(c, 0, 0, 0);
      } else if (kind === "nubarron") {
        c.translate(40, 28);
        c.scale(0.55, 0.55);
        drawCloudEnemy(c, { x: 0, y: 0, t: 0 });
      } else if (kind === "chispa") {
        c.translate(14, 6);
        drawChispa(c, 0, 0, { fly: 0, ground: true, run: 0, squash: 0 }, {});
      }
      ctx = keep;
    });
  }

  // ---------- Arranque ----------

  document.addEventListener("DOMContentLoaded", function () {
    canvas = Lab.$("#game");
    ctx = canvas.getContext("2d");
    g = newGame("demo");
    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", function () {
      setTimeout(resize, 50);
    });
    Lab.poll(2500);
    pollInput();
    drawCast();
    showScreen("start");
    requestAnimationFrame(frame);

    canvas.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      press("pantalla");
    });
    // Tocar fuera del cartel (en el juego que se ve detrás) también empieza.
    Lab.$("#overlay").addEventListener("pointerdown", function (e) {
      if (e.target.id === "overlay") press("pantalla");
    });
    var jumpBtn = Lab.$("#jump-btn");
    jumpBtn.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      press("pantalla");
    });
    // Con el teclado no hay pointerdown: llega el clic (detail 0).
    jumpBtn.addEventListener("click", function (e) {
      if (e.detail === 0) press("pantalla");
    });
    document.addEventListener("keydown", function (e) {
      var key = e.key;
      if (key !== " " && key !== "ArrowUp" && key !== "Enter") return;
      // En un botón, Enter y espacio son del botón (encender un mando, empezar).
      var tag = (e.target && e.target.tagName) || "";
      if (tag === "BUTTON" && key !== "ArrowUp") return;
      e.preventDefault();
      if (!e.repeat) press("pantalla");
    });
    ["#start-btn", "#over-again", "#win-again"].forEach(function (id) {
      Lab.$(id).addEventListener("click", start);
    });

    document.addEventListener("visibilitychange", function () {
      paused = document.hidden;
      lastFrame = 0;
    });

    var soundBtn = Lab.$("#sound-btn");
    function paintSound() {
      soundBtn.textContent = muted ? "🔇 Sin sonido" : "🔊 Con sonido";
      soundBtn.setAttribute("aria-pressed", muted ? "false" : "true");
    }
    soundBtn.addEventListener("click", function () {
      muted = !muted;
      Lab.store.set("juego.mudo", muted);
      paintSound();
    });
    paintSound();

    var frameEl = Lab.$("#frame");
    var full = frameEl.requestFullscreen || frameEl.webkitRequestFullscreen;
    var fullBtn = Lab.$("#full-btn");
    if (!full) fullBtn.hidden = true;
    fullBtn.addEventListener("click", function () {
      if (document.fullscreenElement) document.exitFullscreen();
      else full.call(frameEl);
    });

    Lab.$$("[data-mando]").forEach(function (btn) {
      var name = btn.getAttribute("data-mando");
      function paint() {
        btn.setAttribute("aria-pressed", mandos[name] ? "true" : "false");
        btn.classList.toggle("on", !!mandos[name]);
      }
      btn.addEventListener("click", function () {
        mandos[name] = !mandos[name];
        Lab.store.set("juego.mandos", mandos);
        paint();
      });
      paint();
    });
  });

  // Para mirar desde fuera (y para las pruebas, con ?prueba=1, unos trucos).
  window.Juego = {
    state: function () {
      return {
        mode: g.mode,
        meters: meters(),
        lives: g.lives,
        bolts: g.bolts,
        jumps: g.jumps,
        ground: g.player.ground,
        rocket: g.rocket,
        shield: g.shield,
        slow: g.slow,
        boss: g.boss ? g.boss.phase : null,
        things: g.things.map(function (t) {
          return t.kind;
        }),
      };
    },
  };
  if (TESTING) {
    window.Juego.prueba = {
      skipTo: function (m) {
        g.dist = m * PX_PER_M;
        g.nextCloudM = m + 10000;
      },
      invencible: function (on) {
        invincible = on;
      },
      piloto: function (on) {
        autopilot = on;
      },
      rapido: function (k) {
        testSpeed = k;
      },
      poder: function (type) {
        collect({ type: "power", power: type, x: PLAYER_X, y: GY - 40 });
      },
    };
  }
})();
