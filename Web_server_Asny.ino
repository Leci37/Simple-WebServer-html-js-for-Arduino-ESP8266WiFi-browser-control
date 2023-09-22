/*********
  Rui Santos
  Complete project details at https://RandomNerdTutorials.com/esp32-async-web-server-espasyncwebserver-library/
  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.
*********/

// Import required libraries
//#include <WiFi.h>
#include <ESP8266WiFi.h>
//#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>

//#include <ESP8266WiFi.h>
#include <ESPAsyncTCP.h>
//#include <ESPAsyncWebServer.h>
#include <FS.h>

#include <Ticker.h>

#include "index_html.hpp"


// Replace with your network credentials
const char ssid[] = "NodeMCU-ESP8266";    //Definimos la SSDI de nuestro servidor WiFi -nombre de red- 
//const char password[] = "12345678";       //Definimos la contraseña de nuestro servidor 

const char* PARAM_INPUT_1 = "output";
const char* PARAM_INPUT_2 = "state";


// Auxiliar variables to store the current output state
String output_subir_5State = "off_subir";
String output_bajar_4State = "off_bajar";
 // Assign output variables to GPIO pins
const int PIN_SUBIR_5 = 5;
const int PIN_BAJAR_4 = 4;
const int LED_BUILTIN_16 = 16;

const int PIN_INPUT_TAPA_12 = 12;
const int PIN_INPUT_CARRO_14 = 14;

int is_working_auto = 0;
int count_tapa_abierta = 0;

// Create AsyncWebServer object on port 80
AsyncWebServer server(80);



String return_log_info = "inicio";
#include <ESPDateTime.h>
String GetMillis(){
  //Logger_Print("GetMillis - ");
  //Logger_Println(DateTime.getTime());
  return DateTime.toString() + "<br>"+  return_log_info ; //DateTime.getTime(); //DateTime.now(); 
}
String text_a; 
String text_b; 
String text_c; 
String text_d; 
String text_e; 
String text_LN = ""; 
void Logger_Println(String text){
	Serial.println(text);
  text_e = text_d;
  text_d = text_c;
	text_c = text_b;
	text_b = text_a;
	text_a = text_LN +" "+text;
	return_log_info = text_a +" <br>\n "+ text_b +" <br>\n " + text_c +" <br>\n "+ text_d +" <br>\n " + text_e ;
  text_LN = ""; 
}
void Logger_Print(String text){
	Serial.print(text); 
	text_LN = text_LN +" "+text;
}

void notFound(AsyncWebServerRequest *request) {
  Logger_Println(" AsyncWebServerRequest 404, text/plain, Not found");
  request->send(404, "text/plain", "Not found");
}

String outputState(int output){
  if(digitalRead(output)){
    return "checked";
  }
  else {
    return "";
  }
}


String boton_enable(String tip){
  if(tip == "BAJAR"){
    if(digitalRead(PIN_SUBIR_5) == HIGH){
      //Logger_Println("boton_enable tip "+tip + " BAJAR   disable" );
      return " disabled ";
      
    }
    return " enable ";
  }
  else if(tip == "SUBIR"){
    if(digitalRead(PIN_BAJAR_4) == HIGH){
      //Logger_Println("boton_enable tip "+tip + " SUBIR   disable" );
      return " disabled ";
    }
    return " enable ";
  }
  Logger_Println("WARN boton_enable  Tipo_pin no es valiudo (no se hace nada) ");
  return "";
}


#define MAX_TIME_WORK  4000
 //https://techtutorialsx.com/2021/08/07/esp32-ticker-library/
Ticker onceTicker;
void delay_stop_subir() {
    //delay(MAX_TIME_WORK);
    output_subir_5State = "off_subir";
    digitalWrite(PIN_SUBIR_5, LOW);
}
void delay_stop_bajar() {
    //delay(MAX_TIME_WORK);
    output_bajar_4State = "off_bajar";
    digitalWrite(PIN_BAJAR_4, LOW);
}

