// 🌐 La web y la API.
//
// Las páginas (web_pages.h) se generan desde la carpeta web/ con
// tools/build_web.py: van comprimidas, para que lleguen rápido al móvil.
// La API contesta en JSON y cualquiera puede usarla: la web, un programa de
// bloques, Snap!, TurboWarp… Todas las órdenes son GET para que se puedan
// probar escribiéndolas en el navegador: /api/light?color=red&on=1
#pragma once

#include <ESP8266WebServer.h>

#include "config.h"
#include "settings.h"
#include "buzzer.h"
#include "sound.h"
#include "ghost.h"
#include "lights.h"
#include "network.h"
#include "records.h"
#include "web_pages.h"

ESP8266WebServer server(80);

// --- Ayudantes ---------------------------------------------------------------

String jsonEscape(const String& text) {
  String out;
  out.reserve(text.length() + 2);
  for (unsigned int i = 0; i < text.length(); i++) {
    char c = text[i];
    if (c == '"' || c == '\\') out += '\\';
    if ((uint8_t)c >= 0x20) out += c;
  }
  return out;
}

const char* jsonBool(bool value) {
  return value ? "true" : "false";
}

long argInt(const char* name, long fallback) {
  return server.hasArg(name) ? server.arg(name).toInt() : fallback;
}

bool argBool(const char* name, bool fallback) {
  if (!server.hasArg(name)) return fallback;
  String value = server.arg(name);
  value.toLowerCase();
  return value == "1" || value == "true" || value == "on";
}

void sendJson(int code, const String& json) {
  server.sendHeader("Cache-Control", "no-store");
  server.send(code, "application/json", json);
}

void sendError(int code, const String& message) {
  sendJson(code, "{\"error\":\"" + jsonEscape(message) + "\"}");
}

// --- El estado: todo lo que la placa sabe, de una vez -------------------------

String stateJson() {
  char buf[560];
  snprintf(buf, sizeof(buf),
           "{\"mode\":\"%s\","
           "\"leds\":{\"red\":%s,\"yellow\":%s,\"green\":%s},"
           "\"walk\":%s,\"button\":%u,"
           "\"sound\":{\"level\":%u,\"peak\":%u,\"raw\":%u,\"mic\":%s,\"claps\":%u},"
           "\"ghost\":{\"cm\":%d,\"level\":%u,\"sensor\":%s},"
           "\"settings\":{\"soundYellow\":%u,\"soundRed\":%u,\"soundGain\":%u,\"soundAlarm\":%s,"
           "\"ghostNear\":%u,\"ghostFar\":%u,\"ghostSound\":%s,\"trafficSpeed\":%u},",
           MODE_NAMES[lightMode],
           jsonBool(leds.red), jsonBool(leds.yellow), jsonBool(leds.green),
           jsonBool(walkLight()), buttonPresses,
           sound.level, sound.peak, sound.raw, jsonBool(sound.mic), sound.claps,
           ghost.cm, ghost.level, jsonBool(ghost.sensor),
           settings.soundYellow, settings.soundRed, settings.soundGain, jsonBool(settings.soundAlarm),
           settings.ghostNear, settings.ghostFar, jsonBool(settings.ghostSound), settings.trafficSpeed);
  String json = buf;
  json += "\"board\":{\"name\":\"" + jsonEscape(boardName) + "\",\"address\":\"" + boardAddress() +
          "\",\"accessPoint\":" + jsonBool(accessPointMode) + ",\"version\":\"" LAB_VERSION
          "\",\"uptime\":" + String(millis()) + "}}";
  return json;
}

// --- Las órdenes ---------------------------------------------------------------

void handleState() {
  sendJson(200, stateJson());
}

// /api/input: sólo lo que hace falta para jugar (botón, palmadas, distancia y
// ruido). Es pequeño a propósito: el juego lo pregunta 15 veces por segundo.
void handleInput() {
  char buf[96];
  snprintf(buf, sizeof(buf), "{\"button\":%u,\"claps\":%u,\"cm\":%d,\"level\":%u}",
           buttonPresses, sound.claps, ghost.cm, sound.level);
  sendJson(200, buf);
}

