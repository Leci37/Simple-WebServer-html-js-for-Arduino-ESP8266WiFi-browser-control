// 📶 La wifi.
//
// Normalmente la placa crea su propia wifi («Laboratorio-XXXX») y hace de
// «portal cautivo»: al conectarse, el móvil o la tableta abren la web solos,
// como en la wifi de un hotel. Si en config.h está la wifi de casa, prueba
// antes a entrar en ella.
#pragma once

#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include <DNSServer.h>

#include "config.h"

// Una contraseña de wifi de menos de 8 letras no vale: la placa no crearía la wifi.
static_assert(sizeof(WIFI_AP_PASSWORD) == 1 || sizeof(WIFI_AP_PASSWORD) > 8,
              "La contraseña de WIFI_AP_PASSWORD necesita 8 letras o más (o déjala vacía)");

const unsigned long HOME_WIFI_TIMEOUT_MS = 15000;
const IPAddress AP_IP(192, 168, 4, 1);
// Hasta 8 aparatos a la vez en la wifi de la placa (lo más que deja).
const int AP_MAX_CLIENTS = 8;

DNSServer dnsServer;
bool accessPointMode = false;
String boardName;  // el nombre de su wifi, o el de la red de casa

String boardAddress() {
  return (accessPointMode ? WiFi.softAPIP() : WiFi.localIP()).toString();
}

bool joinHomeWifi() {
  if (strlen(WIFI_HOME_SSID) == 0) return false;
  Serial.printf("Entrando en la wifi «%s»", WIFI_HOME_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.hostname(LAB_HOSTNAME);
  WiFi.begin(WIFI_HOME_SSID, WIFI_HOME_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < HOME_WIFI_TIMEOUT_MS) {
    // Mientras busca la wifi, la lucecita azul parpadea deprisa.
    digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED));
    Serial.print('.');
    delay(250);
  }
  Serial.println();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("No he podido entrar: creo mi propia wifi."));
    return false;
  }
  boardName = WIFI_HOME_SSID;
  return true;
}

void startAccessPoint() {
  char name[33];
  snprintf(name, sizeof(name), "%s%04X", WIFI_AP_PREFIX, (unsigned)(ESP.getChipId() & 0xFFFF));
  boardName = name;
  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(AP_IP, AP_IP, IPAddress(255, 255, 255, 0));
  WiFi.softAP(name, WIFI_AP_PASSWORD, 1, 0, AP_MAX_CLIENTS);
  // El DNS contesta «soy yo» a cualquier nombre: así el móvil, al comprobar
  // si hay internet, llega a la placa y abre la web.
  dnsServer.setErrorReplyCode(DNSReplyCode::NoError);
  dnsServer.start(53, "*", AP_IP);
  accessPointMode = true;
}

void networkBegin() {
  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, HIGH);  // apagada (se enciende con LOW)
  // No guardes la wifi en la memoria flash en cada arranque: se gasta.
  WiFi.persistent(false);
  if (!joinHomeWifi()) startAccessPoint();
  MDNS.begin(LAB_HOSTNAME);
  MDNS.addService("http", "tcp", 80);

  Serial.println();
  Serial.println(F("============================================"));
  if (accessPointMode) {
    Serial.printf("1. Conéctate a la wifi: %s\n", boardName.c_str());
    if (strlen(WIFI_AP_PASSWORD) > 0) Serial.printf("   Contraseña: %s\n", WIFI_AP_PASSWORD);
  } else {
    Serial.printf("1. Conéctate a la wifi de casa: %s\n", boardName.c_str());
  }
  Serial.printf("2. Abre en el navegador: http://%s\n", boardAddress().c_str());
  Serial.printf("   (o http://%s.local)\n", LAB_HOSTNAME);
  Serial.println(F("============================================"));
}

void networkLoop() {
  if (accessPointMode) dnsServer.processNextRequest();
  MDNS.update();

  // Latido: un destello azul cada 2 segundos quiere decir «estoy viva».
  digitalWrite(PIN_STATUS_LED, millis() % 2000 < 60 ? LOW : HIGH);
}
