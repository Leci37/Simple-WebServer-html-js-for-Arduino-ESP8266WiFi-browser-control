// ⚙️ Configuración del Laboratorio de inventos.
// Lo que se puede cambiar sin miedo está aquí: el nombre de la wifi y los pines.
#pragma once

#include <Arduino.h>

#define LAB_VERSION "1.2.1"

// --- La wifi -----------------------------------------------------------------
// La placa crea su propia wifi, «Laboratorio-XXXX». Las cuatro últimas letras
// salen del número de serie de cada placa: en una clase con varias, no se mezclan.
#define WIFI_AP_PREFIX "Laboratorio-"

// Contraseña de esa wifi. Vacía = wifi abierta. Si pones una, de 8 letras o más.
#define WIFI_AP_PASSWORD ""

// Opcional: para usarla con la wifi de casa, escribe aquí su nombre y su
// contraseña. Si en 15 segundos no consigue entrar, crea su propia wifi.
#define WIFI_HOME_SSID ""
#define WIFI_HOME_PASSWORD ""

// La dirección con nombre: http://laboratorio.local
#define LAB_HOSTNAME "laboratorio"

// --- Los pines ---------------------------------------------------------------
// Los nombres D1, D5… sólo existen si en el IDE está elegida la placa NodeMCU
// (o Wemos D1 mini, que tiene los mismos). Con la «genérica» no existen.
#ifdef ARDUINO_ESP8266_GENERIC
#error "Elige la placa «NodeMCU 1.0 (ESP-12E Module)» en Herramientas > Placa"
#endif

// 🚦 Las tres luces del semáforo (cada una con su resistencia de 220 Ω).
#define PIN_RED D5
#define PIN_YELLOW D6
#define PIN_GREEN D7

// 🔊 El zumbador (opcional): suena en el detector de fantasmas y en los bloques.
#define PIN_BUZZER D8

// 🎤 El micrófono: su pata de señal (OUT o AO) va a A0, la única analógica.
#define PIN_MIC A0

// 👻 El sensor de distancia por ultrasonidos (HC-SR04 o HC-SR04P).
#define PIN_TRIG D1
#define PIN_ECHO D2

// 🔘 El botón FLASH que ya trae la placa: es el botón de los peatones.
#define PIN_BUTTON D3

// 💙 La lucecita azul de la placa: parpadea para decir «estoy viva».
#define PIN_STATUS_LED LED_BUILTIN
