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

  // 🔴 CANDADO ESTRICTO DE PESTAÑA: Busca exactamente "PROGRAMA"
  let sheetNamePrg = wbPrograma.SheetNames.find(s => s.trim().toUpperCase() === 'PROGRAMA');
  if (!sheetNamePrg) {
    // Fallback solo si no existe la exacta
    sheetNamePrg = wbPrograma.SheetNames.find(s => s.toUpperCase().includes('PROGRAMA')) || wbPrograma.SheetNames[0];
  }
  
  const jsonProg = XLSX.utils.sheet_to_json(wbPrograma.Sheets[sheetNamePrg], { header: 1 });

  let potEsperaTotal = 0.0;
  let fuegosSuplemenTotal = 0.0;
  const perfilBase24h = Array(24).fill(0);
  const perfilFuegos24h = Array(24).fill(0);

  let filaInicio = -1;
  for (let r = 0; r < jsonProg.length; r++) {
    const fila = jsonProg[r];
    if (!Array.isArray(fila)) continue;
    const textoFila = fila.slice(0, 5).join('').toUpperCase().replace(/\s+/g, '');
    if (textoFila.includes('NUEVARENCA_TG1+TV1_DIESEL') || textoFila.includes('NUEVARENCA_TG1+TV1_GN_A')) {
      filaInicio = r;
      break;
    }
  }
  
  if (filaInicio !== -1) {
    const bloque = jsonProg.slice(filaInicio, filaInicio + 25);
    bloque.forEach(row => {
      const textoFila = row.slice(0, 5).join('').toUpperCase().replace(/\s+/g, '');
      if (!textoFila.includes('NUEVARENCA_TG1+TV1')) return;

      const esFuego = textoFila.includes('+FA1_');
      let totalDia = toFloat(row[28]);
      if (totalDia > 0 && totalDia < 100) totalDia *= 1000;

      if (esFuego) fuegosSuplemenTotal += totalDia;
      else potEsperaTotal += totalDia;

      for (let i = 0; i < 24; i++) {
        const val = toFloat(row[i + 4]); 
        if (esFuego) perfilFuegos24h[i] += val;
        else perfilBase24h[i] += val;
      }
    });
  }

  const costoMarginalVal = toFloat(wbPrograma.Sheets[sheetNamePrg]['AC8']?.v) || 50.6;
  const mwHoras = perfilBase24h.map((v, i) => Number((v + perfilFuegos24h[i]).toFixed(1)));
  const mwHorasFuegos = perfilFuegos24h.map(v => Number(v.toFixed(1)));

  // Salvavidas Matemático
  if (potEsperaTotal === 0) {
    potEsperaTotal = perfilBase24h.reduce((a, b) => a + b, 0);
  }
  if (fuegosSuplemenTotal === 0) {
    fuegosSuplemenTotal = perfilFuegos24h.reduce((a, b) => a + b, 0);
  }

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

  console.log(`\n✅ [VERSIÓN DEFINITIVA V5 - CANDADO DE PESTAÑA] Archivo: ${file.name}`);
  console.log(`- 📑 Pestaña leída: ${sheetNamePrg}`);
  console.log(`- Potencia Espera extraída: ${potEsperaTotal} MW | Hrs CB: ${hrsCB} | Hrs MT: ${hrsMT}`);

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
