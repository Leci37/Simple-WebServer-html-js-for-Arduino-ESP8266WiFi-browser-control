// 🧪 Laboratorio de inventos — para la placa NodeMCU (ESP8266).
//
// Tres inventos en una sola placa:
//   🚦 el semáforo, con su botón de peatones;
//   🎤 el sonómetro: el semáforo dice cuánto ruido hay;
//   👻 el detector de fantasmas: un radar que avisa cuando algo se acerca.
// Se juega y se programa con bloques desde el móvil o la tableta: la web
// vive dentro de la placa.
//
// Para subirlo: en Herramientas > Placa, «NodeMCU 1.0 (ESP-12E Module)», y
// el botón «Subir». No hace falta ninguna librería aparte.
//
// Cada pestaña es una parte del invento:
//   config.h     ⚙️ la wifi y los pines (lo que se puede cambiar)
//   lights.h     🚦 las luces, el semáforo y el botón
//   sound.h      🎤 el micrófono
//   ghost.h      👻 el sensor de distancia
//   buzzer.h     🔊 el zumbador
//   network.h    📶 la wifi
//   records.h    🏆 los récords de la clase de ¡Salta, Chispa!, en la flash
//   alias.h      ✏️ cómo se limpia el alias de un récord
//   web_api.h    🌐 la web y sus órdenes
//   web_pages.h  📄 las páginas (no se toca: sale de la carpeta web/)

#include "config.h"
#include "settings.h"
#include "buzzer.h"
#include "sound.h"
#include "ghost.h"
#include "lights.h"
#include "network.h"
#include "records.h"
#include "web_api.h"

// Al arrancar, cada luz se enciende con su nota: si alguna no se enciende,
// está mal conectada (o el LED está del revés).
void helloLights() {
  const uint8_t pins[] = {PIN_RED, PIN_YELLOW, PIN_GREEN};
  const uint16_t notes[] = {523, 659, 784};  // do, mi, sol
  for (uint8_t i = 0; i < 3; i++) {
    digitalWrite(pins[i], HIGH);
    beep(notes[i], 150);
    delay(250);
    digitalWrite(pins[i], LOW);
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println(F("¡Hola! Soy el Laboratorio de inventos " LAB_VERSION "."));

  buzzerBegin();
  lightsBegin();
  soundBegin();
  ghostBegin();
  helloLights();
  recordsBegin();
  networkBegin();
  webBegin();
  lightsStart();
}

void loop() {
  networkLoop();
  webLoop();
  soundLoop();
  ghostLoop();
  lightsLoop();
}
