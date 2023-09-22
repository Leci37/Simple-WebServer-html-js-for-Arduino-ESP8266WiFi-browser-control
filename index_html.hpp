const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE HTML>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <title>Bolas Carro</title>
        <!-- <script src="https://polyfill.io/v3/polyfill.min.js?features=default"></script>
    <link  href="./location_bolas.csv">
    <link  href="./location_bolas.json">
    <link  href="file://location_bolas.json">
    <link  href="file://location_bolas.css">
     <script src="./location_bolas.css" defer></script> -->

        <style>
            html {
                font-family: Helvetica;
                display: inline-block;
                margin: 0px auto;
                text-align: center;
                height: 100%;
                width: 100%;
            }
            body {
                min-height: 100%;
                min-width: 100%;
            }

            .button {
                background-color: #195B6A;
                color: white;
            }

            button {
                padding: 16px 40px;
                font-size: 2rem;
                border-radius: .5rem;
                text-decoration: none;
                font-size: 30px;
                margin: 2px;
                cursor: pointer;
            }

            .buttonAux {
                margin: 1rem;
                padding: 1rem 2rem;
                font-size: 1rem;
                border-radius: .25rem;
                text-decoration: none;
                font-size: 15px;
                margin: 1px;
                cursor: pointer;
            }

            /* 
Loading button animation       https://www.cssscript.com/animated-button-loader/  */
            */ .button__loader {
                background-color: #77878A;
            }

            :root {
                --first-color: #5d6cc0;
                --first-color-alt: #4b5cb9;
                --text-color: #f9f9fb;
            }

            .button__loader {
                border: none;
                outline: none;
                position: relative;
                background-color: #5d6cc0;
                color: #f9f9fb;
                font-size: 2rem;
                border-radius: .5rem;
                box-shadow: 0 18px 40px #5063ce;
                overflow: hidden;
                cursor: wait;
            }

            .button__loader::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 150;
                background: repeating-linear-gradient(60deg,
                        transparent,
                        transparent 0.75rem,
                        #4b5cb9 0.75rem,
                        #4b5cb9 1.5rem);
                animation: load 1s infinite linear;
            }

            .button__text {
                position: relative;
            }

            @keyframes load {
                100%{
                    transform: translateX(-1.75rem);
                }
            }

            button:disabled,
            button[disabled] {
                border: 1px solid #999999;
                background-color: #cccccc;
                color: #666666;
            }
            .counterDiv{
                text-align: left;
                font-size: 0.5rem;
                font-family: "Lucida Console", sans-serif;
                margin-left: 5rem;
            }

            /* CSS */
            .button-35 {
                background-color: #fff;
                box-shadow: transparent 0 0 0 3px, rgba(18, 18, 18, .1) 0 6px 20px;
                box-sizing: border-box;
                color: #121212;
                cursor: pointer;
                display: inline-flex;
                font-family: Inter, sans-serif;
                justify-content: center;
                line-height: 1;
                margin: 0;
                outline: none;
                text-align: center;
                text-decoration: none;
                transition: box-shadow .2s, -webkit-box-shadow .2s;
                white-space: nowrap;
                border: 0;
                user-select: none;
                -webkit-user-select: none;
                touch-action: manipulation;
            }

            .button-35:hover {
                box-shadow: #121212 0 0 0 3px, transparent 0 0 0 0;
            }


            /* CSS */
            .button-70 {
                background-image: linear-gradient(#0dccea, #27ae60);
                box-shadow: rgba(0, 0, 0, .3) 0 5px 15px;
                box-sizing: border-box;
                color: #fff;
                cursor: pointer;
                user-select: none;
                -webkit-user-select: none;
                touch-action: manipulation;
            }

            /* CSS */
            .button-87 {
                transition: 0.5s;
                color: white;
                border: 0px;
                box-shadow: 0px 0px 14px -7px #f09819;
                background-image: linear-gradient(45deg, #FF512F 0, #FF512F 100%);
                cursor: pointer;
                user-select: none;
                -webkit-user-select: none;
                touch-action: manipulation;
            }

            .button-87:hover {
                /* change the direction of the change here */
                color: #fff;
                text-decoration: none;
            }

            .button-87:active {
                transform: scale(0.95);
            }
            .button-descargando {
                transition: 0.5s;
                color: white;
                border: 0px;
                box-shadow: 0px 0px 14px -7px #e6ff75;
                background-image: linear-gradient(10deg, #FF512F 0, #fc9a08 100%);
                cursor: pointer;
                user-select: none;
                -webkit-user-select: none;
                touch-action: manipulation;
            }
            .button-descargando {
                transform: scale(0.95);
            }

            body {
                max-width: 600px;
                margin: 0px auto;
                padding-bottom: 12px;
            }

            .switch {
                position: relative;
                display: inline-block;
                width: 60px;
                height: 34px
            }

            .switch input {
                display: none
            }

            .slider {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                border-radius: 34px
            }

            .slider:before {
                position: absolute;
                content: "";
                height: 26px;
                width: 26px;
                left: 4px;
                bottom: 4px;
                background-color: #fff;
                -webkit-transition: .4s;
                transition: .4s;
                border-radius: 15px
            }

            input:checked+.slider {
                background-color: #2196F3
            }

            input:checked+.slider:before {
                -webkit-transform: translateX(26px);
                -ms-transform: translateX(26px);
                transform: translateX(26px)
            }

            /* 
 * Always set the map height explicitly to define the size of the div element
 * that contains the map. 
 */
            #map {
                height: 100%;
            }

            /* 
 * Optional: Makes the sample page fill the window. 
 */
            html,
            body {
                height: 100%;
                margin: 0;
                padding: 0;
            }

            .gmnoprint {
                z-index: 0;
                margin: 0;
                padding: 0;
                position: absolute;
                cursor: pointer;
                height: 5%;
                margin: 0.2%;
                user-select: none;
                position: absolute;
                top: 5%;
                right: 40%;
            }
        </style>


        <script>// NO MAPS FUNTIONS


            var btn_subir = document.getElementById("id_subir");
            var btn_bajar = document.getElementById("id_bajar");

            function toggleCheckbox(element) {
                var xhr = new XMLHttpRequest();
                if (element.checked) {
                    xhr.open("GET", "/update?output=" + element.id + "&state=1", true);
                } else {
                    xhr.open("GET", "/update?output=" + element.id + "&state=0", true);
                }
                xhr.send();
            }

            function apally_CSS_buttons() {

                btn_subir = document.getElementById("id_subir");
                btn_bajar = document.getElementById("id_bajar");
                //await sleep(10);
                get_btn_subir_enable();
                get_btn_bajar_enable();
                //await sleep(10);


                if (btn_bajar.disabled) {
                    document.getElementById("id_subir").className = 'button__loader';
                    document.getElementById("id_subir").textContent = "SUBIENDO"
                    console.log('info', "boton subir class loader ");
                }
                if (!btn_bajar.disabled) {
                    document.getElementById("id_subir").className = "button";
                    document.getElementById("id_subir").textContent = "SUBIR"
                }

                if (btn_subir.disabled) {
                    document.getElementById("id_bajar").className = 'button__loader';
                    document.getElementById("id_bajar").textContent = "BAJANDO"
                    console.log('info', "boton bajar class loader ");
                }
                if (!btn_subir.disabled) {
                    document.getElementById("id_bajar").className = "button";
                    document.getElementById("id_bajar").textContent = "BAJAR"
                }
            }

            function toggleCheckboxBu(element) {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", "/button?output=" + element.id + "&state=1", false);//It is not asny 
                xhr.send();
                console.log('info', "press button:  " + "/button?output=" + element.id + "&state=1");

                apally_CSS_buttons();
            }





            function btn_subir_enable(is_enable) {
                var isTrueSet = (is_enable === " disabled ");
                console.log('info', "boton subir es : " + is_enable + " isTrueSet: " + isTrueSet);
                btn_subir.disabled = isTrueSet;

            }


            function btn_bajar_enable(is_enable) {
                var isTrueSet = (is_enable === " disabled ");
                console.log('info', "boton bajar es : " + is_enable + " isTrueSet: " + isTrueSet);
                btn_bajar.disabled = isTrueSet;
            }


            function get_btn_subir_enable() {
                var xmlhttp = new XMLHttpRequest();
                xmlhttp.onreadystatechange = function () {
                    if (xmlhttp.readyState == XMLHttpRequest.DONE) {
                        if (xmlhttp.status == 200) {
                            btn_subir_enable(xmlhttp.responseText);
                        } else {
                            console.log('error', xmlhttp);
                        }
                    }
                };
                xmlhttp.open("GET", "subir_is_enable", false);//It is not asny 
                xmlhttp.send();
            }

            function get_btn_bajar_enable() {
                var xmlhttp = new XMLHttpRequest();
                xmlhttp.onreadystatechange = function () {
                    if (xmlhttp.readyState == XMLHttpRequest.DONE) {
                        if (xmlhttp.status == 200) {
                            btn_bajar_enable(xmlhttp.responseText);
                        } else {
                            console.log('error', xmlhttp);
                        }
                    }
                };
                xmlhttp.open("GET", "bajar_is_enable", false);//It is not asny 
                xmlhttp.send();
            }


            var counterDiv = document.getElementById('counterDiv');

            function updateCounterUI(counter) {
              counterDiv = document.getElementById('counterDiv');
              counterDiv.innerHTML = counter;
              navigator.geolocation.getCurrentPosition(showPosition);//LOCATION REAL TIME
            }

            function ajaxCall_milisecond() {
                var xmlhttp = new XMLHttpRequest();
                xmlhttp.onreadystatechange = function () {
                    if (xmlhttp.readyState == XMLHttpRequest.DONE) {
                        if (xmlhttp.status == 200) {
                            updateCounterUI(xmlhttp.responseText);
                        } else {
                            console.log('error', xmlhttp);
                        }
                    }
                };
                xmlhttp.open("GET", "GetMillis", true);
                xmlhttp.send();
            }


            function ajaxCall_puerta_carro() {
                var xmlhttp = new XMLHttpRequest();
                xmlhttp.onreadystatechange = function () {
                    if (xmlhttp.readyState == XMLHttpRequest.DONE) {
                        if (xmlhttp.status == 200) {
                            var response = xmlhttp.responseText
                            if (response.includes("tapa_abierta")) {
                                document.getElementById("id_tapa").className = 'button-87';
                                document.getElementById("id_tapa").textContent = "ABIERTA"
                            }
                            else if (response.includes("tapa_cerrada")) {
                                document.getElementById("id_tapa").className = 'button-35';
                                document.getElementById("id_tapa").textContent = "CERRADA"
                            }

                            if (response.includes("carro_lleno")) {
                                document.getElementById("id_carro").className = 'button-70';
                                document.getElementById("id_carro").textContent = "LLENO"
                            }
                            else if (response.includes("carro_vacio")) {
                                document.getElementById("id_carro").className = 'button-35';
                                document.getElementById("id_carro").textContent = "VACIO"
                            }
                            
                            if (response.includes("bajando_puerta_carro")) {
                                document.getElementById("id_descargando").style.visibility =  'visible';
                                document.getElementById("id_descargando").className = 'button-descargando';
                                document.getElementById("id_descargando").textContent = "BAJANDO PUERTA CARRO"
                            }
                            else if (response.includes("descargando")) {
                                document.getElementById("id_descargando").style.visibility =  'visible';
                                document.getElementById("id_descargando").className = 'button-descargando';
                                document.getElementById("id_descargando").textContent = "ESPERA DESCARGA"
                            }
                            else if (response.includes("subiendo_puerta_carro")) {
                                document.getElementById("id_descargando").style.visibility =  'visible';
                                document.getElementById("id_descargando").className = 'button-descargando';
                                document.getElementById("id_descargando").textContent = "SUBIENDO PUERTA CARRO"
                            }
                            else {
                                document.getElementById("id_descargando").style.visibility = 'hidden';
                                document.getElementById("id_descargando").className = 'button-35';
                                document.getElementById("id_descargando").textContent = "---"
                            }
                            
                            console.log('debug', "estado de los valores tapa y carro : " + response);
                            //counterDiv.innerHTML = counterDiv.innerHTML + "\n<br>" + xmlhttp.responseText
                        } else {
                            console.log('error', xmlhttp);
                        }
                    }
                };
                xmlhttp.open("GET", "tapa_carro", true);
                xmlhttp.send();
            }

            function scheduleAjax() {
                ajaxCall_milisecond();
                ajaxCall_puerta_carro();
                apally_CSS_buttons();
            };
            setInterval(scheduleAjax, 320);//https://stackoverflow.com/questions/1350446/how-to-schedule-ajax-calls-every-n-seconds
// NO MAPS FUNTIONS
        </script>

        <script>
// MAPS FUNTIONS
            var allow_geo_location = false;
            document.addEventListener("DOMContentLoaded", function () {
                allow_geo_location = navigator.geolocation;
                getLocation();
            });


            // BARANDA 43.023297,-3.507562
            //	43.023,-3.507\n\
            const SEPARATOR = "|"
            var myCSV = "latitude,longitude" + SEPARATOR + "43.02631913,-3.50734879" + SEPARATOR + "43.020478902,-3.507431028" + SEPARATOR + "43.020618305,-3.507443839" + SEPARATOR + "43.020616835,-3.507439146" + SEPARATOR + "43.02051947,-3.507435768" + SEPARATOR + "43.020662595,-3.507327813" + SEPARATOR + "43.020681659,-3.507351705" + SEPARATOR + "43.020535092,-3.507481367" + SEPARATOR + "43.020621188,-3.507270555" + SEPARATOR + "43.020700909,-3.507442979" + SEPARATOR + "43.020637663,-3.50745152";
            // +SEPARATOR+"43.020470746,-3.507458918" +SEPARATOR+"43.020618698,-3.507435833" +SEPARATOR+"43.020482215,-3.507492603" +SEPARATOR+"43.020672914,-3.50735934" +SEPARATOR+"43.020700051,-3.507351278" +SEPARATOR+"43.020689591,-3.507452239" +SEPARATOR+"43.020679776,-3.507314089" +SEPARATOR+"43.020612099,-3.507469095" +SEPARATOR+"43.020689999,-3.50746322" +SEPARATOR+"43.020707851,-3.507320707" +SEPARATOR+"43.020468173,-3.507444071" +SEPARATOR+"43.020702792,-3.50738221" +SEPARATOR+"43.020628631,-3.507488097" +SEPARATOR+"43.020701499,-3.50737622" +SEPARATOR+"43.02070974,-3.50737377" +SEPARATOR+"43.020537526,-3.507478315" +SEPARATOR+"43.020476472,-3.507501711" +SEPARATOR+"43.020558423,-3.507327948" +SEPARATOR+"43.020472122,-3.507404199" +SEPARATOR+"43.020423251,-3.507444489" +SEPARATOR+"43.020691161,-3.50737192" +SEPARATOR+"43.020566663,-3.507332644" +SEPARATOR+"43.020713182,-3.507411227" +SEPARATOR+"43.020423251,-3.507444489" +SEPARATOR+"43.02048742,-3.507462459" +SEPARATOR+"43.020658246,-3.507375469" +SEPARATOR+"43.020479553,-3.507463317" +SEPARATOR+"43.02049857,-3.507420925" +SEPARATOR+"43.02058514,-3.507403736" +SEPARATOR+"43.020658812,-3.507542345" +SEPARATOR+"43.020493955,-3.50748966" +SEPARATOR+"43.02041653,-3.507379653" +SEPARATOR+"43.02072027,-3.507331555" +SEPARATOR+"43.020699251,-3.507371414" +SEPARATOR+"43.020613765,-3.507488694" +SEPARATOR+"43.020450543,-3.507432538";

            const NAME_SAVER = "BOLAS_SAVER"
            var data_long_lat = myCSV.split(SEPARATOR);
            var dataShift = data_long_lat.shift() //remove the header from data_long_lat var

            var new_bolas = "44.020493955,3.50748966"

            //make use of it:
            if (supports_html5_storage() == true) {
                localStorage.setItem(NAME_SAVER, data_long_lat.join(SEPARATOR));//ALMACENO
                var myDataString = localStorage.getItem(NAME_SAVER).split(SEPARATOR); //RECOGO
                var add_myDataString = (myDataString.join(SEPARATOR)) + SEPARATOR + new_bolas;//AÑADO
                localStorage.setItem(NAME_SAVER, add_myDataString);//RE ALMACENO 
                var FULL_myDataString = localStorage.getItem(NAME_SAVER).split(SEPARATOR);

                console.log('info', "Las posiciones de las bolas almacenadas son:  " + FULL_myDataString);
            }
            else
                console.log('warn', "BO está soportado el almacenamiento HTML, nada será guardado en:  " + NAME_SAVER);



            var map, infoWindow;
            var marker;
            var actual_Lat_Lgn = [43.023297, -3.507562] //new google.maps.LatLng(43.023297, -3.507562) //BARANDA
            var markers = []; // Create a marker array to hold your markers
            /*
            if (navigator.geolocation) {
              var aa  = navigator.geolocation.getCurrentPosition(success, error);
            } else {
              console.log('warn', 'geolocation not supported');
              alert('geolocation not supported');
            }
            function success(position) {
              alert(position.coords.latitude + ', ' + position.coords.longitude);
              actual_Lat_Lgn = (position.coords.latitude, position.coords.longitude);
            }
            function error(msg) {
              console.log('error', 'geolocation not supported' + msg);
              alert('error: ' + msg);
            }  */

            function initMap() {

                map = new google.maps.Map(document.getElementById("map"), {
                    zoom: 15,
                    center: new google.maps.LatLng(actual_Lat_Lgn[0], actual_Lat_Lgn[1]),
                    mapTypeId: 'satellite' //mapTypeId: "terrain",
                });

                // Create a <script> tag and set the USGS URL as the source.
                const script = document.createElement("script");

                // This example uses a local copy of the GeoJSON stored at
                // http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojsonp
                script.src =
                    "https://developers.google.com/maps/documentation/javascript/examples/json/earthquake_GeoJSONP.js";
                document.getElementsByTagName("head")[0].appendChild(script);

                marker = new google.maps.Marker({
                    map: map,
                    draggable: true,
                    animation: google.maps.Animation.DROP
                    //position: parliament
                });
                infoWindow = new google.maps.InfoWindow({
                    content: 'content'
                });
                /* google.maps.event.addDomListener(map, "click", () => {
                 window.alert("Map was clicked!");
               });
               google.maps.event.addListener(map, 'click', function(){
                 infoWindow.open(marker.get('map'), marker);
                 });  */
                google.maps.event.addDomListener(document.getElementById('BtnId_addMarker'), 'click', function (evt) {
                    //var long, lat;
                    navigator.geolocation.getCurrentPosition(showPosition);
                    console.log('info', "addDomListener(BtnId_addMarker), - Latitude: " + current_lat + "<br>Longitude: " + current_lng);
                    var marker = new google.maps.Marker({
                        position: {
                            lat: current_lat, // parseFloat(document.getElementById('lat').value),
                            lng: current_lng
                        }, //parseFloat(document.getElementById('lng').value)},
                        map: map
                    });
                    markers.push(marker);
                });

                //"Pan to Current Location" https://developers.google.com/maps/documentation/javascript/examples/map-geolocation
                // BTN PONER
                const locationButton = document.createElement("button");
                locationButton.textContent = "Ubicación"; //https://developers.google.com/maps/documentation/javascript/examples/map-geolocation
                locationButton.classList.add("gmnoprint");
                map.controls[google.maps.ControlPosition.TOP_CENTER].push(locationButton);
                locationButton.addEventListener("click", () => {
                    // Try HTML5 geolocation.
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                            (position) => {
                                const pos = {
                                    lat: position.coords.latitude,
                                    lng: position.coords.longitude,
                                };
                                infoWindow.setPosition(pos);
                                infoWindow.setContent("Location found.");
                                infoWindow.open(map);
                                map.setCenter(pos);
                                //Add nueva posicion to markers []
                                var myLatLng = new google.maps.LatLng(position.coords.longitude, position.coords.latitude);
                                var marker = new google.maps.Marker({
                                    position: myLatLng,
                                    map: map,
                                    animation: google.maps.Animation.DROP
                                });
                                markers.push(marker);
                            },
                            () => {
                                handleLocationError(true, infoWindow, map.getCenter());
                            }
                        );
                    } else {
                        // Browser doesn't support Geolocation
                        handleLocationError(false, infoWindow, map.getCenter());
                    }
                });
            }

            function setMarkers(locations) { //https://stackoverflow.com/questions/22773651/reload-markers-on-googles-maps-api

                for (var i = 0; i < locations.length; i++) {
                    var beach = locations[i].split(",");
                    var myLatLng = new google.maps.LatLng(beach[0], beach[1]);
                    console.log('info', " setMarkers - Poner chincheta en Long: " + beach[0] + " Lat: " + beach[1]);
                    var marker = new google.maps.Marker({
                        position: myLatLng,
                        map: map,
                        animation: google.maps.Animation.DROP
                    });

                    // Push marker to markers array
                    markers.push(marker);
                }
            }
            function reloadMarkers() {
                // Loop through markers and set map to null for each
                for (var i = 0; i < markers.length; i++) {
                    markers[i].setMap(null);
                }
                // Reset the markers array
                markers = [];
                // Call set markers to re-add markers
                setMarkers(data_long_lat);
            }



            function poner_chincheta_en_mapa(longitud, latitud) {
                const latLng = new google.maps.LatLng(longitud, latitud);
                console.log('info', "poner_chincheta_en_mapa - Poner chincheta en Long: " + longitud + " Lat: " + latitud);
                new google.maps.Marker({
                    position: latLng,
                    map: map,
                });
            }


            // Loop through the results array and place a marker for each
            // set of coordinates.
            const eqfeed_callback = function (results) {
                if (data_long_lat == null || data_long_lat.length == 0) {
                    console.log('info', " No hay chinchetas que poner, data_long_lat es null o cero");
                    return;
                }
                setMarkers(data_long_lat);
                //for (let i = 0; i < results.features.length; i++) {
                /*for (let i = 0; i < data_long_lat.length; i++) {
                  var latLng_2 = data_long_lat[i].split(',')
                  //poner_chincheta_en_mapa(latLng_2[0],latLng_2[1] )
                   const latLng = new google.maps.LatLng(latLng_2[0], latLng_2[1]);
              
                  new google.maps.Marker({
                    position: latLng,
                    map: map,
                  });
                }*/
            };

            window.initMap = initMap;
            window.eqfeed_callback = eqfeed_callback;






            function borrar_registro_bolas() {
                if (confirm("¿Estas seguro de borrar el historial de Chinchetas?")) {
                    console.log('info', "borrar_registro_bolas - Borrado todas las referencia de: " + NAME_SAVER);
                    localStorage.removeItem(NAME_SAVER);
                    data_long_lat = "";

                    //eqfeed_callback();
                    reloadMarkers();
                    google.maps.event.trigger(map, 'resize');
                }
            };


            function supports_html5_storage() {
                try {
                    return 'localStorage' in window && window['localStorage'] !== null;
                } catch (e) {
                    return false;
                }
            }


            var actual_position = document.getElementById("id_getLocation");
            function getLocation() {
                if (allow_geo_location) { //(navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(showPosition);
                    //showPosition(position)
                    //return  {lat: position.coords.latitude, lng: position.coords.longitude} ;
                    // lat, //parseFloat(document.getElementById('lat').value),
                    //lng: long} position.coords.longitude , position.coords.latitude;
                } else {
                    console.log('warn', " Geolocation is not supported by this browser. ");
                    actual_position.innerHTML = "Geolocation is not supported by this browser.";
                    //return null;
                }
            }
            var current_lng;
            var current_lat;
            var MAPS_URL = "https://maps.google.com/?q="; // https://maps.google.com/?q=43.135249,-3.359685  lat , lon
            //IMPORTANTE hacer esto para la directiva de seguridad https://stackoverflow.com/questions/49896961/a-geolocation-request-can-only-be-fulfilled-in-a-secure-context

            function showPosition(position) {
                actual_position = document.getElementById("id_getLocation");
                console.log('info', "showPosition - Latitude: " + position.coords.latitude + "  Longitude: " + position.coords.longitude);
                current_lng = position.coords.longitude;
                current_lat = position.coords.latitude;
                actual_position.innerHTML = "Latitud: " + position.coords.latitude +
                    " Longitud: " + position.coords.longitude;
                url = MAPS_URL +position.coords.latitude+","+position.coords.longitude;
                nuevas_bola = "<br><a href=\""+url+"\">Bola geolocalización</a> ";
                actual_position.innerHTML = actual_position.innerHTML + nuevas_bola
            }

            function handleLocationError(browserHasGeolocation, infoWindow, pos) {
                infoWindow.setPosition(pos);
                infoWindow.setContent(
                    browserHasGeolocation
                        ? "Error: The Geolocation service failed."
                        : "Error: Your browser doesn't support geolocation."
                );
                infoWindow.open(map);
            }

