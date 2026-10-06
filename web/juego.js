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
  // v3: las 12 ideas, ya dentro del juego.
  var DUCK_CM = 30; // la mano entre 15 y 30 cm: Chispa se agacha
  var DUCK_H = 34; // agachada, Chispa mide esto
  var TURTLE = 0.78; // el modo tortuga va a esta velocidad

  // Lo que no hay que tocar. «from»: a partir de qué metro aparece.
  // «extra»: lo que corre por su cuenta, además del suelo.
  var KINDS = {
    cactus: { w: 30, h: 50, from: 0, weight: 3, name: "un cactus", emoji: "🌵", t: "Cactus", note: "pinchan" },
    deberes: { w: 46, h: 36, from: 0, weight: 3, name: "los deberes", emoji: "📚", plural: true, t: "Deberes", note: "¡hoy no!" },
    cactus2: { w: 60, h: 46, from: 80, weight: 2, name: "dos cactus", emoji: "🌵", plural: true },
    brocoli: { w: 38, h: 48, from: 120, weight: 2, name: "el brócoli", emoji: "🥦", t: "Brócoli", note: "desde 120 m" },
    mates: { w: 46, h: 64, from: 200, weight: 2, name: "el libro de mates", emoji: "📕", t: "Libro de mates", note: "muy alto" },
    coche: { w: 78, h: 42, from: 320, weight: 1.5, extra: 150, name: "un coche con prisa", emoji: "🚗", t: "Coche", note: "¡va con prisa!" },
    // v3: los del mundo 2 (la granja) y el 3 (la luna).
    valla: { w: 48, h: 40, from: 0, weight: 3, name: "una valla", emoji: "🪵", t: "Valla", note: "de madera" },
    gallina: { w: 36, h: 38, from: 60, weight: 2, extra: 120, name: "una gallina con prisa", emoji: "🐔", t: "Gallina", note: "¡corre hacia ti!" },
    cerdo: { w: 58, h: 40, from: 150, weight: 2, name: "el cerdo dormilón", emoji: "🐷", t: "Cerdo", note: "duerme en medio" },
    roca: { w: 42, h: 34, from: 0, weight: 3, name: "una roca lunar", emoji: "🪨", t: "Roca lunar", note: "llena de hoyos" },
    crater: { w: 76, h: 10, from: 60, weight: 2, name: "un cráter", emoji: "🕳️", box: [18, 5, 40, 5], t: "Cráter", note: "¡no te caigas!" },
    alien: { w: 40, h: 52, from: 150, weight: 2, extra: 50, name: "un marciano", emoji: "👽", t: "Marciano", note: "viene a saludar" },
    examen: { w: 36, h: 20, name: "un examen sorpresa", emoji: "📝" },
    // v3 (idea 8): el Nubarrón también lanza aviones de papel: se pasan agachándose.
    avion: { w: 44, h: 18, extra: 90, name: "un examen volador", emoji: "✈️", t: "Examen volador", note: "¡agáchate! ✋" },
    paca: { w: 44, h: 44, extra: 90, name: "una paca de paja", emoji: "🌾" },
    pacaMini: { w: 34, h: 34, extra: 90, name: "una paca pequeña", emoji: "🌾" },
    cosechadora: { w: 200, h: 140, name: "la Súper Cosechadora", emoji: "🚜", box: [24, 34, 160, 106] },
  };

  // v3 (idea 3): tres mundos. El 2 se abre ganando en el 1, y el 3 ganando en el 2.
  // Los colores van de tres en tres: de día, por la tarde y de noche.
  var WORLDS = {
    campo: {
      n: 1, name: "El campo", emoji: "🌵", shift: 0,
      kinds: ["cactus", "deberes", "cactus2", "brocoli", "mates", "coche"],
      far: ["#a9c7ff", "#d99ab0", "#2b2470"], near: ["#7cd36b", "#b8b25e", "#24584a"],
      dirt: ["#e0a96d", "#e0a96d", "#5d4037"], grass: ["#5cc45a", "#5cc45a", "#2f6b45"],
    },
    granja: {
      n: 2, name: "La granja", emoji: "🐔", shift: 0.4,
      kinds: ["valla", "deberes", "gallina", "cerdo", "mates", "coche"],
      far: ["#b8d9a0", "#e7a487", "#2b2470"], near: ["#efcf63", "#e2a64f", "#3d4a3a"],
      dirt: ["#c98b55", "#c98b55", "#4a3328"], grass: ["#d6b443", "#d39d3c", "#4a5a3a"],
    },
    luna: {
      n: 3, name: "La luna", emoji: "🌙", moon: true, gravity: 1650, jumpV: 690,
      kinds: ["roca", "crater", "deberes", "alien", "mates"],
      far: ["#4b4685", "#4b4685", "#4b4685"], near: ["#7d7a9e", "#7d7a9e", "#7d7a9e"],
      dirt: ["#a6a4bb", "#a6a4bb", "#a6a4bb"], grass: ["#c9c7da", "#c9c7da", "#c9c7da"],
    },
  };
  var WORLD_ORDER = ["campo", "granja", "luna"];

  // v3 (idea 2): Chispas de colores, que se abren juntando rayos.
  var SKINS = [
    { id: "chispa", name: "Chispa", body: "#ffd84d", need: 0 },
    { id: "menta", name: "Menta", body: "#6fe3a6", need: 20 },
    { id: "uva", name: "Uva", body: "#c4a3ff", need: 50 },
    { id: "fresa", name: "Fresa", body: "#ff9fc2", need: 100 },
    { id: "hielo", name: "Hielo", body: "#9fe6ff", need: 160 },
  ];

  // v3 (idea 6): pegatinas, que se guardan en el navegador.
  var STICKERS = [
    { id: "deberes", emoji: "📚", name: "10 deberes", hint: "Salta 10 deberes (entre todas las partidas)" },
    { id: "noche", emoji: "🌙", name: "Noche sin chocar", hint: "Pasa una noche entera sin chocar" },
    { id: "cosechadora", emoji: "🚜", name: "La Cosechadora", hint: "Gana a la Súper Cosechadora" },
    { id: "escudos", emoji: "🛡️", name: "3 escudos", hint: "Coge 3 escudos en una partida" },
    { id: "rayos", emoji: "⚡", name: "50 rayos", hint: "Junta 50 rayos en una partida" },
    { id: "brocoli", emoji: "🥦", name: "5 brócolis", hint: "Salta 5 brócolis en una partida" },
    { id: "agachado", emoji: "✋", name: "Agachado", hint: "Pasa 3 exámenes voladores agachándote" },
    { id: "granja", emoji: "🐔", name: "La granja", hint: "Gana en el mundo 2" },
    { id: "luna", emoji: "👽", name: "La luna", hint: "Gana en el mundo 3" },
  ];

  // v3 (idea 4): las tres fases de la Súper Cosechadora.
  var PHASES = ["Pacas de paja", "Tres saltos seguidos", "¡Con el cohete!"];

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
  // v2: lo que pasa en la partida, contado, para los bloques de «Programar».
  var EV = { jump: 0, hit: 0, bolt: 0, power: 0, over: 0, win: 0, duck: 0, phase: 0 };
  // v3: lo que se elige y lo que se va ganando (todo, en el navegador).
  var world = Lab.store.get("juego.mundo", "campo");
  var turtle = Lab.store.get("juego.tortuga", false);
  var players = Lab.store.get("juego.jugadores", 1);
  var skin = Lab.store.get("juego.skin", "chispa");
  var bank = Lab.store.get("juego.rayosTotal", 0);
  var worldsWon = Lab.store.get("juego.mundos", {});
  var stickers = Lab.store.get("juego.pegatinas", {});
  var stats = Lab.store.get("juego.cuentas", { deberes: 0, agachado: 0 });
  var openAll = Lab.store.get("juego.abierto", false);
  var duo = null; // v3 (idea 1): dos partidas a la vez, una encima de la otra
  var duckHeld = [false, false]; // teclas y botón «Agáchate» (jugador 1 y 2)
  var duckHand = false; // la mano, a media distancia
  if (!WORLDS[world]) world = "campo";
  var programaActivo = false;
  var invincible = false;
  var autopilot = false;
  var testSpeed = 1;

  function newGame(mode, opts) {
    opts = opts || {};
    var slow = mode !== "demo" && turtle;
    var seed = opts.seed != null ? opts.seed : nextSeed++;
    var lives = slow ? 5 : 3;
    return {
      mode: mode, // "demo", "play", "over" o "win"
      t: 0,
      dist: 0,
      speed: BASE_SPEED * (slow ? TURTLE : 1),
      player: { y: GY - PLAYER_H, vy: 0, ground: true, fly: 0, hurt: 0, run: 0, squash: 0, buffered: 0, duck: false },
      lives: lives,
      maxLives: lives,
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
      // v3
      world: opts.world || world,
      turtle: slow,
      body: skinOf(opts.skin || skin).body,
      who: opts.who || 0, // 0: una persona; 1 y 2: los dos jugadores
      cleared: {},
      shields: 0,
      hits: 0,
      night: null,
      autoDuck: false,
      news: [],
      // Con la misma semilla, los dos jugadores ven los mismos obstáculos; las
      // partículas van con otro azar para no descolocarlos.
      rng: makeRng(seed),
      fxr: makeRng(seed + 7919),
    };
  }

  function skinOf(id) {
    for (var i = 0; i < SKINS.length; i++) if (SKINS[i].id === id) return SKINS[i];
    return SKINS[0];
  }

  // El mundo de la partida que se está mirando.
  function wd() {
    return WORLDS[g.world] || WORLDS.campo;
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
    p.duck = false;
    p.squash = -1;
    g.jumps += 1;
    if (g.mode === "play") EV.jump += 1;
    if (g.rocket > 0) {
      p.fly = ROCKET_FLIGHT;
      p.vy = 0;
      sfx("rocket");
    } else {
      p.vy = -(wd().jumpV || JUMP_V);
      sfx("jump");
    }
  }

  function updatePlayer(d) {
    var p = g.player;
    // v3 (idea 8): agacharse, sólo con los pies en el suelo.
    var duck = p.ground && p.fly <= 0 && g.mode !== "over" && g.mode !== "win" && duckWanted();
    if (duck && !p.duck && g.mode === "play") EV.duck += 1;
    p.duck = duck;
    p.run += d * (g.speed / (duck ? 40 : 28));
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
    p.vy += (wd().gravity || GRAVITY) * d;
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
      if (k.weight && k.from <= m && wd().kinds.indexOf(kind) >= 0) {
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
    // v3 (idea 9): en el modo tortuga, más hueco entre obstáculos.
    var min = g.speed * (0.95 + ease * 0.6) * (g.turtle ? 1.35 : 1) + k.w + (k.extra ? 170 : 0);
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

  // v3 (idea 4): el final en tres fases, cada una con su cartel. Mientras
  // tanto, la Cosechadora asoma por la derecha y es ella la que tira las pacas.
  function startBoss() {
    g.boss = { phase: "aviso", step: 0, round: 1, sent: 0, machine: null, peek: 0, out: 0 };
    g.nextThing = 0;
    banner("¡Cuidado! ¡Llega la Súper Cosechadora! 🚜", 2.6);
  }

  function bossStep(n) {
    g.boss.step = n;
    g.boss.sent = 0;
    if (g.mode === "play") EV.phase += 1;
    banner("Fase " + n + " de 3 · " + PHASES[n - 1] + " " + ["🌾", "⤴⤴⤴", "🚀"][n - 1], 2.4);
  }

  function throwBale(kind) {
    addThing(kind, W - 60);
    for (var i = 0; i < 4; i++) puff(W - 40 + i * 6, GY - 4, "dust");
  }

  function updateBossSpawns(dx) {
    var b = g.boss;
    g.nextThing -= dx;
    if (b.phase === "aviso") {
      if (g.nextThing <= -W) {
        b.phase = "pacas";
        bossStep(1);
        g.nextThing = g.speed * 0.9;
      }
    } else if (b.phase === "pacas") {
      if (g.nextThing <= 0) {
        if (b.sent < 3) {
          throwBale("paca");
          b.sent += 1;
          g.nextThing = g.speed * 1.35 + 150;
        } else {
          b.phase = "seguidos";
          bossStep(2);
          g.nextThing = g.speed * 0.9;
        }
      }
    } else if (b.phase === "seguidos") {
      if (g.nextThing <= 0) {
        if (b.sent < 3) {
          // Muy juntas: salto, suelo, salto, suelo, salto.
          throwBale("pacaMini");
          b.sent += 1;
          g.nextThing = b.sent < 3 ? g.speed * 0.85 + 40 : g.speed * 1.5;
        } else {
          b.phase = "cohete";
          bossStep(3);
          g.nextThing = g.speed * 0.5;
        }
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
        // Si te ha pillado, vuelve: otra vez la fase 3.
        b.round += 1;
        b.machine = null;
        b.phase = "cohete";
        g.nextThing = g.speed;
        banner("¡Vuelve! ¡Otra vez con el cohete! 🚜", 2.2);
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
      // v3 (idea 8): el primero es un avión de papel que baja planeando hasta
      // la altura de la cabeza: se pasa agachándose (o saltando). Los exámenes
      // que caen al suelo llegan después, con hueco.
      var plane = c.drops === 3 && c.x > PLAYER_X + 330;
      if (plane) throwPlane(c);
      else g.falling.push({ x: c.x - 18, y: c.y + 24, vy: 0, rot: 0 });
      c.drops -= 1;
      c.dropT = plane ? 1.5 : 1.1;
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
    if (p.duck) return [PLAYER_X + 6, GY - DUCK_H + 4, PLAYER_W - 12, DUCK_H - 7];
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
    EV.hit += 1;
    g.hits += 1;
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
    if (g.mode === "play") EV[item.type === "bolt" ? "bolt" : "power"] += 1;
    if (item.type === "bolt") {
      g.bolts += 1;
      sparkle(item.x, item.y, "#ffd84d");
      sfx("bolt");
      if (g.bolts >= 50) earn("rayos");
      return;
    }
    if (item.power === "escudo") {
      g.shield = true;
      g.shields += 1;
      if (g.shields >= 3) earn("escudos");
    }
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

    var target = (g.boss ? BOSS_SPEED : Math.min(MAX_SPEED, BASE_SPEED + (g.dist / PX_PER_M) * 0.28)) * (g.turtle ? TURTLE : 1);
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
      if (t.glide) {
        t.y += t.vy * d;
        if (t.y >= t.flyY) {
          t.y = t.flyY;
          t.glide = false;
        }
      }
      if (t.x + t.w < -60 && t !== (g.boss && g.boss.machine)) {
        g.things.splice(i, 1);
        continue;
      }
      if (!t.touched && overlaps(box, thingBox(t))) hurt(t.kind, t);
      // v3: lo que se deja atrás sin tocar cuenta para las pegatinas.
      if (t.kind === "avion" && g.player.duck && t.x < PLAYER_X + PLAYER_W && t.x + t.w > PLAYER_X) t.ducked = true;
      if (!t.touched && !t.counted && t.x + t.w < PLAYER_X + 9) {
        t.counted = true;
        passed(t);
      }
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
    if (g.boss) {
      // Asoma poco a poco y, antes de la carga final, se va para coger carrerilla.
      var bs = g.boss;
      bs.peek = Math.min(1, bs.peek + d * 0.7);
      var away = bs.phase === "maquina" || bs.phase === "final" ? 1 : 0;
      bs.out += (away - bs.out) * Math.min(1, d * 2.5);
    }
    // v3 (idea 6): una noche entera sin chocar (en el campo y en la granja).
    if (g.mode === "play" && !wd().moon) {
      var dl = daylight();
      if (!g.night && dl.night > 0.97) g.night = { hits: g.hits };
      else if (g.night && dl.night < 0.4) {
        if (g.hits === g.night.hits) earn("noche");
        g.night = null;
      }
    }

    if (g.mode === "play" && !duo) {
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
    // v3: el avión de papel no se salta: se pasa agachándose.
    g.autoDuck = g.things.some(function (t) {
      var ahead = t.x - (PLAYER_X + PLAYER_W);
      return t.kind === "avion" && !t.touched && ahead < 120 && ahead > -t.w - PLAYER_W - 10;
    });
    if (!p.ground || g.autoDuck) return;
    for (var i = 0; i < g.things.length; i++) {
      var t = g.things[i];
      if (t.kind === "avion") continue;
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
    var r = g.fxr;
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
      var a = g.fxr() * Math.PI * 2;
      var v = 120 + g.fxr() * 200;
      g.fx.push({ kind: "spark", x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6, max: 0.6, r: 4, color: color });
    }
  }

  function confetti() {
    var colors = ["#ff4f4f", "#ffc83d", "#22d47b", "#4cb2ff", "#a77bff", "#ff9bd2"];
    for (var i = 0; i < 90; i++) {
      g.fx.push({
        kind: "confetti",
        x: g.fxr() * W,
        y: -20 - g.fxr() * 160,
        vx: -40 + g.fxr() * 80,
        vy: 90 + g.fxr() * 120,
        life: 3.5,
        max: 3.5,
        r: 4,
        spin: g.fxr() * 6,
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
    EV.over += 1;
    g.killer = kind;
    sfx("over");
    if (duo) return duoCheck();
    boardEvent("over");
    finish();
    showScreen("over");
  }

  function win() {
    g.mode = "win";
    EV.win += 1;
    confetti();
    sfx("win");
    // v3: ganar da pegatinas y abre el mundo siguiente.
    earn("cosechadora");
    if (g.world !== "campo") earn(g.world);
    var next = WORLD_ORDER[WORLD_ORDER.indexOf(g.world) + 1];
    if (next && !worldOpen(next)) g.news.push("🔓 ¡Nuevo mundo: " + WORLDS[next].name + "!");
    worldsWon[g.world] = true;
    Lab.store.set("juego.mundos", worldsWon);
    if (duo) return duoCheck();
    boardEvent("win");
    finish();
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

  // ---------- v3: lo que se gana jugando ----------

  function worldOpen(id) {
    var i = WORLD_ORDER.indexOf(id);
    return openAll || i <= 0 || !!worldsWon[WORLD_ORDER[i - 1]];
  }

  function skinOpen(s) {
    return openAll || bank >= s.need;
  }

  // Idea 6: una pegatina nueva, con su cartel.
  function earn(id) {
    if (g.mode === "demo" || stickers[id]) return;
    var st = STICKERS.filter(function (s) {
      return s.id === id;
    })[0];
    if (!st) return;
    stickers[id] = Date.now();
    Lab.store.set("juego.pegatinas", stickers);
    g.news.push("🆕 Pegatina: " + st.emoji + " " + st.name);
    banner("¡Pegatina nueva! " + st.emoji + " " + st.name, 2.4);
    sfx("power");
    paintStickers();
  }

  // Lo que se deja atrás sin tocarlo.
  function passed(t) {
    if (g.mode !== "play") return;
    g.cleared[t.kind] = (g.cleared[t.kind] || 0) + 1;
    if (t.kind === "deberes" || (t.kind === "avion" && t.ducked)) {
      if (t.kind === "deberes") stats.deberes += 1;
      else stats.agachado += 1;
      Lab.store.set("juego.cuentas", stats);
    }
    if (stats.deberes >= 10) earn("deberes");
    if (stats.agachado >= 3) earn("agachado");
    if ((g.cleared.brocoli || 0) >= 5) earn("brocoli");
  }

  // Idea 8: el avión baja planeando y llega a la altura de la cabeza antes que Chispa.
  function throwPlane(c) {
    var k = KINDS.avion;
    var plane = addThing("avion", c.x - 40);
    plane.flyY = GY - 40 - k.h;
    plane.y = c.y + 18;
    var time = Math.max(0.35, (plane.x - (PLAYER_X + 220)) / (g.speed + k.extra));
    plane.vy = (plane.flyY - plane.y) / time;
    plane.glide = true;
    if (!g.planeTold) {
      g.planeTold = true;
      banner("¡Un examen volador! ✋ Agáchate… o salta", 2.4);
    }
  }

  function duckWanted() {
    if (autopilot || g.mode === "demo") return !!g.autoDuck;
    var i = g.who === 2 ? 1 : 0;
    return duckHeld[i] || (i === 0 && duckHand && (!!duo || mandos.mano));
  }

  // Al acabar: los rayos van a la hucha (abren Chispas) y se mira si la
  // partida entra en los récords de la clase.
  function finish() {
    saveRecord();
    addToBank(g.bolts);
    g.classPlace = classPlace(meters());
    g.classSaved = false;
    g.pendingAlias = g.classPlace > 0;
  }

  function addToBank(bolts) {
    var before = SKINS.filter(skinOpen).length;
    bank += bolts;
    Lab.store.set("juego.rayosTotal", bank);
    SKINS.forEach(function (s, i) {
      if (i >= before && skinOpen(s)) g.news.push("🎨 ¡Nueva Chispa: " + s.name + "!");
    });
    paintSkins();
  }

  // ---------- v3 (idea 5): los récords de la clase, en la placa ----------

  var classRec = { list: [], where: "placa" };
  var ALIASES = ["Rayo", "Cometa", "Trueno", "Pulga", "Bólido", "Canguro", "Petardo", "Saltamontes", "Chispazo", "Relámpago", "Muelle", "Turbo"];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
  }

  function loadClass() {
    return Lab.api("records")
      .then(function (r) {
        classRec = { list: r.records || [], where: "placa" };
      })
      .catch(function () {
        // Una placa sin récords (un firmware de antes): se guardan en esta tableta.
        classRec = { list: Lab.store.get("juego.clase", []), where: "tableta" };
      })
      .then(paintClass);
  }

  // En qué puesto entraría (0: no entra entre los cinco).
  function classPlace(m) {
    if (m <= 0) return 0;
    var place = 1;
    classRec.list.forEach(function (r) {
      if (r.m >= m) place += 1;
    });
    return place <= 5 ? place : 0;
  }

  function saveClass(alias) {
    var game = g;
    var entry = { alias: alias, m: meters(), t: g.turtle ? 1 : 0, w: g.world };
    return Lab.api("record", entry)
      .then(function (r) {
        classRec = { list: r.records || [], where: "placa" };
        return r.place;
      })
      .catch(function () {
        var list = Lab.store.get("juego.clase", []);
        list.push(entry);
        list.sort(function (a, b) {
          return b.m - a.m;
        });
        var place = list.indexOf(entry) + 1;
        list = list.slice(0, 5);
        Lab.store.set("juego.clase", list);
        classRec = { list: list, where: "tableta" };
        return place <= 5 ? place : 0;
      })
      .then(function (place) {
        game.classSaved = place || true;
        game.pendingAlias = false;
        Lab.store.set("juego.alias", alias);
        paintClass();
      });
  }

  function classRows(mine) {
    if (!classRec.list.length) return '<li class="empty"><span></span><span>Todavía nadie. ¡Estrénalos!</span><span></span></li>';
    return classRec.list
      .map(function (r, i) {
        var tags = (r.t ? " 🐢" : "") + (r.w && r.w !== "campo" && WORLDS[r.w] ? " " + WORLDS[r.w].emoji : "");
        return "<li" + (mine === i + 1 ? ' class="me"' : "") + "><span>" + (i + 1) + "</span><span>" + esc(r.alias) + tags + "</span><span>" + r.m + " m</span></li>";
      })
      .join("");
  }

  function paintClass() {
    var table = Lab.$("#class-table");
    if (table) table.innerHTML = classRows(0);
    var where = Lab.$("#class-where");
    if (where) {
      where.textContent =
        classRec.where === "placa"
          ? "Los cinco mejores, guardados en la placa: se ven desde cualquier tableta conectada. 🐢 es el modo tortuga."
          : "Esta placa no guarda récords, así que se guardan en esta tableta. 🐢 es el modo tortuga.";
    }
    Lab.$$(".ov-side").forEach(function (box) {
      if (!box.parentNode.hidden) paintSide(box);
    });
  }

  // La columna de los récords en los carteles del final: con el alias, si entras.
  function paintSide(box) {
    var html = "<h3>🏆 Récords de la clase</h3>";
    if (g.pendingAlias) {
      html +=
        '<p class="class-in">¡Entras en el puesto ' + g.classPlace + "!</p>" +
        '<form class="class-form" data-class-form>' +
        '<input type="text" maxlength="12" autocomplete="off" spellcheck="false" placeholder="Tu alias" aria-label="Tu alias" value="' + esc(Lab.store.get("juego.alias", "")) + '">' +
        '<button class="btn btn-soft" type="button" data-dice aria-label="Un alias al azar">🎲</button>' +
        '<button class="btn" type="submit">Guardar</button>' +
        "</form>" +
        '<p class="muted class-note">Un alias, no tu nombre de verdad. <button class="linkish" type="button" data-skip>No, gracias</button></p>';
    }
    html += '<ol class="class-table">' + classRows(typeof g.classSaved === "number" ? g.classSaved : 0) + "</ol>";
    if (g.classSaved) html += '<p class="muted class-note">✓ ' + (classRec.where === "placa" ? "Guardado en la placa." : "Guardado en esta tableta.") + "</p>";
    else if (!g.pendingAlias && classRec.list.length >= 5) html += '<p class="muted class-note">Para entrar, hay que pasar de ' + classRec.list[4].m + " m.</p>";
    box.innerHTML = html;
    var form = Lab.$("[data-class-form]", box);
    if (!form) return;
    var input = Lab.$("input", form);
    Lab.$("[data-dice]", box).addEventListener("click", function () {
      input.value = ALIASES[Math.floor(Math.random() * ALIASES.length)];
    });
    Lab.$("[data-skip]", box).addEventListener("click", function () {
      g.pendingAlias = false;
      paintSide(box);
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var alias = input.value.replace(/[<>"&]/g, "").trim().slice(0, 12);
      if (!alias) {
        input.focus();
        return Lab.toast("Escribe un alias (o pulsa 🎲)");
      }
      saveClass(alias);
    });
  }

  // ---------- v3 (idea 1): dos jugadores, botón contra palmada ----------

  function startDuo() {
    var seed = nextSeed++;
    var other = skin === "chispa" ? "menta" : "chispa";
    duo = {
      players: [newGame("play", { seed: seed, who: 1 }), newGame("play", { seed: seed, who: 2, skin: other })],
      finished: false,
      winner: 0,
    };
    g = duo.players[0];
    Lab.$("#frame").classList.add("duo");
    resize();
    paintBar();
    showScreen(null);
    boardEvent("start");
    duo.players[0].banner = { text: "🔘 Jugador 1: ¡con el botón!", t: 2.2 };
    duo.players[1].banner = { text: "👏 Jugador 2: ¡con palmadas!", t: 2.2 };
    sfx("power");
  }

  function leaveDuo() {
    if (!duo) return;
    duo = null;
    Lab.$("#frame").classList.remove("duo");
    resize();
    paintBar();
  }

  function metersOf(pg) {
    return Math.floor(pg.dist / PX_PER_M);
  }

  // Cuando acaban los dos, gana quien ha llegado más lejos (y si empatan, quien tiene más rayos).
  function duoCheck() {
    if (!duo || duo.finished) return;
    if (duo.players.some(function (pg) {
      return pg.mode === "play";
    })) return;
    duo.finished = true;
    var a = duo.players[0];
    var b = duo.players[1];
    var ma = metersOf(a);
    var mb = metersOf(b);
    duo.winner = ma > mb ? 1 : mb > ma ? 2 : a.bolts > b.bolts ? 1 : b.bolts > a.bolts ? 2 : 0;
    var keep = g;
    duo.players.forEach(function (pg) {
      g = pg;
      addToBank(pg.bolts);
    });
    g = keep;
    boardEvent("win");
    Lab.confetti();
    showScreen("duo");
  }

  function paintDuo() {
    var names = ["🔘 Jugador 1", "👏 Jugador 2"];
    Lab.$("#duo-title").textContent = duo.winner ? "¡Gana el jugador " + duo.winner + "!" : "¡Empate!";
    Lab.$("#duo-crown").textContent = duo.winner === 1 ? "🔘🏆" : duo.winner === 2 ? "👏🏆" : "🤝";
    var news = [];
    duo.players.forEach(function (pg, i) {
      var box = Lab.$("#duo-p" + (i + 1));
      var k = KINDS[pg.killer] || KINDS.cactus;
      box.classList.toggle("win", duo.winner === i + 1);
      box.innerHTML =
        "<b>" + names[i] + "</b><span>" + metersOf(pg) + " m</span><small>⚡ " + pg.bolts + " rayos · " +
        (pg.mode === "win" ? "🚜 ¡ganó a la Cosechadora!" : "💥 le " + (k.plural ? "pillaron " : "pilló ") + k.name) + "</small>";
      pg.news.forEach(function (n) {
        if (news.indexOf(n) < 0) news.push(n);
      });
    });
    paintNews("#duo-news", news);
    Lab.$("#duo-again").focus({ preventScroll: true });
  }

  function paintBar() {
    Lab.$("#jump2-btn").hidden = !duo;
    Lab.$("#jump-btn").innerHTML = '<span class="ico">⤴</span>' + (duo ? "Jugador 1" : "¡Salta!");
  }

  function advance(dt) {
    if (!duo) return update(dt);
    var keep = g;
    duo.players.forEach(function (pg) {
      g = pg;
      update(dt);
    });
    g = keep;
  }

  // ---------- v3: lo que se ve fuera del juego ----------

  function paintStart() {
    var w = WORLDS[world];
    var open = worldOpen(world);
    Lab.$("#world-name").textContent = "Mundo " + w.n + " · " + w.name + " " + w.emoji;
    var lock = Lab.$("#world-lock");
    lock.hidden = open;
    if (!open) lock.textContent = "🔒 Se abre ganando a la Cosechadora en " + WORLDS[WORLD_ORDER[w.n - 2]].name;
    Lab.$("#start-btn").disabled = !open;
    Lab.$$("[data-players]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", Number(btn.getAttribute("data-players")) === players ? "true" : "false");
    });
    Lab.$$("[data-turtle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", (btn.getAttribute("data-turtle") === "1") === turtle ? "true" : "false");
    });
    paintStartMandos();
  }

  function paintSkins() {
    var box = Lab.$("#skins");
    if (!box) return;
    box.innerHTML = SKINS.map(function (s) {
      var open = skinOpen(s);
      var label = !open ? "🔒 " + s.need + " ⚡" : s.id === skin ? "✓ La tuya" : "Elegir";
      return (
        '<button class="skin' + (open ? "" : " locked") + '" type="button" data-skin="' + s.id + '" aria-pressed="' + (s.id === skin) + '">' +
        '<canvas data-sprite="chispa" data-body="' + s.body + '" aria-hidden="true"></canvas><b>' + s.name + "</b><small>" + label + "</small></button>"
      );
    }).join("");
    var next = SKINS.filter(function (s) {
      return !skinOpen(s);
    })[0];
    Lab.$("#bank").innerHTML =
      "Llevas <b>" + bank + " ⚡</b> juntados en todas tus partidas. " + (next ? "La siguiente, " + next.name + ", con " + next.need + "." : "¡Las tienes todas!");
    Lab.$$("[data-skin]", box).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var s = skinOf(btn.getAttribute("data-skin"));
        if (!skinOpen(s)) return Lab.toast("🔒 " + s.name + " se abre con " + s.need + " rayos. ¡Llevas " + bank + "!");
        skin = s.id;
        Lab.store.set("juego.skin", skin);
        if (g && g.mode === "demo") g.body = s.body;
        paintSkins();
      });
    });
    if (g) drawCast();
  }

  function paintStickers() {
    var box = Lab.$("#stickers");
    if (!box) return;
    var got = 0;
    box.innerHTML = STICKERS.map(function (s) {
      var on = !!stickers[s.id];
      if (on) got += 1;
      return '<li class="sticker' + (on ? " got" : "") + '"><span class="st-ico">' + s.emoji + "</span><b>" + s.name + "</b><small>" + (on ? "¡Conseguida!" : s.hint) + "</small></li>";
    }).join("");
    Lab.$("#sticker-count").textContent = "⭐ " + got + " de " + STICKERS.length;
  }

  // «Lo que te vas a encontrar», con los obstáculos del mundo elegido.
  function paintCast() {
    var list = Lab.$("#cast-list");
    if (!list) return;
    var w = WORLDS[world];
    Lab.$("#cast-world").textContent = "· " + w.name;
    var items = w.kinds
      .filter(function (k) {
        return KINDS[k].t;
      })
      .map(function (k) {
        return [k, KINDS[k].t, KINDS[k].note];
      });
    items.push(["nubarron", "Nubarrón", "tira exámenes"], ["avion", "Examen volador", "¡agáchate! ✋"], ["cosechadora", "Súper Cosechadora", "en 800 m, en 3 fases"]);
    list.innerHTML = items
      .map(function (it) {
        return '<li><canvas data-sprite="' + it[0] + '"></canvas><b>' + it[1] + "</b><span>" + it[2] + "</span></li>";
      })
      .join("");
  }

  function paintNews(sel, list) {
    var box = Lab.$(sel);
    list = list || g.news;
    box.hidden = !list.length;
    box.innerHTML = list
      .map(function (n) {
        return "<span>" + n + "</span>";
      })
      .join("");
  }

  function moveWorld(step) {
    var i = WORLD_ORDER.indexOf(world);
    world = WORLD_ORDER[(i + step + WORLD_ORDER.length) % WORLD_ORDER.length];
    Lab.store.set("juego.mundo", world);
    if (g.mode === "demo") g = newGame("demo");
    paintStart();
    paintCast();
    drawCast();
  }

  function menu() {
    leaveDuo();
    g = newGame("demo");
    showScreen("start");
  }

  function setupV3() {
    Lab.$("#world-prev").addEventListener("click", function () {
      moveWorld(-1);
    });
    Lab.$("#world-next").addEventListener("click", function () {
      moveWorld(1);
    });
    Lab.$$("[data-players]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        players = Number(btn.getAttribute("data-players"));
        Lab.store.set("juego.jugadores", players);
        paintStart();
      });
    });
    Lab.$$("[data-turtle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        turtle = btn.getAttribute("data-turtle") === "1";
        Lab.store.set("juego.tortuga", turtle);
        paintStart();
      });
    });
    ["#over-menu", "#win-menu", "#duo-menu"].forEach(function (id) {
      Lab.$(id).addEventListener("click", menu);
    });
    Lab.$("#duo-again").addEventListener("click", start);
    Lab.$("#win-world").addEventListener("click", function () {
      var next = this.getAttribute("data-world");
      if (!next) return;
      world = next;
      Lab.store.set("juego.mundo", world);
      paintCast();
      drawCast();
      start();
    });
    var duckBtn = Lab.$("#duck-btn");
    duckBtn.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      duckHeld[0] = true;
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (name) {
      duckBtn.addEventListener(name, function () {
        duckHeld[0] = false;
      });
    });
    Lab.$("#jump2-btn").addEventListener("pointerdown", function (e) {
      e.preventDefault();
      press("j2");
    });
    paintSkins();
    paintStickers();
    paintCast();
    drawCast();
    paintStart();
    loadClass();
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
    // v3: en la luna siempre es de noche; la granja empieza por la tarde.
    if (wd().moon) return { sunset: 0, night: 1 };
    var k = (g.dist / PX_PER_M / 700 + (wd().shift || 0)) % 1;
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
    var moon = wd().moon;
    var grad = ctx.createLinearGradient(0, 0, 0, GY);
    grad.addColorStop(0, moon ? "#0b0a26" : sky(["#5ec2ff", "#ff7e5f", "#160f38"], dl.sunset, dl.night));
    grad.addColorStop(1, moon ? "#2e2766" : sky(["#d6f1ff", "#ffd59e", "#3a2c88"], dl.sunset, dl.night));
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
    if (moon) {
      // Desde la luna, lo que se ve en el cielo es la Tierra (y no hay nubes).
      circle(ctx, 660, 70, 32, "rgba(120,180,255,0.16)");
      circle(ctx, 660, 70, 24, "#4c97ff");
      ctx.save();
      ctx.beginPath();
      ctx.arc(660, 70, 24, 0, Math.PI * 2);
      ctx.clip();
      circle(ctx, 649, 62, 10, "#5cc45a");
      circle(ctx, 672, 80, 9, "#5cc45a");
      circle(ctx, 676, 60, 5, "#5cc45a");
      ctx.restore();
      return;
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

  function tone(c, dl) {
    return mix(mix(c[0], c[1], dl.sunset), c[2], dl.night);
  }

  function drawHills(dl) {
    var w = wd();
    // Montañas lejanas: se mueven poco (parallax), parecen lejos.
    var far = tone(w.far, dl);
    ctx.fillStyle = far;
    ctx.beginPath();
    ctx.moveTo(0, GY);
    for (var x = 0; x <= W; x += 10) {
      var wx = x + g.dist * 0.12;
      ctx.lineTo(x, GY - 70 - Math.sin(wx * 0.006) * 28 - Math.sin(wx * 0.017 + 1) * 14);
    }
    ctx.lineTo(W, GY);
    ctx.fill();

    var near = tone(w.near, dl);
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
      // v3: en la granja, graneros y silos; en la luna, cráteres.
      if (g.world === "granja") {
        if (n % 3 === 0) barn(tx, ty + 4, dl);
        else silo(tx, ty + 4, dl);
        continue;
      }
      if (w.moon) {
        ctx.fillStyle = "#615e86";
        ctx.beginPath();
        ctx.ellipse(tx, ty + 8, 18, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.fillStyle = mix("#8a5a3b", "#3b2a2a", dl.night);
      ctx.fillRect(tx - 3, ty - 18, 6, 18);
      circle(ctx, tx, ty - 26, 15, tree);
      circle(ctx, tx - 9, ty - 18, 10, tree);
      circle(ctx, tx + 9, ty - 19, 11, tree);
    }
  }

  function barn(x, y, dl) {
    var red = mix("#d64545", "#55304a", dl.night);
    ctx.fillStyle = red;
    ctx.fillRect(x - 18, y - 26, 36, 26);
    ctx.beginPath();
    ctx.moveTo(x - 22, y - 24);
    ctx.lineTo(x, y - 40);
    ctx.lineTo(x + 22, y - 24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = mix("#fff4e6", "#8a86a8", dl.night);
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 7, y - 16, 14, 16);
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 16);
    ctx.lineTo(x + 7, y);
    ctx.moveTo(x + 7, y - 16);
    ctx.lineTo(x - 7, y);
    ctx.stroke();
  }

  function silo(x, y, dl) {
    var top = mix("#9aa3b5", "#3a3860", dl.night);
    fillRR(ctx, x - 9, y - 44, 18, 44, 4, mix("#c7ccd9", "#4a4870", dl.night));
    circle(ctx, x, y - 44, 9, top);
    ctx.fillStyle = top;
    ctx.fillRect(x - 9, y - 30, 18, 3);
  }

  function drawGround(dl) {
    var w = wd();
    ctx.fillStyle = tone(w.dirt, dl);
    ctx.fillRect(0, GY, W, H - GY + 1000);
    ctx.fillStyle = tone(w.grass, dl);
    ctx.fillRect(0, GY - 2, W, 10);
    // Piedrecitas y briznas que pasan a la velocidad del suelo.
    var step = 46;
    var shift = g.dist % step;
    for (var x = -shift; x < W + step; x += step) {
      var n = Math.floor((x + g.dist) / step);
      var h = (n * 9301 + 49297) % 233;
      if (w.moon) {
        ctx.fillStyle = "#8a88a3";
        ctx.beginPath();
        ctx.ellipse(x + (h % 30), GY + 20 + (h % 18), 5 + (h % 4), 2 + (h % 2), 0, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
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
    if (w.moon) return;
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
    // v3 (idea 8): agachada, más baja y más ancha.
    if (p.duck) c.scale(1.2, DUCK_H / PLAYER_H);
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
      c.fillStyle = extras.body || "#ffd84d";
      c.fill(BULB);
      c.lineWidth = 6;
      c.strokeStyle = "#23214a";
      c.lineJoin = "round";
      c.stroke(BULB);
      c.restore();
    } else {
      circle(c, 0, 16, 16, extras.body || "#ffd84d", "#23214a", 2.5);
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
    // v3: los de la granja.
    valla: function (c, x, y, w, h) {
      var dark = "#7a4a22";
      fillRR(c, x + 3, y, 9, h, 3, "#d39a5c", dark, 2);
      fillRR(c, x + w - 12, y, 9, h, 3, "#d39a5c", dark, 2);
      fillRR(c, x, y + 7, w, 10, 3, "#e2ad6e", dark, 2);
      fillRR(c, x, y + 24, w, 10, 3, "#e2ad6e", dark, 2);
      grumpy(c, x + w / 2, y + 12, 4.5, 2.2);
    },
    gallina: function (c, x, y, w, h, t) {
      var step = Math.sin(t.spin / 5) * 3;
      c.strokeStyle = "#e0a800";
      c.lineWidth = 2.5;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(x + 16, y + 30);
      c.lineTo(x + 14 + step, y + h);
      c.moveTo(x + 23, y + 30);
      c.lineTo(x + 25 - step, y + h);
      c.stroke();
      c.fillStyle = "#fff";
      c.strokeStyle = "#23214a";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x + 32, y + 12);
      c.lineTo(x + 37, y + 9);
      c.lineTo(x + 35, y + 21);
      c.closePath();
      c.fill();
      c.stroke();
      c.beginPath();
      c.ellipse(x + 21, y + 22, 14, 10, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.strokeStyle = "#c3c8d4";
      c.beginPath();
      c.ellipse(x + 23, y + 22, 7, 4, -0.3, 0, Math.PI * 2);
      c.stroke();
      circle(c, x + 8, y + 3, 3, "#ff4f4f");
      circle(c, x + 12, y + 2.5, 3, "#ff4f4f");
      circle(c, x + 10, y + 11, 8, "#fff", "#23214a", 2);
      c.fillStyle = "#ffb703";
      c.beginPath();
      c.moveTo(x + 3, y + 10);
      c.lineTo(x - 4, y + 12);
      c.lineTo(x + 3, y + 14);
      c.closePath();
      c.fill();
      circle(c, x + 6, y + 17, 2, "#ff4f4f");
      circle(c, x + 8, y + 9.5, 1.7, "#23214a");
      c.strokeStyle = "#23214a";
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(x + 5, y + 5.5);
      c.lineTo(x + 11, y + 7);
      c.stroke();
    },
    cerdo: function (c, x, y, w, h) {
      [10, 22, 36, 46].forEach(function (lx) {
        fillRR(c, x + lx, y + h - 9, 7, 9, 2, "#f48fb1", "#23214a", 1.5);
      });
      c.fillStyle = "#ffb3c7";
      c.strokeStyle = "#23214a";
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(x + 31, y + 19, 25, 14, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(x + 14, y + 9);
      c.lineTo(x + 12, y - 1);
      c.lineTo(x + 22, y + 6);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = "#ff8fb1";
      c.beginPath();
      c.ellipse(x + 7, y + 21, 7, 6, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      circle(c, x + 5, y + 20, 1.3, "#23214a");
      circle(c, x + 9, y + 20, 1.3, "#23214a");
      c.beginPath();
      c.arc(x + 17, y + 13, 3, 0.1 * Math.PI, 0.9 * Math.PI);
      c.stroke();
      c.beginPath();
      c.moveTo(x + 56, y + 15);
      c.quadraticCurveTo(x + 63, y + 10, x + 59, y + 6);
      c.stroke();
      c.fillStyle = "#23214a";
      c.textAlign = "center";
      c.font = "bold 11px " + FONT;
      c.fillText("z", x + 27, y - 2);
      c.font = "bold 8px " + FONT;
      c.fillText("z", x + 34, y - 9);
    },
    // v3: los de la luna.
    roca: function (c, x, y, w, h) {
      c.fillStyle = "#8d8aa8";
      c.strokeStyle = "#23214a";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x + 3, y + h);
      c.lineTo(x, y + 18);
      c.quadraticCurveTo(x + 4, y + 3, x + 19, y + 1);
      c.quadraticCurveTo(x + 37, y, x + w, y + 15);
      c.lineTo(x + w - 2, y + h);
      c.closePath();
      c.fill();
      c.stroke();
      circle(c, x + 31, y + 9, 3.5, "#6f6c8c");
      circle(c, x + 9, y + 27, 2.5, "#6f6c8c");
      circle(c, x + 33, y + 27, 2, "#6f6c8c");
      grumpy(c, x + 19, y + 16, 4, 2.4);
    },
    crater: function (c, x, y, w, h) {
      c.fillStyle = "#7d7a9e";
      c.beginPath();
      c.ellipse(x + w / 2, y + h, w / 2, 9, 0, Math.PI, 0);
      c.fill();
      c.fillStyle = "#2a2650";
      c.beginPath();
      c.ellipse(x + w / 2, y + h + 1, w / 2 - 9, 6, 0, 0, Math.PI * 2);
      c.fill();
    },
    alien: function (c, x, y, w, h, t) {
      var bob = Math.sin((t.spin || 0) / 10) * 2;
      fillRR(c, x + 10, y + 40, 7, 12, 3, "#4cc94c", "#23214a", 2);
      fillRR(c, x + 23, y + 40, 7, 12, 3, "#4cc94c", "#23214a", 2);
      fillRR(c, x + 6, y + 20 + bob, 28, 24, 11, "#7be07b", "#23214a", 2);
      c.strokeStyle = "#23214a";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x + 20, y + 4 + bob);
      c.lineTo(x + 20, y - 4 + bob);
      c.stroke();
      circle(c, x + 20, y - 6 + bob, 3.5, "#ff5ad1", "#23214a", 1.5);
      circle(c, x + 20, y + 15 + bob, 13, "#7be07b", "#23214a", 2);
      grumpy(c, x + 20, y + 14 + bob, 5, 3.4);
      c.strokeStyle = "#23214a";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(x + 20, y + 25 + bob, 3, 1.15 * Math.PI, 1.85 * Math.PI);
      c.stroke();
    },
    // v3 (idea 8): el examen volador, un avión de papel.
    avion: function (c, x, y, w, h) {
      c.strokeStyle = "rgba(255,255,255,0.75)";
      c.lineWidth = 2;
      c.lineCap = "round";
      for (var i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(x + w + 6, y + 4 + i * 5);
        c.lineTo(x + w + 18 + i * 3, y + 4 + i * 5);
        c.stroke();
      }
      c.fillStyle = "#fff";
      c.strokeStyle = "#23214a";
      c.lineJoin = "round";
      c.beginPath();
      c.moveTo(x, y + 9);
      c.lineTo(x + w, y);
      c.lineTo(x + w - 12, y + 9);
      c.lineTo(x + w, y + h);
      c.closePath();
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(x + 2, y + 9);
      c.lineTo(x + w - 12, y + 9);
      c.stroke();
      c.fillStyle = "#ff4f4f";
      c.font = "bold 10px " + FONT;
      c.textAlign = "center";
      c.fillText("?", x + w - 20, y + 8);
    },
    pacaMini: function (c, x, y, w, h, t) {
      DRAW.paca(c, x, y, w, h, t);
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
    // v2: vidas y rayos en una sola pastilla (v3: con 5 vidas en el modo tortuga).
    var sep = 24 + g.maxLives * 27;
    pill(ctx, 10, 10, sep + 53, 30);
    for (var i = 0; i < g.maxLives; i++) heart(ctx, 29 + i * 27, 26, i < g.lives);
    ctx.fillStyle = "rgba(35,33,74,0.15)";
    ctx.fillRect(sep, 17, 2, 16);
    drawBolt(ctx, sep + 19, 25, 0);
    ctx.fillStyle = "#23214a";
    ctx.font = "900 16px " + FONT;
    ctx.textAlign = "left";
    ctx.fillText(String(g.bolts), sep + 33, 31);

    // v2: el camino y los metros en la misma pastilla (antes, los metros iban
    // debajo y chocaban con los carteles).
    var bx = 250;
    var bw = 220;
    pill(ctx, bx - 14, 10, bw + 112, 30);
    var k = Math.min(1, g.dist / PX_PER_M / FINAL_M);
    fillRR(ctx, bx, 21, bw, 8, 4, "rgba(35,33,74,0.15)");
    fillRR(ctx, bx, 21, Math.max(8, bw * k), 8, 4, "#22d47b");
    circle(ctx, bx + bw * k, 25, 7, "#ffd84d", "#23214a", 2);
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🚜", bx + bw + 4, 30);
    ctx.fillStyle = "#23214a";
    ctx.font = "900 15px " + FONT;
    ctx.textAlign = "right";
    ctx.fillText(meters() + " m", bx + bw + 88, 31);
    ctx.textAlign = "center";

    pill(ctx, W - 136, 10, 126, 28);
    ctx.fillStyle = "#23214a";
    ctx.font = "800 13px " + FONT;
    ctx.textAlign = "center";
    var tag = g.mode === "demo" ? "DEMO" : g.who ? (g.who === 1 ? "🔘 Jugador 1" : "👏 Jugador 2") : (g.turtle ? "🐢 " : "") + "Récord " + record + " m";
    ctx.fillText(tag, W - 73, 29);

    // Los poderes que hay ahora, con lo que les queda.
    var px = 10;
    [
      ["escudo", g.shield ? 1 : 0, 1],
      ["cohete", g.rocket, g.boss ? 14 : 8],
      ["reloj", g.slow, 6],
    ].forEach(function (pw) {
      if (pw[1] <= 0) return;
      // v2: el tiempo que le queda, en un anillo alrededor (antes, una rayita).
      var left = pw[0] === "escudo" ? 1 : Math.min(1, pw[1] / pw[2]);
      circle(ctx, px + 20, 66, 21, "rgba(255,255,255,0.82)");
      drawPower(ctx, px + 20, 66, pw[0], 0);
      ctx.beginPath();
      ctx.arc(px + 20, 66, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.strokeStyle = POWERS[pw[0]].dark;
      ctx.stroke();
      px += 50;
    });

    // v3 (idea 4): las tres fases del final, cada una con su cartel.
    if (g.boss && g.boss.step) {
      ctx.font = "900 12px " + FONT;
      ctx.textAlign = "right";
      PHASES.forEach(function (name, i) {
        var n = i + 1;
        var done = n < g.boss.step;
        var on = n === g.boss.step;
        var txt = n + " · " + name + (done ? " ✓" : "");
        var tw = ctx.measureText(txt).width + 24;
        var y = 50 + i * 28;
        fillRR(ctx, W - 10 - tw, y, tw, 22, 11, on ? "#f97316" : "rgba(255,255,255,0.9)", on ? "#c2410c" : "rgba(35,33,74,0.15)", 2);
        ctx.fillStyle = on ? "#fff" : done ? "#23214a" : "#625f8a";
        ctx.fillText(txt, W - 22, y + 15);
      });
      ctx.textAlign = "center";
    }
    // v3 (idea 1): con dos jugadores, quien acaba se queda con su cartel.
    if (duo && (g.mode === "over" || g.mode === "win")) {
      fillRR(ctx, W / 2 - 160, 112, 320, 58, 20, "rgba(255,255,255,0.95)", "rgba(35,33,74,0.2)", 3);
      ctx.fillStyle = "#23214a";
      ctx.font = "900 22px " + FONT;
      ctx.textAlign = "center";
      ctx.fillText((g.mode === "win" ? "🏆 ¡Cosechadora! · " : "💥 ¡Fuera! · ") + meters() + " m", W / 2, 149);
    }

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
    ctx.setTransform(view.ratio, 0, 0, view.ratio, 0, 0);
    ctx.fillStyle = "#17123a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!duo) return renderWorld(0, false);
    // v3 (idea 1): dos mundos, uno encima del otro, con una raya en medio.
    var keep = g;
    duo.players.forEach(function (pg, i) {
      g = pg;
      renderWorld(i * H, true);
    });
    g = keep;
    ctx.setTransform(view.ratio * view.scale, 0, 0, view.ratio * view.scale, view.ratio * view.ox, view.ratio * view.oy);
    ctx.fillStyle = "#23214a";
    ctx.fillRect(0, H - 2, W, 4);
  }

  function renderWorld(top, boxed) {
    var dl = daylight();
    var shakeX = g.shake > 0 ? (Math.random() - 0.5) * 12 * g.shake * 3 : 0;
    var shakeY = g.shake > 0 ? (Math.random() - 0.5) * 8 * g.shake * 3 : 0;
    ctx.setTransform(view.ratio * view.scale, 0, 0, view.ratio * view.scale, view.ratio * (view.ox + shakeX), view.ratio * (view.oy + top * view.scale + shakeY));
    ctx.save();
    ctx.beginPath();
    if (boxed) ctx.rect(0, 0, W, H);
    else ctx.rect(0, -1000, W, H + 2000);
    ctx.clip();

    drawSky(dl);
    drawHills(dl);
    drawGround(dl);
    if (g.boss && !g.boss.machine) {
      // v3 (idea 4): la Cosechadora asoma por la derecha mientras tira pacas.
      var b = g.boss;
      var bx = W + 30 - 100 * b.peek + 170 * b.out + Math.sin(g.t * 3) * 3;
      DRAW.cosechadora(ctx, bx, GY - 140, 200, 140, { spin: g.dist });
    }
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
    if (!blink) drawChispa(ctx, PLAYER_X, p.y, p, { rocket: g.rocket > 0, shield: g.shield, hurt: p.hurt > 0, body: g.body });
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
    var hv = duo ? H * 2 : H;
    var scale = Math.min(box.width / W, box.height / hv);
    view = { scale: scale, ox: (box.width - W * scale) / 2, oy: (box.height - hv * scale) / 2, ratio: ratio };
    // v3: los carteles se acomodan a lo que mide el juego.
    var frameEl = Lab.$("#frame");
    if (frameEl) frameEl.setAttribute("data-size", box.height < 270 ? "s" : box.height < 360 ? "m" : "l");
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

  // v3: antes se llamaba STARS, como las estrellas del cielo, y la noche se quedaba sin estrellas.
  var WIN_STARS = [10, 25];
  var mandos = Lab.store.get("juego.mandos", { boton: true, palmada: false, mano: false });

  // v2: en el cartel de inicio se ve con qué mandos se puede saltar (v3: y con dos jugadores, quién usa cuál).
  function paintStartMandos() {
    var box = Lab.$("#start-mandos");
    if (!box) return;
    if (players === 2) {
      box.innerHTML = '<span class="on">J1 · 🔘 botón · tecla A · tocar arriba</span><span class="on">J2 · 👏 palmada · tecla L · tocar abajo</span>';
      return;
    }
    box.innerHTML =
      '<span class="on">👆 Tocar</span>' +
      [["boton", "🔘 Botón"], ["palmada", "👏 Palmada"], ["mano", "👋 Mano"]]
        .map(function (m) {
          return '<span class="' + (mandos[m[0]] ? "on" : "") + '">' + m[1] + "</span>";
        })
        .join("");
  }

  // v2: la señal que llega de la placa, en directo, con la raya que hay que pasar.
  function paintSignal(s) {
    var red = Lab.state && Lab.state.settings ? Lab.state.settings.soundRed : 70;
    var level = Math.max(0, Math.min(100, s.level || 0));
    Lab.$("#sig-sound").style.width = level + "%";
    Lab.$("#sig-sound-mark").style.left = red + "%";
    Lab.$("#sig-sound-out").textContent = level;
    var cm = s.cm;
    var near = cm >= 0 && cm < HAND_CM;
    Lab.$("#sig-hand").style.width = cm >= 0 ? Math.max(4, 100 - (Math.min(cm, 60) / 60) * 100) + "%" : "0%";
    Lab.$("#sig-hand").classList.toggle("hot", near);
    Lab.$("#sig-hand").classList.toggle("duck", cm >= HAND_CM && cm < DUCK_CM);
    Lab.$("#sig-sound").classList.toggle("hot", level >= red);
    Lab.$("#sig-hand-out").textContent = cm >= 0 ? cm + " cm" : "—";
  }
  var boardChain = Promise.resolve();

  function boardEvent(event) {
    // v2: si corre un programa de bloques, las luces son suyas.
    if (!Lab.online || g.mode === "demo" || programaActivo) return;
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
        // v3 (idea 8): a media distancia, Chispa se agacha mientras la mano siga ahí.
        duckHand = s.cm >= HAND_CM && s.cm < DUCK_CM;
        if (lastInput) {
          if (s.button !== lastInput.button) press("boton");
          if (s.claps !== lastInput.claps) press("palmada");
          if (near && !lastInput.near) press("mano");
        }
        lastInput = { button: s.button, claps: s.claps, near: near };
        paintSignal(s);
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
    // v3 (idea 1): con dos jugadores, el botón es del 1 y la palmada del 2.
    if (duo && !duo.finished) {
      var i = source === "boton" || source === "j1" ? 0 : source === "palmada" || source === "j2" ? 1 : -1;
      if (i < 0) return;
      flashLive(i ? "👏 ¡Jugador 2!" : "🔘 ¡Jugador 1!");
      var keep = g;
      g = duo.players[i];
      if (g.mode === "play") jump();
      g = keep;
      return;
    }
    if (source === "j1" || source === "j2") source = "pantalla";
    if (source !== "pantalla" && !mandos[source] && !(duo && (source === "boton" || source === "palmada"))) return;
    flashLive(NAMES[source]);
    if (g.mode === "play") return jump();
    // v3: mientras se escribe el alias de los récords, ningún mando empieza otra.
    if (g.pendingAlias) return;
    // En las pantallas de inicio y de fin, saltar es empezar (con un respiro
    // al acabar, para no empezar otra sin querer).
    if (Date.now() - screenAt > 900) start();
  }

  function flashLive(text) {
    var live = Lab.$("#mando-live");
    live.textContent = text;
    live.classList.add("hit");
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () {
      live.classList.remove("hit");
    }, 400);
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
    overlay.classList.toggle("is-start", name === "start");
    Lab.$("#start-corners").hidden = name !== "start";
    Lab.$$(".overlay-box").forEach(function (box) {
      box.hidden = box.id !== "screen-" + name;
    });
    if (name === "over") {
      var k = KINDS[g.killer] || KINDS.cactus;
      // v2: «te han pillado los deberes» (antes, «te ha pillado los deberes»).
      Lab.$("#over-title").textContent = "¡Te " + (k.plural ? "han" : "ha") + " pillado " + k.name + "!";
      Lab.$("#over-sprite").setAttribute("data-sprite", KINDS[g.killer] ? g.killer : "cactus");
      drawCast();
      Lab.$("#over-score").innerHTML =
        "<span>📏 " + meters() + " m</span><span>⚡ " + g.bolts + " rayos</span><span>⤴ " + g.jumps + " saltos</span>";
      var left = Math.max(0, FINAL_M - meters());
      Lab.$("#over-road").style.width = Math.min(100, (meters() / FINAL_M) * 100) + "%";
      Lab.$("#over-road-text").innerHTML = left > 0 ? "Te faltaban <b>" + left + " m</b> para la Súper Cosechadora 🚜" : "¡Estabas ante la Súper Cosechadora! 🚜";
      Lab.$("#over-record").textContent = g.newRecord ? "🏆 ¡Récord nuevo!" : "Récord: " + record + " m";
      paintNews("#over-news");
      paintSide(Lab.$("#screen-over .ov-side"));
      Lab.$("#over-again").focus({ preventScroll: true });
    }
    if (name === "win") {
      Lab.$("#win-score").innerHTML =
        "<span>📏 " + meters() + " m</span><span>⚡ " + g.bolts + " rayos</span><span>⏱ " + Math.round(g.t) + " s</span>";
      // v2: estrellas según los rayos (los umbrales son una propuesta).
      var stars = g.bolts >= WIN_STARS[1] ? 3 : g.bolts >= WIN_STARS[0] ? 2 : 1;
      Lab.$("#win-stars").innerHTML = [1, 2, 3].map(function (n) {
        return '<span class="' + (n <= stars ? "" : "off") + '">⭐</span>';
      }).join("");
      Lab.$("#win-next").textContent = stars < 3 ? "La siguiente estrella, con " + WIN_STARS[stars - 1] + " rayos. ¿Te atreves?" : "¡Las tres estrellas! Eres una chispa de verdad.";
      // v3 (idea 3): y desde aquí, al mundo siguiente.
      var next = WORLD_ORDER[WORLD_ORDER.indexOf(g.world) + 1];
      var nextBtn = Lab.$("#win-world");
      nextBtn.hidden = !next;
      nextBtn.setAttribute("data-world", next || "");
      if (next) nextBtn.innerHTML = '<span class="ico">' + WORLDS[next].emoji + "</span>Ir a " + WORLDS[next].name;
      paintNews("#win-news");
      paintSide(Lab.$("#screen-win .ov-side"));
      Lab.confetti();
      Lab.$("#win-again").focus({ preventScroll: true });
    }
    if (name === "duo") paintDuo();
    if (name === "start") {
      paintStart();
      Lab.$("#start-btn").focus({ preventScroll: true });
    }
  }

  function start() {
    if (!worldOpen(world)) return menu();
    if (players === 2) return startDuo();
    leaveDuo();
    g = newGame("play");
    showScreen(null);
    boardEvent("start");
    banner(g.turtle ? "🐢 Modo tortuga: 5 vidas" : "¡Corre, Chispa! ⚡", 1.8);
    sfx("power");
  }

  // ---------- Bucle ----------

  var lastFrame = 0;
  var paused = false;

  function frame(now) {
    var dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    if (!paused) advance(dt * testSpeed);
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
        if (kind === "avion") c.translate(0, -24);
        if (kind === "crater") {
          c.fillStyle = "#a6a4bb";
          c.fillRect(-6, k.h, k.w + 12, 14);
        }
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
        drawChispa(c, 0, 0, { fly: 0, ground: true, run: 0, squash: 0 }, { body: cv.getAttribute("data-body") || null });
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
      if (!duo) return press("pantalla");
      // v3: con dos jugadores, tocar arriba salta el 1 y abajo el 2.
      var r = canvas.getBoundingClientRect();
      press((e.clientY - r.top - view.oy) / view.scale < H ? "j1" : "j2");
    });
    // Tocar fuera del cartel (en el juego que se ve detrás) también empieza.
    Lab.$("#overlay").addEventListener("pointerdown", function (e) {
      if (e.target.id === "overlay") press("pantalla");
    });
    var jumpBtn = Lab.$("#jump-btn");
    jumpBtn.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      press(duo ? "j1" : "pantalla");
    });
    // Con el teclado no hay pointerdown: llega el clic (detail 0).
    jumpBtn.addEventListener("click", function (e) {
      if (e.detail === 0) press(duo ? "j1" : "pantalla");
    });
    // v3: con dos jugadores, el 1 salta con A (y se agacha con S) y el 2 con L o ↑
    // (y se agacha con K o ↓). Jugando solo, ↓ y S agachan.
    var DUO_KEYS = { a: "j1", w: "j1", l: "j2", arrowup: "j2" };
    function duckKey(low) {
      if (low === "arrowdown") return duo && !duo.finished ? 1 : 0;
      if (low === "s") return 0;
      if (low === "k") return duo && !duo.finished ? 1 : -1;
      return -1;
    }
    document.addEventListener("keydown", function (e) {
      var key = e.key;
      var low = (key || "").toLowerCase();
      var tag = (e.target && e.target.tagName) || "";
      // v2: escribiendo en los huecos de los bloques (v3: o el alias) no se salta.
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      var who = duckKey(low);
      if (who >= 0) {
        e.preventDefault();
        duckHeld[who] = true;
        return;
      }
      if (duo && !duo.finished && DUO_KEYS[low]) {
        e.preventDefault();
        if (!e.repeat) press(DUO_KEYS[low]);
        return;
      }
      if (key !== " " && key !== "ArrowUp" && key !== "Enter") return;
      // En un botón, Enter y espacio son del botón (encender un mando, empezar).
      if (tag === "BUTTON" && key !== "ArrowUp") return;
      e.preventDefault();
      if (!e.repeat) press("pantalla");
    });
    document.addEventListener("keyup", function (e) {
      var who = duckKey((e.key || "").toLowerCase());
      if (who >= 0) duckHeld[who] = false;
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
        paintStartMandos();
      });
      paint();
    });
    paintStartMandos();
    mountProgram();
    setupV3();
  });

  // ---------- v2: 🧩 Programar el juego con bloques ----------

  var GAME_EVENTS = [
    ["jump", "salte"],
    ["hit", "choque"],
    ["bolt", "coja un rayo"],
    ["power", "coja un poder"],
    ["over", "pierda"],
    ["win", "gane"],
    ["duck", "se agache"],
    ["phase", "pase de fase"],
  ];
  var GAME_POWERS = [
    ["cohete", "🚀 el cohete"],
    ["escudo", "🛡️ el escudo"],
    ["reloj", "⏱️ la cámara lenta"],
  ];

  function hasPower(power) {
    if (power === "escudo") return !!g.shield;
    if (power === "cohete") return g.rocket > 0;
    return g.slow > 0;
  }

  function mountProgram() {
    if (!window.Bloques || !Lab.$("#editor")) return;
    var B = Bloques.BLOCKS;
    B.wait_game = {
      cat: "sensores",
      parts: ["esperar a que Chispa", { name: "ev", type: "select", options: GAME_EVENTS, def: "jump" }],
      run: async function (p, r) {
        var start = EV[p.ev];
        while (EV[p.ev] === start) await r.wait(40);
      },
    };
    B.if_power = {
      cat: "sensores",
      c: true,
      parts: ["si Chispa tiene", { name: "power", type: "select", options: GAME_POWERS, def: "cohete" }],
      run: function (p, r, node) {
        return hasPower(p.power) ? r.runList(node.body) : null;
      },
    };
    // v3 (idea 7): «⚡ cuando Chispa…», un sombrero que se pone en marcha solo
    // cada vez que pasa algo. Puede haber varios a la vez.
    B.when_game = {
      cat: "eventos",
      c: true,
      hat: true,
      parts: ["⚡ cuando Chispa", { name: "ev", type: "select", options: GAME_EVENTS, def: "hit" }],
      run: async function (p, r, node) {
        for (var n = 1; ; n++) {
          var start = EV[p.ev];
          while (EV[p.ev] === start) await r.wait(40);
          r.setLap(node, n === 1 ? "1 vez" : n + " veces");
          await r.runList(node.body);
        }
      },
    };
    Bloques.mount(Lab.$("#editor"), {
      key: "juego",
      blocks: ["light_on", "light_off", "lights_off", "beep", "note", "wait", "repeat", "forever", "wait_game", "if_power", "when_game"],
      example: [
        {
          type: "when_game",
          params: { ev: "jump" },
          body: [
            { type: "light_on", params: { color: "green" } },
            { type: "wait", params: { secs: 0.3 } },
            { type: "light_off", params: { color: "green" } },
          ],
        },
        {
          type: "when_game",
          params: { ev: "hit" },
          body: [
            { type: "light_on", params: { color: "red" } },
            { type: "note", params: { note: "do", secs: 0.3 } },
            { type: "light_off", params: { color: "red" } },
          ],
        },
      ],
      exampleText: "Dos «cuando» a la vez: verde en cada salto, y rojo con su nota en cada choque. ¿Y si suena otra nota con cada rayo?",
      onStart: function () {
        programaActivo = true;
      },
      onStop: function () {
        programaActivo = false;
      },
    });
    if (window.Esquema && Lab.$("#wiring")) {
      Esquema.draw(Lab.$("#wiring"), {
        show: ["leds", "mic", "sonar"],
        dim: ["buzzer"],
        focusX: 560,
        label: "Los mandos del juego: el micrófono en A0 y el sensor en D1 y D2; las luces, como en el semáforo",
      });
    }
  }

  // Para mirar desde fuera (y para las pruebas, con ?prueba=1, unos trucos).
  window.Juego = {
    // v3: para probar los mundos 2 y 3 y todas las Chispas sin ganar antes.
    abrirTodo: function () {
      openAll = true;
      Lab.store.set("juego.abierto", true);
      paintSkins();
      paintStart();
    },
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
        events: JSON.parse(JSON.stringify(EV)),
        program: programaActivo,
        world: g.world,
        turtle: g.turtle,
        duck: g.player.duck,
        step: g.boss ? g.boss.step : 0,
        duo: duo
          ? duo.players.map(function (pg) {
              return { mode: pg.mode, meters: metersOf(pg), lives: pg.lives };
            })
          : null,
        stickers: Object.keys(stickers),
        bank: bank,
        things: g.things.map(function (t) {
          return t.kind;
        }),
      };
    },
  };
  if (TESTING) {
    window.Juego.prueba = {
      actualiza: function (dt, n) {
        for (var i = 0; i < (n || 1); i++) advance(dt);
      },
      dibuja: function () {
        render();
      },
      nube: function () {
        g.cloud = { x: W + 90, y: 48, drops: 3, dropT: 0.8, t: 0 };
      },
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
