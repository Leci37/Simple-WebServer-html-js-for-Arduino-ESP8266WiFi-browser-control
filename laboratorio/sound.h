// 🎤 El sonómetro: cuánto ruido hay, de 0 (silencio) a 100 (¡ensordecedor!).
//
// El micrófono da una señal que sube y baja con el sonido. En silencio casi
// no se mueve; con una palmada da saltos enormes. Por eso no miramos cada
// lectura, sino la distancia entre la más alta y la más baja de un ratito.
#pragma once

#include "config.h"
#include "settings.h"

// Con la wifi encendida, la placa no lee A0 más deprisa que una vez cada 5 ms
// (devolvería la lectura anterior), y leerla sin pausa puede tumbar la wifi.
const unsigned long SOUND_SAMPLE_MS = 5;
// 30 lecturas = 150 ms: un ratito corto, para que la web vaya al ritmo de la voz.
const uint8_t SOUND_WINDOW = 30;
// El pico se queda quieto 2 segundos, como en los ecualizadores.
const unsigned long SOUND_PEAK_HOLD_MS = 2000;

struct SoundState {
  uint8_t level = 0;   // 0-100: lo que enseñan la web y las luces
  uint8_t peak = 0;    // el nivel más alto de los últimos 2 segundos
  uint16_t raw = 0;    // lectura más alta menos la más baja (0-1023)
  bool mic = false;    // ¿parece que hay un micrófono conectado?
};

SoundState sound;

static unsigned long soundLastSample = 0;
static unsigned long soundPeakAt = 0;
static uint16_t soundMin = 1023;
static uint16_t soundMax = 0;
static uint32_t soundSum = 0;
static uint8_t soundSamples = 0;
static float soundSmooth = 0;

// Un sonido el doble de fuerte no nos parece el doble: el oído va a saltos,
// y por eso los decibelios usan logaritmos. Aquí hacemos lo mismo.
uint8_t soundLevelFrom(float peakToPeak) {
  const float QUIET = 4;   // lo que se mueve la señal en silencio
  const float LOUD = 700;  // una palmada muy cerca del micrófono
  if (peakToPeak <= QUIET) return 0;
  float level = 100.0f * log10f(peakToPeak / QUIET) / log10f(LOUD / QUIET);
  return (uint8_t)constrain(level, 0.0f, 100.0f);
}

void soundBegin() {
  pinMode(PIN_MIC, INPUT);
}

void soundLoop() {
  unsigned long now = millis();
  if (now - soundLastSample < SOUND_SAMPLE_MS) return;
  soundLastSample = now;

  uint16_t value = analogRead(PIN_MIC);
  if (value < soundMin) soundMin = value;
  if (value > soundMax) soundMax = value;
  soundSum += value;
  if (++soundSamples < SOUND_WINDOW) return;

  sound.raw = soundMax - soundMin;
  // Sin micrófono, A0 se queda en 0. Con él, la señal descansa a media
  // altura (unos 500): así sabemos si hay que avisar de que falta.
  sound.mic = soundSum / SOUND_WINDOW > 40;

  uint8_t level = soundLevelFrom(sound.raw * settings.soundGain / 100.0f);
  // Sube de golpe y baja despacio: así se ve bien una palmada.
  soundSmooth = level > soundSmooth ? level : soundSmooth * 0.7f + level * 0.3f;
  sound.level = (uint8_t)(soundSmooth + 0.5f);

  if (sound.level >= sound.peak || now - soundPeakAt > SOUND_PEAK_HOLD_MS) {
    sound.peak = sound.level;
    soundPeakAt = now;
  }

  soundMin = 1023;
  soundMax = 0;
  soundSum = 0;
  soundSamples = 0;
}
