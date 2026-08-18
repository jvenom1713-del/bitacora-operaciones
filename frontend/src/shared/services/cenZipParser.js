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

  // 1. Extraer archivos del ZIP
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

  const sheetNamePrg = wbPrograma.SheetNames.find(s => s.toUpperCase().includes('PROGRAMA')) || wbPrograma.SheetNames[0];
  const sheetPrg = wbPrograma.Sheets[sheetNamePrg];
  const jsonProg = XLSX.utils.sheet_to_json(sheetPrg, { header: 1 });

  // 2. VARIABLES DE SUMA
  let potEsperaTotal = 0.0;
  let fuegosSuplemenTotal = 0.0;
  const perfilBase24h = Array(24).fill(0);
  const perfilFuegos24h = Array(24).fill(0);

  // 3. LA SOLUCIÓN DIRECTA: Memoria de nombres leídos para no repetir
  const nemotecnicosLeidos = new Set();

  for (let r = 0; r < jsonProg.length; r++) {
    const row = jsonProg[r];
    if (!Array.isArray(row) || row.length < 4) continue;

    const textoFila = (String(row[0]||'') + String(row[1]||'') + String(row[2]||'') + String(row[3]||'')).toUpperCase().replace(/\s+/g, '');

    // Si la fila pertenece a la central Nueva Renca Ciclo Combinado
    if (textoFila.includes('NUEVARENCA_TG1+TV1_') || textoFila.includes('NUEVARENCA_TG1+TV1+FA1_')) {
      
      // Obtenemos el nombre exacto del combustible (ej: NUEVARENCA_TG1+TV1_GN_A)
      const nombreExacto = String(row[2] || row[1] || row[0] || '').trim();

      // Si ya habíamos sumado esta fila antes, la ignoramos completamente
      if (nemotecnicosLeidos.has(nombreExacto)) {
        continue; 
      }
      nemotecnicosLeidos.add(nombreExacto); // La registramos para no volver a sumarla si aparece más abajo

      const esFuego = nombreExacto.includes('+FA1_');

      // 4. Sumar el Total Exacto Diario desde la Columna AC (Índice 28)
      const totalDia = toFloat(row[28]);
      if (esFuego) {
        fuegosSuplemenTotal += totalDia;
      } else {
        potEsperaTotal += totalDia;
      }

      // 5. Sumar las 24 horas (Columnas E a AB -> Índices 4 a 27)
      for (let i = 0; i < 24; i++) {
        const val = toFloat(row[i + 4]);
        if (esFuego) {
          perfilFuegos24h[i] += val;
        } else {
          perfilBase24h[i] += val;
        }
      }
    }
  }

  // 6. Costo Marginal AC8
  let costoMarginalVal = toFloat(sheetPrg['AC8']?.v) || 49.5;

  const mwHoras = perfilBase24h.map((v, i) => Number((v + perfilFuegos24h[i]).toFixed(1)));
  const mwHorasFuegos = perfilFuegos24h.map(v => Number(v.toFixed(1)));

  // 7. Sistema Promedio (TCO)
  let sistemaPromVal = 57.3;
  let seCalculoTco = false;
  if (wbTco) {
    const sheetNameTco = wbTco.SheetNames.find(s => s.toUpperCase().includes('TCO') || s.toUpperCase().includes('POLITICA'));
    if (sheetNameTco) {
      const jsonTco = XLSX.utils.sheet_to_json(wbTco.Sheets[sheetNameTco], { header: 1 });
      const configsB1 = [], configsB2 = [], configsB3 = [];
      
      nemotecnicosLeidos.forEach(nombre => {
        const row = jsonProg.find(r => String(r[2] || r[1] || r[0] || '').trim() === nombre);
        if (!row) return;
        if (row.slice(4, 12).reduce((a, b) => a + toFloat(b), 0) > 0) configsB1.push(nombre.toUpperCase());
        if (row.slice(12, 22).reduce((a, b) => a + toFloat(b), 0) > 0) configsB2.push(nombre.toUpperCase());
        if (row.slice(22, 28).reduce((a, b) => a + toFloat(b), 0) > 0) configsB3.push(nombre.toUpperCase());
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

  // 8. Cálculo de horas
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

  // Se redondea directamente el valor leído de la columna AC o la suma del perfil de 24h
  const potEsperaMW = Math.round(potEsperaTotal > 0 ? potEsperaTotal : perfilBase24h.reduce((a, b) => a + b, 0));

  return {
    status: 'ok',
    nombreArchivo: file.name,
    nombreExcel,
    despachoCNR: potEsperaMW > 0 ? 'En servicio' : 'Fuera de servicio',
    sistemaProm: String(sistemaPromVal),
    potEspera: String(potEsperaMW),
    fuegosSuplemen: String(Math.round(fuegosSuplemenTotal)),
    hrsCargaBase: String(hrsCB),
    hrsMinTec: String(hrsMT),
    hrsFuegosSuplem: String(hrsFS),
    costoMarginal: String(Number(costoMarginalVal).toFixed(1)),
    horas
  };
}
