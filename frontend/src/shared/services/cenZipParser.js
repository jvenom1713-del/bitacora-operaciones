import JSZip from 'jszip';
import * as XLSX from 'xlsx';

function toFloat(val) {
  if (val === null || val === undefined) return 0.0;
  if (typeof val === 'number') return val;
  try {
    const parsed = parseFloat(String(val).trim().replace(',', '.'));
    return isNaN(parsed) ? 0.0 : parsed;
  } catch (_) {
    return 0.0;
  }
}

export async function procesarArchivoCenCliente(file) {
  if (!file) throw new Error("No se seleccionó ningún archivo.");

  console.log(`\n🚀 [NUEVO ESCÁNER] Leyendo: ${file.name}`);

  let wbPrograma = null;
  let wbTco = null;
  let nombreExcel = file.name;

  if (file.name.toLowerCase().endsWith('.zip')) {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    const excelFiles = Object.keys(zipContent.files).filter(n => n.toUpperCase().endsWith('.XLSX'));

    if (excelFiles.length === 0) throw new Error("No hay Excel en el ZIP.");

    let prgFileName = excelFiles.find(n => n.toUpperCase().includes('PRG') || n.toUpperCase().includes('PROGRAMA')) || excelFiles[0];
    let tcoFileName = excelFiles.find(n => n.toUpperCase().includes('PO') || n.toUpperCase().includes('TCO'));

    nombreExcel = prgFileName;
    wbPrograma = XLSX.read(await zipContent.files[prgFileName].async('arraybuffer'), { type: 'array' });

    if (tcoFileName) {
      try { wbTco = XLSX.read(await zipContent.files[tcoFileName].async('arraybuffer'), { type: 'array' }); } catch (_) {}
    }
  } else {
    wbPrograma = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    wbTco = wbPrograma;
  }

  const sheetNamePrg = wbPrograma.SheetNames.find(s => s.toUpperCase().includes('PROGRAMA')) || wbPrograma.SheetNames[0];
  const jsonProg = XLSX.utils.sheet_to_json(wbPrograma.Sheets[sheetNamePrg], { header: 1 });

  let potEsperaTotal = 0.0;
  let fuegosSuplemenTotal = 0.0;
  const perfilBase24h = Array(24).fill(0);
  const perfilFuegos24h = Array(24).fill(0);
  
  let leyendoBloque = false;

  // 💥 LA GUILLOTINA: Lectura Táctica (Aisla la Fila 1565 a la 1589)
  for (let r = 0; r < jsonProg.length; r++) {
    const row = jsonProg[r];
    if (!Array.isArray(row) || row.length < 4) continue;

    // Columna C (índice 2) es donde está el nombre en tu Excel
    const nombreCentral = String(row[2] || row[1] || row[0] || '').trim().toUpperCase();
    if (nombreCentral === '') continue;

    const esBase = nombreCentral.startsWith('NUEVARENCA_TG1+TV1_');
    const esFuego = nombreCentral.startsWith('NUEVARENCA_TG1+TV1+FA1_');

    if (esBase || esFuego) {
      leyendoBloque = true;
      
      // Sumar 24 Horas (Columnas E a AB -> Índices 4 a 27)
      for (let i = 0; i < 24; i++) {
        const val = toFloat(row[i + 4]);
        if (esBase) perfilBase24h[i] += val;
        if (esFuego) perfilFuegos24h[i] += val;
      }

      // Sumar Total Diario (Columna AC -> Índice 28)
      const totalColAC = toFloat(row[28]);
      if (esBase) potEsperaTotal += totalColAC;
      if (esFuego) fuegosSuplemenTotal += totalColAC;

    } else if (leyendoBloque) {
      // Si estábamos leyendo a Nueva Renca y pasamos a otra central (ej. fila 1590: CMPCCORDILLERA) -> APAGAR ESCÁNER
      console.log(`🛑 Bloque aislado con éxito. Escáner apagado en fila ${r} al detectar: ${nombreCentral}`);
      break; // Esto destruye el bucle y evita que lea los límites técnicos de abajo
    }
  }

  // Costo Marginal (AC8)
  let costoMarginalVal = toFloat(wbPrograma.Sheets[sheetNamePrg]['AC8']?.v) || 49.5;

  const mwHoras = perfilBase24h.map((v, i) => Number((v + perfilFuegos24h[i]).toFixed(1)));
  const mwHorasFuegos = perfilFuegos24h.map(v => Number(v.toFixed(1)));

  // TCO (Sistema Promedio)
  let sistemaPromVal = 57.3;
  if (wbTco) {
    const sheetNameTco = wbTco.SheetNames.find(s => s.toUpperCase().includes('TCO') || s.toUpperCase().includes('POLITICA'));
    if (sheetNameTco) {
      const jsonTco = XLSX.utils.sheet_to_json(wbTco.Sheets[sheetNameTco], { header: 1 });
      const configsB1 = [], configsB2 = [], configsB3 = [];
      
      jsonProg.forEach(row => {
        if (!Array.isArray(row) || row.length < 4) return;
        const nombreCentral = String(row[2] || row[1] || row[0] || '').trim().toUpperCase();
        if (!nombreCentral.startsWith('NUEVARENCA_TG1+TV1_')) return;

        if (row.slice(4, 12).reduce((a, b) => a + toFloat(b), 0) > 0) configsB1.push(nombreCentral);
        if (row.slice(12, 22).reduce((a, b) => a + toFloat(b), 0) > 0) configsB2.push(nombreCentral);
        if (row.slice(22, 28).reduce((a, b) => a + toFloat(b), 0) > 0) configsB3.push(nombreCentral);
      });

      const obtenerProm = (colCent, colCmg, cfgs) => {
        if (!cfgs.length) return null;
        const cmgs = jsonTco.filter(r => cfgs.some(c => String(r[colCent]||'').toUpperCase().includes(c)))
                            .map(r => toFloat(r[colCmg])).filter(v => v > 0);
        return cmgs.length ? cmgs.reduce((a, b) => a + b, 0) / cmgs.length : null;
      };

      const validos = [obtenerProm(2,3,configsB1), obtenerProm(6,7,configsB2), obtenerProm(10,11,configsB3)].filter(v => v !== null);
      if (validos.length) sistemaPromVal = Number((validos.reduce((a, b) => a + b, 0) / validos.length).toFixed(1));
    }
  }

  // Métricas de Horas
  let hrsCB = 0, hrsMT = 0, hrsFS = 0;
  const horas = [];
  for (let h = 1; h <= 24; h++) {
    const pot = mwHoras[h - 1];
    const potFA = mwHorasFuegos[h - 1];
    const ssaa = Number((pot * 0.033).toFixed(1));

    if (potFA > 0) hrsFS++;
    if (pot >= 330) hrsCB++;
    else if (pot >= 158 && pot <= 162) hrsMT++;

    horas.push({ hora: h, potencia_mw: pot, generacion_mwh: pot, ssaa_mwh: ssaa, generacion_neta: Number(Math.max(0, pot - ssaa).toFixed(1)) });
  }

  potEsperaTotal = Math.round(potEsperaTotal);
  console.log(`✅ Resultado Final: ${potEsperaTotal} MW`);

  return {
    status: 'ok',
    nombreArchivo: file.name,
    nombreExcel,
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
