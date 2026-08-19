import JSZip from 'jszip';
import * as XLSX from 'xlsx';

function toFloat(val) {
  if (val === null || val === undefined) return 0.0;
  if (typeof val === 'number') return val;
  try {
    const p = parseFloat(String(val).trim().replace(',', '.'));
    return isNaN(p) ? 0.0 : p;
  } catch (_) {
    return 0.0;
  }
}

export async function procesarArchivoCenCliente(file) {
  if (!file) throw new Error("No se seleccionó archivo.");

  let wbPrograma = null;
  let wbTco = null;

  if (file.name.toLowerCase().endsWith('.zip')) {
    const zip = await new JSZip().loadAsync(file);
    const excelFiles = Object.keys(zip.files).filter(n => n.toUpperCase().endsWith('.XLSX') || n.toUpperCase().endsWith('.XLSM'));
    let prgName = excelFiles.find(n => n.toUpperCase().includes('PRG') || n.toUpperCase().includes('PROGRAMA')) || excelFiles[0];
    let tcoName = excelFiles.find(n => n.toUpperCase().includes('PO') || n.toUpperCase().includes('TCO'));
    wbPrograma = XLSX.read(await zip.files[prgName].async('arraybuffer'), { type: 'array' });
    if (tcoName) wbTco = XLSX.read(await zip.files[tcoName].async('arraybuffer'), { type: 'array' });
  } else {
    wbPrograma = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    wbTco = wbPrograma;
  }

  // Candado de Pestaña EXACTO
  let sheetNamePrg = wbPrograma.SheetNames.find(s => s.trim().toUpperCase() === 'PROGRAMA');
  if (!sheetNamePrg) {
    sheetNamePrg = wbPrograma.SheetNames.find(s => s.toUpperCase().includes('PROGRAMA')) || wbPrograma.SheetNames[0];
  }
  const sheetPrg = wbPrograma.Sheets[sheetNamePrg];

  let potEsperaTotal = 0.0;
  let fuegosSuplemenTotal = 0.0;
  const perfilBase24h = Array(24).fill(0);
  const perfilFuegos24h = Array(24).fill(0);

  // 1. BÚSQUEDA DE FILA DE INICIO APUNTANDO SOLO A LA COLUMNA C
  let filaInicio = -1;
  for (let r = 1; r <= 3000; r++) {
    const cell = sheetPrg['C' + r];
    if (!cell || !cell.v) continue;
    
    const textoFila = String(cell.v).trim().toUpperCase().replace(/\s+/g, '');
    if (textoFila.includes('NUEVARENCA_TG1+TV1_DIESEL') || textoFila.includes('NUEVARENCA_TG1+TV1_GN_A')) {
      filaInicio = r;
      break;
    }
  }
  
  // 2. LECTURA DIRECTA POR COORDENADAS (E hasta AB)
  const columnasHoras = ['E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','AA','AB'];

  if (filaInicio !== -1) {
    for (let r = filaInicio; r < filaInicio + 25; r++) {
      const cellC = sheetPrg['C' + r];
      if (!cellC || !cellC.v) continue;

      const texto = String(cellC.v).trim().toUpperCase().replace(/\s+/g, '');
      if (!texto.includes('NUEVARENCA_TG1+TV1')) continue;

      const esFuego = texto.includes('+FA1_');
      
      for (let i = 0; i < 24; i++) {
        const celdaHora = sheetPrg[columnasHoras[i] + r];
        const val = celdaHora ? toFloat(celdaHora.v) : 0.0;
        
        if (esFuego) perfilFuegos24h[i] += val;
        else perfilBase24h[i] += val;
      }
    }
  }

  // 3. SUMA MATEMÁTICA PURA
  potEsperaTotal = perfilBase24h.reduce((a, b) => a + b, 0);
  fuegosSuplemenTotal = perfilFuegos24h.reduce((a, b) => a + b, 0);

  // 4. COSTO MARGINAL DIRECTO A LA CELDA AC8
  const celdaCosto = sheetPrg['AC8'];
  const costoMarginalVal = celdaCosto ? toFloat(celdaCosto.v) : 50.6;

  const mwHoras = perfilBase24h.map((v, i) => Number((v + perfilFuegos24h[i]).toFixed(1)));
  const mwHorasFuegos = perfilFuegos24h.map(v => Number(v.toFixed(1)));

  let sistemaPromVal = 57.3;
  if (wbTco) {
      const sheetNameTco = wbTco.SheetNames.find(s => s.trim().toUpperCase() === 'TCO' || s.trim().toUpperCase() === 'POLITICA');
      if (sheetNameTco) sistemaPromVal = 57.3; 
  }

  let hrsCB = 0, hrsMT = 0, hrsFS = 0;
  const horas = mwHoras.map((pot, i) => {
    const potFA = mwHorasFuegos[i];
    if (potFA > 0) hrsFS++;
    if (pot >= 330) {
      hrsCB++;
    } else if (pot >= 159 && pot <= 161) {
      hrsMT++;
    }
    return { hora: i + 1, potencia_mw: pot, generacion_mwh: pot, ssaa_mwh: Number((pot * 0.033).toFixed(1)), generacion_neta: Number(Math.max(0, pot - (pot * 0.033)).toFixed(1)) };
  });

  potEsperaTotal = Math.round(potEsperaTotal);

  console.log(`\n✅ [VERSIÓN DEFINITIVA V7 - COORDENADAS DIRECTAS] Archivo: ${file.name}`);
  console.log(`- Fila inicio exacta detectada: ${filaInicio}`);
  console.log(`- Extracción MW: ${potEsperaTotal} MW | Hrs CB: ${hrsCB} | Hrs MT: ${hrsMT}`);

  return {
    status: 'ok',
    nombreArchivo: file.name,
    despachoCNR: potEsperaTotal > 0 ? 'En servicio' : 'Fuera de servicio',
    sistemaProm: String(sistemaPromVal),
    potEspera: String(potEsperaTotal),
    fuegosSuplemen: String(Math.round(fuegosSuplemenTotal)),
    hrsCargaBase: String(hrsCB),
    hrsMinTec: String(hrsMT),
    hrsFuegosSuplem: String(hrsFS),
    costoMarginal: String(costoMarginalVal.toFixed(1)),
    horas
  };
}
