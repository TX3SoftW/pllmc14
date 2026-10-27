const $ = o => document.querySelector(o);

var fCrystal = 10.24; // Frecuencia del cristal en MHz
var fVco = 92.9;      // Frecuencia deseada del VCO en MHz
var P = 64;           // Módulo base del prescaler (64 para 64/65)

// Estado de los pines de dirección RA (1 = Alto/Libre, 0 = Bajo/Masa)
var raPins = { RA2: 1, RA1: 0, RA0: 0 }; 

// ==========================================
// FUNCIÓN PRINCIPAL DE CÁLCULO
// ==========================================
function calcularMC145152(crystal, vco, prescaler, ra) {
    // 1. Determinar el divisor R según la tabla estándar
    const tablaR = {
        "000": 8,   "001": 64,  "010": 128, "011": 256,
        "100": 512, "101": 1024,"110": 1160,"111": 2048
    };
    const llaveRA = `${ra.RA2}${ra.RA1}${ra.RA0}`;
    const R = tablaR[llaveRA];

    if (!R) {
        return { error: "Configuración de pines RA no válida." };
    }

    // 2. Calcular frecuencia de referencia (paso de canal) en MHz
    const fR = crystal / R;

    // 3. Calcular divisor total (N_total) redondeado al entero más cercano
    const nTotal = Math.round(vco / fR);
    const fReal = nTotal * fR; // Frecuencia exacta que se logrará sintonizar

    // 4. Calcular contadores N y A
    const N = Math.floor(nTotal / prescaler);
    const A = nTotal % prescaler;

    // 5. Validar restricciones críticas de hardware del MC145152P2
    let errorHardware = null;
    if (A >= N) errorHardware = `¡Error! A (${A}) debe ser menor que N (${N}). El PLL no enganchará.`;
    if (N < 3 || N > 1023) errorHardware = `¡Error! N (${N}) está fuera del rango permitido (3 a 1023).`;
    if (A < 0 || A > 63) errorHardware = `¡Error! A (${A}) está fuera del rango permitido (0 a 63).`;

    // 6. Convertir a binario con la cantidad de bits correspondiente (LSB a la derecha)
    // El integrado requiere: N = 10 bits, A = 6 bits
    const nBinario = N.toString(2).padStart(10, '0');
    const aBinario = A.toString(2).padStart(6, '0');

    // Mapear pines físicos (ordenados de bit menos significativo LSB a más significativo MSB)
    const mapearPines = (strBinario) => strBinario.split('').reverse().map(Number);

    return {
        frecuenciaReferenciaKHz: fR * 1000,
        divisorR: R,
        divisorTotal: nTotal,
        frecuenciaRealSintonizadaMHz: fReal,
        error: errorHardware,
        contadorN: { decimal: N, binario: nBinario, pines_N0_a_N9: mapearPines(nBinario) },
        contadorA: { decimal: A, binario: aBinario, pines_A0_a_A5: mapearPines(aBinario) }
    };
}

// ==========================================
// EJECUCIÓN Y SALIDA
// ==========================================

function calcular(){
	raPins.RA0 = $("#dip_RA0").checked ? 0 : 1;
	raPins.RA1 = $("#dip_RA1").checked ? 0 : 1;
	raPins.RA2 = $("#dip_RA2").checked ? 0 : 1;
	
	fVco = parseFloat($("#inp_freq").value);
	
	P = parseInt($("#inp_pres").value);
	
	fCrystal = parseFloat($("#inp_cristal").value);
	
	const resultado = calcularMC145152(fCrystal, fVco, P, raPins);

	if(resultado.error !== null){
		alert(resultado.error);
		return;
	}
	
	for(let i = 0; i < 10; i++){
		$("#dip_" + $("#inp_N" + i).value).checked = resultado.contadorN.pines_N0_a_N9[i] ? false : true;
	}
	for(let i = 0; i < 6; i++){
		$("#dip_" + $("#inp_A" + i).value).checked = resultado.contadorA.pines_A0_a_A5[i] ? false : true;
	}
}