bool ledState = 0;
Ticker timer_led_control_blink;
void led_control_blink() {
  digitalWrite(LED_BUILTIN, ledState);
  digitalWrite(LED_BUILTIN_16, ledState);
  ledState = !ledState;
}
/*Ticker timer_cambio_estado_tapa;
void cambio_estado_tapa() {
  digitalWrite(LED_BUILTIN, ledState);
  digitalWrite(LED_BUILTIN_16, ledState);
  ledState = !ledState;
}*/
 

void subir_CHANGE() {
    Logger_Println("DEBUG GPIO 5 on_subir");
    if(digitalRead(PIN_SUBIR_5) == HIGH){
       Logger_Println("INFO se para el proceso de SUBIDA por el usuario");
       output_subir_5State = "off_subir";
       digitalWrite(PIN_SUBIR_5, LOW);
       return;
    }
    if(digitalRead(PIN_BAJAR_4) == HIGH){
       Logger_Println("WARN se esta tratando de SUBIR cuando el PIN bajar esta activo (se anula la operacion)");
       return;
    }
    output_subir_5State = "on_subir";
    digitalWrite(PIN_SUBIR_5, HIGH);
    Logger_Print("INFO SUBIENDO hasta que finalice  el tiempo: ");
    Logger_Println(String(MAX_TIME_WORK));
    onceTicker.once_ms(MAX_TIME_WORK, delay_stop_subir);
}

void bajar_CHANGE() {
    Logger_Println("DEBUG GPIO 4 on_bajar");
    if(digitalRead(PIN_BAJAR_4) == HIGH){
       Logger_Println("INFO se para el proceso de BAJADA por el usuario");
       output_bajar_4State = "off_bajar";
       digitalWrite(PIN_BAJAR_4, LOW);
       return;
    }
    if(digitalRead(PIN_SUBIR_5) == HIGH){
       Logger_Println("WARN se esta tratando de BAJAR cuando el PIN subir esta activo (se anula la operacion)");
       return;
    }
    output_bajar_4State = "on_bajar";
    digitalWrite(PIN_BAJAR_4, HIGH);
    Logger_Print("INFO BAJANDO hasta que finalice  el tiempo: ");
    Logger_Println(String(MAX_TIME_WORK));
    onceTicker.once_ms(MAX_TIME_WORK, delay_stop_bajar);
}



const String ID_SUBIR = "id_subir";
const String ID_BAJAR = "id_bajar";
const String ID_AUTO = "id_auto";
bool auto_State = 0;

// Replaces placeholder with button section in your web page
String processor(const String& var){
  //Logger_Println(var);
  if(var == "BUTTONPLACEHOLDER"){
    String buttons ="";
    String event_button = "  onmousedown=\"toggleCheckboxBu(this);\" " ; // ontouchstart=\"toggleCheckboxBu(\'on\');\" onmouseup=\"toggleCheckboxBu(\'off\');\" ontouchend=\"toggleCheckboxBu(\'off\');\" ";  
    Logger_Println(event_button);
    //buttons += "<p>GPIO 5 - State " + output_subir_5State + " Subir: "+boton_enable("SUBIR")+"</p>\n";
    buttons += "<p><button  id=\""+ID_SUBIR+"\" class=\"button\" "+boton_enable("SUBIR")+"  " + event_button +" ><span class=\"button__text\">SUBIR</span></button></p>\n";
    //buttons += "<p>GPIO 4 - State " + output_bajar_4State + " Bajar: "+boton_enable("BAJAR")+"</p>\n";
    buttons += "<p><button  id=\""+ID_BAJAR+"\" class=\"button\"  "+boton_enable("BAJAR")+"   " + event_button +" ><span class=\"button__text\">BAJAR</span></button></p>\n";

    //https://randomnerdtutorials.com/esp32-esp8266-relay-web-server/
    /*for(int i=1; i<=NUM_RELAYS; i++){
      String relayStateValue = relayState(i);
      buttons+= "<h4>Relay #" + String(i) + " - GPIO " + String(relayGPIOs[i-1]) + "</h4><label class=\"switch\"><input type=\"checkbox\" onchange=\"toggleCheckbox(this)\" id=\"" + String(i) + "\" "+ relayStateValue +"><span class=\"slider\"></span></label>";
    }*/
    return buttons;
  }
  if(var == "AUTOPLACEHOLDER"){
    String buttons ="";
    String outputStateValue = " checked=\"unchecked\" "; //outputState();
    buttons+= "<h5>AUTOMATICO<span id=\"outputState\"></span></h5><label class=\"switch\"><input type=\"checkbox\" onchange=\"toggleCheckbox(this)\" id=\""+ID_AUTO+"\" " + outputStateValue + "><span class=\"slider\"></span></label>";
    return buttons;
  }
  return String();
}


