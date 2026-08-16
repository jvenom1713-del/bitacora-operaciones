import { getApiUrl } from '../apiConfig';

/**
 * Servicio modular para obtener la telemetría y datos de generación del Coordinador/Backend
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @param {string} unidadId - Identificador de unidad (default 'CENTRAL')
 */
export async function fetchGeneracionCoordinador(fecha, unidadId = 'CENTRAL') {
  try {
    const url = getApiUrl(`/api/resumen-generacion-diaria?fecha=${fecha || ''}&unidad=${unidadId}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Respuesta no satisfactoria del Coordinador');
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn("Aviso: No se pudo obtener datos en vivo del Coordinador, usando estructura local segura.", error);
    // Retorna estructura base de 24 horas para no romper la interfaz
    return Array.from({ length: 24 }, (_, i) => ({
      hora: i + 1,
      potencia_mw: 0,
      generacion_mwh: 0,
      ssaa_mwh: 0,
      generacion_neta: 0
    }));
  }
}
