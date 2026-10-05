# El Laboratorio en la plataforma (propuesta)

Hoy el Laboratorio funciona solo: la placa crea su wifi, sirve su web y no
sabe nada de tuisku. Esto es una **propuesta** de cómo entraría en la
plataforma zlecitool, sin perder eso. Las decisiones marcadas «del dueño»
están por tomar; nada de esto está hecho.

Las piezas del núcleo que se nombran son las de su
[CONTRATO.md](https://github.com/Leci37/zlecitool-core/blob/develop/CONTRATO.md)
en la 0.19.

## 1. Qué se gana

| Hoy (sólo la placa) | Con la plataforma |
|---|---|
| Los programas de bloques y los retos, en el navegador de cada tableta | En la cuenta: se siguen desde otra tableta o desde casa |
| Cada placa, una isla | «Mis placas»: las de la clase, si están encendidas, su versión, sus sensores |
| Programar es arrastrar bloques | Además, **«Programa con una frase»**: la IA propone los bloques y el niño los entiende y los cambia |
| Sólo en español | Los idiomas de la plataforma (con euskera, catalán y gallego) |
| Las fichas de montaje, en la pantalla | También en PDF para imprimir y repartir en clase |

## 2. Lo que no cambia: la placa sigue sola

El firmware, su wifi, su portal cautivo, su web y su API siguen igual: **la
placa funciona sin internet**, en un aula sin wifi o en un campamento. La
plataforma es un extra para cuando hay red. Una placa sin ficha (abajo) es
exactamente la de hoy.

## 3. Una herramienta nueva: `lab`

Desde la plantilla, como todas: `zlecitool-lab`, slug `lab`, trabajando en
`_ztool_main`.

- **¿Pública o de empresa?** (del dueño). La propuesta: **de empresa**
  (`rename_tool.py --business`), con el **colegio como empresa**: sus profes
  son sus personas (dueño, administradores, miembros), sus placas y sus
  tabletas, sus máquinas, y la IA se paga con el saldo del colegio. Las
  familias podrían entrar después como herramienta pública, o con la puerta
  abierta (`"door": "open"`, 0.19) para mirar sin colegio.
- **Pantallas:** «Mis placas», «Programas de la clase» (el editor de bloques,
  el mismo `bloques.js`), «Retos» y «Programa con una frase».
- **Lo que vive en la herramienta:** sus tablas `lab_board`, `lab_program`,
  `lab_challenge`, con `org_id` (del colegio) y filtradas por
  `current_org().id`; sus prompts; su copia de `web/` para el editor.

## 4. Las placas, como máquinas del núcleo (0.18)

El núcleo ya tiene justo esto: **máquinas** que no son personas.

- **Alta:** quien administra el colegio la da de alta en «Empresa» (o
  `flask zt org device <colegio> "Placa 1" --token --tool lab`) y recibe una
  **ficha de API** `ztk_…`, que se enseña una vez.
- **En la placa:** la ficha va en `config.h`, como la wifi. La placa llama a
  la herramienta por HTTPS con `Authorization: Bearer ztk_…` (sin token CSRF:
  no hay cookies) a vistas `@device(api=True)`:
  - `POST /lab/api/latido`: cada minuto, su versión, su modo y sus sensores
    (para «Mis placas»);
  - `GET /lab/api/programa`: el programa que el profe le ha mandado, si lo hay.
- **Nunca la contraseña de una persona en la placa** (CONTRATO, «lo que no se
  hace»): para eso está la ficha, que se revoca desde «Empresa».
- **La tableta de la clase,** un navegador **emparejado** con su código
  (`/zt/pair`): entra en la pantalla de la clase (`@device(home=True)`) sin
  que ningún niño teclee una contraseña.

**Sin librerías nuevas en el firmware:** HTTPS con `WiFiClientSecure`
(BearSSL), que viene con el núcleo ESP8266. Hay que cuidar tres cosas, con
su prueba en el simulador antes de nada:

- la **memoria**: el compilador deja unos 50 kB libres y la wifi y el
  servidor se llevan parte; BearSSL cabe con búferes pequeños
  (`setBufferSizes(512, 512)`), y la conexión se abre, se usa y se cierra;
- el **certificado**: nada de `setInsecure()`; el certificado raíz del
  dominio en la flash (`setTrustAnchors`) y la hora por NTP (`configTime`),
  que validar un certificado la necesita;
- que **sin red, nada se pare**: si la plataforma no contesta, la placa
  sigue con lo suyo y lo intenta más tarde.

## 5. Los niños no tienen cuenta

Son menores: en España, por debajo de 14 años tratar sus datos pide el
consentimiento de padres o tutores (RGPD y LOPDGDD). La propuesta es no
necesitarlo: **las cuentas son de los profes** (y, si llegan, de las
familias); los niños usan las tabletas emparejadas y las placas, y sus
programas son «de la clase» o llevan un alias, sin nombre ni correo. Lo
decide el dueño y lo revisa alguien que sepa de derecho, como las páginas
legales del núcleo.

## 6. «Programa con una frase»: la IA

«Haz que el semáforo parpadee en amarillo hasta que alguien pulse el botón»
→ la IA escribe el programa en el JSON de los bloques, y el editor lo enseña
como bloques: se lee, se entiende, se cambia y se ejecuta (nunca se ejecuta
solo).

- Un prompt con versión, `lab/prompts/programa.v1.md`, con su **esquema**
  (`programa.v1.schema.json`, 0.12): sólo los tipos de bloque que existen
  (`light_on`, `wait`, `repeat`…), con sus parámetros y límites. Así la
  respuesta siempre tiene una forma que el editor sabe pintar.
- Su respuesta de muestra para la IA falsa (`programa.v1.example.json`): las
  pruebas no gastan.
- En un trabajo (`jobs.submit`) que cobra con `charge("programa")` al acabar
  bien; el precio, en `tool.json`.
- Y debajo, «¿Te ha servido?» (`zt_feedback`): la calidad de cada versión del
  prompt, en el panel.

Lo peor que puede pedir la IA es encender una luz o pitar: la placa sólo
entiende sus órdenes.

## 7. Qué pone el núcleo y qué no

| Hace falta | Pieza del núcleo | |
|---|---|---|
| Cuentas de los profes, sesión común | cuentas (0.2) | ✅ |
| El colegio, sus personas y sus papeles | empresas e invitaciones (0.16) | ✅ |
| El saldo del colegio para la IA | saldo de la empresa (0.17) | ✅ |
| Las placas, con su ficha de API | máquinas, `@device(api=True)` (0.18) | ✅ |
| Las tabletas de la clase | navegador emparejado, `@device(home=True)` (0.18) | ✅ |
| Idiomas, con euskera, catalán y gallego | `"languages"` (0.18) | ✅ |
| IA con respuesta de forma garantizada | prompts con esquema (0.12) | ✅ |
| Fichas de montaje en PDF | PDF híbrido (0.4) | ✅ |
| El tutorial de bienvenida | `"tour"` (0.13) | ✅ |
| El cliente de la placa (C++, HTTPS con la ficha) | — | Va en este repo: el núcleo es Python |

No hace falta pedirle nada al núcleo para empezar.

## 8. Pasos

1. **Del dueño:** pública o de empresa, el nombre y el slug (`lab`), y los
   menores (sección 5).
2. Apuntarla en el núcleo (README y `docs/HERRAMIENTAS.md`) como herramienta
   en camino.
3. **Este repo:** la ficha en `config.h`, el cliente HTTPS (latido y
   programa) con su prueba en el simulador, y que sin ficha todo siga igual.
4. **`zlecitool-lab`** desde la plantilla: «Mis placas», «Programas de la
   clase», los retos, `check_tool` en verde.
5. La IA: el prompt, su esquema, su muestra y su precio.
6. Probar con un colegio de verdad, con las placas y las tabletas de clase.
