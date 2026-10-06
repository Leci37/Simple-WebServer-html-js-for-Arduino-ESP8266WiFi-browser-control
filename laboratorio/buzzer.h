// 🔊 El zumbador.
// Un zumbador pasivo suena a la nota que le pidas: hay que hacerlo vibrar
// tantas veces por segundo como hercios tiene la nota (el La, 440 veces).
#pragma once

#include "config.h"

void buzzerBegin() {
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
}

// tone() no espera a que acabe la nota: la placa sigue atendiendo a la web.
void beep(uint16_t hz, uint16_t ms) {
  if (hz == 0 || ms == 0) {
    noTone(PIN_BUZZER);
    return;
  }
  tone(PIN_BUZZER, hz, ms);
}
