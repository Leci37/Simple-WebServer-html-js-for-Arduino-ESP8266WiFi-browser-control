
function toggleCheckbox(element) {
	var xhr = new XMLHttpRequest();
	if (element.checked) {
		xhr.open("GET", "/update?output=" + element.id + "&state=1", true);
	} else {
		xhr.open("GET", "/update?output=" + element.id + "&state=0", true);
	}
	xhr.send();
}

function apally_CSS_buttons(){

  btn_subir = document.getElementById("id_subir");
  btn_bajar = document.getElementById("id_bajar");
   //await sleep(10);
   get_btn_subir_enable();
   get_btn_bajar_enable();
   //await sleep(10);


   if (btn_bajar.disabled){
      document.getElementById("id_subir").className = 'button__loader';
      document.getElementById("id_subir").textContent = "SUBIENDO"
      console.log('info', "boton subir class loader ");
   }
   if (!btn_bajar.disabled){
      document.getElementById("id_subir").className = "button";
      document.getElementById("id_subir").textContent = "SUBIR"
   }

   if (btn_subir.disabled){
      document.getElementById("id_bajar").className = 'button__loader';
      document.getElementById("id_bajar").textContent = "BAJANDO"
      console.log('info', "boton bajar class loader ");
   }
   if (!btn_subir.disabled){
      document.getElementById("id_bajar").className = "button";
      document.getElementById("id_bajar").textContent = "BAJAR"
   }
}

function toggleCheckboxBu(element) {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "/button?output=" + element.id + "&state=1", false);//It is not asny 
	xhr.send();
   console.log('info', "press button:  "+  "/button?output=" + element.id + "&state=1");

   apally_CSS_buttons();
}




var btn_subir = document.getElementById("id_subir");
var btn_bajar = document.getElementById("id_bajar");
function btn_subir_enable(is_enable) {
   var isTrueSet = (is_enable === " disabled ");
	console.log('info', "boton subir es : " + is_enable + " isTrueSet: "+isTrueSet);
	btn_subir.disabled = isTrueSet;

}


function btn_bajar_enable(is_enable) {
   var isTrueSet = (is_enable === " disabled ");
	console.log('info', "boton bajar es : " + is_enable + " isTrueSet: "+isTrueSet);
	btn_bajar.disabled = isTrueSet;
}


function get_btn_subir_enable() {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
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
	xmlhttp.onreadystatechange = function() {
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
	counterDiv.innerHTML = counter;
}

function ajaxCall_milisecond() {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
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
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == XMLHttpRequest.DONE) {
			if (xmlhttp.status == 200) {
            var response = xmlhttp.responseText
            if(response.includes("tapa_abierta")) {
               document.getElementById("id_tapa").className = 'button-87';
               document.getElementById("id_tapa").textContent = "ABIERTA"
            }
            else if(response.includes("tapa_cerrada")){
               document.getElementById("id_tapa").className = 'button-35';
               document.getElementById("id_tapa").textContent = "CERRADA"
            }

            if(response.includes("carro_lleno")) {
               document.getElementById("id_carro").className = 'button-70';
               document.getElementById("id_carro").textContent = "LLENO"
            }
            else if(response.includes("carro_vacio")){
               document.getElementById("id_carro").className = 'button-35';
               document.getElementById("id_carro").textContent = "VACIO"
            }
            console.log('debug', "estado de los valores tapa y carro : "+response);
            counterDiv.innerHTML = counterDiv.innerHTML  + "\n<br>"+ xmlhttp.responseText
			} else {
				console.log('error', xmlhttp);
			}
		}
	};
	xmlhttp.open("GET", "tapa_carro", true);
	xmlhttp.send();
}

(function scheduleAjax() {
	ajaxCall_milisecond();
   ajaxCall_puerta_carro();
   apally_CSS_buttons();
	setTimeout(scheduleAjax, 1000);
})();
