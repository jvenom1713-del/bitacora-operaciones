import JSZip from 'jszip';
import * as XLSX from 'xlsx';

function toFloat(val) {
  if (!val) return 0.0;
  if (typeof val === 'number') return val;
  try {
    const p = parseFloat(String(val).trim().replace(',', '.'));
    return isNaN(p) ? 0.0 : p;
  } catch (_) {
    return 0.0;
  }
}

export async function procesarArchivoCenCliente(file) {
  if (!file) throw new Error("No se seleccionó ningún archivo.");

  let wbPrograma = null;
  let wbTco = null;
  let nombreExcel = file.name;

  // 1. EXTRAER ARCHIVOS DEL ZIP
  if (file.name.toLowerCase().endsWith('.zip')) {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    const excelFiles = Object.keys(zipContent.files).filter(n => n.toUpperCase().endsWith('.XLSX') || n.toUpperCase().endsWith('.XLSM'));

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

  // 2. ABRIR HOJA PROGRAMA
  const sheetNamePrg = wbPrograma.SheetNames.find(s => s.toUpperCase().includes('PROGRAMA')) || wbPrograma.SheetNames[0];
  const sheetPrg = wbPrograma.Sheets[sheetNamePrg];
  const jsonProg = XLSX.utils.sheet_to_json(sheetPrg, { header: 1 });

  let potEsperaTotal = 0.0;
  let fuegosSuplemenTotal = 0.0;
  const perfilBase24h = Array(24).fill(0);
  const perfilFuegos24h = Array(24).fill(0);

  // =====================================================================
  // 3. ENCONTRAR EL INICIO DEL BLOQUE DE 25 FILAS A PRUEBA DE FALLOS
  // =====================================================================
  let indiceInicio = -1;
  
  for (let r = 0; r < jsonProg.length; r++) {
    const row = jsonProg[r];
    if (!Array.isArray(row) || row.length < 4) continue;
    
    // Fusionamos las celdas y borramos todos los espacios para que sea imposible que un error de tipeo lo oculte
    const textoCeldas = (String(row[0]||'') + String(row[1]||'') + String(row[2]||'') + String(row[3]||'')).toUpperCase().replace(/\s+/g, '');
    
    // Apenas encontremos la primera variante del Ciclo Combinado (que tenga el guión bajo de gas), capturamos la fila
    if (textoCeldas.includes('NUEVARENCA_TG1+TV1_')) {
      indiceInicio = r;
      break; 
    }
  }

  let bloqueRenca = [];

  if (indiceInicio !== -1) {
    // Extraemos EXACTAMENTE el bloque (esa fila + las 24 de abajo)
    bloqueRenca = jsonProg.slice(indiceInicio, indiceInicio + 25);

    for (let r = 0; r < bloqueRenca.length; r++) {
      const row = bloqueRenca[r];
      if (!Array.isArray(row)) continue;

      const textoCeldas = (String(row[0]||'') + String(row[1]||'') + String(row[2]||'') + String(row[3]||'')).toUpperCase().replace(/\s+/g, '');
      
      // Asegurar que la fila pertenece a la central
      if (!textoCeldas.includes('NUEVARENCA_TG1+TV1')) continue;

      const esFuego = textoCeldas.includes('+FA1_');

      // Columna AC (Índice 28)
      let totalDia = toFloat(row[28]);
      if (totalDia > 0 && totalDia < 100) totalDia = totalDia * 1000;

      if (esFuego) fuegosSuplemenTotal += totalDia;
      else potEsperaTotal += totalDia;

      // Sumar 24 horas (Columnas E a AB -> Índices 4 a 27)
      for (let i = 0; i < 24; i++) {
        const val = toFloat(row[i + 4]);
        if (esFuego) perfilFuegos24h[i] += val;
        else perfilBase24h[i] += val;
      }
    }
  }

  // 4. COSTO MARGINAL AC8
  let costoMarginalVal = toFloat(sheetPrg['AC8']?.v) || 49.5;

  const mwHoras = perfilBase24h.map((v, i) => Number((v + perfilFuegos24h[i]).toFixed(1)));
  const mwHorasFuegos = perfilFuegos24h.map(v => Number(v.toFixed(1)));

  // SALVACAÍDAS MATEMÁTICO: Si la columna AC estaba vacía en el Excel y dio 0, sumamos las 24 horas manualmente.
  if (potEsperaTotal === 0) {
    potEsperaTotal = mwHoras.reduce((a, b) => a + b, 0);
  }
  if (fuegosSuplemenTotal === 0) {
    fuegosSuplemenTotal = mwHorasFuegos.reduce((a, b) => a + b, 0);
  }

  // 5. SISTEMA PROMEDIO (TCO)
  let sistemaPromVal = 57.3;
  let seCalculoTco = false;
  if (wbTco) {
    const sheetNameTco = wbTco.SheetNames.find(s => s.toUpperCase().includes('TCO') || s.toUpperCase().includes('POLITICA'));
    if (sheetNameTco) {
      const jsonTco = XLSX.utils.sheet_to_json(wbTco.Sheets[sheetNameTco], { header: 1 });
      const configsB1 = [], configsB2 = [], configsB3 = [];
      
      bloqueRenca.forEach(row => {
        const nombreCelda = String(row[2] || row[1] || row[0] || '').trim().toUpperCase();
        if (!nombreCelda.includes('NUEVARENCA')) return;

        if (row.slice(4, 12).reduce((a, b) => a + toFloat(b), 0) > 0) configsB1.push(nombreCelda);
        if (row.slice(12, 22).reduce((a, b) => a + toFloat(b), 0) > 0) configsB2.push(nombreCelda);
        if (row.slice(22, 28).reduce((a, b) => a + toFloat(b), 0) > 0) configsB3.push(nombreCelda);
      });

      const obtenerProm = (colCent, colCmg, cfgs) => {
        if (!cfgs.length) return null;
        const cmgs = jsonTco.filter(r => cfgs.some(c => String(r[colCent]||'').toUpperCase().includes(c)))
                            .map(r => toFloat(r[colCmg])).filter(v => v > 0);
        return cmgs.length ? cmgs.reduce((a, b) => a + b, 0) / cmgs.length : null;
      };

      const validos = [obtenerProm(2,3,configsB1), obtenerProm(6,7,configsB2), obtenerProm(10,11,configsB3)].filter(v => v !== null);
      if (validos.length) {
          sistemaPromVal = Number((validos.reduce((a, b) => a + b, 0) / validos.length).toFixed(1));
          seCalculoTco = true;
      }
    }
  }
  if (!seCalculoTco) sistemaPromVal = 57.3;

  // 6. CÁLCULO DE HORAS DE OPERACIÓN
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
    costoMarginal: String(Number(costoMarginalVal).toFixed(1)),
    horas
  };
}
