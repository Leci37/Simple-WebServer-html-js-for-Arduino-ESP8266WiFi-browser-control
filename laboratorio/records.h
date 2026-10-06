// 🏆 Los récords de la clase de ¡Salta, Chispa!: los cinco mejores.
//
// Viven en la memoria flash de la placa (la «EEPROM» que trae el núcleo
// ESP8266, sin librerías aparte): duran aunque se desenchufe y aunque se
// vuelva a cargar el firmware. Se borran con /api/records?clear=1.
// La flash aguanta muchas escrituras, pero no infinitas: sólo se escribe
// cuando alguien entra entre los cinco, y como mucho una vez cada 10 segundos
// (lo que llegue antes espera en la memoria; si justo entonces se desenchufa,
// se pierde ese último).
#pragma once

#include <Arduino.h>
#include <EEPROM.h>

#include "alias.h"

const uint8_t RECORDS_MAX = 5;
const uint32_t RECORD_METERS_MAX = 999999;
// Los mundos del juego (campo, granja y luna), como los llama la API: en el
// orden de WORLD_ORDER y con los nombres de WORLD_API de web/juego.js.
const char* const WORLD_NAMES[] = {"field", "farm", "moon"};
const uint8_t WORLD_COUNT = sizeof(WORLD_NAMES) / sizeof(WORLD_NAMES[0]);
// Así, aunque un programa mande récords en bucle, la flash no se gasta.
const unsigned long RECORDS_SAVE_GAP_MS = 10000;
// Si la flash no empieza por esto, está sin estrenar (o era de otro programa).
const uint32_t RECORDS_MAGIC = 0x5245434C;  // "RECL", y la L de laboratorio

struct Record {
  char alias[ALIAS_SIZE];
  uint32_t meters;
  uint8_t turtle;  // 1: en modo tortuga
  uint8_t world;   // su número en WORLD_NAMES
};

struct RecordTable {
  uint32_t magic;
  uint8_t count;
  Record list[RECORDS_MAX];  // de más metros a menos
};

RecordTable records;
bool recordsDirty = false;      // hay cambios que aún no están en la flash
bool recordsSavedOnce = false;  // ya se ha escrito alguna vez desde que arrancó
unsigned long recordsSavedAt = 0;

// El número del mundo que se llama así, o -1 si no hay ninguno.
int worldFromName(const String& name) {
  for (uint8_t i = 0; i < WORLD_COUNT; i++) {
    if (name == WORLD_NAMES[i]) return i;
  }
  return -1;
}

void recordsSave() {
  EEPROM.put(0, records);
  EEPROM.commit();
  recordsDirty = false;
  recordsSavedOnce = true;
  recordsSavedAt = millis();
}

// Algo ha cambiado: a la flash ya, o en cuanto pasen los 10 segundos.
void recordsChanged() {
  recordsDirty = true;
  if (!recordsSavedOnce || millis() - recordsSavedAt >= RECORDS_SAVE_GAP_MS) recordsSave();
}

// En cada vuelta de loop(): lo que estaba esperando, a la flash.
void recordsLoop() {
  if (recordsDirty && millis() - recordsSavedAt >= RECORDS_SAVE_GAP_MS) recordsSave();
}

void recordsBegin() {
  EEPROM.begin(sizeof(RecordTable));
  EEPROM.get(0, records);
  if (records.magic != RECORDS_MAGIC || records.count > RECORDS_MAX) {
    memset(&records, 0, sizeof(records));
    records.magic = RECORDS_MAGIC;
    return;  // no se escribe hasta el primer récord
  }
  // Por si la flash trae algo raro: cada alias, cerrado, y cada mundo, uno que existe.
  for (uint8_t i = 0; i < records.count; i++) {
    records.list[i].alias[ALIAS_SIZE - 1] = '\0';
    if (records.list[i].world >= WORLD_COUNT) records.list[i].world = 0;
    records.list[i].turtle = records.list[i].turtle ? 1 : 0;
  }
}

// Mete un récord en su sitio y dice en qué puesto ha entrado (de 1 a 5), o 0
// si no entra. Con los mismos metros que otro, va detrás: el otro llegó antes.
uint8_t recordsAdd(const char* alias, uint32_t meters, bool turtle, uint8_t world) {
  uint8_t at = 0;
  while (at < records.count && records.list[at].meters >= meters) at++;
  if (at >= RECORDS_MAX) return 0;
  uint8_t last = records.count < RECORDS_MAX ? records.count : RECORDS_MAX - 1;
  for (uint8_t i = last; i > at; i--) records.list[i] = records.list[i - 1];
  Record& record = records.list[at];
  memset(&record, 0, sizeof(record));
  strncpy(record.alias, alias, ALIAS_SIZE - 1);
  record.meters = meters;
  record.turtle = turtle ? 1 : 0;
  record.world = world < WORLD_COUNT ? world : 0;
  if (records.count < RECORDS_MAX) records.count++;
  recordsChanged();
  return at + 1;
}

void recordsClear() {
  if (records.count == 0) return;
  memset(records.list, 0, sizeof(records.list));
  records.count = 0;
  recordsChanged();
}
