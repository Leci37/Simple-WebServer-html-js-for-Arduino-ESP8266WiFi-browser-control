// 👻 El detector de fantasmas (que, en secreto, es un sensor de distancia).
//
// El sensor lanza un grito de ultrasonidos que no oímos (40 000 Hz) y escucha
// cuánto tarda en volver el eco, como los murciélagos. Si el eco tarda poco,
// hay algo cerca… ¿un fantasma?
#pragma once

#include "config.h"
#include "settings.h"

const unsigned long GHOST_PING_MS = 100;
// Sin sensor, cada medida espera el eco 25 ms en balde: entonces, más despacio.
const unsigned long GHOST_IDLE_PING_MS = 500;
// 25 ms de espera = unos 4 metros (ida y vuelta), lo que alcanza el sensor.
const unsigned long GHOST_ECHO_TIMEOUT_US = 25000;
// Tres ecos perdidos seguidos: ya no hay nada delante.
const uint8_t GHOST_MISSES_FOR_NOTHING = 3;
const unsigned long GHOST_SENSOR_TIMEOUT_MS = 5000;

struct GhostState {
  int16_t cm = -1;      // -1: no vuelve ningún eco (nada cerca, o no hay sensor)
  uint8_t level = 0;    // la «energía espectral», de 0 (nada) a 5 (¡espectro!)
  bool sensor = false;  // ¿ha vuelto algún eco en los últimos 5 segundos?
};

GhostState ghost;

static unsigned long ghostLastPing = 0;
static unsigned long ghostLastEcho = 0;
static bool ghostEverEchoed = false;
static uint8_t ghostMisses = 0;
static int16_t ghostRecent[3] = {-1, -1, -1};
static uint8_t ghostNext = 0;

// La mediana de tres: la del medio. Si una medida sale loca, no cuenta.
int16_t median3(int16_t a, int16_t b, int16_t c) {
  return max(min(a, b), min(max(a, b), c));
}

uint8_t ghostLevelFrom(int16_t cm) {
  int near = settings.ghostNear;
  int far = settings.ghostFar;
  if (cm < 0 || cm > far) return 0;
  if (cm <= near / 2) return 5;
  if (cm <= near) return 4;
  // Entre «lejos» y «cerca», de 1 a 3: cuanto más cerca, más energía.
  return 1 + (uint8_t)((far - cm) * 3 / (far - near + 1));
}

void ghostBegin() {
  pinMode(PIN_TRIG, OUTPUT);
  digitalWrite(PIN_TRIG, LOW);
  pinMode(PIN_ECHO, INPUT);
}

void ghostLoop() {
  unsigned long now = millis();
  unsigned long every = ghost.sensor ? GHOST_PING_MS : GHOST_IDLE_PING_MS;
  if (now - ghostLastPing < every) return;
  ghostLastPing = now;

  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  unsigned long us = pulseIn(PIN_ECHO, HIGH, GHOST_ECHO_TIMEOUT_US);

  if (us == 0) {
    if (ghostMisses < 255) ghostMisses++;
    if (ghostMisses >= GHOST_MISSES_FOR_NOTHING) ghost.cm = -1;
  } else {
    ghostMisses = 0;
    ghostLastEcho = now;
    ghostEverEchoed = true;
    // El sonido corre a 343 m/s: 0,0343 cm cada microsegundo. Y va y vuelve,
    // así que la distancia es la mitad: microsegundos / 58.
    int16_t cm = (int16_t)(us / 58);
    if (ghost.cm < 0) {
      // Venimos de «nada»: empezamos de cero con esta medida.
      ghostRecent[0] = ghostRecent[1] = ghostRecent[2] = cm;
    } else {
      ghostRecent[ghostNext] = cm;
    }
    ghostNext = (ghostNext + 1) % 3;
    ghost.cm = median3(ghostRecent[0], ghostRecent[1], ghostRecent[2]);
  }

  ghost.sensor = ghostEverEchoed && now - ghostLastEcho < GHOST_SENSOR_TIMEOUT_MS;
  ghost.level = ghostLevelFrom(ghost.cm);
}
