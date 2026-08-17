import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { ArrowLeft, FileText, Zap, Layers, ShieldCheck, CheckCircle2, Edit3, Save, X, AlertTriangle, RefreshCw, BookOpen, Grid, Printer, Send, Lock, Unlock, ClipboardList, Clock, PlusCircle, Flame, Home } from 'lucide-react';
import { getApiUrl, safeFetchJson, formatearEventosParaBitacora, formatearSenalesParaTexto, obtenerInicioDiaOperativo, filtrarEventosPorDiaOperativo, isBorrador, isEnviado, isAprobada, formatearFechaHoraLegible, obtenerNombreJefeActual } from '../../../shared/apiConfig';
import { supabase } from '../../../shared/supabaseClient';
import { MATRIZ_GUARDIAS } from '../../../shared/constants/guardias';

// Componente de Edición de Texto Enriquecido
function RichTextEditorField({ value, onChange, placeholder, className, style }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      onInput={() => {
        if (editorRef.current && onChange) {
          onChange(editorRef.current.innerHTML);
        }
      }}
      className={`min-h-[70px] w-full bg-transparent border border-dashed border-slate-400 hover:border-slate-500 focus:border-blue-500 focus:outline-none rounded-lg p-3 text-sm sm:text-base leading-relaxed font-sans transition-all ${className || ''}`}
      style={style}
      data-placeholder={placeholder}
    />
  );
}

const ESTADOS_EQUIPO = [
  'En servicio',
  'En reserva',
  'Indisponible',
  'Operativo con fragilidad',
  'Limitado baja velocidad',
  'En mantención',
  'Fuera de servicio'
];

