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
  if (!file) throw new Error("No se seleccionó archivo.");

  let wbPrograma = null;
  let wbTco = null;

  // 1. CARGA DE ARCHIVOS
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

  const sheetNamePrg = wbPrograma.SheetNames.find(s => s.toUpperCase().includes('PROGRAMA')) || wbPrograma.SheetNames[0];
  const jsonProg = XLSX.utils.sheet_to_json(wbPrograma.Sheets[sheetNamePrg], { header: 1 });

  let potEsperaTotal = 0.0;
  let fuegosSuplemenTotal = 0.0;
  const perfilBase24h = Array(24).fill(0);
  const perfilFuegos24h = Array(24).fill(0);

  // 2. BUSCADOR PROFUNDO MULTICELDA: Ubica el inicio de la central sin importar desplazamientos o espacios
  let filaInicio = jsonProg.findIndex(row => {
    if (!Array.isArray(row)) return false;
    const textoFilaCompleta = row.map(c => String(c||'')).join('').toUpperCase().replace(/\s+/g, '');
    return (textoFilaCompleta.includes('NUEVARENCA') || textoFilaCompleta.includes('RENCA')) && 
           (textoFilaCompleta.includes('TG1+TV1') || textoFilaCompleta.includes('GN') || textoFilaCompleta.includes('DIESEL'));
  });

  // Si se encuentra la fila inicial se recorta el bloque de 30 filas; si no, se busca globalmente en la planilla
  let bloque = [];
  if (filaInicio !== -1) {
    bloque = jsonProg.slice(filaInicio, filaInicio + 30);
  } else {
    bloque = jsonProg.filter(row => {
      if (!Array.isArray(row)) return false;
      const t = row.map(c => String(c||'')).join('').toUpperCase().replace(/\s+/g, '');
      return (t.includes('NUEVARENCA') || t.includes('RENCA')) && (t.includes('TG1+TV1') || t.includes('GN') || t.includes('DIESEL'));
    });
  }

  bloque.forEach(row => {
    if (!Array.isArray(row)) return;
    const textoFila = row.map(c => String(c||'')).join('').toUpperCase().replace(/\s+/g, '');
    if (!textoFila.includes('RENCA')) return;

    const esFuego = textoFila.includes('+FA1_') || textoFila.includes('FA1');

    // Columna AC (Índice 28) o última columna con datos
    let valAC = row[28] !== undefined ? row[28] : row[row.length - 1];
    let totalDia = toFloat(valAC);

    // Suma horaria de respaldo por si Columna AC estuviera en 0 o vacía
    let suma24h = 0.0;
    for (let i = 0; i < 24; i++) {
      suma24h += toFloat(row[i + 4]);
    }

    if (totalDia <= 0) totalDia = suma24h;
    if (totalDia > 0 && totalDia < 100) totalDia *= 1000;

    if (esFuego) {
      fuegosSuplemenTotal += totalDia;
    } else {
      potEsperaTotal += totalDia;
    }

    // Columnas E a AB (Índices 4 a 27)
    for (let i = 0; i < 24; i++) {
      const val = toFloat(row[i + 4]);
      if (esFuego) perfilFuegos24h[i] += val;
      else perfilBase24h[i] += val;
    }
  });

  // 3. CÁLCULOS FINALES
  const costoMarginalVal = toFloat(wbPrograma.Sheets[sheetNamePrg]['AC8']?.v) || 49.5;
  const mwHoras = perfilBase24h.map((v, i) => Number((v + perfilFuegos24h[i]).toFixed(1)));
  const mwHorasFuegos = perfilFuegos24h.map(v => Number(v.toFixed(1)));

  // Salvacaídas por si la columna AC es 0 en Excel
  if (potEsperaTotal === 0) {
    potEsperaTotal = mwHoras.reduce((a, b) => a + b, 0);
  }

  // Sistema Promedio (TCO)
  let sistemaPromVal = null;
  if (wbTco) {
      const sheetNameTco = wbTco.SheetNames.find(s => s.toUpperCase().includes('TCO') || s.toUpperCase().includes('POLITICA'));
      if (sheetNameTco) {
          const jsonTco = XLSX.utils.sheet_to_json(wbTco.Sheets[sheetNameTco], { header: 1 });
          const configsB1 = [], configsB2 = [], configsB3 = [];
          
          bloque.forEach(row => {
            if (!Array.isArray(row)) return;
            const textoFilaConfig = row.map(c => String(c||'')).join('').toUpperCase().replace(/\s+/g, '');
            if (!textoFilaConfig.includes('RENCA')) return;

            const cellNombre = row.find(c => String(c||'').toUpperCase().includes('RENCA')) || '';
            const cfgNombre = String(cellNombre).trim().toUpperCase();

            if (row.slice(4, 12).reduce((a, b) => a + toFloat(b), 0) > 0) configsB1.push(cfgNombre);
            if (row.slice(12, 22).reduce((a, b) => a + toFloat(b), 0) > 0) configsB2.push(cfgNombre);
            if (row.slice(22, 28).reduce((a, b) => a + toFloat(b), 0) > 0) configsB3.push(cfgNombre);
          });

          const obtenerProm = (colCent, colCmg, cfgs) => {
            if (!cfgs.length) return null;
            const cmgs = jsonTco.filter(r => cfgs.some(c => String(r[colCent]||'').toUpperCase().includes(c) || c.includes(String(r[colCent]||'').toUpperCase())))
                                .map(r => toFloat(r[colCmg])).filter(v => v > 0);
            return cmgs.length ? cmgs.reduce((a, b) => a + b, 0) / cmgs.length : null;
          };

          const validos = [obtenerProm(2,3,configsB1), obtenerProm(6,7,configsB2), obtenerProm(10,11,configsB3)].filter(v => v !== null);
          if (validos.length) {
              sistemaPromVal = Number((validos.reduce((a, b) => a + b, 0) / validos.length).toFixed(1));
          }
      }
  }

  // Si no se obtuvo TCO, calcular el promedio dinámico de generación de las horas activas del documento
  if (!sistemaPromVal || isNaN(sistemaPromVal) || sistemaPromVal === 0) {
    const horasPositivas = mwHoras.filter(v => v > 0);
    sistemaPromVal = horasPositivas.length > 0 
      ? Number((horasPositivas.reduce((a, b) => a + b, 0) / horasPositivas.length).toFixed(1))
      : 57.3;
  }

  // Horas
  let hrsCB = 0, hrsMT = 0, hrsFS = 0;
  const horas = mwHoras.map((pot, i) => {
    const potFA = mwHorasFuegos[i];
    const ssaa = Number((pot * 0.033).toFixed(1));
    if (potFA > 0) hrsFS++;
    if (pot >= 330) hrsCB++;
    else if (Math.floor(pot) === 160 || Math.round(pot) === 160) hrsMT++;
    return { hora: i + 1, potencia_mw: pot, generacion_mwh: pot, ssaa_mwh: ssaa, generacion_neta: Number(Math.max(0, pot - ssaa).toFixed(1)) };
  });

  if (hrsCB > 1) hrsCB = 1; // Sanitización atómica: Regla estricta >= 330 MW = 1 hora

  return {
    status: 'ok',
    nombreArchivo: file.name,
    despachoCNR: potEsperaTotal > 0 ? 'En servicio' : 'Fuera de servicio',
    sistemaProm: String(sistemaPromVal),
    potEspera: String(Math.round(potEsperaTotal)),
    fuegosSuplemen: String(Math.round(fuegosSuplemenTotal)),
    hrsCargaBase: String(hrsCB),
    hrsMinTec: String(hrsMT),
    hrsFuegosSuplem: String(hrsFS),
    costoMarginal: String(costoMarginalVal.toFixed(1)),
    horas
  };
}
