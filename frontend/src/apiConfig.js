import { supabase } from './supabaseClient';

export const isHttp = typeof window !== 'undefined' && window.location.protocol.startsWith('http');
export const API_BASE = isHttp ? '' : 'http://127.0.0.1:5000';

export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  if (!isHttp) {
    return `http://127.0.0.1:5000${cleanPath}`;
  }
  return cleanPath;
}

export async function safeFetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } else {
      return { ok: res.ok, status: res.status, data: {} };
    }
  } catch (err) {
    return { ok: false, status: 0, data: {}, error: err.message };
  }
}

export async function guardarBitacoraSupabase({ folio, fecha, turno, operador, jefe_turno, estado, contenido }) {
  const { data, error } = await supabase
    .from('bitacoras')
    .insert([ { folio, fecha, turno, operador, jefe_turno, estado, contenido } ]);
  if (error) {
    console.error("Error al guardar bitácora en Supabase:", error);
  }
  return { data, error };
}

export async function consultarBitacorasSupabase() {
  const { data, error } = await supabase
    .from('bitacoras')
    .select('*')
    .order('id', { ascending: false });
  if (error) {
    console.error("Error al consultar bitácoras en Supabase:", error);
  }
  return { data, error };
}


export function formatearEventosParaBitacora(eventosLista) {
  if (!eventosLista || !Array.isArray(eventosLista) || eventosLista.length === 0) {
    return '';
  }
  return eventosLista.map(e => {
    let horaStr = '';
    if (e.fecha_hora) {
      const partes = String(e.fecha_hora).split(' ');
      horaStr = partes[1] ? partes[1].slice(0, 5) : String(e.fecha_hora).slice(0, 5);
    } else if (e.hora) {
      horaStr = e.hora;
    }
    const prefijoHora = horaStr ? `[${horaStr}] ` : '';
    const prefijoCat = e.categoria && e.categoria !== 'GENERAL' ? `(${e.categoria}) ` : '';
    const tituloStr = e.titulo ? `${e.titulo}: ` : '';
    const equipoStr = e.equipo_afectado ? ` [Equipo: ${e.equipo_afectado}]` : '';
    const userStr = e.registrado_por ? ` (por ${e.registrado_por})` : '';
    
    return `• ${prefijoHora}${prefijoCat}${tituloStr}${e.descripcion || ''}${equipoStr}${userStr}`;
  }).join('\n');
}

export function formatearSenalesParaTexto(listaSenales) {
  if (!listaSenales || !Array.isArray(listaSenales) || listaSenales.length === 0) {
    return 'Sin señales forzadas o manuales registradas.';
  }
  const lineas = [];
  listaSenales.forEach((s) => {
    if (s.ctg && s.ctg !== '—' && String(s.ctg).trim() !== '') {
      lineas.push(`• MKVI CTG: ${s.ctg}`);
    }
    if (s.stg && s.stg !== '—' && String(s.stg).trim() !== '') {
      lineas.push(`• MKVI STG: ${s.stg}`);
    }
    if (s.bop1 && s.bop1 !== '—' && String(s.bop1).trim() !== '') {
      lineas.push(`• BOP: ${s.bop1}`);
    }
  });
  return lineas.length > 0 ? lineas.join('\n') : 'Sin señales forzadas o manuales registradas.';
}