String get_tapa_carro(){
  String sensorResult = "";
  if(digitalRead(PIN_INPUT_TAPA_12)){
    sensorResult += "tapa_abierta";
  }
  else {
    sensorResult += "tapa_cerrada";
  }
  sensorResult += "__";
  if(digitalRead(PIN_INPUT_CARRO_14)){
    sensorResult += "carro_lleno";
  }
  else {
    sensorResult += "carro_vacio";
  }
  if(is_working_auto == 1){
    sensorResult += "__bajando_puerta_carro";
  }
  else if(is_working_auto == 2){
    sensorResult += "__descargando";
  }
  else if(is_working_auto == 3){
    sensorResult += "__subiendo_puerta_carro";
  }
  else if(is_working_auto == 4){
    sensorResult += "__error_auto_sensor_bloked";
  }
  else {
    sensorResult += "";
  }
  return sensorResult;
}

bool debe_permanecer_esperando_AUTO(){
  if( ! digitalRead(PIN_INPUT_CARRO_14)){
    if( ! digitalRead(PIN_INPUT_TAPA_12)){
      return false;
    }
  }
  return true;
  //return digitalRead(PIN_INPUT_CARRO_14) != LOW & digitalRead(PIN_INPUT_TAPA_12) != LOW;
}


void modo_AUTOmatico(){
  if(is_working_auto != 0 || (auto_State == 0)){
    Logger_Println("AUTO Return Esta trabajando el proceso de apertura y cierre automatico, no se prosigue (standar)");
    return;
  }

  if(digitalRead(PIN_INPUT_TAPA_12) == HIGH && digitalRead(PIN_INPUT_CARRO_14) == LOW ){
    Logger_Println("AUTO Está cayendo la 1º Bola al carro  permanecer en espera mientras tapa abierta y carro vacio ");
    delay(2000);
    while(digitalRead(PIN_INPUT_CARRO_14) == LOW) {delay(100);Serial.println("AUTO 21 ");}
    delay(2000);
    //
    while(digitalRead(PIN_INPUT_TAPA_12) == HIGH) {delay(100);Serial.println("AUTO 31 ");}
    while(digitalRead(PIN_INPUT_CARRO_14) == LOW) {delay(100);Serial.println("AUTO 31 ");}
    Logger_Println("AUTO Ha caido la 1º Bola: carro  lleno tapa cerrada ");
    delay(3000);
    return;
  }

  if (digitalRead(PIN_INPUT_CARRO_14) == HIGH) 
  {
    for(int i = 0; i<6; i++){
      delay(333);
      if (digitalRead(PIN_INPUT_CARRO_14) != HIGH || (auto_State == 0)) {
        //Logger_Println("Bola en carro por más de 6 segundos ");
        return;
      }
    }
    Logger_Println("AUTO 2º Bola en carro por más de 2 segundos detectada ");

    //while(digitalRead(DATA_PIN) != LOW) {}

    if (digitalRead(PIN_INPUT_TAPA_12) == HIGH && digitalRead(PIN_INPUT_CARRO_14) == HIGH) {
        delay(500);
        if(is_working_auto != 0 || (auto_State == 0)){
          Logger_Println("AUTO Return  Está trabajando el proceso de apertura y cierre automatico, no se prosigue (digitalRead(PIN_INPUT_TAPA_12) == HIGH) ");
          return;
        }
        if (digitalRead(PIN_INPUT_TAPA_12) == HIGH && digitalRead(PIN_INPUT_CARRO_14) == HIGH){
            is_working_auto = 1;
            Logger_Println("AUTO Bajar tapa automatico, la 2º bola ha permanecido en el carro por 6s y la tapa abierta 500ms");
            bajar_CHANGE();
            delay(MAX_TIME_WORK);
            is_working_auto = 2;
            Logger_Println("AUTO Permanece esperando hasta el carro se descargue, puerta del carro está abajo ");
            while(debe_permanecer_esperando_AUTO()) {delay(100);Serial.println("AUTO 1 ");}
            delay(1000);//se comprueba tres veces el resultado 
            while(debe_permanecer_esperando_AUTO()) {delay(100);Serial.println("AUTO 21 ");}
            delay(1000);//se comprueba tres veces el resultado 
            while(debe_permanecer_esperando_AUTO()) {delay(100);Serial.println("AUTO 31 ");}

            Logger_Println("AUTO Tapa cerrada y carro vacio, se espera 12s para subir la puerta del carro  ");
            delay(10000);
            while(debe_permanecer_esperando_AUTO()) {delay(100);Serial.println("AUTO 41 ");}
            delay(2000);
            while(debe_permanecer_esperando_AUTO()) {delay(100);Serial.println("AUTO 51 ");}
            is_working_auto = 3;
            delay(1000);
            if( digitalRead(PIN_INPUT_TAPA_12) == HIGH && digitalRead(PIN_INPUT_CARRO_14) == HIGH){
              Logger_Println("AUTO ERROR la tapa del carro o la puerta siguen bloqueadas  ");
              is_working_auto = 4;
              return;
            }
            subir_CHANGE();
            delay(MAX_TIME_WORK);
            is_working_auto = 0;
            Logger_Println("AUTO carro cerrado, finaliza el ciclo automatico ");
            //while(digitalRead(PIN_INPUT_TAPA_12) == HIGH && digitalRead(PIN_INPUT_CARRO_14) == HIGH) {}
        }

      }
    }
}



