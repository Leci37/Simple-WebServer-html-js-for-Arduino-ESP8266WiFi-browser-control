// ✏️ Limpiar un alias: el nombre que se pone quien entra en los récords de la
// clase de ¡Salta, Chispa!.
//
// Sin <>"& (que nadie cuele HTML en la tableta de otro), sin caracteres de
// control, sin espacios a los lados y con 12 letras como mucho. En UTF-8 una
// letra ocupa de 1 a 4 bytes (la «ñ», 2; un emoji, 4): se cuentan letras, no
// bytes, y lo que no es UTF-8 válido se tira. clean_alias() de
// tools/simulador.py hace lo mismo, y las pruebas comparan los dos.
//
// Va en su pestaña y sin nada de Arduino para poder probarlo en el ordenador.
#pragma once

#include <stddef.h>
#include <stdint.h>
#include <string.h>

const uint8_t ALIAS_CHARS = 12;
// Lo que ocupa como mucho un alias limpio, con su '\0' al final.
const size_t ALIAS_SIZE = 4 * ALIAS_CHARS + 1;

// Cuántos bytes tiene la letra UTF-8 que empieza en s; 0 si no es válida
// (cortada, demasiado larga o una de las que UTF-8 prohíbe).
inline size_t utf8Length(const uint8_t* s, size_t left) {
  uint8_t c = s[0];
  size_t n;
  uint8_t low = 0x80, high = 0xBF;  // dónde puede caer el segundo byte
  if (c < 0x80) return 1;
  if (c >= 0xC2 && c <= 0xDF) {
    n = 2;
  } else if (c >= 0xE0 && c <= 0xEF) {
    n = 3;
    if (c == 0xE0) low = 0xA0;   // si no, la letra cabría en menos bytes
    if (c == 0xED) high = 0x9F;  // las mitades de UTF-16 no son letras
  } else if (c >= 0xF0 && c <= 0xF4) {
    n = 4;
    if (c == 0xF0) low = 0x90;
    if (c == 0xF4) high = 0x8F;  // más allá de U+10FFFF no hay nada
  } else {
    return 0;
  }
  if (left < n || s[1] < low || s[1] > high) return 0;
  for (size_t i = 2; i < n; i++) {
    if (s[i] < 0x80 || s[i] > 0xBF) return 0;
  }
  return n;
}

// La letra que se tira aunque sea válida: <>"&, los caracteres de control (los
// de siempre, DEL y los de U+0080 a U+009F) y U+FFFD, el «?» con que se
// sustituye lo que no se entiende (así la placa y el simulador, que lo recibe
// ya sustituido, dejan el mismo alias).
inline bool aliasDrops(const uint8_t* s, size_t n) {
  if (n == 1) return s[0] < 0x20 || s[0] == 0x7F || strchr("<>\"&", s[0]) != NULL;
  if (n == 2) return s[0] == 0xC2 && s[1] <= 0x9F;
  return n == 3 && s[0] == 0xEF && s[1] == 0xBF && s[2] == 0xBD;
}

// Deja en out (de outSize >= ALIAS_SIZE bytes) el alias limpio de los length
// bytes de in, y devuelve cuántos bytes tiene. Es como, en JavaScript,
// quitar lo de arriba, .trim() y .slice(0, 12), pero contando letras.
inline size_t cleanAlias(const char* in, size_t length, char* out, size_t outSize) {
  const uint8_t* s = (const uint8_t*)in;
  size_t used = 0;       // bytes en out
  size_t untilWord = 0;  // bytes en out hasta la última letra que no es espacio
  uint8_t letters = 0;
  bool full = false;  // ya hay 12: sólo queda ver si detrás hay algo más que espacios
  size_t i = 0;
  while (i < length) {
    size_t n = utf8Length(s + i, length - i);
    if (n == 0) {
      i++;  // un byte suelto que no es UTF-8: fuera
      continue;
    }
    if (aliasDrops(s + i, n)) {
      i += n;
      continue;
    }
    bool space = n == 1 && s[i] == ' ';
    if (full) {
      // Si detrás de las 12 hay una letra, los espacios del final de las 12 no
      // son «los de un lado»: se quedan.
      if (!space) untilWord = used;
      i += n;
      if (!space) break;
      continue;
    }
    if (space && used == 0) {
      i++;  // los espacios del principio
      continue;
    }
    if (used + n >= outSize) break;  // no pasa con outSize >= ALIAS_SIZE
    memcpy(out + used, s + i, n);
    used += n;
    if (!space) untilWord = used;
    i += n;
    if (++letters == ALIAS_CHARS) full = true;
  }
  out[untilWord] = '\0';
  return untilWord;
}