// /api/mode?set=manual|auto|night|sound|ghost
void handleMode() {
  LightMode mode;
  if (!modeFromName(server.arg("set"), mode)) {
    sendError(400, "set tiene que ser manual, auto, night, sound o ghost");
    return;
  }
  setMode(mode);
  handleState();
}

// /api/light?color=red|yellow|green|all&on=1|0 (sin «on», cambia: si estaba encendida, la apaga)
// Encender una luz a mano pone el modo manual.
void handleLight() {
  String color = server.arg("color");
  if (color != "red" && color != "yellow" && color != "green" && color != "all") {
    sendError(400, "color tiene que ser red, yellow, green o all");
    return;
  }
  setMode(MODE_MANUAL);
  Leds next = leds;
  if (color == "all") {
    // Sin «on»: si hay alguna encendida, las apaga todas; si no, las enciende.
    bool on = argBool("on", !(leds.red || leds.yellow || leds.green));
    next = {on, on, on};
  }
  if (color == "red") next.red = argBool("on", !leds.red);
  if (color == "yellow") next.yellow = argBool("on", !leds.yellow);
  if (color == "green") next.green = argBool("on", !leds.green);
  writeLeds(next.red, next.yellow, next.green);
  handleState();
}

// /api/beep?hz=880&ms=200 (hz=0 calla el zumbador)
void handleBeep() {
  long hz = argInt("hz", 880);
  long ms = argInt("ms", 200);
  if (hz < 0 || hz > 10000 || ms < 0 || ms > 5000) {
    sendError(400, "hz va de 0 a 10000 y ms de 0 a 5000");
    return;
  }
  beep((uint16_t)hz, (uint16_t)ms);
  handleState();
}

// /api/walk: como pulsar el botón de los peatones.
void handleWalk() {
  pressButton();
  handleState();
}

// /api/settings?soundRed=80&ghostSound=0… Sólo cambia lo que se nombra.
void handleSettings() {
  Settings next = settings;
  next.soundYellow = constrain(argInt("soundYellow", next.soundYellow), 0, 100);
  next.soundRed = constrain(argInt("soundRed", next.soundRed), 0, 100);
  next.soundGain = constrain(argInt("soundGain", next.soundGain), 10, 1000);
  next.soundAlarm = argBool("soundAlarm", next.soundAlarm);
  next.ghostNear = constrain(argInt("ghostNear", next.ghostNear), 2, 400);
  next.ghostFar = constrain(argInt("ghostFar", next.ghostFar), 3, 400);
  next.ghostSound = argBool("ghostSound", next.ghostSound);
  next.trafficSpeed = constrain(argInt("trafficSpeed", next.trafficSpeed), 1, 3);
  if (next.soundYellow >= next.soundRed) {
    sendError(400, "soundYellow tiene que ser menor que soundRed");
    return;
  }
  if (next.ghostNear >= next.ghostFar) {
    sendError(400, "ghostNear tiene que ser menor que ghostFar");
    return;
  }
  settings = next;
  handleState();
}

// --- Los récords de la clase (records.h) --------------------------------------

String recordsJson() {
  String json = "\"records\":[";
  for (uint8_t i = 0; i < records.count; i++) {
    const Record& record = records.list[i];
    if (i) json += ',';
    json += "{\"alias\":\"" + jsonEscape(record.alias) + "\",\"m\":" + String(record.meters) +
            ",\"t\":" + String(record.turtle) + ",\"w\":\"" + WORLD_NAMES[record.world] + "\"}";
  }
  json += ']';
  return json;
}

// /api/records: los cinco mejores, de más metros a menos. Con clear=1, los borra.
void handleRecords() {
  if (argBool("clear", false)) recordsClear();
  String json = "{";
  json += recordsJson();
  json += '}';
  sendJson(200, json);
}

