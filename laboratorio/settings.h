// Los ajustes que se cambian desde la web (los deslizadores de cada invento).
// Viven en la memoria: al apagar la placa vuelven a estos valores.
#pragma once

#include <Arduino.h>

struct Settings {
  // 🎤 Sonómetro: a partir de qué nivel de ruido (0-100) se enciende cada luz.
  uint8_t soundYellow = 45;
  uint8_t soundRed = 70;
  // Sensibilidad del micrófono en %: cada modelo oye distinto.
  uint16_t soundGain = 100;
  // Pitar cuando hay demasiado ruido.
  bool soundAlarm = false;

  // 👻 Detector de fantasmas: distancias en centímetros.
  uint16_t ghostNear = 20;  // más cerca que esto: ¡espectro! (rojo)
  uint16_t ghostFar = 60;   // más cerca que esto: algo se mueve (amarillo)
  bool ghostSound = true;   // pitidos que se aceleran al acercarse

  // 🚦 Semáforo automático: 1 = tortuga, 2 = normal, 3 = liebre.
  uint8_t trafficSpeed = 2;
};

Settings settings;
