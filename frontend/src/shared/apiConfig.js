import { supabase } from './supabaseClient';

export const isHttp = typeof window !== 'undefined' && window.location.protocol.startsWith('http');

export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const port = window.location.port;
    if ((host === 'localhost' || host === '127.0.0.1') && port && port !== '5000') {
      return `http://${host}:5000${cleanPath}`;
    }
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

export function normalizeEstado(st) {
  if (!st) return 'borrador';
  const s = String(st).toLowerCase().trim();
  if (s === 'borrador' || s === 'abierto' || s === 'abierta') return 'borrador';
  if (s === 'enviado' || s === 'en_revision' || s === 'en revisión') return 'enviado';
  if (s === 'aprobada' || s === 'aprobado' || s === 'cerrado' || s === 'finalizado') return 'aprobada';
  return 'borrador';
}

export function isBorrador(st) {
  return normalizeEstado(st) === 'borrador';
}

export function isEnviado(st) {
  return normalizeEstado(st) === 'enviado';
}

export function isAprobada(st) {
  return normalizeEstado(st) === 'aprobada';
}

export async function guardarBitacoraSupabase({ folio, fecha, turno, operador, jefe_turno, estado, contenido }) {
  const estadoNorm = normalizeEstado(estado);
  const { data, error } = await supabase
    .from('bitacoras')
    .insert([ { folio, fecha, turno, operador, jefe_turno, estado: estadoNorm, contenido } ]);
  if (error) {
    console.error("Error al guardar bitácora en Supabase:", error);
  }
  return { data, error };
}

/**
 * LÓGICA DE DÍA OPERATIVO (Inicio a las 20:00 hrs):
 * - Si la hora actual es ANTES de las 20:00, el Día Operativo comenzó AYER a las 20:00.
 * - Si la hora actual es DESPUÉS (o igual) a las 20:00, el Día Operativo comenzó HOY a las 20:00.
 */
export function obtenerInicioDiaOperativo(fechaRef = new Date()) {
  const d = new Date(fechaRef);
  const hora = d.getHours();
  const inicio = new Date(d);
  if (hora < 20) {
    inicio.setDate(inicio.getDate() - 1);
  }
  inicio.setHours(20, 0, 0, 0);
  return inicio;
}

export function filtrarEventosPorDiaOperativo(eventosLista, fechaRef = new Date()) {
  if (!eventosLista || !Array.isArray(eventosLista)) return [];
  const inicioDia = obtenerInicioDiaOperativo(fechaRef);

  return eventosLista.filter(e => {
    let fechaEvento = null;
    if (e.created_at) {
      fechaEvento = new Date(e.created_at);
    } else if (e.fecha_hora) {
      const fhStr = String(e.fecha_hora).includes('T') ? e.fecha_hora : String(e.fecha_hora).replace(' ', 'T');
      fechaEvento = new Date(fhStr);
    } else if (e.fecha) {
      const horaStr = e.hora || '00:00';
      fechaEvento = new Date(`${e.fecha}T${horaStr}:00`);
    }

    if (!fechaEvento || isNaN(fechaEvento.getTime())) {
      return true; // Conservar si la fecha no es determinable
    }

    return fechaEvento >= inicioDia;
  });
}

export async function consultarBitacorasSupabase() {
  const inicioDiaIso = obtenerInicioDiaOperativo().toISOString();
  const { data, error } = await supabase
    .from('bitacoras')
    .select('*')
    .gte('created_at', inicioDiaIso)
    .order('id', { ascending: false });

  if (error) {
    console.error("Error al consultar bitácoras en Supabase con filtro de día operativo:", error);
    // Caída defensiva sin filtro .gte si la columna creada_at varía
    const resFallback = await supabase.from('bitacoras').select('*').order('id', { ascending: false });
    return resFallback;
  }
  return { data, error };
}

export function formatearEventosParaBitacora(eventosLista) {
  if (!eventosLista || !Array.isArray(eventosLista) || eventosLista.length === 0) {
    return '';
  }
  const eventosFiltrados = filtrarEventosPorDiaOperativo(eventosLista);
  const listaProcesar = eventosFiltrados.length > 0 ? eventosFiltrados : eventosLista;

  return listaProcesar.map(e => {
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

export function formatearFechaHoraLegible(fechaRaw) {
  if (!fechaRaw) return 'N/A';
  try {
    const str = String(fechaRaw).trim();
    if (str.includes('/') && str.includes('hrs')) return str;
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} hrs`;
  } catch (_) {
    return String(fechaRaw);
  }
}

export function obtenerNombreJefeActual(usuarioActual, equipoTurno) {
  const esValido = (n) =>
    n &&
    typeof n === 'string' &&
    n.trim() &&
    !['Jefe de Turno', 'aprobada', 'enviado', 'CERRADO', 'ABIERTO', 'Sin JDT', 'Operador', '-'].includes(n.trim());

  // 1. FUENTE PRIMARIA Y OFICIAL: El Jefe de Turno (JDT) establecido en la dotación al abrir el turno por el Operador de Sala de Control (OSC)
  if (esValido(equipoTurno?.jdt)) return equipoTurno.jdt.trim();
  if (esValido(equipoTurno?.jefe_turno)) return equipoTurno.jefe_turno.trim();
  if (esValido(equipoTurno?.cerrado_por_nombre)) return equipoTurno.cerrado_por_nombre.trim();
  if (esValido(equipoTurno?.jdt_nombre)) return equipoTurno.jdt_nombre.trim();
  if (esValido(equipoTurno?.jefe_nombre)) return equipoTurno.jefe_nombre.trim();

  // 2. Consultar la dotación de turno en localStorage si no venía en equipoTurno
  try {
    const saved = localStorage.getItem('equipo_turno_actual');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (esValido(parsed?.jdt)) return parsed.jdt.trim();
      if (esValido(parsed?.jefe_turno)) return parsed.jefe_turno.trim();
    }
  } catch (_) {}

  // 3. Respaldo: Si el usuario en sesión es un Jefe de Turno con nombre específico
  if (
    usuarioActual?.nombre &&
    typeof usuarioActual.nombre === 'string' &&
    usuarioActual.nombre.trim() &&
    !['Jefe de Turno', 'Operador', 'Operador Sala de Control', 'ADMIN', 'Usuario'].includes(usuarioActual.nombre.trim())
  ) {
    return usuarioActual.nombre.trim();
  }

  // 4. Respaldo por correo corporativo
  const email = usuarioActual?.email?.toLowerCase() || '';
  if (email.includes('galaz') || email.includes('ngalaz')) return 'Norman Galaz';
  if (email.includes('sanmartin') || email.includes('jsanmartin')) return 'Javier San Martin';
  if (email.includes('flores') || email.includes('pflores')) return 'Pablo Flores Vasquez';
  if (email.includes('torres') || email.includes('atorres')) return 'Ariel Torres';
  if (email.includes('valdivia') || email.includes('cvaldivia')) return 'Cristian Valdivia Maldonado';
  if (email.includes('troncoso')) return 'Rodrigo Troncoso';

  return 'Norman Galaz';
}