// /api/record?alias=Rayo&m=906&t=0&w=field: un récord nuevo (t=1, en modo
// tortuga; w, el mundo). Contesta con la lista y el puesto (0 si no entra).
void handleRecord() {
  char alias[ALIAS_SIZE];
  String raw = server.arg("alias");
  cleanAlias(raw.c_str(), raw.length(), alias, sizeof(alias));
  long meters = argInt("m", 0);
  if (alias[0] == '\0' || meters <= 0) {
    sendError(400, "hace falta un alias y los metros");
    return;
  }
  int world = 0;
  if (server.hasArg("w")) {
    world = worldFromName(server.arg("w"));
    if (world < 0) {
      sendError(400, "w tiene que ser field, farm o moon");
      return;
    }
  }
  uint32_t capped = meters > (long)RECORD_METERS_MAX ? RECORD_METERS_MAX : (uint32_t)meters;
  uint8_t place = recordsAdd(alias, capped, argBool("t", false), (uint8_t)world);
  String json = "{";
  json += recordsJson();
  json += ",\"place\":" + String(place) + "}";
  sendJson(200, json);
}

// /api: la chuleta de la API, para quien quiera programar la placa desde fuera.
void handleApiHelp() {
  sendJson(200,
           "{\"api\":["
           "\"GET /api/state\","
           "\"GET /api/input\","
           "\"GET /api/mode?set=manual|auto|night|sound|ghost\","
           "\"GET /api/light?color=red|yellow|green|all&on=1|0\","
           "\"GET /api/beep?hz=880&ms=200\","
           "\"GET /api/walk\","
           "\"GET /api/settings?soundYellow=45&soundRed=70&soundGain=100&soundAlarm=0"
           "&ghostNear=20&ghostFar=60&ghostSound=1&trafficSpeed=2\","
           "\"GET /api/records (clear=1 los borra)\","
           "\"GET /api/record?alias=Rayo&m=906&t=0&w=field|farm|moon\""
           "]}");
}

// --- Las páginas y el portal cautivo -------------------------------------------

bool isOurHost(String host) {
  int colon = host.indexOf(':');
  if (colon >= 0) host = host.substring(0, colon);
  return host.length() == 0 || host == boardAddress() || host.equalsIgnoreCase(LAB_HOSTNAME ".local");
}

void redirectHome() {
  server.sendHeader("Location", "http://" + boardAddress() + "/", true);
  server.send(302, "text/plain", "");
}

void sendPage(const WebPage& page) {
  // El móvil pregunta con la ETag si lo que guardó sigue valiendo: si sí, no
  // hace falta mandarlo otra vez.
  server.sendHeader("ETag", page.etag);
  if (server.header("If-None-Match") == page.etag) {
    server.send(304);
    return;
  }
  server.sendHeader("Cache-Control", "no-cache");
  server.sendHeader("Content-Encoding", "gzip");
  server.send_P(200, page.type, (PGM_P)page.data, page.length);
}

void handleNotFound() {
  if (server.uri().startsWith("/api/")) {
    sendError(404, "esa orden no existe: mira /api");
    return;
  }
  // Portal cautivo: cualquier dirección (también la que usa el móvil para
  // comprobar si hay internet) lleva a la portada.
  if (accessPointMode) {
    redirectHome();
    return;
  }
  server.send(404, "text/plain", "No existe");
}

void webBegin() {
  const char* headers[] = {"If-None-Match"};
  server.collectHeaders(headers, sizeof(headers) / sizeof(headers[0]));
  // Otros programas (Snap!, TurboWarp, una web hecha por ti) pueden usar la API.
  server.enableCORS(true);

  for (size_t i = 0; i < WEB_PAGE_COUNT; i++) {
    const WebPage* page = &WEB_PAGES[i];
    server.on(page->path, HTTP_GET, [page]() {
      if (accessPointMode && !isOurHost(server.hostHeader())) {
        redirectHome();
        return;
      }
      sendPage(*page);
    });
  }

  server.on("/api", HTTP_GET, handleApiHelp);
  server.on("/api/state", HTTP_GET, handleState);
  server.on("/api/input", HTTP_GET, handleInput);
  server.on("/api/mode", HTTP_GET, handleMode);
  server.on("/api/light", HTTP_GET, handleLight);
  server.on("/api/beep", HTTP_GET, handleBeep);
  server.on("/api/walk", HTTP_GET, handleWalk);
  server.on("/api/settings", HTTP_GET, handleSettings);
  server.on("/api/records", HTTP_GET, handleRecords);
  server.on("/api/record", HTTP_GET, handleRecord);
  server.onNotFound(handleNotFound);
  server.begin();
}

void webLoop() {
  server.handleClient();
}
