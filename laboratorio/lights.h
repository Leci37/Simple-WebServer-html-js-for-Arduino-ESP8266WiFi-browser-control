// 🚦 Las tres luces y quién manda en ellas.
//
// Las luces son de todos los inventos: el semáforo las usa como semáforo, el
// sonómetro para decir cuánto ruido hay y el detector para avisar de fantasmas.
// El «modo» dice quién manda ahora.
#pragma once

#include "config.h"
#include "settings.h"
#include "buzzer.h"
#include "sound.h"
#include "ghost.h"

enum LightMode : uint8_t {
  MODE_MANUAL,  // 🖐️ las enciende la web (o un programa de bloques)
  MODE_AUTO,    // 🔄 semáforo automático, con botón de peatones
  MODE_NIGHT,   // 🌙 ámbar intermitente, como de noche
  MODE_SOUND,   // 🎤 enseñan el ruido
  MODE_GHOST,   // 👻 enseñan lo cerca que está el fantasma
  MODE_COUNT
};

const char* const MODE_NAMES[MODE_COUNT] = {"manual", "auto", "night", "sound", "ghost"};

struct Leds {
  bool red;
  bool yellow;
  bool green;
};

LightMode lightMode = MODE_AUTO;
Leds leds = {false, false, false};

enum TrafficPhase : uint8_t { PHASE_GREEN, PHASE_YELLOW, PHASE_RED };

static TrafficPhase trafficPhase = PHASE_GREEN;
static unsigned long trafficPhaseAt = 0;
static bool walkRequested = false;  // alguien quiere cruzar
static bool walkBeeps = false;      // pitidos para cruzar (los piden con el botón)
static unsigned long lastBeepAt = 0;

uint16_t buttonPresses = 0;  // veces que se ha pulsado el botón (en la placa o en la web)

void writeLeds(bool red, bool yellow, bool green) {
  if (red != leds.red) digitalWrite(PIN_RED, red ? HIGH : LOW);
  if (yellow != leds.yellow) digitalWrite(PIN_YELLOW, yellow ? HIGH : LOW);
  if (green != leds.green) digitalWrite(PIN_GREEN, green ? HIGH : LOW);
  leds = {red, yellow, green};
}

// Los peatones cruzan cuando los coches tienen el rojo.
bool walkLight() {
  return lightMode == MODE_AUTO && trafficPhase == PHASE_RED;
}

