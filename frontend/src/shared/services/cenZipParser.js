import JSZip from 'jszip';
import * as XLSX from 'xlsx';

/**
 * Helper para convertir valores de celdas Excel a Float de manera segura
 */
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

/**
 * Parser cliente para procesar archivos ZIP o XLSX descargados del Coordinador Eléctrico Nacional (CEN)
 * Lee las hojas 'PROGRAMA' y 'TCO' del libro o del archivo ZIP.
 * @param {File} file - Archivo .zip o .xlsx seleccionado por el usuario
 * @returns {Promise<Object>} Datos de generación extraídos y formateados
 */
export async function procesarArchivoCenCliente(file) {
  if (!file) throw new Error("No se seleccionó ningún archivo.");

  let wbPrograma = null;
  let wbTco = null;
  let nombreExcel = file.name;

  // 1. Procesar archivo ZIP si el usuario seleccionó un .zip
  if (file.name.toLowerCase().endsWith('.zip')) {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    
    // Buscar todos los archivos Excel dentro del ZIP
    const excelFiles = Object.keys(zipContent.files).filter(name => {
      const uname = name.toUpperCase();
      return uname.endsWith('.XLSX') || uname.endsWith('.XLSM');
    });

    if (excelFiles.length === 0) {
      throw new Error("No se encontró ningún archivo Excel (.xlsx) dentro del archivo ZIP.");
    }

    // Identificar cuál es el de PROGRAMA (ej: PRG20260818.xlsx) y cuál el de TCO (ej: TCO20260818.xlsx)
    let prgFileName = excelFiles.find(name => {
      const u = name.toUpperCase();
      return u.includes('PRG') || u.includes('PROGRAMA') || u.includes('PCP');
    }) || excelFiles[0];

    let tcoFileName = excelFiles.find(name => {
      const u = name.toUpperCase();
      return u.includes('PO') || u.includes('TCO') || u.includes('POLITICA');
    });

    nombreExcel = prgFileName;

    const prgBuffer = await zipContent.files[prgFileName].async('arraybuffer');
    wbPrograma = XLSX.read(prgBuffer, { type: 'array' });

    if (tcoFileName) {
      try {
        const tcoBuffer = await zipContent.files[tcoFileName].async('arraybuffer');
        wbTco = XLSX.read(tcoBuffer, { type: 'array' });
      } catch (_) {}
    }
  } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xlsm')) {
    const arrayBuffer = await file.arrayBuffer();
    wbPrograma = XLSX.read(arrayBuffer, { type: 'array' });
    wbTco = wbPrograma; // Podría contener la hoja TCO dentro del mismo libro
  } else {
    throw new Error("Formato de archivo no soportado. Seleccione un archivo .zip o .xlsx");
  }

  // 2. Obtener la hoja PROGRAMA
  const sheetNamesPrg = wbPrograma.SheetNames;
  let sheetNamePrg = sheetNamesPrg.find(s => {
    const u = s.toUpperCase();
    return u === 'PROGRAMA' || u.includes('PROGRAMA') || u.includes('PRG') || u.includes('PCP');
  }) || sheetNamesPrg[0];

  const sheetProg = wbPrograma.Sheets[sheetNamePrg];
  const jsonProg = XLSX.utils.sheet_to_json(sheetProg, { header: 1 });

  // 3. FILTRADO ESTRICTO POR PREFIJO (Aislar bloque principal NUEVARENCA_TG1+TV1_)
  let filasBaseIndices = [];
  let filasFuegosIndices = [];

  for (let r = 0; r < jsonProg.length; r++) {
    const row = jsonProg[r];
    if (!Array.isArray(row) || row.length < 2) continue;

    const c0 = String(row[0] || '').trim().toUpperCase();
    const c1 = String(row[1] || '').trim().toUpperCase();
    const c2 = String(row[2] || '').trim().toUpperCase();
    const c3 = String(row[3] || '').trim().toUpperCase();
    const cells = [c0, c1, c2, c3];

    // Buscar si alguna celda comienza exactamente con el prefijo del bloque principal
    const cellNemoBase = cells.find(c => c.startsWith('NUEVARENCA_TG1+TV1_') || c.startsWith('TG1+TV1_'));
    const cellNemoFuegos = cells.find(c => c.includes('+FA1_') || c.includes('+FA1'));

    if (cellNemoFuegos) {
      filasFuegosIndices.push(r);
    } else if (cellNemoBase) {
      filasBaseIndices.push(r);
    }
  }

  // Fallback de seguridad por nemotécnico si el prefijo exacto difiere ligeramente
  if (filasBaseIndices.length === 0) {
    for (let r = 0; r < jsonProg.length; r++) {
      const row = jsonProg[r];
      if (!Array.isArray(row) || row.length < 2) continue;
      const str = (String(row[0] || '') + ' ' + String(row[1] || '') + ' ' + String(row[2] || '') + ' ' + String(row[3] || '')).toUpperCase();
      if (str.includes('NUEVARENCA') && str.includes('TG1+TV1')) {
        if (str.includes('+FA1_') || str.includes('FUEGOS')) {
          filasFuegosIndices.push(r);
        } else {
          filasBaseIndices.push(r);
        }
      }
    }
  }

  // A) (MW) POT ESPERA: Suma de la columna AC (Col 28) ÚNICAMENTE de las filas extraídas en filasBaseIndices
  let potEsperaTotal = 0.0;
  for (const rIdx of filasBaseIndices) {
    const row = jsonProg[rIdx];
    if (row && row[28] !== undefined) {
      potEsperaTotal += toFloat(row[28]);
    }
  }

  // B) (MW) FUEGOS SUPLEMEN: Suma de la columna AC (Col 28) de las filas con fuegos '+FA1_'
  let fuegosSuplemenTotal = 0.0;
  for (const rIdx of filasFuegosIndices) {
    const row = jsonProg[rIdx];
    if (row && row[28] !== undefined) {
      fuegosSuplemenTotal += toFloat(row[28]);
    }
  }

  // 4. Extraer Costo Marginal de la Celda AC8 (Row 7, Col 28 -> Indice AC)
  let costoMarginalVal = 49.5;
  if (sheetProg['AC8'] && sheetProg['AC8'].v !== undefined) {
    const valAc8 = toFloat(sheetProg['AC8'].v);
    if (valAc8 > 0) costoMarginalVal = valAc8;
  } else if (jsonProg.length > 7 && jsonProg[7] && jsonProg[7][28] !== undefined) {
    const valAc8 = toFloat(jsonProg[7][28]);
    if (valAc8 > 0) costoMarginalVal = valAc8;
  }

  // 5. CÁLCULO Y CONSOLIDACIÓN VERTICAL DE MATRIZ HORARIA DE DESPACHO (Horas 1 a 24 -> Cols E a AB -> Indices 4 a 27)
  const perfilBase24h = Array(24).fill(0);
  const perfilFuegos24h = Array(24).fill(0);

  for (let i = 0; i < 24; i++) {
    const colIdx = 4 + i; // Indice 4 es la Columna E (Hora 1)
    
    filasBaseIndices.forEach(rIdx => {
      const row = jsonProg[rIdx];
      if (row && row[colIdx] !== undefined) {
        perfilBase24h[i] += toFloat(row[colIdx]);
      }
    });

    filasFuegosIndices.forEach(rIdx => {
      const row = jsonProg[rIdx];
      if (row && row[colIdx] !== undefined) {
        perfilFuegos24h[i] += toFloat(row[colIdx]);
      }
    });
  }

  const mwHoras = new Array(24).fill(0);
  const mwHorasFuegos = new Array(24).fill(0);
  for (let i = 0; i < 24; i++) {
    mwHoras[i] = Number((perfilBase24h[i] + perfilFuegos24h[i]).toFixed(1));
    mwHorasFuegos[i] = Number(perfilFuegos24h[i].toFixed(1));
  }

  // 6. Calcular Sistema Promedio utilizando la hoja TCO si está disponible
  let sistemaPromVal = 57.3;
  let seCalculoTco = false;

  if (wbTco) {
    const sheetNamesTco = wbTco.SheetNames;
    let sheetNameTco = sheetNamesTco.find(s => s.toUpperCase().includes('TCO') || s.toUpperCase().includes('POLITICA'));
    if (sheetNameTco) {
      const sheetTco = wbTco.Sheets[sheetNameTco];
      const jsonTco = XLSX.utils.sheet_to_json(sheetTco, { header: 1 });

      const configsB1 = [], configsB2 = [], configsB3 = [];
      filasBaseIndices.forEach((rIdx) => {
        const row = jsonProg[rIdx];
        if (!row) return;
        const configNombre = String(row[2] || row[1] || row[0] || '').trim();

        // Bloque 1 (Horas 1-8 -> Cols E a L -> Indices 4 a 11)
        const sumB1 = row.slice(4, 12).reduce((a, b) => a + toFloat(b), 0);
        if (sumB1 > 0) configsB1.push(configNombre.toUpperCase());

        // Bloque 2 (Horas 9-18 -> Cols M a V -> Indices 12 a 21)
        const sumB2 = row.slice(12, 22).reduce((a, b) => a + toFloat(b), 0);
        if (sumB2 > 0) configsB2.push(configNombre.toUpperCase());

        // Bloque 3 (Horas 19-24 -> Cols W a AB -> Indices 22 a 27)
        const sumB3 = row.slice(22, 28).reduce((a, b) => a + toFloat(b), 0);
        if (sumB3 > 0) configsB3.push(configNombre.toUpperCase());
      });

      const obtenerCmgPromBloque = (colCentral, colCmg, configsActivas) => {
        if (configsActivas.length === 0) return null;
        const cmgs = [];
        for (const cfg of configsActivas) {
          for (let r = 0; r < jsonTco.length; r++) {
            const row = jsonTco[r];
            if (!Array.isArray(row)) continue;
            const centVal = String(row[colCentral] || '').trim().toUpperCase();
            if (centVal && (centVal === cfg || centVal.includes(cfg))) {
              const cmg = toFloat(row[colCmg]);
              if (cmg > 0) cmgs.push(cmg);
              break;
            }
          }
        }
        return cmgs.length > 0 ? (cmgs.reduce((a, b) => a + b, 0) / cmgs.length) : null;
      };

      const b1Avg = obtenerCmgPromBloque(2, 3, configsB1);   // Col C (Indice 2), Col D (Indice 3)
      const b2Avg = obtenerCmgPromBloque(6, 7, configsB2);   // Col G (Indice 6), Col H (Indice 7)
      const b3Avg = obtenerCmgPromBloque(10, 11, configsB3); // Col K (Indice 10), Col L (Indice 11)

      const bloquesValidos = [b1Avg, b2Avg, b3Avg].filter(v => v !== null && v > 0);
      if (bloquesValidos.length > 0) {
        sistemaPromVal = Number((bloquesValidos.reduce((a, b) => a + b, 0) / bloquesValidos.length).toFixed(1));
        seCalculoTco = true;
      }
    }
  }

  // Fallback si no se calculó desde TCO
  if (!seCalculoTco) {
    sistemaPromVal = 57.3;
  }

  // 7. CONTEO DE HORAS Y CONSTRUCCIÓN DE METRICAS OPERACIONALES EXACTAS
  let hrsCB = 0;
  let hrsMT = 0;
  let hrsFS = 0;
  const horas = [];

  for (let h = 1; h <= 24; h++) {
    const pot = mwHoras[h - 1];
    const potFA = mwHorasFuegos[h - 1];
    const ssaa = Number((pot * 0.033).toFixed(1));
    const neta = Number(Math.max(0, pot - ssaa).toFixed(1));

    if (potFA > 0) {
      hrsFS++;
    }

    if (pot >= 330) {
      hrsCB++;
    } else if (pot >= 158 && pot <= 162) { // Conteo exacto de 160 MW (tolerancia 158 a 162 MW)
      hrsMT++;
    }

    horas.push({
      hora: h,
      potencia_mw: pot,
      generacion_mwh: pot,
      ssaa_mwh: ssaa,
      generacion_neta: neta
    });
  }

  const potEsperaMW = Math.round(potEsperaTotal || mwHoras.reduce((a, b) => a + b, 0));
  const fuegosSuplemenMW = Math.round(fuegosSuplemenTotal);

  return {
    status: 'ok',
    nombreArchivo: file.name,
    nombreExcel,
    despachoCNR: potEsperaMW > 0 ? 'En servicio' : 'Fuera de servicio',
    sistemaProm: String(sistemaPromVal || '57.3'),
    potEspera: String(potEsperaMW),
    fuegosSuplemen: String(fuegosSuplemenMW),
    hrsCargaBase: String(hrsCB),
    hrsMinTec: String(hrsMT),
    hrsFuegosSuplem: String(hrsFS),
    costoMarginal: String(costoMarginalVal ? Number(costoMarginalVal).toFixed(1) : '49.5'),
    horas
  };
}
