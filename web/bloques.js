/* 🧩 El editor de bloques: programar la placa como en Scratch.
   Se tocan o se arrastran bloques para hacer una secuencia; «▶ ¡Ejecutar!» la
   recorre paso a paso, mandando cada orden a la placa e iluminando el bloque
   que va ejecutando. El programa es una lista de bloques en JSON y se guarda
   en el navegador.

   Cada página elige qué bloques salen (Bloques.mount) y qué hace al empezar y
   al terminar (por ejemplo, devolver las luces al sonómetro). */
(function () {
  "use strict";

  var COLORS = [
    ["red", "🔴 rojo"],
    ["yellow", "🟡 amarillo"],
    ["green", "🟢 verde"],
  ];
  var NOTES = [
    ["do", "do", 523],
    ["re", "re", 587],
    ["mi", "mi", 659],
    ["fa", "fa", 698],
    ["sol", "sol", 784],
    ["la", "la", 880],
    ["si", "si", 988],
    ["do2", "do agudo", 1047],
  ];
  var CMP = [
    ["gt", "mayor"],
    ["lt", "menor"],
  ];
  var CATS = {
    luces: "💡 Luces",
    sonido: "🔊 Sonido",
    control: "🔁 Control",
    sensores: "📡 Sensores",
    eventos: "⚡ Eventos",
  };
  var STOP = { stop: true };

  function sel(name, options, def) {
    return { name: name, type: "select", options: options, def: def };
  }

  function num(name, def, min, max, step) {
    return { name: name, type: "number", def: def, min: min, max: max, step: step };
  }

  function noteHz(note) {
    for (var i = 0; i < NOTES.length; i++) if (NOTES[i][0] === note) return NOTES[i][2];
    return 523;
  }

  function compare(cmp, value, limit) {
    return cmp === "lt" ? value < limit : value > limit;
  }

  function ghostCloserThan(state, cm) {
    return state.ghost.cm >= 0 && state.ghost.cm < cm;
  }

  // Todos los bloques que existen. «run» recibe los valores del bloque (p),
  // el ejecutor (r) y el propio bloque (para los que tienen bloques dentro).
  var BLOCKS = {
    light_on: {
      cat: "luces",
      parts: ["encender", sel("color", COLORS, "red")],
      run: function (p, r) {
        return r.light(p.color, true);
      },
    },
    light_off: {
      cat: "luces",
      parts: ["apagar", sel("color", COLORS, "red")],
      run: function (p, r) {
        return r.light(p.color, false);
      },
    },
    lights_off: {
      cat: "luces",
      parts: ["apagar todas"],
      run: function (p, r) {
        return r.light("all", false);
      },
    },
    beep: {
      cat: "sonido",
      parts: ["pitar", num("secs", 0.2, 0.05, 5, 0.05), "segundos"],
      run: function (p, r) {
        return r.beep(1000, p.secs);
      },
    },
    note: {
      cat: "sonido",
      parts: ["tocar", sel("note", NOTES, "do"), "durante", num("secs", 0.5, 0.05, 5, 0.05), "s"],
      run: function (p, r) {
        return r.beep(noteHz(p.note), p.secs);
      },
    },
    wait: {
      cat: "control",
      parts: ["esperar", num("secs", 1, 0.1, 60, 0.1), "segundos"],
      run: function (p, r) {
        return r.wait(p.secs * 1000);
      },
    },
    repeat: {
      cat: "control",
      c: true,
      parts: ["repetir", num("times", 3, 1, 100, 1), "veces"],
      run: async function (p, r, node) {
        // p.times se lee en cada vuelta: si se cambia el número mientras va, vale.
        for (var i = 1; i <= p.times; i++) {
          r.setLap(node, i + " de " + p.times);
          await r.runList(node.body);
          await r.breathe();
        }
        r.setLap(node, "");
      },
    },
    forever: {
      cat: "control",
      c: true,
      cap: true,
      parts: ["por siempre"],
      run: async function (p, r, node) {
        // Sólo se sale con «Parar»: entonces la espera de dentro lanza STOP.
        for (var lap = 1; ; lap++) {
          r.setLap(node, "vuelta " + lap);
          await r.runList(node.body);
          await r.breathe();
        }
      },
    },
    wait_button: {
      cat: "sensores",
      parts: ["esperar a que pulsen el botón 🔘"],
      run: function (p, r) {
        var start = r.state().button;
        return r.waitUntil(function (s) {
          return s.button !== start;
        });
      },
    },
    wait_sound: {
      cat: "sensores",
      parts: ["esperar a que el ruido sea", sel("cmp", CMP, "gt"), "que", num("value", 60, 0, 100, 1)],
      run: function (p, r) {
        return r.waitUntil(function (s) {
          return compare(p.cmp, s.sound.level, p.value);
        });
      },
    },
    if_sound: {
      cat: "sensores",
      c: true,
      parts: ["si el ruido es", sel("cmp", CMP, "gt"), "que", num("value", 60, 0, 100, 1)],
      run: function (p, r, node) {
        return compare(p.cmp, r.state().sound.level, p.value) ? r.runList(node.body) : null;
      },
    },
    wait_ghost: {
      cat: "sensores",
      parts: ["esperar a que algo esté a menos de", num("cm", 30, 2, 400, 1), "cm"],
      run: function (p, r) {
        return r.waitUntil(function (s) {
          return ghostCloserThan(s, p.cm);
        });
      },
    },
    if_ghost: {
      cat: "sensores",
      c: true,
      parts: ["si algo está a menos de", num("cm", 30, 2, 400, 1), "cm"],
      run: function (p, r, node) {
        return ghostCloserThan(r.state(), p.cm) ? r.runList(node.body) : null;
      },
    },
  };

  // ---------- El programa (los datos) ----------

  var seq = 0;

  function newNode(type, params, body) {
    var def = BLOCKS[type];
    var node = { id: "b" + ++seq, type: type, params: {} };
    def.parts.forEach(function (part) {
      if (typeof part === "string") return;
      var given = params && params[part.name];
      node.params[part.name] = given === undefined ? part.def : given;
    });
    if (def.c) node.body = [];
    (body || []).forEach(function (child) {
      if (def.c && child && BLOCKS[child.type]) node.body.push(newNode(child.type, child.params, child.body));
    });
    return node;
  }

  // Lo guardado (o un ejemplo) se vuelve a construir: así se revisa que todo
  // existe y cada bloque recibe su número.
  function build(list) {
    return (list || [])
      .filter(function (item) {
        return item && BLOCKS[item.type];
      })
      .map(function (item) {
        return newNode(item.type, item.params, item.body);
      });
  }

  function plain(list) {
    return list.map(function (node) {
      var out = { type: node.type, params: node.params };
      if (node.body) out.body = plain(node.body);
      return out;
    });
  }

  function findNode(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return { list: list, index: i, node: list[i] };
      if (list[i].body) {
        var inner = findNode(list[i].body, id);
        if (inner) return inner;
      }
    }
    return null;
  }

  function clampParam(part, value) {
    var n = parseFloat(String(value).replace(",", "."));
    if (isNaN(n)) n = part.def;
    n = Math.min(part.max, Math.max(part.min, n));
    if (part.step >= 1) n = Math.round(n);
    return Math.round(n * 100) / 100;
  }

  // ---------- Pequeñas ayudas del DOM ----------

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function closest(node, selector) {
    while (node && node.nodeType === 1) {
      if (node.matches ? node.matches(selector) : node.msMatchesSelector(selector)) return node;
      node = node.parentNode;
    }
    return null;
  }

  // ---------- El editor ----------

  function Editor(container, options) {
    this.options = options;
    this.key = "programa." + options.key;
    this.program = build(Lab.store.get(this.key, []));
    this.target = "root";
    this.running = false;
    this.stopped = false;
    this.waiters = [];
    this.drag = null;
    this.elements = {};
    this.mountDom(container);
    this.render();
  }

  Editor.prototype.mountDom = function (container) {
    var self = this;
    container.innerHTML = "";
    container.classList.add("bk-editor");

    var palette = el("div", "bk-palette");
    palette.setAttribute("aria-label", "Bloques");
    var used = {};
    this.options.blocks.forEach(function (type) {
      used[BLOCKS[type].cat] = used[BLOCKS[type].cat] || [];
      used[BLOCKS[type].cat].push(type);
    });
    // En el móvil no caben todos: se ve una familia cada vez, con sus pestañas.
    var tabs = el("div", "bk-cats");
    var groups = [];
    Object.keys(CATS).forEach(function (cat) {
      if (!used[cat]) return;
      var group = el("div", "bk-cat cat-" + cat);
      group.appendChild(el("h3", "bk-cat-title", CATS[cat]));
      var list = el("div", "bk-list");
      used[cat].forEach(function (type) {
        list.appendChild(self.paletteBlock(type));
      });
      group.appendChild(list);
      palette.appendChild(group);
      var tab = el("button", "bk-cat-tab cat-" + cat, CATS[cat]);
      tab.type = "button";
      tab.addEventListener("click", function () {
        groups.forEach(function (g) {
          g.group.classList.toggle("active", g.group === group);
          g.tab.classList.toggle("active", g.tab === tab);
        });
      });
      tabs.appendChild(tab);
      groups.push({ group: group, tab: tab });
    });
    palette.insertBefore(tabs, palette.firstChild);
    groups[0].group.classList.add("active");
    groups[0].tab.classList.add("active");

    var workspace = el("div", "bk-workspace");
    var toolbar = el("div", "bk-toolbar row");
    this.runBtn = this.button(toolbar, "btn btn-go", "▶", "¡Ejecutar!", function () {
      self.run();
    });
    this.stopBtn = this.button(toolbar, "btn btn-stop", "■", "Parar", function () {
      self.stop();
    });
    this.button(toolbar, "btn btn-soft", "💡", "Ejemplo", function () {
      self.loadExample();
    });
    this.button(toolbar, "btn btn-soft", "🧹", "Borrar", function () {
      self.clear();
    });
    this.status = el("p", "bk-status");
    this.status.setAttribute("role", "status");

    var script = el("div", "bk-script");
    script.setAttribute("aria-label", "Tu programa");
    var hat = el("div", "bk bk-hat cat-eventos", "🏁 al pulsar ▶ ¡Ejecutar!");
    this.rootStack = el("div", "bk-stack bk-root");
    this.rootStack.setAttribute("data-list", "root");
    this.empty = el("p", "bk-empty", "Toca un bloque para ponerlo aquí debajo, o arrástralo. ¡Prueba con «encender»!");
    script.appendChild(hat);
    script.appendChild(this.rootStack);
    script.appendChild(this.empty);
    this.script = script;

    this.trash = el("div", "bk-trash", "🗑️ Suelta fuera para quitarlo");
    this.trash.setAttribute("aria-hidden", "true");

    workspace.appendChild(toolbar);
    workspace.appendChild(this.status);
    workspace.appendChild(script);
    container.appendChild(palette);
    container.appendChild(workspace);
    document.body.appendChild(this.trash);

    // Arrastrar: con ratón, dedo o lápiz (Pointer Events). Sin ellos (tabletas
    // muy viejas), tocar un bloque lo añade igual.
    container.addEventListener("pointerdown", function (e) {
      self.pointerDown(e);
    });
    script.addEventListener("click", function (e) {
      self.pickTarget(e);
    });
    palette.addEventListener("click", function (e) {
      // El toque ya lo añadió el arrastre (pointerup). El clic sólo cuenta si
      // viene del teclado (detail 0) o de una tableta sin Pointer Events.
      if (window.PointerEvent && e.detail !== 0) return;
      var source = closest(e.target, "[data-palette]");
      if (source) self.add(source.getAttribute("data-palette"));
    });
    this.updateButtons();
  };

  Editor.prototype.button = function (parent, className, icon, label, onClick) {
    var btn = el("button", className);
    btn.type = "button";
    btn.appendChild(el("span", "ico", icon));
    btn.appendChild(document.createTextNode(label));
    btn.addEventListener("click", onClick);
    parent.appendChild(btn);
    return btn;
  };

  Editor.prototype.paletteBlock = function (type) {
    var def = BLOCKS[type];
    var block = el("button", "bk cat-" + def.cat + (def.c ? " bk-pal-c" : ""));
    block.type = "button";
    block.setAttribute("data-palette", type);
    def.parts.forEach(function (part) {
      if (typeof part === "string") {
        block.appendChild(el("span", "bk-text", part));
        return;
      }
      var shown = part.def;
      if (part.type === "select") {
        part.options.forEach(function (option) {
          if (option[0] === part.def) shown = option[1];
        });
      }
      block.appendChild(el("span", "bk-slot", String(shown).replace(".", ",")));
    });
    return block;
  };

  // ---------- Pintar el programa ----------

  Editor.prototype.render = function () {
    this.elements = {};
    if (this.target !== "root" && !findNode(this.program, this.target)) this.target = "root";
    this.rootStack.innerHTML = "";
    this.renderList(this.rootStack, this.program);
    this.empty.hidden = this.program.length > 0;
    this.script.classList.toggle("has-target", this.target !== "root");
  };

  Editor.prototype.renderList = function (stack, list) {
    var self = this;
    var unreachable = false;
    list.forEach(function (node) {
      stack.appendChild(self.renderNode(node, unreachable));
      if (BLOCKS[node.type].cap) unreachable = true;
    });
  };

  Editor.prototype.renderNode = function (node, unreachable) {
    var def = BLOCKS[node.type];
    var head;
    var outer;
    if (def.c) {
      outer = el("div", "bk-c cat-" + def.cat);
      head = el("div", "bk bk-c-top cat-" + def.cat + (def.hat ? " bk-hat-top" : ""));
      var mouth = el("div", "bk-mouth");
      var inner = el("div", "bk-stack");
      inner.setAttribute("data-list", node.id);
      if (this.target === node.id) inner.classList.add("bk-target");
      this.renderList(inner, node.body);
      mouth.appendChild(inner);
      outer.appendChild(head);
      outer.appendChild(mouth);
      outer.appendChild(el("div", "bk bk-c-bottom cat-" + def.cat));
    } else {
      outer = head = el("div", "bk cat-" + def.cat);
    }
    outer.setAttribute("data-id", node.id);
    if (unreachable) {
      outer.classList.add("bk-dead");
      outer.title = "«Por siempre» no termina nunca: aquí no llegará";
    }
    this.fillParts(head, def, node);
    var remove = el("button", "bk-x", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", "Quitar este bloque");
    var self = this;
    remove.addEventListener("click", function () {
      if (self.running) return self.busy();
      var found = findNode(self.program, node.id);
      if (found) found.list.splice(found.index, 1);
      self.changed();
    });
    head.appendChild(remove);
    if (def.c) {
      var lap = el("span", "bk-lap");
      head.appendChild(lap);
      this.elements[node.id + ":lap"] = lap;
    }
    this.elements[node.id] = head;
    return outer;
  };

  Editor.prototype.fillParts = function (target, def, node) {
    var self = this;
    def.parts.forEach(function (part) {
      if (typeof part === "string") {
        target.appendChild(el("span", "bk-text", part));
        return;
      }
      var input;
      if (part.type === "select") {
        input = el("select", "bk-in");
        part.options.forEach(function (option) {
          var opt = el("option", "", option[1]);
          opt.value = option[0];
          input.appendChild(opt);
        });
        input.value = node.params[part.name];
        input.addEventListener("change", function () {
          node.params[part.name] = input.value;
          self.save();
        });
      } else {
        input = el("input", "bk-in bk-num");
        input.type = "text";
        input.setAttribute("inputmode", "decimal");
        input.value = String(node.params[part.name]).replace(".", ",");
        input.size = Math.max(2, input.value.length);
        input.addEventListener("input", function () {
          input.size = Math.max(2, input.value.length);
        });
        input.addEventListener("change", function () {
          node.params[part.name] = clampParam(part, input.value);
          input.value = String(node.params[part.name]).replace(".", ",");
          input.size = Math.max(2, input.value.length);
          self.save();
        });
      }
      input.setAttribute("aria-label", part.name);
      target.appendChild(input);
    });
  };

  Editor.prototype.save = function () {
    Lab.store.set(this.key, plain(this.program));
  };

  Editor.prototype.changed = function () {
    this.render();
    this.save();
  };

  Editor.prototype.busy = function () {
    Lab.toast("Para el programa (■) para cambiar los bloques");
  };

  // ---------- Añadir con un toque ----------

  // Dónde caen los bloques que se tocan: abajo del todo, o dentro del
  // «repetir»/«si» que se haya elegido tocando su hueco.
  Editor.prototype.pickTarget = function (e) {
    if (closest(e.target, ".bk, .bk-x, input, select")) return;
    var stack = closest(e.target, ".bk-stack");
    var id = stack ? stack.getAttribute("data-list") : "root";
    this.target = this.target === id ? "root" : id;
    this.render();
  };

  Editor.prototype.targetList = function () {
    if (this.target !== "root") {
      var found = findNode(this.program, this.target);
      if (found) return found.node.body;
    }
    // Debajo de un «por siempre» no se llega nunca: lo nuevo va dentro.
    var last = this.program[this.program.length - 1];
    if (last && (BLOCKS[last.type].cap || BLOCKS[last.type].hat)) return last.body;
    return this.program;
  };

  Editor.prototype.add = function (type) {
    if (this.running) return this.busy();
    // v3: los «cuando…» van siempre sueltos, en el programa de arriba.
    (BLOCKS[type].hat ? this.program : this.targetList()).push(newNode(type));
    this.changed();
    var head = this.elements["b" + seq];
    if (head && head.scrollIntoView) head.scrollIntoView({ block: "nearest" });
  };

  // ---------- Arrastrar ----------

  Editor.prototype.pointerDown = function (e) {
    // Un segundo dedo mientras se arrastra con el primero: no cuenta.
    if (this.drag) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (closest(e.target, "input, select, .bk-x")) return;
    var source = closest(e.target, "[data-palette], [data-id]");
    if (!source || closest(e.target, ".bk-mouth") === e.target) return;
    // Tocar el hueco de un «repetir» no lo arrastra: lo elige (pickTarget).
    if (e.target.classList && e.target.classList.contains("bk-stack")) return;
    var self = this;
    this.drag = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      source: source,
      palette: source.getAttribute("data-palette"),
      started: false,
    };
    this.onMove = function (ev) {
      self.pointerMove(ev);
    };
    this.onUp = function (ev) {
      self.pointerUp(ev, false);
    };
    this.onCancel = function (ev) {
      self.pointerUp(ev, true);
    };
    document.addEventListener("pointermove", this.onMove);
    document.addEventListener("pointerup", this.onUp);
    document.addEventListener("pointercancel", this.onCancel);
  };

  Editor.prototype.pointerMove = function (e) {
    var drag = this.drag;
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.started) {
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 8) return;
      if (this.running) {
        this.endDrag();
        return this.busy();
      }
      this.startDrag(e);
    }
    e.preventDefault();
    drag.ghost.style.left = e.clientX - drag.dx + "px";
    drag.ghost.style.top = e.clientY - drag.dy + "px";
    this.findDrop(e.clientX, e.clientY);
  };

  Editor.prototype.startDrag = function (e) {
    var drag = this.drag;
    var rect = drag.source.getBoundingClientRect();
    drag.started = true;
    drag.dx = Math.min(e.clientX - rect.left, 60);
    drag.dy = Math.min(e.clientY - rect.top, 24);
    if (drag.palette) {
      drag.node = newNode(drag.palette);
    } else {
      var found = findNode(this.program, drag.source.getAttribute("data-id"));
      drag.from = { list: found.list, index: found.index };
      drag.node = found.list.splice(found.index, 1)[0];
      document.body.classList.add("bk-dragging-script");
      this.render();
    }
    var ghost = el("div", "bk-ghost");
    ghost.appendChild(this.renderNode(drag.node, false));
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    document.body.classList.add("bk-dragging");
  };

  Editor.prototype.findDrop = function (x, y) {
    var drag = this.drag;
    if (drag.marker && drag.marker.parentNode) drag.marker.parentNode.removeChild(drag.marker);
    drag.drop = null;
    var under = document.elementFromPoint(x, y);
    var inScript = under && closest(under, ".bk-script");
    this.trash.classList.toggle("hot", !inScript);
    if (!inScript) return;
    var stack = closest(under, ".bk-stack") || this.rootStack;
    var kids = Array.prototype.filter.call(stack.children, function (child) {
      return child.hasAttribute("data-id");
    });
    var index = kids.length;
    for (var i = 0; i < kids.length; i++) {
      var r = kids[i].getBoundingClientRect();
      if (y < r.top + Math.min(r.height / 2, 26)) {
        index = i;
        break;
      }
    }
    drag.drop = { list: stack.getAttribute("data-list"), index: index };
    drag.marker = drag.marker || el("div", "bk-marker");
    stack.insertBefore(drag.marker, kids[index] || null);
  };

  Editor.prototype.pointerUp = function (e, cancelled) {
    var drag = this.drag;
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.started) {
      this.endDrag();
      if (!cancelled && drag.palette) this.add(drag.palette);
      return;
    }
    if (cancelled && drag.from) {
      drag.from.list.splice(drag.from.index, 0, drag.node);
    } else if (drag.drop) {
      var list = drag.drop.list === "root" ? this.program : findNode(this.program, drag.drop.list).node.body;
      list.splice(drag.drop.index, 0, drag.node);
    } else if (drag.from) {
      Lab.toast("Bloque quitado 🗑️");
    }
    this.endDrag();
    this.changed();
  };

  Editor.prototype.endDrag = function () {
    var drag = this.drag;
    document.removeEventListener("pointermove", this.onMove);
    document.removeEventListener("pointerup", this.onUp);
    document.removeEventListener("pointercancel", this.onCancel);
    if (drag && drag.ghost) drag.ghost.parentNode.removeChild(drag.ghost);
    if (drag && drag.marker && drag.marker.parentNode) drag.marker.parentNode.removeChild(drag.marker);
    document.body.classList.remove("bk-dragging", "bk-dragging-script");
    this.trash.classList.remove("hot");
    this.drag = null;
  };

  // ---------- Botones ----------

  Editor.prototype.loadExample = function () {
    if (this.running) return this.busy();
    if (this.program.length && !window.confirm("¿Cambiar tu programa por el ejemplo?")) return;
    this.program = build(this.options.example);
    this.target = "root";
    this.changed();
    this.say(this.options.exampleText || "Mira el ejemplo y pulsa ▶ ¡Ejecutar!");
  };

  Editor.prototype.clear = function () {
    if (this.running) return this.busy();
    if (this.program.length && !window.confirm("¿Borrar todos los bloques?")) return;
    this.program = [];
    this.target = "root";
    this.changed();
  };

  Editor.prototype.updateButtons = function () {
    this.runBtn.disabled = this.running;
    this.stopBtn.disabled = !this.running;
    this.script.classList.toggle("is-running", this.running);
  };

  Editor.prototype.say = function (text) {
    this.status.textContent = text;
  };

  // ---------- Ejecutar ----------

  Editor.prototype.run = async function () {
    if (this.running) return;
    if (!this.program.length) {
      Lab.toast("Primero pon algún bloque 😉");
      return;
    }
    this.running = true;
    this.stopped = false;
    this.updateButtons();
    this.say("▶ Ejecutando…");
    try {
      if (this.options.onStart) await this.options.onStart();
      // Cada vez, desde las luces apagadas: así se ve bien qué hace el programa.
      await this.call("light", { color: "all", on: 0 });
      // v3: cada «cuando…» espera por su cuenta, a la vez que lo demás.
      var self = this;
      var hats = this.program.filter(function (n) {
        return BLOCKS[n.type].hat;
      });
      var rest = this.program.filter(function (n) {
        return !BLOCKS[n.type].hat;
      });
      await Promise.all(
        [this.runList(rest)].concat(
          hats.map(function (n) {
            return self.runList([n]);
          })
        )
      );
      this.say("✓ ¡Terminado! ¿Lo cambias y lo pruebas otra vez?");
    } catch (err) {
      if (!this.stopped) this.stop();
      if (err === STOP) this.say("■ Parado.");
      else this.say("😕 " + (err && err.message ? err.message : "Algo ha fallado") + ". ¿Sigues conectado a la placa?");
    }
    this.mark(null);
    var elements = this.elements;
    Object.keys(elements).forEach(function (key) {
      if (/:lap$/.test(key)) elements[key].textContent = "";
    });
    this.running = false;
    this.updateButtons();
    if (this.options.onStop) this.options.onStop();
  };

  Editor.prototype.stop = function () {
    this.stopped = true;
    var waiters = this.waiters;
    this.waiters = [];
    waiters.forEach(function (cancel) {
      cancel();
    });
  };

  Editor.prototype.runList = async function (list) {
    for (var i = 0; i < list.length; i++) {
      if (this.stopped) throw STOP;
      var node = list[i];
      this.mark(node);
      await BLOCKS[node.type].run(node.params, this.runtime, node);
    }
  };

  Editor.prototype.mark = function (node) {
    if (this.current) this.current.classList.remove("bk-run");
    this.current = node ? this.elements[node.id] : null;
    if (this.current) this.current.classList.add("bk-run");
  };

  Editor.prototype.wait = function (ms) {
    var self = this;
    return new Promise(function (resolve, reject) {
      if (self.stopped) return reject(STOP);
      var timer = setTimeout(function () {
        self.waiters.splice(self.waiters.indexOf(cancel), 1);
        resolve();
      }, ms);
      function cancel() {
        clearTimeout(timer);
        reject(STOP);
      }
      self.waiters.push(cancel);
    });
  };

  Editor.prototype.call = function (path, params) {
    var self = this;
    if (this.stopped) return Promise.reject(STOP);
    return Lab.api(path, params).then(function (state) {
      if (self.stopped) throw STOP;
      return state;
    });
  };

  // Lo que pueden usar los bloques al ejecutarse.
  Object.defineProperty(Editor.prototype, "runtime", {
    get: function () {
      var self = this;
      if (this._runtime) return this._runtime;
      this._runtime = {
        light: function (color, on) {
          return self.call("light", { color: color, on: on ? 1 : 0 });
        },
        beep: function (hz, secs) {
          var ms = Math.round(secs * 1000);
          return self.call("beep", { hz: hz, ms: Math.min(ms, 5000) }).then(function () {
            return self.wait(ms);
          });
        },
        wait: function (ms) {
          return self.wait(ms);
        },
        // Los sensores se miran en el último estado que mandó la placa.
        state: function () {
          return Lab.state;
        },
        waitUntil: async function (test) {
          while (!(Lab.state && test(Lab.state))) await self.wait(100);
        },
        runList: function (list) {
          return self.runList(list);
        },
        setLap: function (node, text) {
          var lap = self.elements[node.id + ":lap"];
          if (lap) lap.textContent = text;
        },
        // Un respiro en cada vuelta: un «por siempre» vacío no congela la página.
        breathe: function () {
          return self.wait(20);
        },
      };
      return this._runtime;
    },
  });

  window.Bloques = {
    mount: function (container, options) {
      return new Editor(container, options);
    },
    BLOCKS: BLOCKS,
  };
})();
