/* Laboratorio de inventos: lo que comparten todas las páginas.
   Habla con la placa, pinta a Chispa (la mascota), cambia de pestaña,
   guarda los retos y celebra con confeti.
   JavaScript sencillo a propósito: tiene que ir también en tabletas viejas. */
(function () {
  "use strict";

  var listeners = [];
  var failures = 0;
  var pollEvery = 400;
  var polling = false;

  // ---------- Pequeñas ayudas ----------

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function toQuery(params) {
    return Object.keys(params || {})
      .map(function (key) {
        return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
      })
      .join("&");
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error("La placa tarda demasiado en contestar"));
        }, ms);
      }),
    ]);
  }

  // localStorage puede no existir (ventana privada, portal cautivo): sin él,
  // la web funciona igual, sólo que no recuerda.
  var store = {
    get: function (key, fallback) {
      try {
        var raw = window.localStorage.getItem("lab." + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        window.localStorage.setItem("lab." + key, JSON.stringify(value));
      } catch (e) {
        /* sin memoria: no pasa nada */
      }
    },
  };

  // ---------- Hablar con la placa ----------

  // Todas las órdenes contestan con el estado entero de la placa.
  function api(path, params) {
    var url = "/api/" + path;
    var q = toQuery(params);
    if (q) url += "?" + q;
    return withTimeout(fetch(url, { cache: "no-store" }), 4000).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) throw new Error(body.error || "Error " + res.status);
        if (body && body.mode) setState(body);
        return body;
      });
    });
  }

  function setState(state) {
    Lab.state = state;
    setOnline(true);
    listeners.forEach(function (fn) {
      fn(state);
    });
  }

  function onState(fn) {
    listeners.push(fn);
    if (Lab.state) fn(Lab.state);
  }

  function setOnline(online) {
    if (Lab.online === online) return;
    Lab.online = online;
    document.body.classList.toggle("is-offline", !online);
    $$("[data-conn]").forEach(function (el) {
      el.classList.toggle("online", online);
      el.classList.toggle("offline", !online);
      el.textContent = online ? "Conectado" : "Sin conexión";
    });
  }

  function poll(everyMs) {
    if (everyMs) pollEvery = everyMs;
    if (polling) return;
    polling = true;
    (function loop() {
      api("state")
        .then(function () {
          failures = 0;
        })
        .catch(function () {
          failures += 1;
          if (failures >= 2) setOnline(false);
        })
        .then(function () {
          // Con la pestaña escondida, preguntamos poco: la placa lo agradece.
          setTimeout(loop, document.hidden ? 2000 : pollEvery);
        });
    })();
  }

  // ---------- Chispa, la mascota ----------

  var MOUTHS = {
    happy: '<path d="M49 79q11 10 22 0" stroke="#23214a" stroke-width="5" stroke-linecap="round" fill="none"/>',
    wow: '<ellipse cx="60" cy="82" rx="7" ry="9" fill="#23214a"/><ellipse cx="60" cy="85" rx="4" ry="4" fill="#ff7a7a"/>',
    scared:
      '<path d="M46 84q4-6 7 0t7 0t7 0t7 0" stroke="#23214a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  };

  function chispaSvg(mood) {
    var mouth = MOUTHS[mood] || MOUTHS.happy;
    var brows =
      mood === "scared"
        ? '<path d="M40 50l13-5M80 50l-13-5" stroke="#23214a" stroke-width="4" stroke-linecap="round"/>'
        : "";
    var eyeH = mood === "happy" ? 7 : 9;
    return (
      '<svg viewBox="0 0 120 140" aria-hidden="true">' +
      '<g class="rays" stroke="#ffb400" stroke-width="6" stroke-linecap="round">' +
      '<path d="M60 4v12M17 22l9 9M103 22l-9 9M3 60h12M117 60h-12"/></g>' +
      '<path d="M60 22c-22 0-38 16-38 37 0 13 6 22 13 29 5 5 7 9 7 14v6h36v-6c0-5 2-9 7-14 7-7 13-16 13-29 0-21-16-37-38-37z" ' +
      'fill="#ffd84d" stroke="#23214a" stroke-width="5" stroke-linejoin="round"/>' +
      '<path d="M37 53c2-9 9-16 18-18" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".85"/>' +
      brows +
      '<ellipse cx="48" cy="63" rx="5.5" ry="' + eyeH + '" fill="#23214a"/>' +
      '<ellipse cx="72" cy="63" rx="5.5" ry="' + eyeH + '" fill="#23214a"/>' +
      '<circle cx="50" cy="60" r="2.2" fill="#fff"/><circle cx="74" cy="60" r="2.2" fill="#fff"/>' +
      '<ellipse cx="38" cy="77" rx="6" ry="4" fill="#ff9b9b" opacity=".75"/>' +
      '<ellipse cx="82" cy="77" rx="6" ry="4" fill="#ff9b9b" opacity=".75"/>' +
      mouth +
      '<rect x="42" y="108" width="36" height="9" rx="4" fill="#a7b0c2" stroke="#23214a" stroke-width="5"/>' +
      '<rect x="45" y="117" width="30" height="9" rx="4" fill="#a7b0c2" stroke="#23214a" stroke-width="5"/>' +
      '<path d="M52 126h16l-3 8h-10z" fill="#23214a"/></svg>'
    );
  }

  function drawChispas() {
    $$(".chispa").forEach(function (el) {
      el.innerHTML = chispaSvg(el.getAttribute("data-mood"));
    });
  }

  // Chispa dice algo: cambia el bocadillo (y su cara, si se pide).
  function say(text, mood) {
    $$("[data-say]").forEach(function (el) {
      el.textContent = text;
    });
    if (mood) {
      $$(".helper .chispa").forEach(function (el) {
        if (el.getAttribute("data-mood") !== mood) {
          el.setAttribute("data-mood", mood);
          el.innerHTML = chispaSvg(mood);
        }
      });
    }
  }

  // ---------- Pestañas (Jugar / Programar / Montar) ----------

  function setupTabs() {
    var tabs = $$("[role=tab]");
    if (!tabs.length) return;
    var names = tabs.map(function (t) {
      return t.getAttribute("data-tab");
    });

    function show(name) {
      tabs.forEach(function (tab) {
        var on = tab.getAttribute("data-tab") === name;
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;
        $("#panel-" + tab.getAttribute("data-tab")).hidden = !on;
      });
      if (history.replaceState) history.replaceState(null, "", "#" + name);
      document.dispatchEvent(new CustomEvent("lab:tab", { detail: name }));
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        show(tab.getAttribute("data-tab"));
      });
      tab.addEventListener("keydown", function (e) {
        var step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!step) return;
        var next = tabs[(i + step + tabs.length) % tabs.length];
        next.focus();
        show(next.getAttribute("data-tab"));
      });
    });

    var wanted = location.hash.slice(1);
    show(names.indexOf(wanted) >= 0 ? wanted : names[0]);
  }

  // ---------- Celebrar ----------

  var toastTimer = null;

  function toast(text, ms) {
    var el = $(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = text;
    // Un fotograma de espera: si no, la animación de entrada no se ve.
    requestAnimationFrame(function () {
      el.classList.add("show");
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("show");
    }, ms || 2600);
  }

  function confetti() {
    var pieces = ["🎉", "⭐", "✨", "🎊", "💛", "🌟"];
    for (var i = 0; i < 22; i++) {
      var el = document.createElement("span");
      el.className = "confetti";
      el.textContent = pieces[i % pieces.length];
      el.style.left = Math.random() * 100 + "vw";
      el.style.animationDelay = Math.random() * 0.5 + "s";
      document.body.appendChild(el);
      setTimeout(el.remove.bind(el), 2400);
    }
  }

  // ---------- Retos: se tachan y se recuerdan ----------

  function setupChallenges() {
    $$(".challenges[data-key]").forEach(function (list) {
      var key = "retos." + list.getAttribute("data-key");
      var done = store.get(key, {});
      var buttons = $$(".challenge", list);
      var counter = $("[data-challenge-count='" + list.getAttribute("data-key") + "']");

      function paint() {
        var count = 0;
        buttons.forEach(function (btn) {
          var isDone = !!done[btn.getAttribute("data-id")];
          if (isDone) count++;
          btn.classList.toggle("done", isDone);
          btn.setAttribute("aria-pressed", isDone ? "true" : "false");
          $(".check", btn).textContent = isDone ? "✓" : "";
        });
        if (counter) counter.textContent = "⭐ " + count + " de " + buttons.length;
      }

      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-id");
          done[id] = !done[id];
          store.set(key, done);
          paint();
          if (done[id]) {
            confetti();
            toast("¡Reto conseguido! 🏆");
          }
        });
      });
      paint();
    });
  }

  // ---------- El pie: cómo se llama la placa ----------

  function paintBoard(state) {
    $$("[data-board-name]").forEach(function (el) {
      el.textContent = state.board.name;
    });
    $$("[data-board-address]").forEach(function (el) {
      el.textContent = state.board.address;
    });
    $$("[data-version]").forEach(function (el) {
      el.textContent = state.board.version;
    });
  }

  var Lab = {
    state: null,
    online: null,
    api: api,
    poll: poll,
    onState: onState,
    say: say,
    toast: toast,
    confetti: confetti,
    sleep: sleep,
    store: store,
    $: $,
    $$: $$,
  };
  window.Lab = Lab;

  document.addEventListener("DOMContentLoaded", function () {
    drawChispas();
    setupTabs();
    setupChallenges();
    onState(paintBoard);
  });
})();