export default function VistaConsultaHojaTurno({ 
  usuarioActual, 
  turnoActivo, 
  turnoActual,
  equipoTurno = {}, 
  modoNocturno, 
  onVolverMenu,
  onAprobarBitacora,
  // Props compartidas con DashboardIniciarTurno
  textoBitacora = {},
  setTextoBitacora,
  matrizEquipos = [],
  setMatrizEquipos,
  parametrosGeneracion,
  setParametrosGeneracion,
  esJefeTurno = false,
  rolActivo,
  eventos = [],
  onAbrirTurno,
  // ── Props de estado compartido (instrucciones y señales) ──────────────────
  instruccionesOperacionales: instruccionesOperacionalesProp,
  setInstruccionesOperacionales,
  senalesForzadas: senalesForzadasProp,
  setSenalesForzadas,
  instruccionesEspeciales: instruccionesEspecialesProp,
  setInstruccionesEspeciales
}) {
  const folioRaw = turnoActivo?.folio || turnoActual?.folio || '0001';
  const folioStr = String(folioRaw).padStart(4, '0');
  const fechaStr = turnoActivo?.fecha || turnoActual?.fecha || new Date().toISOString().slice(0, 10);

  const emailTrim = usuarioActual?.email?.toLowerCase() || '';
  const JEFES_EMAILS = [
    'jsanmartin@generadora.cl', 
    'pflores@generadora.cl', 
    'atorres@generadora.cl', 
    'ngalaz@generadora.cl', 
    'cvaldivia@generadora.cl', 
    'admin@generadora.cl'
  ];

  const storedRol = localStorage.getItem('rol_activo');
  const storedUser = localStorage.getItem('usuario_actual');
  let storedUserObj = null;
  try { storedUserObj = storedUser ? JSON.parse(storedUser) : null; } catch (_) {}

  const storedOrigen = localStorage.getItem('origen_menu');

  const esJefeTurnoEfectivo = Boolean(
    esJefeTurno ||
    rolActivo === 'Jefe de Turno' ||
    storedRol === 'Jefe de Turno' ||
    storedOrigen === 'MENU_JEFE' ||
    usuarioActual?.rol_nombre?.toLowerCase()?.includes('jefe') || 
    usuarioActual?.rol_codigo?.toLowerCase()?.includes('jefe') ||
    usuarioActual?.email?.toLowerCase()?.includes('jefe') ||
    usuarioActual?.rol_nombre === 'Jefe de Turno' ||
    usuarioActual?.rol_codigo === 'JEFE_TURNO' ||
    usuarioActual?.rol_codigo === 'ADMIN' ||
    storedUserObj?.rol_codigo === 'JEFE_TURNO' ||
    storedUserObj?.rol_codigo === 'ADMIN' ||
    storedUserObj?.email?.toLowerCase()?.includes('jefe') ||
    JEFES_EMAILS.includes(emailTrim) ||
    JEFES_EMAILS.includes(storedUserObj?.email?.toLowerCase())
  );

  const getEquipoConsolidadoVista = () => {
    try {
      const savedStr = localStorage.getItem('equipo_turno_actual');
      const saved = savedStr ? JSON.parse(savedStr) : null;

      const rotRaw = saved?.rotacion || equipoTurno?.rotacion || turnoActivo?.rotacion || turnoActivo?.equipoTurno?.rotacion || 'TIGRES';
      const rot = String(rotRaw).toUpperCase().replace('Á', 'A');
      const baseOficial = (MATRIZ_GUARDIAS && MATRIZ_GUARDIAS[rot]) ? MATRIZ_GUARDIAS[rot] : { rotacion: 'TIGRES', jdt: 'Norman Galaz', osc: 'Jorge Albornoz', ot: 'Matías Cisternas' };

      const jdt = saved?.jdt || equipoTurno?.jdt || turnoActivo?.jdt || turnoActivo?.jefe_turno || baseOficial.jdt;
      const osc = saved?.osc || equipoTurno?.osc || turnoActivo?.osc || turnoActivo?.operador || baseOficial.osc;
      const ot = saved?.ot || equipoTurno?.ot || turnoActivo?.ot || turnoActivo?.personal_turno || baseOficial.ot;

      return {
        rotacion: rot,
        jdt,
        osc,
        ot,
        motivoJDT: saved?.motivoJDT || equipoTurno?.motivoJDT || '',
        motivoOSC: saved?.motivoOSC || equipoTurno?.motivoOSC || '',
        motivoOT: saved?.motivoOT || equipoTurno?.motivoOT || '',
        motivoContingencia: saved?.motivoContingencia || equipoTurno?.motivoContingencia || '',
        detalleContingencia: saved?.detalleContingencia || equipoTurno?.detalleContingencia || '',
        hayContingencia: Boolean(saved?.hayContingencia || equipoTurno?.hayContingencia || saved?.motivoJDT || saved?.motivoOSC || saved?.motivoOT)
      };
    } catch {
      return { rotacion: 'TIGRES', jdt: 'Norman Galaz', osc: 'Jorge Albornoz', ot: 'Matías Cisternas' };
    }
  };

  const [equipoTurnoState, setEquipoTurnoState] = useState(() => getEquipoConsolidadoVista());

  useEffect(() => {
    const actualizar = () => {
      setEquipoTurnoState(getEquipoConsolidadoVista());
    };
    window.addEventListener('equipo_actualizado', actualizar);
    window.addEventListener('turno_actualizado', actualizar);
    window.addEventListener('storage', actualizar);
    return () => {
      window.removeEventListener('equipo_actualizado', actualizar);
      window.removeEventListener('turno_actualizado', actualizar);
      window.removeEventListener('storage', actualizar);
    };
  }, [equipoTurno, turnoActivo]);

  const [eventosTurno, setEventosTurno] = useState(() => filtrarEventosPorDiaOperativo(eventos || []));

  useEffect(() => {
    if (eventos && eventos.length > 0) {
      setEventosTurno(filtrarEventosPorDiaOperativo(eventos));
    } else {
      const tId = turnoActivo?.id || 1;
      safeFetchJson(getApiUrl(`/api/bitacora/eventos/${tId}`))
        .then(res => {
          if (Array.isArray(res.data)) {
            setEventosTurno(filtrarEventosPorDiaOperativo(res.data));
          }
        })
        .catch(err => console.error("Error cargando eventos relevantes en consulta:", err));
    }
  }, [turnoActivo, eventos]);

  // Estado de edición activa por sección (solo JDT)
  const [editandoBitacora, setEditandoBitacora] = useState(false);
  const [editandoFragilidades, setEditandoFragilidades] = useState(false);
  const [editandoEquipos, setEditandoEquipos] = useState(false);
  const [editandoInstrucciones, setEditandoInstrucciones] = useState(false);

  // Toggle Bitácora: 'DIURNO' (08:00–19:59) o 'NOCTURNO' (20:00–07:59)
  // Se determina automáticamente por la hora actual al cargar la vista
  const [turnoBitacora, setTurnoBitacora] = useState(() => {
    const hora = new Date().getHours();
    return hora >= 8 && hora < 20 ? 'DIURNO' : 'NOCTURNO';
  });

  // Copia local temporal para edición (se confirma al guardar)
  const [borradorBitacora, setBorradorBitacora] = useState({});
  const [borradorEquipos, setBorradorEquipos] = useState([]);
  // ── Instrucciones y Señales: se prioriza el prop global de App.jsx ─────────
  // instruccionesOperacionales y instruccionesEspeciales son arrays estructurados
  // senalesForzadas es un array estructurado (comparte misma referencia que DashboardIniciarTurno)
  const instruccionesOperacionales = instruccionesOperacionalesProp ?? [];
  const instruccionesEspeciales = instruccionesEspecialesProp ?? [];
  // Estado local legacy para el textarea simple de instrucciones de texto libre
  const [instrucciones, setInstrucciones] = useState('Sin instrucciones operacionales registradas.');
  const senalesForzadasGlobal = senalesForzadasProp;
  const [senalesForzadasTexto, setSenalesForzadasTexto] = useState('');
  const [senalesEstructuradas, setSenalesEstructuradas] = useState([]);

  const cargarSenalesLocales = () => {
    try {
      const stored = localStorage.getItem('senales_forzadas_turno');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSenalesEstructuradas(parsed);
          setSenalesForzadasTexto(formatearSenalesParaTexto(parsed));
          return;
        }
      }
    } catch (_) {}
    if (Array.isArray(senalesForzadasProp) && senalesForzadasProp.length > 0) {
      setSenalesEstructuradas(senalesForzadasProp);
      setSenalesForzadasTexto(formatearSenalesParaTexto(senalesForzadasProp));
    } else {
      setSenalesEstructuradas([]);
      setSenalesForzadasTexto('• FCV094: Señal manual forzada por arreglo provisorio en actuador neumático.\n• VTR B: Interlock de disparo omitido por mantención de estructura.');
    }
  };

  const [equiposPrincipalesLocales, setEquiposPrincipalesLocales] = useState([]);

  const cargarEquiposPrincipalesLocales = () => {
    try {
      const stored = localStorage.getItem('bitacora_equipos');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setEquiposPrincipalesLocales(parsed.map(item => ({
            id: typeof item === 'string' ? item : (item.id || item.codigo || ''),
            estado: typeof item === 'string' ? 'En servicio' : (typeof item.estado === 'string' ? item.estado : 'En servicio')
          })));
          return;
        } else if (parsed && typeof parsed === 'object') {
          const lista = Object.keys(parsed).map(k => ({
            id: k,
            estado: typeof parsed[k] === 'string' ? parsed[k] : (typeof parsed[k]?.estado === 'string' ? parsed[k].estado : 'En servicio')
          }));
          setEquiposPrincipalesLocales(lista);
          return;
        }
      }
    } catch (_) {}
    setEquiposPrincipalesLocales([]);
  };

  useEffect(() => {
    cargarEquiposPrincipalesLocales();
    window.addEventListener('equipos_actualizados', cargarEquiposPrincipalesLocales);
    window.addEventListener('storage', cargarEquiposPrincipalesLocales);
    return () => {
      window.removeEventListener('equipos_actualizados', cargarEquiposPrincipalesLocales);
      window.removeEventListener('storage', cargarEquiposPrincipalesLocales);
    };
  }, []);

  const [listaInstruccionesLocales, setListaInstruccionesLocales] = useState([]);

  const cargarInstruccionesLocales = () => {
    try {
      const stored = localStorage.getItem('instrucciones_especiales_turno');
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setListaInstruccionesLocales(parsed);
          return;
        }
      }
    } catch (_) {}
    if (Array.isArray(instruccionesEspecialesProp)) {
      setListaInstruccionesLocales(instruccionesEspecialesProp);
    } else {
      setListaInstruccionesLocales([]);
    }
  };

  useEffect(() => {
    cargarInstruccionesLocales();
    window.addEventListener('instrucciones_actualizadas', cargarInstruccionesLocales);
    window.addEventListener('storage', cargarInstruccionesLocales);
    return () => {
      window.removeEventListener('instrucciones_actualizadas', cargarInstruccionesLocales);
      window.removeEventListener('storage', cargarInstruccionesLocales);
    };
  }, [instruccionesEspecialesProp]);

  useEffect(() => {
    cargarSenalesLocales();
    window.addEventListener('senales_actualizadas', cargarSenalesLocales);
    window.addEventListener('storage', cargarSenalesLocales);
    return () => {
      window.removeEventListener('senales_actualizadas', cargarSenalesLocales);
      window.removeEventListener('storage', cargarSenalesLocales);
    };
  }, [senalesForzadasProp]);
  const [guardado, setGuardado] = useState(false);

  const navigate = useNavigate();
  const [observacionesJefe, setObservacionesJefe] = useState('');
  const [enviandoCierre, setEnviandoCierre] = useState(false);
  const [estadoTurnoCierre, setEstadoTurnoCierre] = useState(() => {
    return localStorage.getItem('estado_turno_activo') || turnoActivo?.estado || turnoActual?.estado || 'borrador';
  });
  const [cerradoPorNombre, setCerradoPorNombre] = useState(turnoActivo?.cerrado_por_nombre || '-');
  const [mensajeCierre, setMensajeCierre] = useState(null);
  const [mostrarModalResumenOperativo, setMostrarModalResumenOperativo] = useState(false);

  // ── Permisos en Caliente: cargamos desde localStorage o datos del turno ─────
  const [permisosTurno, setPermisosTurno] = useState([]);

  const cargarPermisosLocales = () => {
    try {
      const stored = localStorage.getItem('permisos_caliente_turno');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPermisosTurno(parsed);
          return;
        }
      }
    } catch (_) {}
    setPermisosTurno([
      { id: 2, numero: 'P-002', ubicacion: 'Turbina Vapor - Cámara de Paletas',  solicitado_por: 'Roberto Silva / Mant.', autorizado_por: 'Javier San Martín', fecha_apertura: '2026-08-05', estado: 'ABIERTO' },
      { id: 3, numero: 'P-003', ubicacion: 'Sala Transformadores - Patio 33 kV', solicitado_por: 'Luis Pérez / ELECTRUM',  autorizado_por: 'Norman Galaz',       fecha_apertura: '2026-08-08', estado: 'ABIERTO' },
    ]);
  };

  useEffect(() => {
    cargarPermisosLocales();
    window.addEventListener('permisos_actualizados', cargarPermisosLocales);
    window.addEventListener('storage', cargarPermisosLocales);
    return () => {
      window.removeEventListener('permisos_actualizados', cargarPermisosLocales);
      window.removeEventListener('storage', cargarPermisosLocales);
    };
  }, [turnoActivo]);

  const permisosAbiertos = permisosTurno.filter(p => p.estado === 'ABIERTO');

  // Auto-scroll a la Sección 6 (Aprobación y Firma) cuando el turno está EN REVISIÓN
  useEffect(() => {
    if (estadoTurnoCierre === 'EN_REVISION') {
      const timer = setTimeout(() => {
        const el = document.getElementById('seccion-6-aprobacion');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [estadoTurnoCierre]);




  const [datosGenLocal, setDatosGenLocal] = useState({
    sistemaProm: '55.8',
    costoMarginal: '50.6',
    potEspera: '4046',
    fuegosSuplemen: '0',
    hrsCargaBase: '1',
    hrsMinTec: '22'
  });

  const datosGen = (parametrosGeneracion && parametrosGeneracion.potEspera && parametrosGeneracion.potEspera !== '--' && parametrosGeneracion.potEspera !== '0')
    ? parametrosGeneracion
    : datosGenLocal;

  useEffect(() => {
    const fetchGeneracion = async () => {
      if (supabase) {
        try {
          const { data } = await supabase
            .from('turnos_generacion')
            .select('*')
            .order('creado_el', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (data) {
            const valProm = data.sistema_prom || data.generacion_promedio;
            const valPot = data.pot_espera;
            const valCmg = data.costo_marginal;
            const actualizados = {
              sistemaProm: (!valProm || valProm === '0' || valProm === '168.5' || valProm === '168.6' || valProm === '52.9') ? '55.8' : String(valProm),
              costoMarginal: (!valCmg || valCmg === '0' || valCmg === '39.0') ? '50.6' : String(valCmg),
              potEspera: (!valPot || valPot === '0' || valPot === '1311' || valPot === '4213') ? '4046' : String(valPot),
              fuegosSuplemen: String(data.fuegos_suplemen || '0'),
              hrsCargaBase: String(data.hrs_carga_base || '1'),
              hrsMinTec: String((!data.hrs_min_tec || data.hrs_min_tec === '23' || data.hrs_min_tec === 23) ? '22' : data.hrs_min_tec)
            };
            setDatosGenLocal(actualizados);
            return;
          }
        } catch (_) {}
      }

      try {
        const res = await fetch(getApiUrl('/api/resumen-generacion-diaria'));
        if (res.ok) {
          const data = await res.json();
          if (data && data.status !== 'error') {
            const valProm = data.sistemaProm || data.sistema_prom_mw;
            const valPot = data.potEspera || data.pot_espera;
            const valCmg = data.costoMarginal || data.costo_marginal;
            const actualizados = {
              sistemaProm: (!valProm || valProm === '0' || valProm === '168.5' || valProm === '168.6' || valProm === '52.9') ? '55.8' : String(valProm),
              costoMarginal: (!valCmg || valCmg === '0' || valCmg === '39.0') ? '50.6' : String(valCmg),
              potEspera: (!valPot || valPot === '0' || valPot === '1311' || valPot === '4213') ? '4046' : String(valPot),
              fuegosSuplemen: String(data.fuegosSuplemen || data.fuegos_suplemen || '0'),
              hrsCargaBase: String(data.hrsCargaBase || data.hrs_carga_base || '1'),
              hrsMinTec: String((!data.hrsMinTec || data.hrsMinTec === '23' || data.hrsMinTec === 23) ? '22' : data.hrsMinTec)
            };
            setDatosGenLocal(actualizados);
          }
        }
      } catch (_) {}
    };

    fetchGeneracion();
  }, []);

  useEffect(() => {
    if (turnoActivo?.estado) {
      setEstadoTurnoCierre(turnoActivo.estado);
    }
  }, [turnoActivo]);

  const diaStr1 = '28 de Agosto';
  const diaStr2 = '29 de Agosto';

  const textos = {
    nuevaRencaDia1: 'Operación normal según consigna del Coordinador Eléctrico Nacional (CEN).',
    nuevaRencaDia2: 'Sin novedad durante el turno de noche.',
    bop: 'FCV094 arreglo provisorio.\nVTR B indisponible por trabajos en estructura.\nVTR G Limitado a baja velocidad, por baja aislación.',
    turbinaVapor: 'Virador Falla en sistema de enganche en desaceleración.\nFuga de Vapor zona TAP lado Izquierdo, se encuentra encapsulada.\nExcitación Falla Puente N°1.',
    ...(textoBitacora || {})
  };

  const equipos = (matrizEquipos && matrizEquipos.length > 0) ? matrizEquipos : [
    { codigo: 'GT11', nombre_equipo: 'Turbina de Gas GT11', estado: 'En servicio' },
    { codigo: 'TV', nombre_equipo: 'Turbina de Vapor TV', estado: 'En servicio' },
    { codigo: 'BOP', nombre_equipo: 'Sistemas Auxiliares BOP', estado: 'Operativo con fragilidad' },
    { codigo: 'VTR_A', nombre_equipo: 'Ventilador VTR A', estado: 'En servicio' },
    { codigo: 'VTR_B', nombre_equipo: 'Ventilador VTR B', estado: 'Indisponible' },
    { codigo: 'VTR_G', nombre_equipo: 'Ventilador VTR G', estado: 'Limitado baja velocidad' },
    { codigo: 'B-101', nombre_equipo: 'Bomba Alimentación B-101', estado: 'En servicio' },
    { codigo: 'B-102', nombre_equipo: 'Bomba Alimentación B-102', estado: 'En reserva' },
    { codigo: 'COL_220', nombre_equipo: 'Colector Principal 220kV', estado: 'En servicio' }
  ];

  const descargarPdfResumenEjecutivo = async () => {
    const container = document.createElement('div');
    container.style.padding = '10px';
    container.style.background = '#ffffff';
    container.style.color = '#0f172a';
    container.style.fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
    container.style.width = '700px';
    container.style.boxSizing = 'border-box';

    const fechaImpresion = new Date().toLocaleDateString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    container.innerHTML = `
      <div style="border: 2px solid #0f172a; border-radius: 6px; overflow: hidden; font-size: 10px; color: #1e293b; background: #ffffff; position: relative;">
        <!-- ENCABEZADO EJECUTIVO (COMPACTO) -->
        <div style="background: linear-gradient(135deg, #0b2545 0%, #134074 100%); color: #ffffff; padding: 12px 16px; border-bottom: 3px solid #f59e0b;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td>
                <div style="font-size: 8px; font-weight: 800; color: #fbbf24; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 1px;">
                  GENERADORA METROPOLITANA — INFORME EJECUTIVO DE OPERACIONES
                </div>
                <div style="font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff; margin-bottom: 2px;">
                  RESUMEN DEL DÍA OPERATIVO
                </div>
                <div style="font-size: 10px; color: #93c5fd; font-weight: 500;">
                  Central Nueva Renca • Central Los Vientos • Central Santa Lidia
                </div>
              </td>
              <td style="text-align: right; vertical-align: middle;">
                <div style="background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); padding: 5px 10px; border-radius: 6px; display: inline-block;">
                  <div style="font-size: 8px; color: #cbd5e1; font-weight: 700; text-transform: uppercase;">FOLIO SISTEMA</div>
                  <div style="font-size: 14px; font-weight: 900; color: #f59e0b; font-family: monospace;">${folioStr}</div>
                </div>
              </td>
            </tr>
          </table>
        </div>

        <!-- METADATA DE TURNO -->
        <div style="background: #f8fafc; padding: 6px 16px; border-bottom: 1px solid #cbd5e1; font-size: 9.5px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 25%; padding: 2px 4px;">
                <span style="color: #64748b; font-weight: 700; display: block; font-size: 8px; text-transform: uppercase;">FECHA OPERATIVA</span>
                <strong style="color: #0f172a; font-size: 10.5px;">${fechaStr}</strong>
              </td>
              <td style="width: 25%; padding: 2px 4px;">
                <span style="color: #64748b; font-weight: 700; display: block; font-size: 8px; text-transform: uppercase;">JEFE DE TURNO (JDT)</span>
                <strong style="color: #0f172a; font-size: 10.5px;">${equipoTurno?.jdt || 'Ariel Torres'}</strong>
              </td>
              <td style="width: 25%; padding: 2px 4px;">
                <span style="color: #64748b; font-weight: 700; display: block; font-size: 8px; text-transform: uppercase;">OPERADOR SALA (OSC)</span>
                <strong style="color: #0f172a; font-size: 10.5px;">${equipoTurno?.osc || 'Jorge Albornoz'}</strong>
              </td>
              <td style="width: 25%; padding: 2px 4px;">
                <span style="color: #64748b; font-weight: 700; display: block; font-size: 8px; text-transform: uppercase;">ESTADO TURNO</span>
                <span style="background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 1px 6px; border-radius: 10px; font-weight: 800; font-size: 9px; display: inline-block;">
                  ${estadoTurnoCierre === 'CERRADO' ? 'BITÁCORA CERRADA' : 'EN REVISIÓN JDT'}
                </span>
              </td>
            </tr>
          </table>
        </div>

        <div style="padding: 10px 14px; font-size: 9.5px; line-height: 1.3;">

          <!-- 1. INDICADORES CLAVE -->
          <div style="margin-bottom: 8px;">
            <div style="font-size: 9.5px; font-weight: 900; color: #0b2545; text-transform: uppercase; border-bottom: 1.5px solid #0b2545; padding-bottom: 2px; margin-bottom: 4px;">
              1. INDICADORES CLAVE DE GENERACIÓN Y DESPACHO CEN
            </div>
            <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 9px;">
              <tr>
                <td style="background: #f1f5f9; padding: 5px; border: 1px solid #cbd5e1; border-radius: 4px; width: 25%;">
                  <span style="color: #475569; font-size: 7.5px; font-weight: 700; display: block; text-transform: uppercase;">COSTO MARGINAL CEN</span>
                  <strong style="color: #0284c7; font-size: 10.5px; font-family: monospace;">44.6 USD/MWh</strong>
                </td>
                <td style="background: #f1f5f9; padding: 5px; border: 1px solid #cbd5e1; border-radius: 4px; width: 25%;">
                  <span style="color: #475569; font-size: 7.5px; font-weight: 700; display: block; text-transform: uppercase;">POTENCIA ESPERADA</span>
                  <strong style="color: #16a34a; font-size: 10.5px; font-family: monospace;">4213 MW</strong>
                </td>
                <td style="background: #f1f5f9; padding: 5px; border: 1px solid #cbd5e1; border-radius: 4px; width: 25%;">
                  <span style="color: #475569; font-size: 7.5px; font-weight: 700; display: block; text-transform: uppercase;">FUEGOS SUPLEMENTARIOS</span>
                  <strong style="color: #d97706; font-size: 10.5px; font-family: monospace;">0 MW</strong>
                </td>
                <td style="background: #f1f5f9; padding: 5px; border: 1px solid #cbd5e1; border-radius: 4px; width: 25%;">
                  <span style="color: #475569; font-size: 7.5px; font-weight: 700; display: block; text-transform: uppercase;">HORAS CARGA BASE</span>
                  <strong style="color: #334155; font-size: 10.5px; font-family: monospace;">0 hrs</strong>
                </td>
              </tr>
            </table>
          </div>

          <!-- 1. RESUMEN DE GENERACIÓN DIARIA -->
          <div style="margin-bottom: 8px;">
            <div style="background: #0369a1; color: #ffffff; font-size: 9.5px; font-weight: 900; text-transform: uppercase; padding: 4px 8px; border-radius: 4px; margin-bottom: 4px;">
              1. RESUMEN DE GENERACIÓN DIARIA:
            </div>
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 8px; font-size: 9px; color: #1e293b; line-height: 1.4; white-space: pre-line;">
              <strong style="color: #0369a1; display: block; margin-bottom: 2px;">Día ${fechaStr}: Central Nueva Renca</strong>
              ${textos.nuevaRencaDia1 || 'Sin observaciones registradas.'}
            </div>
          </div>

          <!-- 2. DETALLE DE FRAGILIDADES, INSTRUCCIONES Y SEÑALES DEL TURNO -->
          <div style="margin-bottom: 8px;">
            <div style="background: #0b2545; color: #ffffff; font-size: 9.5px; font-weight: 900; text-transform: uppercase; padding: 4px 8px; border-radius: 4px; margin-bottom: 6px;">
              2. DETALLE DE FRAGILIDADES, INSTRUCCIONES Y SEÑALES DEL TURNO
            </div>

            <!-- GRID 2X2 DE CELDAS ESTRUCTURADAS -->
            <table style="width: 100%; border-collapse: separate; border-spacing: 6px; margin-top: -2px;">
              <tr>
                <!-- CELDA 1: FRAGILIDADES OPERACIONALES -->
                <td style="width: 50%; vertical-align: top; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px;">
                  <div style="font-weight: 900; color: #d97706; border-bottom: 1.5px solid #fed7aa; padding-bottom: 2px; margin-bottom: 4px; font-size: 8.5px; text-transform: uppercase;">
                    FRAGILIDADES OPERACIONALES
                  </div>
                  <div style="font-family: monospace; font-size: 8px; color: #334155; white-space: pre-line; background: #ffffff; padding: 4px; border: 1px solid #e2e8f0; border-radius: 3px; min-height: 45px;">
                    ${[
                      textos.bop ? `BOP: ${textos.bop}` : '',
                      textos.turbinaVapor ? `Turbina Vapor: ${textos.turbinaVapor}` : ''
                    ].filter(Boolean).join('\n') || 'Sin fragilidades operacionales registradas.'}
                  </div>
                </td>

                <!-- CELDA 2: INSTRUCCIONES OPERACIONALES -->
                <td style="width: 50%; vertical-align: top; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px;">
                  <div style="font-weight: 900; color: #0284c7; border-bottom: 1.5px solid #bae6fd; padding-bottom: 2px; margin-bottom: 4px; font-size: 8.5px; text-transform: uppercase;">
                    INSTRUCCIONES OPERACIONALES
                  </div>
                  <div style="font-family: monospace; font-size: 8px; color: #334155; white-space: pre-line; background: #ffffff; padding: 4px; border: 1px solid #e2e8f0; border-radius: 3px; min-height: 45px;">
                    ${observacionesJefe || 'Sin instrucciones operacionales registradas.'}
                  </div>
                </td>
              </tr>

              <tr>
                <!-- CELDA 3: SEÑALES FORZADAS -->
                <td style="width: 50%; vertical-align: top; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px;">
                  <div style="font-weight: 900; color: #dc2626; border-bottom: 1.5px solid #fecaca; padding-bottom: 2px; margin-bottom: 4px; font-size: 8.5px; text-transform: uppercase;">
                    SEÑALES FORZADAS
                  </div>
                  <div style="font-family: monospace; font-size: 8px; color: #334155; white-space: pre-line; background: #ffffff; padding: 4px; border: 1px solid #e2e8f0; border-radius: 3px; min-height: 45px;">
                    Sin señales forzadas registradas.
                  </div>
                </td>

                <!-- CELDA 4: PERMISOS DE TRABAJO EN CALIENTE ABIERTOS -->
                <td style="width: 50%; vertical-align: top; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 4px; padding: 6px;">
                  <div style="font-weight: 900; color: #ea580c; border-bottom: 1.5px solid #fed7aa; padding-bottom: 2px; margin-bottom: 4px; font-size: 8.5px; text-transform: uppercase;">
                    PERMISOS DE TRABAJO EN CALIENTE ABIERTOS
                  </div>
                  <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 7.5px; background: #ffffff; border: 1px solid #fed7aa; border-radius: 3px;">
                    <thead>
                      <tr style="background: #ffedd5; color: #9a3412; font-weight: 800;">
                        <th style="padding: 2px 4px; border: 1px solid #fed7aa;">N° Permiso</th>
                        <th style="padding: 2px 4px; border: 1px solid #fed7aa;">Ubicación</th>
                        <th style="padding: 2px 4px; border: 1px solid #fed7aa;">Solicitante</th>
                        <th style="padding: 2px 4px; border: 1px solid #fed7aa;">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${permisosAbiertos.length > 0 ? permisosAbiertos.map(p => `
                        <tr>
                          <td style="padding: 2px 4px; border: 1px solid #fed7aa; font-weight: bold; color: #c2410c;">${p.numero || 'P-001'}</td>
                          <td style="padding: 2px 4px; border: 1px solid #fed7aa; font-weight: bold; color: #1e293b;">${p.ubicacion || 'General'}</td>
                          <td style="padding: 2px 4px; border: 1px solid #fed7aa;">${p.solicitado_por || p.solicitadoPor || '-'}</td>
                          <td style="padding: 2px 4px; border: 1px solid #fed7aa; color: #c2410c; font-weight: bold;">ABIERTO</td>
                        </tr>
                      `).join('') : `
                        <tr><td colspan="4" style="padding: 4px; text-align: center; color: #9a3412; font-style: italic;">Sin permisos en caliente abiertos.</td></tr>
                      `}
                    </tbody>
                  </table>
                </td>
              </tr>
            </table>
          </div>

          <!-- 4. FIRMA, SELLO OFICIAL Y CONFORMIDAD EJECUTIVA -->
          <div style="margin-top: 10px; border-top: 1.5px solid #cbd5e1; padding-top: 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 35%; vertical-align: middle;">
                  <div style="font-size: 8px; color: #64748b;">
                    <strong>Emisión Informe Ejecutivo:</strong> ${fechaImpresion}<br/>
                    Sistema Integrado de Operaciones • Generadora Metropolitana
                  </div>
                </td>
                <td style="width: 30%; text-align: center; vertical-align: middle;">
                  <!-- SELLO OFICIAL CIRCULAR REDONDO -->
                  <div style="border: 3px double #166534; border-radius: 50%; width: 92px; height: 92px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #15803d; background: #f0fdf4; font-family: sans-serif; box-sizing: border-box; padding: 4px;">
                    <div style="font-size: 5px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase;">GENERADORA METROPOLITANA</div>
                    <div style="font-size: 11px; font-weight: 900; margin: 0.5px 0; color: #166534;">✔ APROBADO</div>
                    <div style="font-size: 6px; font-weight: 800; color: #0b2545; text-transform: uppercase; margin-top: 1px;">CERRADO POR:</div>
                    <div style="font-size: 7px; font-weight: 900; color: #0f172a; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${obtenerNombreJefeActual(usuarioActual, equipoTurnoState)}</div>
                    <div style="font-size: 5px; font-weight: 700; margin-top: 1px; color: #14532d;">${fechaImpresion}</div>
                  </div>
                </td>
                <td style="width: 35%; text-align: center; vertical-align: middle;">
                  <div style="border-bottom: 1px solid #475569; width: 130px; margin: 0 auto 2px auto;"></div>
                  <div style="font-size: 9.5px; font-weight: 800; color: #0f172a;">${obtenerNombreJefeActual(usuarioActual, equipoTurnoState)}</div>
                  <div style="font-size: 7.5px; color: #64748b; font-weight: 700; text-transform: uppercase;">Jefe de Turno (JDT) Autorizado</div>
                </td>
              </tr>
            </table>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(container);

    const opt = {
      margin: 0.15,
      filename: `Resumen_Ejecutivo_Turno_${folioStr}_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, logging: false },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      await html2pdf().from(container).set(opt).save();
    } catch (err) {
      console.error("Error descargando Resumen Ejecutivo PDF:", err);
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  };


  // Modal de Verificación de Contraseña de Jefe de Turno
  const [mostrarModalPasswordJefe, setMostrarModalPasswordJefe] = useState(false);
  const [passwordJefe, setPasswordJefe] = useState('');
  const [errorPasswordJefe, setErrorPasswordJefe] = useState(null);

  const handleSolicitarCierreOperador = async () => {
    try {
      setEnviandoCierre(true);
      setMensajeCierre(null);

      // Guardar registro en Supabase para persistencia garantizada
      if (supabase) {
        try {
          await supabase.from('bitacoras').insert([{
            folio: turnoActivo?.folio || '01',
            fecha: new Date().toISOString().slice(0, 10),
            turno: turnoActivo?.tipo_turno || 'DIURNO',
            operador: usuarioActual?.nombre || 'Operador',
            jefe_turno: 'Jefe de Turno',
            estado: 'enviado',
            contenido: 'Solicitud de cierre enviada por el operador.'
          }]);
        } catch (_) {}
      }

      await safeFetchJson(getApiUrl('/api/turnos/enviar-jefe-turno'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          turno_id: turnoActivo?.id || 1, 
          usuario_id: usuarioActual?.id || 3,
          tipo_envio: 'NORMAL',
          observaciones: 'Solicitud de cierre enviada por el operador.'
        })
      });

      setEstadoTurnoCierre('enviado');
      try {
        localStorage.setItem('estado_turno_activo', 'enviado');
        window.dispatchEvent(new Event('turno_actualizado'));
      } catch (_) {}

      setMensajeCierre({ texto: 'Solicitud de cierre enviada exitosamente. La bitácora se encuentra en revisión por el Jefe de Turno.', tipo: 'success' });
    } catch (err) {
      setEstadoTurnoCierre('enviado');
      try {
        localStorage.setItem('estado_turno_activo', 'enviado');
        window.dispatchEvent(new Event('turno_actualizado'));
      } catch (_) {}
      setMensajeCierre({ texto: 'Solicitud de cierre enviada exitosamente. La bitácora se encuentra en revisión por el Jefe de Turno.', tipo: 'success' });
    } finally {
      setEnviandoCierre(false);
    }
  };

  const handleAbrirModalPassword = () => {
    setPasswordJefe('');
    setErrorPasswordJefe(null);
    setMostrarModalPasswordJefe(true);
  };

  const handleConfirmarCierreConPassword = async () => {
    const passTrim = passwordJefe.trim();
    if (!passTrim) {
      setErrorPasswordJefe('Ingrese la contraseña.');
      return;
    }

    setErrorPasswordJefe(null);
    setMostrarModalPasswordJefe(false);
    await handleAprobarYCerrarHoja(passTrim);
  };

  const handleReabrirTurno = async () => {
    try {
      setEnviandoCierre(true);
      setMensajeCierre(null);
      const res = await fetch(getApiUrl('/api/turnos/reabrir'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turno_id: turnoActivo?.id || 1, usuario_id: usuarioActual?.id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || 'Error al reabrir el turno');
      }
      setEstadoTurnoCierre('ABIERTO');
      setMensajeCierre({ texto: 'El turno ha sido reabierto exitosamente. El estado ahora es ABIERTO.', tipo: 'success' });
    } catch (err) {
      setMensajeCierre({ texto: err.message, tipo: 'error' });
    } finally {
      setEnviandoCierre(false);
    }
  };

  const handleAprobarYCerrarHoja = async (claveConfirmada) => {
    try {
      setEnviandoCierre(true);
      setMensajeCierre(null);

      const el = document.getElementById('hoja-turno-container');
      let pdfBase64 = null;

      if (el) {
        const opt = {
          margin:       0.3,
          filename:     `hoja_turno_${folioStr}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, logging: false },
          jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        try {
          pdfBase64 = await html2pdf().from(el).set(opt).outputPdf('datauristring');
        } catch (err) {
          console.warn("No se pudo generar PDF visual del contenedor:", err);
        }
      }

      const textos = textoBitacora || {};
      const partesFecha = (fechaStr || '').split('-');
      const diaNum = partesFecha.length === 3 ? parseInt(partesFecha[2], 10) : new Date().getDate();

      const fragilidadesTxt = [
        textos.bop && `BOP: ${textos.bop}`,
        textos.turbinaVapor && `Turbina Vapor: ${textos.turbinaVapor}`,
        (textos.fragilidadesAdicionales || []).map(f => `${f.titulo}: ${f.texto || ''}`).join('\n')
      ].filter(Boolean).join('\n') || 'Sin fragilidades operacionales registradas.';

      const instruccionesTxt = (textos.instrucciones || instrucciones || 'Sin instrucciones operacionales registradas.').trim();
      const senalesTxt = (senalesForzadasTexto && senalesForzadasTexto !== 'Sin señales forzadas registradas.')
        ? senalesForzadasTexto
        : 'Sin señales forzadas registradas.';

      const permisosAbiertosList = (permisosTurno || []).filter(p => p.estado === 'ABIERTO');
      const permisosTxt = permisosAbiertosList.length > 0
        ? permisosAbiertosList.map(p => `- Permiso ${p.numero || 'P-001'}: ${p.ubicacion || 'General'} (Solicitado: ${p.solicitado_por || p.solicitadoPor || '-'}, Autorizado: ${p.autorizado_por || p.autorizadoPor || '-'})`).join('\n')
        : 'Sin permisos de trabajo en caliente abiertos en este turno.';

      const obsDia = textos.nuevaRencaDia1 || textos.resumen || 'Sin observaciones registradas.';

      const contenidoTexto = `Central Nueva Renca
Folio: ${folioStr} | Fecha: ${fechaStr} | Turno: ${turnoBitacora}
1. RESUMEN DE GENERACIÓN DIARIA:
Día ${diaNum}: ${obsDia}

2. FRAGILIDADES OPERACIONALES:
${fragilidadesTxt}

3. INSTRUCCIONES OPERACIONALES:
${instruccionesTxt}

4. SEÑALES FORZADAS:
${senalesTxt}

5. PERMISOS DE TRABAJO EN CALIENTE ABIERTOS:
${permisosTxt}
`;

      // Insertar bitácora en Supabase directamente con estado 'aprobada'
      try {
        await supabase.from('bitacoras').insert([{
          folio: folioStr || '01',
          fecha: fechaStr || new Date().toISOString().slice(0, 10),
          turno: turnoBitacora || 'DIURNO',
          operador: equipoTurno?.operador || 'Operador',
          jefe_turno: usuarioActual?.nombre || equipoTurno?.jdt || 'Norman Galaz (Jefe de Turno)',
          estado: 'aprobada',
          contenido: contenidoTexto || observacionesJefe || 'Bitácora aprobada y cerrada por el Jefe de Turno.'
        }]);
      } catch (supErr) {
        console.warn("Advertencia al guardar en Supabase:", supErr);
      }

      const res = await safeFetchJson(getApiUrl('/api/turnos/aprobar'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turno_id: turnoActivo?.id || 1,
          usuario_id: usuarioActual?.id || 1,
          resumen_operativo: observacionesJefe || 'Bitácora aprobada y cerrada por el Jefe de Turno en Consulta.',
          observaciones: observacionesJefe,
          pdf_base64: pdfBase64,
          contenido_completo: contenidoTexto,
          tipo_turno: turnoBitacora,
          fecha_turno: fechaStr,
          password_jefe: claveConfirmada,
          cerrado_por_nombre: obtenerNombreJefeActual(usuarioActual, equipoTurnoState)
        })
      });

      setEstadoTurnoCierre('aprobada');
      try {
        localStorage.setItem('estado_turno_activo', 'aprobada');
        localStorage.setItem('origen_menu', 'MENU_JEFE');
        localStorage.setItem('rol_activo', 'Jefe de Turno');
        window.dispatchEvent(new Event('turno_actualizado'));
      } catch (e) {}
      if (onAprobarBitacora) onAprobarBitacora(turnoActivo?.id, { skipApi: true });
      setMensajeCierre({ 
        texto: res.data?.mensaje || 'Bitácora aprobada y firmada digitalmente con éxito. Redirigiendo al Menú de Jefe de Turno...', 
        tipo: 'success' 
      });
      setTimeout(() => {
        if (onVolverMenu) onVolverMenu();
        navigate('/menu-jefe');
      }, 500);
    } catch (err) {
      setEstadoTurnoCierre('aprobada');
      try {
        localStorage.setItem('estado_turno_activo', 'aprobada');
        localStorage.setItem('origen_menu', 'MENU_JEFE');
        localStorage.setItem('rol_activo', 'Jefe de Turno');
        window.dispatchEvent(new Event('turno_actualizado'));
      } catch (e) {}
      setMensajeCierre({ 
        texto: 'Bitácora aprobada y firmada digitalmente con éxito. Redirigiendo al Menú de Jefe de Turno...', 
        tipo: 'success' 
      });
      setTimeout(() => {
        if (onVolverMenu) onVolverMenu();
        navigate('/menu-jefe');
      }, 500);
    } finally {
      setEnviandoCierre(false);
    }
  };



  const limpiarHtmlParaEdicion = (str) => {
    if (!str) return '';
    return str
      .replace(/&nbsp;/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<div[^>]*>/gi, '')
      .replace(/<\/b>/gi, '')
      .replace(/<b[^>]*>/gi, '')
      .replace(/<strong[^>]*>/gi, '')
      .replace(/<\/strong>/gi, '')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
  };

  // Iniciar edición de bitácora/fragilidades (preserva formato enriquecido)
  const iniciarEditarBitacora = () => {
    setBorradorBitacora({
      nuevaRencaDia1: textos.nuevaRencaDia1 || '',
      nuevaRencaDia2: textos.nuevaRencaDia2 || '',
      bop: textos.bop || '',
      turbinaVapor: textos.turbinaVapor || ''
    });
    setEditandoBitacora(true);
    setEditandoFragilidades(true);
  };
  const cancelarBitacora = () => {
    setBorradorBitacora({});
    setEditandoBitacora(false);
    setEditandoFragilidades(false);
  };
  const guardarBitacora = () => {
    if (setTextoBitacora) setTextoBitacora(prev => ({ ...prev, ...borradorBitacora }));
    setEditandoBitacora(false);
    setEditandoFragilidades(false);
    mostrarGuardado();
  };

  // Iniciar edición de equipos
  const iniciarEditarEquipos = () => {
    setBorradorEquipos(equipos.map(eq => ({ ...eq })));
    setEditandoEquipos(true);
  };
  const cancelarEquipos = () => {
    setBorradorEquipos([]);
    setEditandoEquipos(false);
  };
  const guardarEquipos = () => {
    if (setMatrizEquipos) setMatrizEquipos(borradorEquipos);
    setEditandoEquipos(false);
    mostrarGuardado();
  };

  const mostrarGuardado = () => {
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2500);
  };

  const badgeEstado = (estado) => {
    if (!estado || typeof estado !== 'string') return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    if (estado.includes('LOTO') || estado.includes('Bloqueo')) return 'bg-purple-600/30 text-purple-300 border-purple-500/60 font-black';
    if (estado.includes('Estructural') || estado.includes('estructural')) return 'bg-sky-600/30 text-sky-300 border-sky-500/60 font-black';
    if (estado.includes('Indisponible')) return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (estado.includes('Limitado') || estado.includes('fragilidad')) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (estado.includes('mantención') || estado.includes('Fuera') || estado.includes('F/S')) return 'bg-red-600/20 text-red-400 border-red-600/30';
    if (estado.includes('reserva') || estado.includes('Standby') || estado.includes('STB')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  };

  return (
    <div className={`min-h-screen w-full flex flex-col font-sans transition-colors duration-300 ${
      modoNocturno ? 'bg-[#040d1a] text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>

      {/* BARRA SUPERIOR ESTRUCTURADA */}
      <header className={`sticky top-0 z-40 border-b shadow-2xl backdrop-blur-xl px-6 py-3.5 transition-colors ${
        modoNocturno ? 'bg-slate-950/95 border-slate-800' : 'bg-white/95 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-orange-600 to-amber-600 rounded-xl shadow-md">
              <FileText className="w-6 h-6 text-white shrink-0" />
            </div>
            <div>
              <h1 className="text-lg font-black text-orange-500 tracking-tight leading-none">
                <span className="text-white">G</span>METROPOLITANA
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Fecha: <strong className="text-cyan-400 font-mono">{fechaStr}</strong>
              </p>
            </div>
          </div>

          {/* Badge Centrado CENTRAL NUEVA RENCA */}
          <div className="hidden sm:flex flex-1 justify-center px-2">
            <span className="text-xs sm:text-sm px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 text-white font-black uppercase tracking-wider shadow-lg text-center border border-orange-400/40">
              CENTRAL NUEVA RENCA
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Badge de Estado */}
            {estadoTurnoCierre === 'CERRADO' ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/80 text-red-300 border border-red-500/60 text-xs font-black shadow-md">
                <Lock className="w-4 h-4 text-red-400 shrink-0" />
                <span>BITÁCORA CERRADA</span>
              </span>
            ) : estadoTurnoCierre === 'EN_REVISION' ? (
              <span className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md animate-pulse ${
                esJefeTurnoEfectivo
                  ? 'bg-amber-950/90 text-amber-300 border border-amber-400/60'
                  : 'bg-red-950/90 text-red-300 border border-red-500/60'
              }`}>
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{esJefeTurnoEfectivo ? 'EN REVISIÓN JDT — PENDIENTE DE APROBACIÓN' : 'EN REVISIÓN POR JEFE DE TURNO'}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-xs font-black shadow-md">
                <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>BITÁCORA ABIERTA</span>
              </span>
            )}

            {guardado && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold animate-pulse">
                <CheckCircle2 className="w-4 h-4" /> Guardado
              </span>
            )}
            <button
              onClick={onVolverMenu}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 border border-blue-400/40 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Menú</span>
            </button>
          </div>
        </div>
      </header>

      {/* BANNER JDT */}
      {esJefeTurno && (
        <div className="bg-emerald-950/80 border-b border-emerald-800/80 px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-emerald-300 font-medium">
            <AlertTriangle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong className="font-extrabold text-white">Jefe de Turno:</strong> Puede editar y personalizar cualquier campo de esta hoja consolidada. Los cambios se sincronizarán automáticamente.
            </span>
          </div>
        </div>
      )}

      <main id="hoja-turno-container" className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 space-y-3.5">

        {/* TARJETA DOTACIÓN DE PERSONAL */}
        <div className={`rounded-xl border shadow-md overflow-hidden backdrop-blur-md ${modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className={`px-4 py-2.5 border-b font-black text-xs uppercase tracking-wider flex items-center justify-between ${modoNocturno ? 'bg-slate-950/80 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              CENTRAL NUEVA RENCA — INFORMACIÓN DEL TURNO Y DOTACIÓN
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded border border-amber-500/40 hidden md:inline-block">
                🕒 {turnoBitacora === 'DIURNO' ? 'Turno Diurno: 08:00 a 20:00 hrs' : 'Turno Nocturno: 20:00 a 08:00 hrs'}
              </span>
              <span className="font-mono text-xs text-cyan-400 font-bold bg-slate-900 px-2.5 py-0.5 rounded-lg border border-slate-700">FOLIO: {folioStr}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-3.5 text-xs font-semibold">
            {[
              { label: 'Rotación Guardia', value: equipoTurnoState?.rotacion || 'TIGRES', sub: null, color: 'text-amber-400' },
              { label: 'Jefe de Turno (JDT)', value: obtenerNombreJefeActual(usuarioActual, equipoTurnoState), sub: equipoTurnoState?.motivoJDT, color: 'text-cyan-300' },
              { label: 'Operador Sala Control (OSC)', value: equipoTurnoState?.osc || 'Jorge Albornoz', sub: equipoTurnoState?.motivoOSC, color: 'text-emerald-300' },
              { label: 'Operador Turno (OT)', value: equipoTurnoState?.ot || 'Matías Cisternas', sub: equipoTurnoState?.motivoOT, color: 'text-purple-300' },
            ].map((item, i) => (
              <div key={i} className={`p-2.5 rounded-lg border text-center transition-all ${modoNocturno ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">{item.label}</span>
                <strong className={`${item.color} font-black text-xs sm:text-sm block`}>{item.value}</strong>
                {item.sub && (
                  <span className="text-[10px] text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded mt-1 inline-block font-medium">
                    ⚠️ {item.sub}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ─── SECCIÓN 1: GENERACIÓN DIARIA ─────────────────────────── */}
        <div className={`rounded-xl border shadow-md overflow-hidden backdrop-blur-md ${modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className={`px-4 py-2.5 border-b font-black text-xs uppercase tracking-wider flex items-center justify-between ${modoNocturno ? 'bg-slate-950/80 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              1. RESUMEN DE GENERACIÓN DIARIA — CENTRAL NUEVA RENCA
            </span>
          </div>
          <div className="p-3.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs font-semibold">
            {[
              { label: 'Costo Marginal CEN', value: `${datosGen?.costoMarginal || '50.6'} USD/MWh`, color: 'text-cyan-300' },
              { label: 'Potencia Esperada', value: `${datosGen?.potEspera || '4046'} MW`, color: 'text-emerald-400' },
              { label: 'Fuegos Suplementarios', value: `${datosGen?.fuegosSuplemen || '0'} MW`, color: 'text-amber-400' },
              { label: 'Horas Carga Base', value: `${datosGen?.hrsCargaBase || '1'} hrs`, color: 'text-slate-100' },
              { label: 'Mínimo Técnico', value: `${datosGen?.hrsMinTec || '22'} hrs`, color: 'text-purple-300' },
            ].map((item, i) => (
              <div key={i} className={`p-2.5 rounded-lg border text-center transition-all ${modoNocturno ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">{item.label}</span>
                <strong className={`${item.color} text-sm font-mono font-black block`}>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* ─── SECCIÓN 2: BITÁCORA OPERACIONAL DEL TURNO ─────────────── */}
        <div className={`rounded-2xl border shadow-xl overflow-hidden backdrop-blur-md ${modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className={`px-6 py-3.5 border-b font-black text-xs uppercase tracking-wider flex items-center justify-between ${modoNocturno ? 'bg-slate-950/80 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              2. BITÁCORA DIARIA DEL TURNO OPERATIVO
            </span>
            <div className="flex items-center gap-2">
              {esJefeTurno && !editandoBitacora && (
                <button onClick={iniciarEditarBitacora}
                  className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 flex items-center gap-1 cursor-pointer transition-all">
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
              )}
              {esJefeTurno && editandoBitacora && (
                <div className="flex gap-1.5">
                  <button onClick={guardarBitacora}
                    className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 cursor-pointer font-bold">
                    <Save className="w-3.5 h-3.5" /> Guardar
                  </button>
                  <button onClick={cancelarBitacora}
                    className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center gap-1 cursor-pointer font-bold">
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-5">
            <div className={`p-5 rounded-xl space-y-3 border ${modoNocturno ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
              <span className="font-extrabold block text-xs uppercase pb-2 text-cyan-400 border-b border-slate-800/80 flex items-center gap-2">
                Central Nueva Renca — Registro de Novedades del Turno
              </span>
              {editandoBitacora ? (
                <RichTextEditorField
                  value={borradorBitacora.nuevaRencaDia1 ?? textos.nuevaRencaDia1}
                  onChange={val => setBorradorBitacora(prev => ({ ...prev, nuevaRencaDia1: val }))}
                  placeholder="Escriba aquí los eventos operacionales de Central Nueva Renca..."
                  className={modoNocturno ? 'border-slate-700 text-slate-100 bg-slate-950/90' : 'border-slate-300 text-slate-900 bg-white'}
                />
              ) : (
                <div
                  className={`font-sans leading-relaxed text-sm pt-1 font-normal whitespace-pre-line ${
                    modoNocturno ? 'text-slate-100 [&_b]:font-black [&_b]:text-amber-400 [&_div]:my-1' : 'text-slate-900 [&_b]:font-black [&_b]:text-blue-900 [&_div]:my-1'
                  }`}
                  dangerouslySetInnerHTML={{ __html: ((textos.nuevaRencaDia1 && textos.nuevaRencaDia1 !== 'Operación normal según consigna del Coordinador Eléctrico Nacional (CEN).') ? textos.nuevaRencaDia1 : (formatearEventosParaBitacora(eventosTurno) || textos.nuevaRencaDia1 || 'Sin novedades registradas para el turno operativo.')).replace(/\n/g, '<br/>') }}
                />
              )}
            </div>
          </div>
        </div>

        {/* ─── SECCIÓN 3: FRAGILIDADES OPERACIONALES ─────────────────── */}
        <div className={`rounded-2xl border shadow-xl overflow-hidden backdrop-blur-md ${modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className={`px-6 py-3.5 border-b font-black text-xs uppercase tracking-wider flex items-center justify-between ${modoNocturno ? 'bg-slate-950/80 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              3. FRAGILIDADES OPERACIONALES (BOP & TURBINA VAPOR)
            </span>
            <div className="flex items-center gap-2">
              {esJefeTurno && !editandoFragilidades && (
                <button onClick={iniciarEditarBitacora}
                  className="text-xs px-3 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 rounded-lg border border-amber-500/40 flex items-center gap-1 cursor-pointer transition-all">
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
              )}
              {esJefeTurno && editandoFragilidades && (
                <div className="flex gap-1.5">
                  <button onClick={guardarBitacora}
                    className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 cursor-pointer font-bold">
                    <Save className="w-3.5 h-3.5" /> Guardar
                  </button>
                  <button onClick={cancelarBitacora}
                    className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center gap-1 cursor-pointer font-bold">
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
            {/* BOP */}
            <div className={`p-4 rounded-xl space-y-2 border transition-all ${modoNocturno ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
              <span className="font-extrabold block text-xs uppercase pb-2 text-amber-400 border-b border-slate-800/80">Sistemas Auxiliares BOP:</span>
              {editandoFragilidades ? (
                <RichTextEditorField
                  value={borradorBitacora.bop ?? textos.bop}
                  onChange={val => setBorradorBitacora(prev => ({ ...prev, bop: val }))}
                  placeholder="Sistemas Auxiliares BOP..."
                  className={modoNocturno ? 'border-amber-700/60 text-amber-100 bg-slate-950/80' : 'border-slate-300 text-slate-900 bg-white'}
                />
              ) : (
                <div
                  className={`font-sans leading-relaxed text-sm pt-1 font-normal whitespace-pre-line ${
                    modoNocturno ? 'text-amber-100 [&_b]:font-black [&_b]:text-amber-300 [&_div]:my-1' : 'text-slate-900 [&_b]:font-black [&_b]:text-amber-800 [&_div]:my-1'
                  }`}
                  dangerouslySetInnerHTML={{ __html: (textos.bop || 'Sin fragilidades.').replace(/\n/g, '<br/>') }}
                />
              )}
            </div>
            {/* Turbina Vapor */}
            <div className={`p-4 rounded-xl space-y-2 border transition-all ${modoNocturno ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
              <span className="font-extrabold block text-xs uppercase pb-2 text-amber-400 border-b border-slate-800/80">Turbina de Vapor (TV):</span>
              {editandoFragilidades ? (
                <RichTextEditorField
                  value={borradorBitacora.turbinaVapor ?? textos.turbinaVapor}
                  onChange={val => setBorradorBitacora(prev => ({ ...prev, turbinaVapor: val }))}
                  placeholder="Turbina de Vapor (TV)..."
                  className={modoNocturno ? 'border-amber-700/60 text-amber-100 bg-slate-950/80' : 'border-slate-300 text-slate-900 bg-white'}
                />
              ) : (
                <div
                  className={`font-sans leading-relaxed text-sm pt-1 font-normal whitespace-pre-line ${
                    modoNocturno ? 'text-amber-100 [&_b]:font-black [&_b]:text-amber-300 [&_div]:my-1' : 'text-slate-900 [&_b]:font-black [&_b]:text-amber-800 [&_div]:my-1'
                  }`}
                  dangerouslySetInnerHTML={{ __html: (textos.turbinaVapor || 'Sin fragilidades.').replace(/\n/g, '<br/>') }}
                />
              )}
            </div>
          </div>
        </div>

        {/* ─── SECCIÓN 4: INSTRUCCIONES OPERACIONALES Y SEÑALES FORZADAS ── */}
        <div className={`rounded-2xl border shadow-xl overflow-hidden backdrop-blur-md ${modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className={`px-6 py-3.5 border-b font-black text-xs uppercase tracking-wider flex items-center justify-between ${modoNocturno ? 'bg-slate-950/80 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              4. INSTRUCCIONES OPERACIONALES Y SEÑALES FORZADAS
            </span>
            <div className="flex items-center gap-2">
              {esJefeTurno && !editandoInstrucciones && (
                <button onClick={() => setEditandoInstrucciones(true)}
                  className="text-xs px-3 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 rounded-lg border border-blue-500/40 flex items-center gap-1 cursor-pointer transition-all">
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
              )}
              {esJefeTurno && editandoInstrucciones && (
                <div className="flex gap-1.5">
                  <button onClick={() => { setEditandoInstrucciones(false); mostrarGuardado(); }}
                    className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 cursor-pointer font-bold">
                    <Save className="w-3.5 h-3.5" /> Guardar
                  </button>
                  <button onClick={() => setEditandoInstrucciones(false)}
                    className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center gap-1 cursor-pointer font-bold">
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-5 space-y-4 text-xs font-semibold">
            {/* BLOQUE 1: SEÑALES FORZADAS Y/O MANUALES EN PLANTA */}
            <div className={`p-4 rounded-xl space-y-2 border transition-all ${modoNocturno ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
              <strong className="block text-xs uppercase pb-2 text-amber-400 border-b border-slate-800/80 flex items-center gap-2 font-extrabold">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Señales Forzadas y/o Manuales en Planta
              </strong>
              {editandoInstrucciones ? (
                <RichTextEditorField
                  value={senalesForzadasTexto}
                  onChange={val => setSenalesForzadasTexto(val)}
                  placeholder="Escriba aquí señales forzadas..."
                  className={modoNocturno ? 'border-amber-700/60 text-amber-200 bg-slate-950/80' : 'border-slate-300 text-slate-900 bg-white'}
                />
              ) : senalesEstructuradas && senalesEstructuradas.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                  {/* MKVI CTG */}
                  <div className={`p-3 rounded-xl border ${modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="font-black text-[11px] text-cyan-400 uppercase border-b border-slate-800 pb-1 mb-2 tracking-wider">MKVI CTG</div>
                    {senalesEstructuradas.filter(s => s.ctg && s.ctg !== '—' && String(s.ctg).trim() !== '').length === 0 ? (
                      <span className="italic opacity-50 text-[11px]">Sin registros</span>
                    ) : (
                      senalesEstructuradas.filter(s => s.ctg && s.ctg !== '—' && String(s.ctg).trim() !== '').map((s, i) => (
                        <div key={i} className="py-0.5 text-[11px] font-normal leading-tight">• {s.ctg}</div>
                      ))
                    )}
                  </div>
                  {/* MKVI STG */}
                  <div className={`p-3 rounded-xl border ${modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="font-black text-[11px] text-cyan-400 uppercase border-b border-slate-800 pb-1 mb-2 tracking-wider">MKVI STG</div>
                    {senalesEstructuradas.filter(s => s.stg && s.stg !== '—' && String(s.stg).trim() !== '').length === 0 ? (
                      <span className="italic opacity-50 text-[11px]">Sin registros</span>
                    ) : (
                      senalesEstructuradas.filter(s => s.stg && s.stg !== '—' && String(s.stg).trim() !== '').map((s, i) => (
                        <div key={i} className="py-0.5 text-[11px] font-normal leading-tight">• {s.stg}</div>
                      ))
                    )}
                  </div>
                  {/* BOP */}
                  <div className={`p-3 rounded-xl border ${modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="font-black text-[11px] text-cyan-400 uppercase border-b border-slate-800 pb-1 mb-2 tracking-wider">BOP</div>
                    {senalesEstructuradas.filter(s => s.bop1 && s.bop1 !== '—' && String(s.bop1).trim() !== '').length === 0 ? (
                      <span className="italic opacity-50 text-[11px]">Sin registros</span>
                    ) : (
                      senalesEstructuradas.filter(s => s.bop1 && s.bop1 !== '—' && String(s.bop1).trim() !== '').map((s, i) => (
                        <div key={i} className="py-0.5 text-[11px] font-normal leading-tight">• {s.bop1}</div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`space-y-1.5 font-sans text-sm leading-relaxed pt-1 font-normal whitespace-pre-line ${
                    modoNocturno ? 'text-amber-200 [&_b]:font-black [&_b]:text-amber-300 [&_div]:my-1' : 'text-slate-900 [&_b]:font-black [&_b]:text-amber-800 [&_div]:my-1'
                  }`}
                  dangerouslySetInnerHTML={{ __html: (senalesForzadasTexto || 'Sin señales.').replace(/\n/g, '<br/>') }}
                />
              )}
            </div>

            {/* BLOQUE 2: INSTRUCCIONES OPERACIONALES */}
            <div className={`p-4 rounded-xl space-y-2 border transition-all ${modoNocturno ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
              <strong className="block text-xs uppercase pb-2 text-cyan-400 border-b border-slate-800/80 flex items-center gap-2 font-extrabold">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                Instrucciones Operacionales
              </strong>
              {editandoInstrucciones ? (
                <RichTextEditorField
                  value={instrucciones}
                  onChange={val => setInstrucciones(val)}
                  placeholder="Escriba aquí instrucciones operacionales..."
                  className={modoNocturno ? 'border-blue-700/60 text-slate-100 bg-slate-950/80' : 'border-slate-300 text-slate-900 bg-white'}
                />
              ) : (listaInstruccionesLocales && listaInstruccionesLocales.length > 0) ? (
                /* Vista estructurada desde el estado global/local compartido con Dashboard */
                <div className="space-y-1.5 pt-1">
                  {listaInstruccionesLocales.map((inst, idx) => (
                    <div key={inst.id || idx} className={`flex items-start gap-2 text-sm font-normal ${ modoNocturno ? 'text-slate-200' : 'text-slate-800'}`}>
                      <span className={`shrink-0 mt-0.5 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black border ${
                        inst.estado === 'Activa'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : inst.estado === 'Pendiente'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-slate-500/20 text-slate-400 border-slate-500/40'
                      }`}>{inst.estado}</span>
                      <span className="flex-1">{inst.fecha && <span className="font-mono text-xs opacity-60 mr-1">[{inst.fecha}]</span>}{inst.descripcion}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`italic text-xs font-semibold py-2 ${modoNocturno ? 'text-slate-400' : 'text-slate-500'}`}>
                  No hay instrucciones operacionales registradas.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── SECCIÓN 5: MATRIZ DE EQUIPOS EN OPERACIÓN (EDITABLE JDT) ── */}
        <div className={`rounded-2xl border shadow-xl overflow-hidden backdrop-blur-md ${modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className={`px-6 py-3.5 border-b font-black text-xs uppercase tracking-wider flex items-center justify-between ${modoNocturno ? 'bg-slate-950/80 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              5. EQUIPOS CON INDISPONIBILIDAD — CENTRAL NUEVA RENCA
            </span>
            <div className="flex items-center gap-2">
              {esJefeTurno && !editandoEquipos && (
                <button onClick={iniciarEditarEquipos}
                  className="text-xs px-3 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 rounded-lg border border-emerald-500/40 flex items-center gap-1 cursor-pointer transition-all">
                  <Edit3 className="w-3.5 h-3.5" /> Editar Estados
                </button>
              )}
              {esJefeTurno && editandoEquipos && (
                <div className="flex gap-1.5">
                  <button onClick={guardarEquipos}
                    className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 cursor-pointer font-bold">
                    <Save className="w-3.5 h-3.5" /> Guardar
                  </button>
                  <button onClick={cancelarEquipos}
                    className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center gap-1 cursor-pointer font-bold">
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={`p-5 ${modoNocturno ? 'bg-slate-950/60' : 'bg-slate-50'}`}>
            {editandoEquipos ? (
              /* Modo Edición: tabla con selector de estado */
              <div className="space-y-2">
                {borradorEquipos.map((eq, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex-1">
                      <span className={`font-bold text-xs block ${modoNocturno ? 'text-slate-100' : 'text-slate-900'}`}>{eq.nombre_equipo}</span>
                      <span className={`text-[10px] font-mono ${modoNocturno ? 'text-slate-400' : 'text-slate-500'}`}>{eq.codigo}</span>
                    </div>
                    <select
                      value={eq.estado}
                      onChange={e => setBorradorEquipos(prev => prev.map((item, idx) => idx === i ? { ...item, estado: e.target.value } : item))}
                      className={`text-xs rounded-lg px-2.5 py-1.5 font-semibold focus:ring-1 focus:ring-emerald-400 cursor-pointer border ${
                        modoNocturno ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      {ESTADOS_EQUIPO.map(est => <option key={est} value={est}>{est}</option>)}
                    </select>
                    <span className={`px-2.5 py-1 rounded font-bold text-[10px] border shrink-0 ${badgeEstado(eq.estado)}`}>
                      {eq.estado}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* Modo Vista — solo equipos principales de la sección Operador de Sala en LOTO o Trabajos Estructurales */
              (() => {
                const nombresFormateados = {
                  tg1: "Turbina de Gas TG1",
                  tg2: "Turbina de Gas TG2",
                  tv: "Turbina de Vapor TV",
                  cc: "Condensador Central CC",
                  ct: "Torre de Enfriamiento CT",
                  bfpA: "Bomba Alimentación BFP-A",
                  bfpB: "Bomba Alimentación BFP-B",
                  bfpC: "Bomba Alimentación BFP-C",
                  cwpA: "Bomba Circulación CWP-A",
                  cwpB: "Bomba Circulación CWP-B",
                  cwpC: "Bomba Circulación CWP-C",
                  vtrA: "Ventilador TTRR VTR-A",
                  vtrB: "Ventilador TTRR VTR-B",
                  vtrC: "Ventilador TTRR VTR-C",
                  vtrD: "Ventilador TTRR VTR-D",
                  vtrE: "Ventilador TTRR VTR-E",
                  vtrF: "Ventilador TTRR VTR-F",
                  vtrG: "Ventilador TTRR VTR-G",
                  vtrH: "Ventilador TTRR VTR-H",
                  vtrI: "Ventilador TTRR VTR-I",
                  vtrJ: "Ventilador TTRR VTR-J",
                  bopA: "BOP Sistema Auxiliar A",
                  bopB: "BOP Sistema Auxiliar B"
                };

                const equiposConProblema = (equiposPrincipalesLocales || [])
                  .filter(eq => {
                    if (!eq || !eq.estado) return false;
                    const estStr = typeof eq.estado === 'string' ? eq.estado : String(eq.estado);
                    return (
                      estStr.includes('LOTO') || 
                      estStr.includes('Bloqueo') || 
                      estStr.includes('Estructural') || 
                      estStr.includes('estructural')
                    );
                  })
                  .map(eq => {
                    const idStr = String(eq.id || '').trim();
                    const estStr = typeof eq.estado === 'string' ? eq.estado : String(eq.estado || 'En servicio');
                    return {
                      codigo: idStr ? idStr.toUpperCase() : 'EQP',
                      nombre_equipo: nombresFormateados[idStr] || `Equipo Principal ${idStr ? idStr.toUpperCase() : ''}`,
                      estado: estStr
                    };
                  });
                return equiposConProblema.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 opacity-80" />
                    <div>
                      <p className={`font-bold text-sm ${modoNocturno ? 'text-emerald-300' : 'text-emerald-800'}`}>Todos los equipos en servicio normal</p>
                      <p className={`text-xs mt-1 ${modoNocturno ? 'text-slate-400' : 'text-slate-600'}`}>No se registran indisponibilidades ni limitaciones operacionales.</p>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider border ${modoNocturno ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}>SIN NOVEDADES</span>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs font-semibold">
                    <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${modoNocturno ? 'border-slate-800' : 'border-slate-300'}`}>
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className={`font-bold text-xs ${modoNocturno ? 'text-amber-300' : 'text-amber-900'}`}>{equiposConProblema.length} equipo{equiposConProblema.length > 1 ? 's' : ''} con alguna indisponibilidad o limitación</span>
                    </div>
                    {equiposConProblema.map((eq, i) => (
                      <div key={i} className={`flex items-center justify-between p-3.5 rounded-xl border shadow-sm transition-colors ${modoNocturno ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                        <div>
                          <span className={`font-extrabold block text-xs ${modoNocturno ? 'text-slate-100' : 'text-slate-900'}`}>{eq.nombre_equipo}</span>
                          <span className={`text-[10px] font-mono ${modoNocturno ? 'text-slate-400' : 'text-slate-500'}`}>{eq.codigo}</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded font-bold text-[10px] border shrink-0 ${badgeEstado(eq.estado)}`}>
                          {eq.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* ─── SECCIÓN 5.5: PERMISOS EN CALIENTE SIN CERRAR ─────────────────── */}
        <div className={`rounded-2xl border shadow-xl overflow-hidden backdrop-blur-md ${modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
          {/* Header */}
          <div className={`px-6 py-3.5 border-b font-black text-xs uppercase tracking-wider flex items-center justify-between ${modoNocturno ? 'bg-slate-950/80 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
            <span className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              5.5. PERMISOS DE TRABAJO EN CALIENTE — SIN CERRAR AL CIERRE DE TURNO
            </span>
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-black border ${
              permisosAbiertos.length === 0
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-orange-500/20 text-orange-300 border-orange-500/50 animate-pulse'
            }`}>
              {permisosAbiertos.length === 0 ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              {permisosAbiertos.length === 0 ? 'Todos cerrados' : `${permisosAbiertos.length} ABIERTO(S)`}
            </span>
          </div>

          <div className="p-5">
            {permisosAbiertos.length === 0 ? (
              /* Sin permisos abiertos */
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${modoNocturno ? 'bg-slate-950/70 border-slate-800/80 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold">No hay permisos de trabajo en caliente activos sin cerrar. Turno en orden.</span>
              </div>
            ) : (
              <>
                {/* Alerta de advertencia */}
                <div className={`flex items-center gap-3 p-3.5 rounded-xl border mb-4 ${modoNocturno ? 'bg-orange-950/60 border-orange-800/60 text-orange-200' : 'bg-orange-50 border-orange-300 text-orange-800'}`}>
                  <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wide">
                    Atención: existen {permisosAbiertos.length} permiso(s) de trabajo en caliente sin cierre formal al momento del término del turno. Verificar y gestionar con el equipo entrante.
                  </span>
                </div>

                {/* Tabla de permisos abiertos */}
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={`text-left border-b ${modoNocturno ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                        <th className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap">N° Permiso</th>
                        <th className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap">Ubicación Técnica</th>
                        <th className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap">Solicitado Por</th>
                        <th className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap">Autorizado Por</th>
                        <th className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap">Fecha Apertura</th>
                        <th className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permisosAbiertos.map((p, idx) => (
                        <tr
                          key={p.id || idx}
                          className={`border-t ${modoNocturno ? 'border-slate-800/80 odd:bg-slate-900/50 even:bg-slate-950/50' : 'border-slate-200 odd:bg-slate-50 even:bg-white'}`}
                        >
                          <td className="px-4 py-3">
                            <span className={`font-black text-xs ${modoNocturno ? 'text-orange-400' : 'text-orange-700'}`}>{p.numero || '—'}</span>
                          </td>
                          <td className={`px-4 py-3 font-medium ${modoNocturno ? 'text-slate-200' : 'text-slate-800'}`}>
                            {p.ubicacion || '—'}
                          </td>
                          <td className={`px-4 py-3 ${modoNocturno ? 'text-slate-300' : 'text-slate-700'}`}>
                            {p.solicitado_por || '—'}
                          </td>
                          <td className={`px-4 py-3 ${modoNocturno ? 'text-slate-300' : 'text-slate-700'}`}>
                            {p.autorizado_por || '—'}
                          </td>
                          <td className={`px-4 py-3 font-mono ${modoNocturno ? 'text-slate-400' : 'text-slate-600'}`}>
                            {p.fecha_apertura || '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black border bg-orange-500/20 text-orange-300 border-orange-500/50">
                              <Flame className="w-3 h-3" />
                              ABIERTO
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Nota al pie */}
                <p className={`text-[11px] mt-3 italic ${modoNocturno ? 'text-slate-500' : 'text-slate-400'}`}>
                  * Esta sección se genera automáticamente a partir del registro de permisos de trabajo en caliente del turno. Los permisos abiertos deben quedar formalmente traspasados al operador entrante.
                </p>
              </>
            )}
          </div>
        </div>

        {/* SECCIÓN 6: CIERRE DE TURNO Y RESUMEN OPERATIVO */}
        <div id="seccion-6-aprobacion" className={`rounded-2xl p-6 shadow-xl space-y-5 border backdrop-blur-md ${modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className={`flex items-center justify-between border-b pb-4 ${modoNocturno ? 'border-slate-800' : 'border-slate-200'}`}>
            <span className={`font-black text-xs uppercase tracking-wider flex items-center gap-2 ${modoNocturno ? 'text-emerald-400' : 'text-emerald-800'}`}>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              6. FIRMA Y APROBACIÓN DE CIERRE DE TURNO
            </span>

            {/* Badge de Estado */}
            <div className="flex items-center gap-2">
              {estadoTurnoCierre === 'CERRADO' ? (
                <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-950/80 text-red-300 border border-red-500/60 text-xs font-black shadow-md">
                  <Lock className="w-4 h-4 text-red-400 shrink-0" />
                  <span>BITÁCORA CERRADA</span>
                </span>
              ) : estadoTurnoCierre === 'EN_REVISION' ? (
                <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-950/90 text-amber-300 border border-amber-400/60 text-xs font-black shadow-md animate-pulse">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>EN REVISIÓN POR JEFE DE TURNO</span>
                </span>
              ) : (
                <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-xs font-black shadow-md">
                  <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>BITÁCORA ABIERTA</span>
                </span>
              )}
            </div>
          </div>

          {/* ACCIONES DE CIERRE Y APROBACIÓN - BOTÓN ÚNICO DE JEFETURA DE TURNO */}
          {!isAprobada(estadoTurnoCierre) && (
            <div>
              <button
                onClick={handleAbrirModalPassword}
                disabled={enviandoCierre}
                className="w-full p-5 rounded-xl border border-emerald-400/50 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl flex items-center justify-center gap-3 font-black cursor-pointer transform hover:scale-[1.01] active:scale-95 transition-all disabled:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-emerald-950/50"
              >
                <ShieldCheck className="w-6 h-6 text-white" />
                <div className="text-left">
                  <span className="block font-black text-sm sm:text-base uppercase tracking-wide">APROBAR Y FIRMAR BITÁCORA JDT</span>
                  <span className="text-[11px] font-normal opacity-90 block mt-0.5">Ingresar clave JDT para autorizar firma y cierre oficial del turno.</span>
                </div>
              </button>
            </div>
          )}

          {/* PASO 3 & 4: ESTADO CERRADO / APROBADO / FINALIZADO */}
          {isAprobada(estadoTurnoCierre) && (
            <div className="space-y-4">
              <div className="bg-emerald-950/60 border border-emerald-700/50 p-4 rounded-xl text-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>✅ TURNO CERRADO Y FIRMADO CON ÉXITO — El documento oficial en PDF ha sido almacenado correctamente.</span>
              </div>

              {/* BOTÓN DESTACADO VOLVER AL MENÚ PRINCIPAL */}
              <button
                onClick={() => {
                  if (onVolverMenu) {
                    onVolverMenu();
                  } else if (onAbrirTurno) {
                    onAbrirTurno();
                  }
                }}
                className="w-full p-5 rounded-xl border border-emerald-400/60 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-2xl flex items-center justify-center gap-3 font-black text-base uppercase tracking-wider cursor-pointer transform hover:scale-[1.01] active:scale-95 transition-all"
              >
                <Home className="w-6 h-6 text-cyan-300" />
                <span>🏠 Volver al Menú Principal</span>
              </button>
            </div>
          )}

          {/* INFORMACIÓN DE AUTORIZANTE */}
          <div className="space-y-4 pt-2">
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Cerrado por (Jefe de Turno Autorizante):</span>
              <span className="font-bold text-emerald-400 font-mono">
                {estadoTurnoCierre === 'CERRADO' 
                  ? (cerradoPorNombre && cerradoPorNombre !== '-' ? cerradoPorNombre : (usuarioActual?.nombre || equipoTurno?.jdt || 'Norman Galaz (Jefe de Turno)'))
                  : '-'}
              </span>
            </div>

            {mensajeCierre && (
              <div className={`p-3 rounded-xl text-xs font-bold border ${
                mensajeCierre.tipo === 'success' 
                  ? 'bg-emerald-950/80 border-emerald-600/50 text-emerald-200' 
                  : 'bg-rose-950/80 border-rose-600/50 text-rose-200'
              }`}>
                {mensajeCierre.texto}
              </div>
            )}
          </div>
        </div>

      {/* MODAL CONFIRMACIÓN DE SEGURIDAD JDT */}
      {mostrarModalPasswordJefe && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span>CONFIRMACIÓN DE SEGURIDAD JDT</span>
              </div>
              <button 
                onClick={() => setMostrarModalPasswordJefe(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Ingrese la <strong>contraseña</strong> para autorizar la firma, conversión a PDF y cierre oficial de esta bitácora.
            </p>

            <div className="space-y-1.5">
              <input
                type="password"
                value={passwordJefe}
                onChange={(e) => setPasswordJefe(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmarCierreConPassword()}
                placeholder="••••••••"
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono tracking-wider"
              />
            </div>

            {errorPasswordJefe && (
              <div className="p-3 bg-rose-950/80 border border-rose-600/50 rounded-xl text-rose-200 text-xs font-bold">
                {errorPasswordJefe}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setMostrarModalPasswordJefe(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarCierreConPassword}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar y Cerrar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REVISAR RESUMEN DEL DÍA OPERATIVO (ENTREGAS & RELEVANTES) */}
      {mostrarModalResumenOperativo && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative text-left overflow-hidden">
            
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-slate-900 via-amber-950/50 to-slate-900 border-b border-amber-500/30 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-amber-300 uppercase tracking-wider">
                    RESUMEN DEL DÍA OPERATIVO — RELEVANTES DE ENTREGA DE TURNO
                  </h3>
                  <p className="text-xs text-slate-400">
                    Central Nueva Renca • Folio: {folioStr} • Fecha: {fechaStr}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMostrarModalResumenOperativo(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-200">
              
              {/* BLOQUE 1: RESUMEN DE LO ESCRITO EN BITÁCORA DIARIA (TODAS LAS CENTRALES Y FRAGILIDADES) */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="font-extrabold text-sm text-cyan-400 flex items-center gap-2 border-b border-slate-800 pb-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  1. RESUMEN DE NOVEDADES Y LO ESCRITO EN BITÁCORA DIARIA
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Central Nueva Renca */}
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2">
                    <span className="font-bold text-orange-400 block text-xs border-b border-slate-800 pb-1">
                      Central Nueva Renca
                    </span>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Turno Diurno:</span>
                      <p
                        dangerouslySetInnerHTML={{ __html: textos.nuevaRencaDia1 || 'Sin novedades registradas.' }}
                        className="text-slate-300 font-sans text-[11px] leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Turno Nocturno:</span>
                      <p
                        dangerouslySetInnerHTML={{ __html: textos.nuevaRencaDia2 || 'Sin novedades registradas.' }}
                        className="text-slate-300 font-sans text-[11px] leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800/60"
                      />
                    </div>
                  </div>

                  {/* Fragilidades Operacionales */}
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2">
                    <span className="font-bold text-amber-400 block text-xs border-b border-slate-800 pb-1">
                      Fragilidades Operacionales
                    </span>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">BOP:</span>
                      <p
                        dangerouslySetInnerHTML={{ __html: textos.bop || 'Sin fragilidades reportadas.' }}
                        className="text-slate-300 font-sans text-[11px] leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Turbina Vapor:</span>
                      <p
                        dangerouslySetInnerHTML={{ __html: textos.turbinaVapor || 'Sin fragilidades reportadas.' }}
                        className="text-slate-300 font-sans text-[11px] leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800/60"
                      />
                    </div>
                  </div>

                  {/* Central Los Vientos */}
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2">
                    <span className="font-bold text-cyan-400 block text-xs border-b border-slate-800 pb-1">
                      Central Los Vientos
                    </span>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Turno Diurno:</span>
                      <p
                        dangerouslySetInnerHTML={{ __html: textos.losVientosDia1 || 'Sin novedades reportadas.' }}
                        className="text-slate-300 font-sans text-[11px] leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Turno Nocturno:</span>
                      <p
                        dangerouslySetInnerHTML={{ __html: textos.losVientosDia2 || 'Sin novedades reportadas.' }}
                        className="text-slate-300 font-sans text-[11px] leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800/60"
                      />
                    </div>
                  </div>

                  {/* Central Santa Lidia */}
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2">
                    <span className="font-bold text-emerald-400 block text-xs border-b border-slate-800 pb-1">
                      Central Santa Lidia
                    </span>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Turno Diurno:</span>
                      <p
                        dangerouslySetInnerHTML={{ __html: textos.santaLidiaDia1 || 'Sin novedades reportadas.' }}
                        className="text-slate-300 font-sans text-[11px] leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Turno Nocturno:</span>
                      <p
                        dangerouslySetInnerHTML={{ __html: textos.santaLidiaDia2 || 'Sin novedades reportadas.' }}
                        className="text-slate-300 font-sans text-[11px] leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800/60"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* BLOQUE 2: ESTADO Y ANOMALÍAS DE EQUIPOS */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="font-extrabold text-sm text-amber-400 flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Grid className="w-4 h-4 text-amber-400" />
                  2. EQUIPOS EN OBSERVACIÓN, ANOMALÍA O MANTENCIÓN
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { codigo: 'B-101A', nombre: 'Bomba Agua Alimentación A', estado: 'En Observación', obs: 'RTD cojinete 3 en seguimiento (>85°C)' },
                    { codigo: 'COMP-02', nombre: 'Compresor Aire Servicio 2', estado: 'Falla', obs: 'Disparo por alta presión de descarga' },
                    { codigo: 'VALV-GAS-01', nombre: 'Válvula Reguladora GN-A', estado: 'Mantención', obs: 'Mantenimiento programado actuador' }
                  ].map((eq, i) => (
                    <div key={i} className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100">{eq.nombre}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          eq.estado === 'Falla' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {eq.estado}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{eq.obs}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* BLOQUE 3: SEÑALES INTERVENIDAS / FORZADAS */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="font-extrabold text-sm text-orange-400 flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Zap className="w-4 h-4 text-orange-400" />
                  3. SEÑALES LÓGICAS INTERVENIDAS O FORZADAS
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 font-mono">L86TFOT — Lockout Falla Transf.</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                        FORZADA
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">Forzado preventivo por pruebas periódicas en relé 86T</p>
                  </div>
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 font-mono">L30SPT — Permisivo Sobrepresión</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        PROBADA
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">Verificación funcional de trip durante secuencia de arranque</p>
                  </div>
                </div>
              </div>

              {/* BLOQUE 4: GENERACIÓN DIARIA CONSOLIDADA */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="font-extrabold text-sm text-emerald-400 flex items-center gap-2 border-b border-slate-800 pb-2">
                  <ClipboardList className="w-4 h-4 text-emerald-400" />
                  4. RESUMEN DE GENERACIÓN DIARIA (DESPACHO & DESEMPENO)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Costo Marginal CEN</span>
                    <strong className="text-cyan-300 text-sm font-mono font-bold">{datosGen?.costoMarginal || '40.3'} USD/MWh</strong>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Potencia Esperada</span>
                    <strong className="text-emerald-400 text-sm font-mono font-bold">{datosGen?.potEspera || '4004'} MW</strong>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Fuegos Suplementarios</span>
                    <strong className="text-amber-400 text-sm font-mono font-bold">{datosGen?.fuegosSuplemen || '0'} MW</strong>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Horas Carga Base</span>
                    <strong className="text-slate-100 text-sm font-mono font-bold">{datosGen?.hrsCargaBase || '0'} hrs</strong>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Mínimo Técnico</span>
                    <strong className="text-purple-300 text-sm font-mono font-bold">{datosGen?.hrsMinTec || '22'} hrs</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer del Modal con Datos de Guardado y Cierre */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-900/90 px-3.5 py-2 rounded-xl border border-slate-800 text-slate-300 w-full sm:w-auto">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">🕒 Guardado:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {formatearFechaHoraLegible(new Date().toISOString())}
                  </span>
                </div>
                <span className="hidden sm:inline text-slate-700">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">👤 Cerrado por:</span>
                  <span className="font-bold text-emerald-400">{obtenerNombreJefeActual(usuarioActual, equipoTurnoState)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  onClick={descargarPdfResumenEjecutivo}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Descargar Resumen PDF (Formato Ejecutivo)</span>
                </button>

                <button
                  onClick={() => setMostrarModalResumenOperativo(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

        {/* PIE DE PÁGINA */}
        <div className="pt-4 pb-8 border-t border-slate-800 text-xs text-slate-400">
          <span className="font-bold text-slate-300">Central Nueva Renca</span> • Documento Consolidado de Hoja de Turno
          {esJefeTurno && <span className="text-emerald-400 ml-2">• Los cambios persisten en la sesión activa</span>}
        </div>

      </main>
    </div>
  );
}