void lightsBegin() {
  pinMode(PIN_RED, OUTPUT);
  pinMode(PIN_YELLOW, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  digitalWrite(PIN_RED, LOW);
  digitalWrite(PIN_YELLOW, LOW);
  digitalWrite(PIN_GREEN, LOW);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
}

void setMode(LightMode mode) {
  if (mode == lightMode) return;
  lightMode = mode;
  // Cada modo empieza de cero: luces apagadas y el semáforo desde el verde.
  writeLeds(false, false, false);
  trafficPhase = PHASE_GREEN;
  trafficPhaseAt = millis();
  walkRequested = false;
  walkBeeps = false;
}

bool modeFromName(const String& name, LightMode& mode) {
  for (uint8_t i = 0; i < MODE_COUNT; i++) {
    if (name == MODE_NAMES[i]) {
      mode = (LightMode)i;
      return true;
    }
  }
  return false;
}

// El botón de peatones: el FLASH de la placa o el de la web.
void pressButton() {
  buttonPresses++;
  beep(1200, 40);
  if (lightMode == MODE_AUTO && trafficPhase != PHASE_RED) walkRequested = true;
}

unsigned long trafficDuration(TrafficPhase phase) {
  // 🐢 tortuga, 🚶 normal, 🐇 liebre
  static const uint16_t GREEN_MS[] = {8000, 5000, 3000};
  static const uint16_t YELLOW_MS[] = {3000, 2000, 1000};
  static const uint16_t RED_MS[] = {8000, 5000, 3000};
  uint8_t speed = constrain(settings.trafficSpeed, 1, 3) - 1;
  if (phase == PHASE_GREEN) return GREEN_MS[speed];
  if (phase == PHASE_YELLOW) return YELLOW_MS[speed];
  return RED_MS[speed];
}

void goToPhase(TrafficPhase phase, unsigned long now) {
  trafficPhase = phase;
  trafficPhaseAt = now;
}

// El semáforo empieza en verde cuando la placa ya está lista (la wifi tarda).
void lightsStart() {
  goToPhase(PHASE_GREEN, millis());
}

void trafficLoop(unsigned long now) {
  unsigned long elapsed = now - trafficPhaseAt;
  switch (trafficPhase) {
    case PHASE_GREEN:
      // Si alguien quiere cruzar, el verde dura sólo un segundo más.
      if (elapsed >= trafficDuration(PHASE_GREEN) || (walkRequested && elapsed >= 1000)) {
        goToPhase(PHASE_YELLOW, now);
      }
      break;
    case PHASE_YELLOW:
      if (elapsed >= trafficDuration(PHASE_YELLOW)) {
        goToPhase(PHASE_RED, now);
        walkBeeps = walkRequested;
        walkRequested = false;
      }
      break;
    case PHASE_RED:
      // Los pitidos ayudan a cruzar a quien no ve el semáforo.
      if (walkBeeps && now - lastBeepAt >= 500) {
        beep(1000, 60);
        lastBeepAt = now;
      }
      if (elapsed >= trafficDuration(PHASE_RED)) {
        walkBeeps = false;
        goToPhase(PHASE_GREEN, now);
      }
      break;
  }
  writeLeds(trafficPhase == PHASE_RED, trafficPhase == PHASE_YELLOW, trafficPhase == PHASE_GREEN);
}

void soundLightsLoop(unsigned long now) {
  bool red = sound.level >= settings.soundRed;
  bool yellow = !red && sound.level >= settings.soundYellow;
  writeLeds(red, yellow, !red && !yellow);
  if (red && settings.soundAlarm && now - lastBeepAt >= 1000) {
    beep(1400, 200);
    lastBeepAt = now;
  }
}

void ghostLightsLoop(unsigned long now) {
  uint8_t level = ghost.level;
  if (level == 0) {
    writeLeds(false, false, true);
  } else if (level <= 3) {
    writeLeds(false, true, false);
  } else {
    // El rojo parpadea, y más deprisa cuanto más cerca está.
    unsigned long half = level == 5 ? 120 : 300;
    writeLeds((now / half) % 2 == 0, false, false);
  }
  // Pitidos de radar: más seguidos y más agudos cuanto más cerca.
  if (settings.ghostSound && level > 0) {
    unsigned long gap = map(level, 1, 5, 900, 120);
    if (now - lastBeepAt >= gap) {
      beep(500 + level * 250, 50);
      lastBeepAt = now;
    }
  }
}

static bool buttonDown = false;
static unsigned long buttonChangedAt = 0;

void buttonLoop(unsigned long now) {
  bool down = digitalRead(PIN_BUTTON) == LOW;
  // 40 ms de calma: al pulsar, el contacto rebota y parecerían varias pulsaciones.
  if (down != buttonDown && now - buttonChangedAt > 40) {
    buttonDown = down;
    buttonChangedAt = now;
    if (down) pressButton();
  }
}

void lightsLoop() {
  unsigned long now = millis();
  buttonLoop(now);
  switch (lightMode) {
    case MODE_AUTO:
      trafficLoop(now);
      break;
    case MODE_NIGHT:
      writeLeds(false, (now / 500) % 2 == 0, false);
      break;
    case MODE_SOUND:
      soundLightsLoop(now);
      break;
    case MODE_GHOST:
      ghostLightsLoop(now);
      break;
    default:
      break;  // MODE_MANUAL: las luces se quedan como las dejó la web
  }
}