void setup(){
  DateTime.begin(15 * 1000);
  // Serial port for debugging purposes
    Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(LED_BUILTIN_16, OUTPUT); 
  digitalWrite(LED_BUILTIN, 1);
  digitalWrite(LED_BUILTIN_16, 1); 
    // Initialize the output variables as outputs
    pinMode(PIN_SUBIR_5, OUTPUT);
    pinMode(PIN_BAJAR_4, OUTPUT);
    pinMode(PIN_INPUT_TAPA_12, INPUT);
    pinMode(PIN_INPUT_CARRO_14, INPUT);
    // Set outputs to LOW
    digitalWrite(PIN_SUBIR_5, LOW);
    digitalWrite(PIN_BAJAR_4, LOW);

/*  if(!SPIFFS.begin()){
    Logger_Println("An Error has occurred while mounting SPIFFS");
    return;
  }
  else{
    Logger_Println("SPIFFS.begin()");

  }*/
  
  // Connect to Wi-Fi
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid); //Red abierta


  // Print ESP Local IP Address
  Logger_Println(WiFi.localIP().toString());


  // Route for root / web page
 server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
    Logger_Print("/ request: ");
    request->send_P(200, "text/html", index_html, processor);
  }); 


  // Receive an HTTP GET request
  server.on("/button", HTTP_GET, [] (AsyncWebServerRequest *request) {
    String inputMessage1;
    String inputMessage2;
    // GET input1 value on <ESP_IP>/update?output=<inputMessage1>&state=<inputMessage2>
    if (request->hasParam(PARAM_INPUT_1) && request->hasParam(PARAM_INPUT_2)) {
      inputMessage1 = request->getParam(PARAM_INPUT_1)->value();
      inputMessage2 = request->getParam(PARAM_INPUT_2)->value();
      if(inputMessage1 == ID_SUBIR){
        subir_CHANGE();
      }
      else if(inputMessage1 == ID_BAJAR){
        bajar_CHANGE();
      }
    }
    else {
      inputMessage1 = "No message sent";
      inputMessage2 = "No message sent";
    }
    Logger_Print("INFO GET BUTTON request: ");
    Logger_Print(String(inputMessage1));
    Logger_Print(" -- ");
    Logger_Print(String(inputMessage2));
    Logger_Println("/ request: ");
    request->send_P(200, "text/html", index_html, processor);
  });



  // Send a GET request to <ESP_IP>/update?output=<inputMessage1>&state=<inputMessage2>
  server.on("/update", HTTP_GET, [] (AsyncWebServerRequest *request) {
    String inputMessage1;
    String inputMessage2;
    // GET input1 value on <ESP_IP>/update?output=<inputMessage1>&state=<inputMessage2>
    if (request->hasParam(PARAM_INPUT_1) && request->hasParam(PARAM_INPUT_2)) {
      inputMessage1 = request->getParam(PARAM_INPUT_1)->value();
      inputMessage2 = request->getParam(PARAM_INPUT_2)->value();
      digitalWrite(inputMessage1.toInt(), inputMessage2.toInt());
    }
    else {
      inputMessage1 = "No message sent";
      inputMessage2 = "No message sent";
    }
    if (inputMessage1 == ID_AUTO){
      Logger_Print("INFO Cambio en el estado del automatico, nuevo valor: ");
      Logger_Println(inputMessage2);
      auto_State = inputMessage2.toInt();
      request->send(200, "text/plain", "GET UPDATE Cambio en el estado del automatico");
    }
    else{
      Logger_Print("INFO GET UPDATE request: ");
      Logger_Print(inputMessage1);
      Logger_Print(" -- ");
      Logger_Println(inputMessage2);
      request->send(200, "text/plain", "GET UPDATE recived message");
    }
  });

   server.on("/GetMillis", HTTP_GET, [](AsyncWebServerRequest *request) {
      request->send(200, "text/plain", GetMillis());
   });

  server.on("/subir_is_enable", HTTP_GET, [](AsyncWebServerRequest *request) {
      request->send(200, "text/plain", boton_enable("SUBIR"));
  });
  server.on("/bajar_is_enable", HTTP_GET, [](AsyncWebServerRequest *request) {
      request->send(200, "text/plain", boton_enable("BAJAR"));
  });
  server.on("/tapa_carro", HTTP_GET, [](AsyncWebServerRequest *request) {
      request->send(200, "text/plain", get_tapa_carro());
   });

  // Start server
  server.begin();
  // Setup complete
  Logger_Println("INFO Setup completed arduino wifi completed");
  digitalWrite(LED_BUILTIN, 0);
  digitalWrite(LED_BUILTIN_16, 0);
  timer_led_control_blink.attach_ms(1500, led_control_blink );
  //timer_cambio_estado_tapa.attach_ms(300, cambio_estado_tapa );
  Logger_Println("");
}


Ticker ticker_AUTO;
void loop() {
  /*Logger_Print("auto_State: ");
  Logger_Print(auto_State);
  Logger_Print("--  is_working_auto: ");
  Logger_Println(is_working_auto);*/
  if(auto_State == 1 && is_working_auto == 0 ){
    modo_AUTOmatico();
    //ticker_AUTO.once_ms(1, modo_AUTOmatico);
  }
  delay(1000);

}