// MAPS FUNTIONS
        </script>
  </head >
  <body>
        <!-- <a href="192.168.4.1">HOME</a> -->
        <h5>ESP8266 Web Server</h5>
        <p><span>Date/Time: </span><span id="datetime"><script>var dt = new Date();document.getElementById("datetime").innerHTML=dt.toLocaleString();</script>
        </span></p>

        %AUTOPLACEHOLDER%<br>
        <h1>Carro Bolas</h1>
        <p></p>
        %BUTTONPLACEHOLDER%


        <h1>Tapa        Carro</h1>
        <button id="id_tapa" class="button-35" enable="">NO DATA</button>
        <button id="id_carro" class="button-35" enable="">NO DATA</button>
        <br> 
        <button id="id_descargando" class="button-descargando" style="visibility: hidden;">---</button>

        <br>
        <p id="id_getLocation">id_getLocation</p>
        <p>Millis</p>
        <div id="counterDiv" class="counterDiv" >---</div>
        


        <!--   <br><h1>Carro Bolas</h1><p></p>
    <p>GPIO 5 - State off_subir Subir:  enable </p>
<p><button id="id_subir" class="button" enable="" onmousedown="toggleCheckboxBu(this);">SUBIR</button></p>
<p>GPIO 4 - State off_bajar Bajar:  enable </p>
<p><button id="id_bajar" class="button" enable="" onmousedown="toggleCheckboxBu(this);">BAJAR</button></p>-->



 <!-- 
        <h2 style="margin-block-start:0.8em; margin-block-end:0.1em;">Ubicación Chinchetas</h2>
        <button id="BtnId_addMarker" class="buttonAux">Poner</button>-->
        <!--  onclick="getLocation();  https://stackoverflow.com/questions/45814530/adding-markers-to-google-map-on-button-click -->
  <!--        <button class="buttonAux" onclick="borrar_registro_bolas();">Borrar Todas</button>
        <br><p id="id_getLocation">id_getLocation</p>
        <div id="map" style="top:0.4%; bottom:2%; width:98%; height:90%"></div>-->

        <!-- <input type="file" id="file-input" />
<h3>Contents of the file:</h3>
<pre id="file-content"></pre>

    
     The `defer` attribute causes the callback to execute after the full HTML
     document has been parsed. For non-blocking uses, avoiding race conditions,
     and consistent behavior across browsers, consider loading using Promises
     with https://www.npmjs.com/package/@googlemaps/js-api-loader.
    -->
        <script
            src="https://maps.googleapis.com/maps/api/js?key=AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg&callback=initMap&v=weekly"
            defer></script>
        </body>

</html>

)rawliteral";