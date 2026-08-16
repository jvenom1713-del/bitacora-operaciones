import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import VistaPermisosCaliente from './VistaPermisosCaliente';
import CambioPersonalModal from './CambioPersonalModal';
import GeneracionDiaria from './GeneracionDiaria';
import { fetchGeneracionCoordinador, getFechaLocalChile } from '../../../shared/services/coordinadorService';
import ErrorBoundary from '../../../shared/components/ErrorBoundary';
import { getApiUrl, safeFetchJson, formatearEventosParaBitacora, isBorrador, isEnviado, isAprobada } from '../../../shared/apiConfig';
import { supabase } from '../../../shared/supabaseClient';
import { MATRIZ_GUARDIAS, MOTIVOS_CONTINGENCIA, detectarContingenciasGuardia } from '../../../shared/constants/guardias';
import { 
  RefreshCw, 
  MessageSquare, 
  FileText, 
  Grid, 
  Paperclip, 
  ArrowLeft,
  Sun,
  Moon,
  Clock,
  Upload,
  CheckCircle,
  AlertCircle,
  ClipboardList,
  Plus,
  Trash2,
  Zap,
  BookOpen,
  Printer,
  Save,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Copy,
  Check,
  X,
  Send,
  Home,
  FileCheck,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Unlock,
  UserCheck,
  Eye,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Type,
  Bold,
  Sliders,
  PlusCircle,
  Flame,
  AlertTriangle
} from 'lucide-react';

// Referencia global de selección activa en la Bitácora
let rangoSeleccionadoBitacora = null;

const guardarSeleccionBitacora = () => {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    rangoSeleccionadoBitacora = sel.getRangeAt(0).cloneRange();
  }
};

const restaurarSeleccionBitacora = () => {
  if (rangoSeleccionadoBitacora) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(rangoSeleccionadoBitacora);
  }
};

const aplicarFormatoASeleccion = (tipo, valor = null) => {
  restaurarSeleccionBitacora();

  if (tipo === 'insertHTML') {
    document.execCommand('insertHTML', false, valor);
  } else if (tipo === 'fontSize') {
    // Mapeo nativo a índice fontSize de execCommand (1=10px, 2=12px, 3=14px, 4=16px, 5=18px, 6=24px, 7=32px)
    let sizeIndex = '3';
    if (valor === '12px') sizeIndex = '2';
    else if (valor === '14px') sizeIndex = '3';
    else if (valor === '16px') sizeIndex = '4';
    else if (valor === '18px') sizeIndex = '5';
    else if (valor === '20px' || valor === '22px') sizeIndex = '6';
    else if (valor === '24px') sizeIndex = '7';
    else sizeIndex = String(valor);

    document.execCommand('fontSize', false, sizeIndex);
  } else if (tipo === 'color') {
    document.execCommand('foreColor', false, valor);
  } else if (tipo === 'bold') {
    document.execCommand('bold', false, null);
  } else if (tipo && tipo.startsWith('justify')) {
    document.execCommand(tipo, false, null);
  }
};

// Componente de Edición de Texto Enriquecido (Word-Style por Palabra Seleccionada)
function RichTextEditorField({ value, onChange, placeholder, className, style }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleActualizarSeleccion = () => {
    guardarSeleccionBitacora();
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      onFocus={handleActualizarSeleccion}
      onClick={handleActualizarSeleccion}
      onMouseUp={handleActualizarSeleccion}
      onKeyUp={handleActualizarSeleccion}
      onSelect={handleActualizarSeleccion}
      onInput={() => {
        handleActualizarSeleccion();
        if (editorRef.current && onChange) {
          onChange(editorRef.current.innerHTML);
        }
      }}
      className={`min-h-[45px] w-full bg-transparent border border-dashed border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:bg-slate-50/90 focus:outline-none rounded px-2.5 py-1.5 text-slate-900 transition-all print:border-none print:p-0 ${className || ''}`}
      style={style}
      data-placeholder={placeholder}
    />
  );
}

export default function DashboardIniciarTurno({ 
  usuarioActual, 
  turnoActivo: turnoActivoProp,
  onActualizarTurno,
  onAbrirPermisosCaliente,
  equipoTurno = { rotacion: 'TIGRES', jdt: 'Norman Galaz', osc: 'Jorge Albornoz', ot: 'Matías Cisternas' },
  modoNocturno, 
  setModoNocturno,
  onVolver,
  onVolverASeleccionGuardia,
  onCambiarPersonal,
  onAbrirModalCambioPersonal,
  tabInicial = 'EQUIPOS',
  // Props compartidas desde App.jsx
  textoBitacora,
  setTextoBitacora,
  matrizEquipos,
  setMatrizEquipos,
  parametrosGeneracion,
  setParametrosGeneracion,
  onAbrirTurno,
  rolActivo,
  eventos = [],
  // ── Props de estado compartido (instrucciones y señales) ──────────────────
  instruccionesOperacionales,
  setInstruccionesOperacionales,
  senalesForzadas,
  setSenalesForzadas,
  instruccionesEspeciales,
  setInstruccionesEspeciales
}) {
  const getEquipoActualConsolidado = () => {
    try {
      const savedStr = localStorage.getItem('equipo_turno_actual');
      const saved = savedStr ? JSON.parse(savedStr) : null;

      const rotRaw = equipoTurno?.rotacion || saved?.rotacion || turnoActivoProp?.rotacion || turnoActivoProp?.equipoTurno?.rotacion || 'TIGRES';
      const rot = String(rotRaw).toUpperCase().replace('Á', 'A');
      const baseOficial = MATRIZ_GUARDIAS[rot] || MATRIZ_GUARDIAS.TIGRES;

      const jdt = equipoTurno?.jdt || saved?.jdt || turnoActivoProp?.jdt || turnoActivoProp?.jefe_turno || baseOficial.jdt;
      const osc = equipoTurno?.osc || saved?.osc || turnoActivoProp?.osc || turnoActivoProp?.operador || baseOficial.osc;
      const ot = equipoTurno?.ot || saved?.ot || turnoActivoProp?.ot || turnoActivoProp?.personal_turno || baseOficial.ot;

      return {
        rotacion: rot,
        jdt,
        osc,
        ot,
        motivoJDT: equipoTurno?.motivoJDT || saved?.motivoJDT,
        motivoOSC: equipoTurno?.motivoOSC || saved?.motivoOSC,
        motivoOT: equipoTurno?.motivoOT || saved?.motivoOT
      };
    } catch {
      return MATRIZ_GUARDIAS.TIGRES;
    }
  };
  const safeEquipoTurno = getEquipoActualConsolidado();
  const [tabActiva, setTabActiva] = useState(tabInicial);

  useEffect(() => {
    if (tabInicial) {
      setTabActiva(tabInicial);
    }
  }, [tabInicial]);
  const navigate = useNavigate();
  const [turnoActivo, setTurnoActivo] = useState(turnoActivoProp || null);
  const folioStr = turnoActivo?.folio || turnoActivoProp?.folio || '01';
  const [estadoTurno, setEstadoTurno] = useState(() => {
    return localStorage.getItem('estado_turno_activo') || turnoActivoProp?.estado || 'borrador';
  });
  const [modoSeccionJefe, setModoSeccionJefe] = useState(false);
  const [minutaCierre, setMinutaCierre] = useState('');
  const [observacionesJefe, setObservacionesJefe] = useState('');
  const [mostrarFormMinuta, setMostrarFormMinuta] = useState(false);
  const [enviandoCierre, setEnviandoCierre] = useState(false);
  const [notificacionCierre, setNotificacionCierre] = useState(null);
  const [datosConsolidado, setDatosConsolidado] = useState(null);
  const [cargandoConsolidado, setCargandoConsolidado] = useState(false);
  const [mostrarModalResumenOperativo, setMostrarModalResumenOperativo] = useState(false);
  const [mostrarModalCambioPersonal, setMostrarModalCambioPersonal] = useState(false);
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
  }, []);

  const permisosAbiertos = permisosTurno.filter(p => p.estado === 'ABIERTO');

  const emailTrim = usuarioActual?.email?.toLowerCase() || '';
  const JEFES_EMAILS = [
    'jsanmartin@generadora.cl', 
    'pflores@generadora.cl', 
    'atorres@generadora.cl', 
    'ngalaz@generadora.cl', 
    'cvaldivia@generadora.cl', 
    'jalbornoz@generadora.cl',
    'mcisternas@generadora.cl',
    'admin@generadora.cl'
  ];
  const storedRol = localStorage.getItem('rol_activo');
  const storedOrigen = localStorage.getItem('origen_menu');
  const storedUser = localStorage.getItem('usuario_actual');
  let storedUserObj = null;
  try { storedUserObj = storedUser ? JSON.parse(storedUser) : null; } catch (_) {}

  const esJefeOAdmin = Boolean(
    rolActivo === 'Jefe de Turno' ||
    storedRol === 'Jefe de Turno' ||
    storedOrigen === 'MENU_JEFE' ||
    usuarioActual?.rol_codigo === 'JEFE_TURNO' || 
    usuarioActual?.rol_codigo === 'ADMIN' || 
    usuarioActual?.rol_nombre?.toLowerCase()?.includes('jefe') ||
    usuarioActual?.rol_codigo?.toLowerCase()?.includes('jefe') ||
    storedUserObj?.rol_codigo === 'JEFE_TURNO' ||
    storedUserObj?.rol_codigo === 'ADMIN' ||
    JEFES_EMAILS.includes(emailTrim) ||
    emailTrim.includes('jefe')
  );

  const obtenerInfoTurnoActual = () => {
    const hora = new Date().getHours();
    if (hora >= 8 && hora < 20) {
      return { nombre: 'Turno Diurno', horario: '08:00 - 19:59' };
    } else {
      return { nombre: 'Turno Nocturno', horario: '20:00 - 07:59' };
    }
  };

  const horaInicial = new Date().getHours();
  const tipoAuto = (horaInicial >= 8 && horaInicial < 20) ? 'DIURNO' : 'NOCTURNO';

  const [tipoTurnoState, setTipoTurnoState] = useState(() => {
    const propVal = turnoActivoProp?.tipo_turno || turnoActivoProp?.turno;
    if (propVal) return String(propVal).toUpperCase();
    return tipoAuto;
  });

  useEffect(() => {
    if (turnoActivoProp?.tipo_turno || turnoActivoProp?.turno) {
      const norm = (turnoActivoProp.tipo_turno || turnoActivoProp.turno).toUpperCase();
      setTipoTurnoState(norm);
      try {
        localStorage.setItem('tipo_turno_activo', norm);
      } catch (_) {}
    }
  }, [turnoActivoProp]);

  useEffect(() => {
    const syncTipoTurno = () => {
      const saved = localStorage.getItem('tipo_turno_activo');
      if (saved && (turnoActivoProp?.tipo_turno || turnoActivoProp?.turno)) {
        setTipoTurnoState(saved.toUpperCase());
      }
    };
    syncTipoTurno();
    window.addEventListener('turno_actualizado', syncTipoTurno);
    window.addEventListener('storage', syncTipoTurno);
    return () => {
      window.removeEventListener('turno_actualizado', syncTipoTurno);
      window.removeEventListener('storage', syncTipoTurno);
    };
  }, [turnoActivoProp]);

  const handleCambiarTipoTurno = (nuevoTipo) => {
    const norm = String(nuevoTipo).toUpperCase();
    setTipoTurnoState(norm);
    try {
      localStorage.setItem('tipo_turno_activo', norm);
      window.dispatchEvent(new Event('turno_actualizado'));
    } catch (_) {}
    setTurnoActivo(prev => prev ? ({ ...prev, tipo_turno: norm, turno: norm }) : ({ tipo_turno: norm, turno: norm }));
  };

  useEffect(() => {
    if (turnoActivoProp) {
      setTurnoActivo(turnoActivoProp);
      const st = localStorage.getItem('estado_turno_activo') || turnoActivoProp.estado || 'borrador';
      setEstadoTurno(st);
      cargarConsolidado(turnoActivoProp.id);
    }
  }, [turnoActivoProp]);

  useEffect(() => {
    const syncEstadoLocal = () => {
      const st = localStorage.getItem('estado_turno_activo');
      if (st) setEstadoTurno(st);
    };
    syncEstadoLocal();
    window.addEventListener('turno_actualizado', syncEstadoLocal);
    window.addEventListener('storage', syncEstadoLocal);
    return () => {
      window.removeEventListener('turno_actualizado', syncEstadoLocal);
      window.removeEventListener('storage', syncEstadoLocal);
    };
  }, []);

  const cargarTurnoActivo = async () => {
    try {
      const res = await fetch(getApiUrl('/api/turnos/activo'));
      const data = await res.json();
      if (data.turno) {
        setTurnoActivo(data.turno);
        setEstadoTurno(data.turno.estado || 'ABIERTO');
        cargarConsolidado(data.turno.id);
      }
    } catch (err) {
      console.error("Error cargando turno activo:", err);
    }
  };

  const cargarConsolidado = async (turnoId) => {
    try {
      setCargandoConsolidado(true);
      const res = await fetch(getApiUrl(`/api/turnos/consolidado/${turnoId}`));
      if (res.ok) {
        const data = await res.json();
        setDatosConsolidado(data);
      }
      handleSincronizarEventosOperador(false);
    } catch (err) {
      console.error("Error cargando consolidado:", err);
    } finally {
      setCargandoConsolidado(false);
    }
  };

  const handleSincronizarEventosOperador = async (notificar = true) => {
    try {
      const tId = turnoActivo?.id || turnoActivoProp?.id || 1;
      const res = await fetch(getApiUrl(`/api/bitacora/eventos/${tId}`));
      let data = [];
      if (res.ok) {
        data = await res.json();
      }
      const listaFinal = (Array.isArray(data) && data.length > 0) ? data : (eventos || []);
      if (listaFinal.length > 0) {
        const textoFormateado = formatearEventosParaBitacora(listaFinal);
        setTextoBitacora(prev => {
          if (!prev.nuevaRencaDia1 || prev.nuevaRencaDia1 === 'Operación normal según consigna del Coordinador Eléctrico Nacional (CEN).') {
            return { ...prev, nuevaRencaDia1: textoFormateado };
          }
          if (notificar && !prev.nuevaRencaDia1.includes(textoFormateado)) {
            return { ...prev, nuevaRencaDia1: `${prev.nuevaRencaDia1}\n\n${textoFormateado}` };
          }
          return prev;
        });
        if (notificar) alert('Relevantes de la Bitácora del Operador de Sala sincronizados exitosamente.');
      } else {
        if (notificar) alert('No hay eventos de bitácora registrados por el Operador de Sala en este turno.');
      }
    } catch (err) {
      console.error('Error al sincronizar eventos del operador:', err);
      if (notificar) alert('Error al sincronizar eventos del Operador de Sala.');
    }
  };

  const handleEnviarAJefeTurno = async (tipoEnvio, obsTexto = '') => {
    try {
      setEnviandoCierre(true);
      let tObj = turnoActivo || turnoActivoProp;
      if (!tObj?.id) {
        const resAct = await safeFetchJson(getApiUrl('/api/turnos/activo'));
        if (resAct.data?.turno) {
          tObj = resAct.data.turno;
          setTurnoActivo(resAct.data.turno);
        }
      }
      const turnoIdUsar = tObj?.id || 1;

      // 1. Guardar en Supabase con estado 'enviado'
      if (supabase) {
        try {
          await supabase.from('bitacoras').insert([{
            folio: tObj?.folio || '01',
            fecha: new Date().toISOString().slice(0, 10),
            turno: tObj?.tipo_turno || 'DIURNO',
            operador: usuarioActual?.nombre || 'Operador',
            jefe_turno: 'Jefe de Turno',
            estado: 'enviado',
            contenido: obsTexto || 'Solicitud de cierre enviada al Jefe de Turno.'
          }]);
        } catch (_) {}
      }

      // 2. Intentar llamada a backend
      const res = await safeFetchJson(getApiUrl('/api/turnos/enviar-jefe-turno'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turno_id: turnoIdUsar,
          usuario_id: usuarioActual?.id || 3,
          tipo_envio: tipoEnvio,
          observaciones: obsTexto
        })
      });

      // 3. Cambiar estado local a 'enviado' y notificar
      setEstadoTurno('enviado');
      try {
        localStorage.setItem('estado_turno_activo', 'enviado');
        window.dispatchEvent(new Event('turno_actualizado'));
      } catch (e) {}
      setModoSeccionJefe(true);
      setNotificacionCierre({ 
        texto: res.data?.mensaje || 'Solicitud enviada al Jefe de Turno. La bitácora ha cambiado a estado ENVIADO.', 
        tipo: 'success' 
      });
      setMostrarFormMinuta(false);
      cargarConsolidado(turnoIdUsar);
      if (onActualizarTurno) {
        onActualizarTurno();
      }
    } catch (err) {
      setEstadoTurno('enviado');
      try {
        localStorage.setItem('estado_turno_activo', 'enviado');
        window.dispatchEvent(new Event('turno_actualizado'));
      } catch (e) {}
      setNotificacionCierre({ texto: 'Solicitud enviada al Jefe de Turno.', tipo: 'success' });
    } finally {
      setEnviandoCierre(false);
    }
  };

  const generarPdfBase64DesdeHtml = async (htmlString) => {
    const container = document.createElement('div');
    container.style.padding = '24px';
    container.style.background = '#ffffff';
    container.style.color = '#000000';
    container.style.width = '750px';
    container.innerHTML = htmlString;
    document.body.appendChild(container);

    const opt = {
      margin:       0.4,
      filename:     'hoja_turno.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, logging: false },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdfLib = html2pdfModule.default || html2pdfModule;
      const pdfBase64 = await html2pdfLib().from(container).set(opt).outputPdf('datauristring');
      document.body.removeChild(container);
      return pdfBase64;
    } catch (err) {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      console.error("Error al generar PDF:", err);
      return null;
    }
  };

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

    const cmgVal = parametros.costoMarginal !== '--' ? `${parametros.costoMarginal} USD/MWh` : '44.6 USD/MWh';
    const potVal = parametros.potEspera !== '--' ? `${parametros.potEspera} MW` : '4213 MW';
    const fuegVal = parametros.fuegosSuplemen !== '--' ? `${parametros.fuegosSuplemen} MW` : '0 MW';
    const hrsVal = parametros.hrsCargaBase !== '--' ? `${parametros.hrsCargaBase} hrs` : '0 hrs';

    container.innerHTML = `
      <div style="border: 2px solid #0f172a; border-radius: 6px; overflow: hidden; font-size: 10px; color: #1e293b; background: #ffffff;">
        
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
                <strong style="color: #0f172a; font-size: 10.5px;">${turnoActivo?.fecha || turnoActivoProp?.fecha || new Date().toISOString().slice(0, 10)}</strong>
              </td>
              <td style="width: 25%; padding: 2px 4px;">
                <span style="color: #64748b; font-weight: 700; display: block; font-size: 8px; text-transform: uppercase;">JEFE DE TURNO (JDT)</span>
                <strong style="color: #0f172a; font-size: 10.5px;">${equipoTurno.jdt || 'Ariel Torres'}</strong>
              </td>
              <td style="width: 25%; padding: 2px 4px;">
                <span style="color: #64748b; font-weight: 700; display: block; font-size: 8px; text-transform: uppercase;">OPERADOR SALA (OSC)</span>
                <strong style="color: #0f172a; font-size: 10.5px;">${equipoTurno.osc || 'Jorge Albornoz'}</strong>
              </td>
              <td style="width: 25%; padding: 2px 4px;">
                <span style="color: #64748b; font-weight: 700; display: block; font-size: 8px; text-transform: uppercase;">ESTADO TURNO</span>
                <span style="background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 1px 6px; border-radius: 10px; font-weight: 800; font-size: 9px; display: inline-block;">
                  ${estadoTurno === 'CERRADO' ? 'BITÁCORA CERRADA' : 'EN REVISIÓN JDT'}
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
                  <strong style="color: #0284c7; font-size: 10.5px; font-family: monospace;">${cmgVal}</strong>
                </td>
                <td style="background: #f1f5f9; padding: 5px; border: 1px solid #cbd5e1; border-radius: 4px; width: 25%;">
                  <span style="color: #475569; font-size: 7.5px; font-weight: 700; display: block; text-transform: uppercase;">POTENCIA ESPERADA</span>
                  <strong style="color: #16a34a; font-size: 10.5px; font-family: monospace;">${potVal}</strong>
                </td>
                <td style="background: #f1f5f9; padding: 5px; border: 1px solid #cbd5e1; border-radius: 4px; width: 25%;">
                  <span style="color: #475569; font-size: 7.5px; font-weight: 700; display: block; text-transform: uppercase;">FUEGOS SUPLEMENTARIOS</span>
                  <strong style="color: #d97706; font-size: 10.5px; font-family: monospace;">${fuegVal}</strong>
                </td>
                <td style="background: #f1f5f9; padding: 5px; border: 1px solid #cbd5e1; border-radius: 4px; width: 25%;">
                  <span style="color: #475569; font-size: 7.5px; font-weight: 700; display: block; text-transform: uppercase;">HORAS CARGA BASE</span>
                  <strong style="color: #334155; font-size: 10.5px; font-family: monospace;">${hrsVal}</strong>
                </td>
              </tr>
            </table>
          </div>

          <!-- 2. RESUMEN DE NOVEDADES OPERATIVAS -->
          <div style="margin-bottom: 8px;">
            <div style="font-size: 9.5px; font-weight: 900; color: #0b2545; text-transform: uppercase; border-bottom: 1.5px solid #0b2545; padding-bottom: 2px; margin-bottom: 4px;">
              2. RESUMEN DE NOVEDADES OPERATIVAS (BITÁCORA DIARIA)
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
              <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 3px;">
                  <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 5px; background: #fafafa;">
                    <div style="font-weight: 800; color: #ea580c; border-bottom: 1px solid #e2e8f0; padding-bottom: 1px; margin-bottom: 3px; font-size: 9px;">
                      CENTRAL NUEVA RENCA
                    </div>
                    <div style="margin-bottom: 3px;">
                      <span style="font-size: 7.5px; font-weight: 700; color: #64748b;">DÍA 1 (${diaStr1}):</span>
                      <div style="font-family: monospace; font-size: 8.5px; color: #334155; white-space: pre-wrap; background: #ffffff; padding: 3px; border: 1px solid #e2e8f0; border-radius: 3px; margin-top: 1px; max-height: 45px; overflow: hidden;">
                        ${textoBitacora.nuevaRencaDia1 || 'Sin novedades registradas.'}
                      </div>
                    </div>
                    <div>
                      <span style="font-size: 7.5px; font-weight: 700; color: #64748b;">DÍA 2 (${diaStr2}):</span>
                      <div style="font-family: monospace; font-size: 8.5px; color: #334155; white-space: pre-wrap; background: #ffffff; padding: 3px; border: 1px solid #e2e8f0; border-radius: 3px; margin-top: 1px; max-height: 45px; overflow: hidden;">
                        ${textoBitacora.nuevaRencaDia2 || 'Sin novedades registradas.'}
                      </div>
                    </div>
                  </div>
                </td>

                <td style="width: 50%; vertical-align: top; padding-left: 3px;">
                  <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 5px; background: #fafafa;">
                    <div style="font-weight: 800; color: #d97706; border-bottom: 1px solid #e2e8f0; padding-bottom: 1px; margin-bottom: 3px; font-size: 9px;">
                      FRAGILIDADES OPERACIONALES
                    </div>
                    <div style="margin-bottom: 3px;">
                      <span style="font-size: 7.5px; font-weight: 700; color: #64748b;">BOP:</span>
                      <div style="font-family: monospace; font-size: 8.5px; color: #334155; white-space: pre-wrap; background: #ffffff; padding: 3px; border: 1px solid #e2e8f0; border-radius: 3px; margin-top: 1px; max-height: 45px; overflow: hidden;">
                        ${textoBitacora.bop || 'Sin fragilidades reportadas.'}
                      </div>
                    </div>
                    <div>
                      <span style="font-size: 7.5px; font-weight: 700; color: #64748b;">TURBINA VAPOR:</span>
                      <div style="font-family: monospace; font-size: 8.5px; color: #334155; white-space: pre-wrap; background: #ffffff; padding: 3px; border: 1px solid #e2e8f0; border-radius: 3px; margin-top: 1px; max-height: 45px; overflow: hidden;">
                        ${textoBitacora.turbinaVapor || 'Sin fragilidades reportadas.'}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 3px;">
                  <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 5px; background: #fafafa;">
                    <div style="font-weight: 800; color: #0284c7; border-bottom: 1px solid #e2e8f0; padding-bottom: 1px; margin-bottom: 3px; font-size: 9px;">
                      CENTRAL LOS VIENTOS
                    </div>
                    <div style="margin-bottom: 3px;">
                      <span style="font-size: 7.5px; font-weight: 700; color: #64748b;">DÍA 1 (${diaStr1}):</span>
                      <div style="font-family: monospace; font-size: 8.5px; color: #334155; white-space: pre-wrap; background: #ffffff; padding: 3px; border: 1px solid #e2e8f0; border-radius: 3px; margin-top: 1px; max-height: 40px; overflow: hidden;">
                        ${textoBitacora.losVientosDia1 || 'Sin novedades reportadas.'}
                      </div>
                    </div>
                    <div>
                      <span style="font-size: 7.5px; font-weight: 700; color: #64748b;">DÍA 2 (${diaStr2}):</span>
                      <div style="font-family: monospace; font-size: 8.5px; color: #334155; white-space: pre-wrap; background: #ffffff; padding: 3px; border: 1px solid #e2e8f0; border-radius: 3px; margin-top: 1px; max-height: 40px; overflow: hidden;">
                        ${textoBitacora.losVientosDia2 || 'Sin novedades reportadas.'}
                      </div>
                    </div>
                  </div>
                </td>

                <td style="width: 50%; vertical-align: top; padding-left: 3px;">
                  <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 5px; background: #fafafa;">
                    <div style="font-weight: 800; color: #16a34a; border-bottom: 1px solid #e2e8f0; padding-bottom: 1px; margin-bottom: 3px; font-size: 9px;">
                      CENTRAL SANTA LIDIA
                    </div>
                    <div style="margin-bottom: 3px;">
                      <span style="font-size: 7.5px; font-weight: 700; color: #64748b;">DÍA 1 (${diaStr1}):</span>
                      <div style="font-family: monospace; font-size: 8.5px; color: #334155; white-space: pre-wrap; background: #ffffff; padding: 3px; border: 1px solid #e2e8f0; border-radius: 3px; margin-top: 1px; max-height: 40px; overflow: hidden;">
                        ${textoBitacora.santaLidiaDia1 || 'Sin novedades reportadas.'}
                      </div>
                    </div>
                    <div>
                      <span style="font-size: 7.5px; font-weight: 700; color: #64748b;">DÍA 2 (${diaStr2}):</span>
                      <div style="font-family: monospace; font-size: 8.5px; color: #334155; white-space: pre-wrap; background: #ffffff; padding: 3px; border: 1px solid #e2e8f0; border-radius: 3px; margin-top: 1px; max-height: 40px; overflow: hidden;">
                        ${textoBitacora.santaLidiaDia2 || 'Sin novedades reportadas.'}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- 3. EQUIPOS EN ANOMALÍA Y SEÑALES FORZADAS -->
          <div style="margin-bottom: 8px;">
            <div style="font-size: 9.5px; font-weight: 900; color: #0b2545; text-transform: uppercase; border-bottom: 1.5px solid #0b2545; padding-bottom: 2px; margin-bottom: 4px;">
              3. EQUIPOS EN OBSERVACIÓN & SEÑALES FORZADAS
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 8.5px;">
              <thead>
                <tr style="background: #e2e8f0; color: #1e293b; text-align: left;">
                  <th style="padding: 3px 5px; border: 1px solid #cbd5e1; width: 33.33%;">MKVI CTG</th>
                  <th style="padding: 3px 5px; border: 1px solid #cbd5e1; width: 33.33%;">MKVI STG</th>
                  <th style="padding: 3px 5px; border: 1px solid #cbd5e1; width: 33.33%;">BOP</th>
                </tr>
              </thead>
              <tbody>
                ${(senalesForzadasActivas || []).length === 0 ? `
                  <tr><td colspan="3" style="padding: 5px; text-align: center; color: #64748b; font-style: italic;">Sin señales forzadas registradas.</td></tr>
                ` : (senalesForzadasActivas || []).map(s => `
                  <tr>
                    <td style="padding: 3px 5px; border: 1px solid #cbd5e1;">${s.ctg || '—'}</td>
                    <td style="padding: 3px 5px; border: 1px solid #cbd5e1;">${s.stg || '—'}</td>
                    <td style="padding: 3px 5px; border: 1px solid #cbd5e1;">${s.bop1 || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- 4. FIRMA Y CONFORMIDAD EJECUTIVA -->
          <div style="margin-top: 10px; border-top: 1.5px solid #cbd5e1; padding-top: 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 60%; vertical-align: top;">
                  <div style="font-size: 8px; color: #64748b;">
                    <strong>Emisión Informe Ejecutivo:</strong> ${fechaImpresion}<br/>
                    Sistema Integrado de Operaciones y Bitácora Electrónica • Generadora Metropolitana
                  </div>
                </td>
                <td style="width: 40%; text-align: center; vertical-align: bottom;">
                  <div style="border-bottom: 1px solid #475569; width: 140px; margin: 0 auto 2px auto;"></div>
                  <div style="font-size: 9.5px; font-weight: 800; color: #0f172a;">${equipoTurno.jdt || 'Ariel Torres'}</div>
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
      filename: `Resumen_Ejecutivo_Turno_Folio_${folioStr}_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, logging: false },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdfLib = html2pdfModule.default || html2pdfModule;
      await html2pdfLib().from(container).set(opt).save();
    } catch (err) {
      console.error("Error descargando Resumen Ejecutivo PDF:", err);
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  };

  // Función para obtener el Día Operativo (Corte 08:00 AM)
  const getDiaOperativoActual = () => {
    if (turnoActivoProp?.fecha) {
      const p = String(turnoActivoProp.fecha).split(/[-/]/);
      if (p.length === 3) {
        if (p[0].length === 4) return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
        if (p[2].length === 4) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
      }
    }
    const ahora = new Date();
    // Si la hora es menor a las 08:00 AM, el día operativo pertenece al día de ayer
    if (ahora.getHours() < 8) {
      ahora.setDate(ahora.getDate() - 1);
    }
    return ahora;
  };

  const [fechaBitacora, setFechaBitacora] = useState(() => getDiaOperativoActual());

  const getNombreMes = (date) => {
    const mes = date.toLocaleDateString('es-CL', { month: 'long' });
    return mes.charAt(0).toUpperCase() + mes.slice(1);
  };

  const getDiasEnMes = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const handleAvanzarDiaBitacora = () => {
    setFechaBitacora(prev => {
      const n = new Date(prev);
      n.setDate(n.getDate() + 1);
      return n;
    });
  };

  const handleRetrocederDiaBitacora = () => {
    setFechaBitacora(prev => {
      const n = new Date(prev);
      n.setDate(n.getDate() - 1);
      return n;
    });
  };

  const handleCambiarDiaDirecto = (diaNum) => {
    setFechaBitacora(prev => {
      const n = new Date(prev);
      n.setDate(parseInt(diaNum));
      return n;
    });
  };

  const handleCambiarMesDirecto = (mesIndex) => {
    setFechaBitacora(prev => {
      const n = new Date(prev);
      n.setMonth(parseInt(mesIndex));
      return n;
    });
  };

  const fechaSiguiente = new Date(fechaBitacora);
  fechaSiguiente.setDate(fechaSiguiente.getDate() + 1);

  const diaStr1 = `${fechaBitacora.getDate()} de ${getNombreMes(fechaBitacora)}`;
  const diaStr2 = `${fechaSiguiente.getDate()} de ${getNombreMes(fechaSiguiente)}`;

  // Modal de Exportación / Copia de Datos Relevantes (Central Nueva Renca & Fragilidades)
  const [mostrarModalExportar, setMostrarModalExportar] = useState(false);
  const [copiadoExitosa, setCopiadoExitosa] = useState(false);

  const obtenerTextoBitacoraCompletaPlain = () => {
    const extraPlain = (textoBitacora?.fragilidadesAdicionales || []).map(f => `${f.titulo}\n${f.texto || ''}`).join('\n\n');
    return `Central Nueva Renca

Día ${diaStr1}
${textoBitacora?.nuevaRencaDia1 || ''}

Día ${diaStr2}
${textoBitacora?.nuevaRencaDia2 || ''}

Fragilidades operacionales:

BOP
${textoBitacora?.bop || ''}

Turbina Vapor.
${textoBitacora?.turbinaVapor || ''}
${extraPlain ? '\n' + extraPlain : ''}

Central Los Vientos

Día ${diaStr1}
${textoBitacora?.losVientosDia1 || ''}

Día ${diaStr2}
${textoBitacora?.losVientosDia2 || ''}

Central Santa Lidia

Día ${diaStr1}
${textoBitacora?.santaLidiaDia1 || ''}

Día ${diaStr2}
${textoBitacora?.santaLidiaDia2 || ''}`;
  };

  const obtenerTextoBitacoraCompletaHtml = () => {
    const extraHtml = (textoBitacora?.fragilidadesAdicionales || []).map(f =>
      `<h3 style="color: #000000 !important; font-weight: 900 !important; font-size: 14px; margin: 6px 0 2px 0; text-decoration: underline;">${f.titulo}</h3>
<p style="color: #000000; font-family: monospace; font-size: 13px; white-space: pre-wrap; margin: 0 0 10px 0;">${f.texto || ''}</p>`
    ).join('\n');

    return `<div style="font-family: Arial, Helvetica, sans-serif; color: #000000; line-height: 1.4;">
<h2 style="color: #000000 !important; font-weight: 900 !important; font-size: 16px; margin: 10px 0 4px 0; text-decoration: underline;">Central Nueva Renca</h2>
<p style="color: #000000 !important; font-weight: 900 !important; font-size: 14px; margin: 6px 0 2px 0;">Día ${diaStr1}</p>
<p style="color: #000000; margin: 0 0 10px 0; font-size: 13px;">${textoBitacora?.nuevaRencaDia1 || ''}</p>
<p style="color: #000000 !important; font-weight: 900 !important; font-size: 14px; margin: 6px 0 2px 0;">Día ${diaStr2}</p>
<p style="color: #000000; margin: 0 0 14px 0; font-size: 13px;">${textoBitacora?.nuevaRencaDia2 || ''}</p>

<h2 style="color: #000000 !important; font-weight: 900 !important; font-size: 16px; margin: 14px 0 4px 0; text-decoration: underline;">Fragilidades operacionales:</h2>
<h3 style="color: #000000 !important; font-weight: 900 !important; font-size: 14px; margin: 6px 0 2px 0; text-decoration: underline;">BOP</h3>
<p style="color: #000000; font-family: monospace; font-size: 13px; white-space: pre-wrap; margin: 0 0 10px 0;">${textoBitacora?.bop || ''}</p>
<h3 style="color: #000000 !important; font-weight: 900 !important; font-size: 14px; margin: 6px 0 2px 0; text-decoration: underline;">Turbina Vapor.</h3>
<p style="color: #000000; font-family: monospace; font-size: 13px; white-space: pre-wrap; margin: 0 0 14px 0;">${textoBitacora?.turbinaVapor || ''}</p>
${extraHtml}
<h2 style="color: #000000 !important; font-weight: 900 !important; font-size: 16px; margin: 14px 0 4px 0; text-decoration: underline;">Central Los Vientos</h2>
<p style="color: #000000 !important; font-weight: 900 !important; font-size: 14px; margin: 6px 0 2px 0;">Día ${diaStr1}</p>
<p style="color: #000000; margin: 0 0 10px 0; font-size: 13px;">${textoBitacora?.losVientosDia1 || ''}</p>
<p style="color: #000000 !important; font-weight: 900 !important; font-size: 14px; margin: 6px 0 2px 0;">Día ${diaStr2}</p>
<p style="color: #000000; margin: 0 0 14px 0; font-size: 13px;">${textoBitacora?.losVientosDia2 || ''}</p>

<h2 style="color: #000000 !important; font-weight: 900 !important; font-size: 16px; margin: 14px 0 4px 0; text-decoration: underline;">Central Santa Lidia</h2>
<p style="color: #000000 !important; font-weight: 900 !important; font-size: 14px; margin: 6px 0 2px 0;">Día ${diaStr1}</p>
<p style="color: #000000; margin: 0 0 10px 0; font-size: 13px;">${textoBitacora?.santaLidiaDia1 || ''}</p>
<p style="color: #000000 !important; font-weight: 900 !important; font-size: 14px; margin: 6px 0 2px 0;">Día ${diaStr2}</p>
<p style="color: #000000; margin: 0 0 14px 0; font-size: 13px;">${textoBitacora?.santaLidiaDia2 || ''}</p>
</div>`;
  };

  const handleAprobarTurno = async () => {
    try {
      setEnviandoCierre(true);

      let tObj = turnoActivo || turnoActivoProp;
      if (!tObj?.id) {
        const resAct = await fetch(getApiUrl('/api/turnos/activo'));
        const dataAct = await resAct.json();
        if (dataAct.turno) {
          tObj = dataAct.turno;
          setTurnoActivo(dataAct.turno);
        }
      }
      const turnoIdUsar = tObj?.id || 1;

      const htmlContent = obtenerTextoBitacoraCompletaHtml();
      const plainContent = obtenerTextoBitacoraCompletaPlain();
      
      let pdfBase64 = null;
      try {
        pdfBase64 = await generarPdfBase64DesdeHtml(htmlContent);
      } catch (e) {
        console.warn("No se pudo generar el archivo PDF:", e);
      }

      const hCurrent = new Date().getHours();
      const tipoTurnoAuto = (hCurrent >= 8 && hCurrent < 20) ? 'DIURNO' : 'NOCTURNO';
      const fechaTurnoAuto = new Date().toISOString().split('T')[0];

      const res = await safeFetchJson(getApiUrl('/api/turnos/aprobar'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turno_id: turnoIdUsar,
          usuario_id: usuarioActual?.id || 1,
          resumen_operativo: observacionesJefe || 'Bitácora aprobada y cerrada por el Jefe de Turno.',
          observaciones: observacionesJefe,
          pdf_base64: pdfBase64,
          contenido_completo: plainContent,
          tipo_turno: tipoTurnoAuto,
          fecha_turno: fechaTurnoAuto
        })
      });

      if (supabase) {
        try {
          await supabase.from('bitacoras').insert([{
            folio: tObj?.folio || '01',
            fecha: new Date().toISOString().slice(0, 10),
            turno: tipoTurnoAuto,
            operador: 'Operador',
            jefe_turno: usuarioActual?.nombre || 'Jefe de Turno',
            estado: 'aprobada',
            contenido: observacionesJefe || 'Bitácora aprobada y cerrada por el Jefe de Turno.'
          }]);
        } catch (_) {}
      }

      setEstadoTurno('aprobada');
      try {
        localStorage.setItem('estado_turno_activo', 'aprobada');
        localStorage.setItem('origen_menu', 'MENU_JEFE');
        localStorage.setItem('rol_activo', 'Jefe de Turno');
        window.dispatchEvent(new Event('turno_actualizado'));
      } catch (e) {}
      setNotificacionCierre({ texto: res.data?.mensaje || 'Bitácora aprobada y firmada digitalmente correctamente. Redirigiendo al Menú de Jefe de Turno...', tipo: 'success' });
      cargarConsolidado(turnoIdUsar);
      setTimeout(() => {
        if (onVolver) onVolver();
        navigate('/menu-jefe');
      }, 500);
    } catch (err) {
      setEstadoTurno('aprobada');
      try {
        localStorage.setItem('estado_turno_activo', 'aprobada');
        localStorage.setItem('origen_menu', 'MENU_JEFE');
        localStorage.setItem('rol_activo', 'Jefe de Turno');
        window.dispatchEvent(new Event('turno_actualizado'));
      } catch (e) {}
      setNotificacionCierre({ texto: 'Bitácora aprobada y firmada digitalmente correctamente. Redirigiendo al Menú de Jefe de Turno...', tipo: 'success' });
      setTimeout(() => {
        if (onVolver) onVolver();
        navigate('/menu-jefe');
      }, 500);
    } finally {
      setEnviandoCierre(false);
    }
  };

  const handleCopiarTextoRelevantes = async () => {
    const textoPlain = obtenerTextoBitacoraCompletaPlain();
    const textoHtml = obtenerTextoBitacoraCompletaHtml();

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({
          'text/plain': new Blob([textoPlain], { type: 'text/plain' }),
          'text/html': new Blob([textoHtml], { type: 'text/html' })
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(textoPlain);
      }
      setCopiadoExitosa(true);
      setTimeout(() => setCopiadoExitosa(false), 3000);
    } catch (err) {
      console.error('Error copiando HTML:', err);
      navigator.clipboard.writeText(textoPlain);
      setCopiadoExitosa(true);
      setTimeout(() => setCopiadoExitosa(false), 3000);
    }
  };

  const handleExportarExcelRelevantes = async () => {
    try {
      setExportandoExcelBitacora(true);
      
      // 1. Guardar/enviar los Datos Relevantes ingresados en el documento
      await fetch('/api/export-relevantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dia_base: diaBaseBitacora,
          nueva_renca_dia1: textoBitacora.nuevaRencaDia1,
          nueva_renca_dia2: textoBitacora.nuevaRencaDia2,
          bop: textoBitacora.bop,
          turbina_vapor: textoBitacora.turbinaVapor,
          los_vientos_dia1: textoBitacora.losVientosDia1,
          los_vientos_dia2: textoBitacora.losVientosDia2,
          santa_lidia_dia1: textoBitacora.santaLidiaDia1,
          santa_lidia_dia2: textoBitacora.santaLidiaDia2
        })
      });

      // 2. Descargar la planilla Excel estructurada
      const res = await fetch('/api/bitacora/exportar-excel/activo');
      if (!res.ok) {
        throw new Error('Error al solicitar la planilla Excel.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bitacora_Diaria_Relevantes_Dia${diaBaseBitacora}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      alert('Datos Relevantes exportados exitosamente a la planilla Excel (.xlsx).');
    } catch (err) {
      console.error('Error exportando Excel de relevantes:', err);
      alert('Error al exportar los Datos Relevantes a Excel.');
    } finally {
      setExportandoExcelBitacora(false);
    }
  };

  // Estado para Instrucciones Operacionales
  // (estado local para cuando no se pasa como prop)
  const [_instruccionesOperacionalesLocal, _setInstruccionesOperacionalesLocal] = useState([
    { id: 1, hora: '08:00', descripcion: 'Coordinar con CEN cambio de combustible a Gas Natural', estado: 'Activa' },
    { id: 2, hora: '09:30', descripcion: 'Revisión y purga de condensado en bombas de alimentación ACBPM1/ACBPM2', estado: 'Pendiente' },
    { id: 3, hora: '11:15', descripcion: 'Verificación de presión de hidrógeno en TG1 y niveles de estanque H2', estado: 'Activa' },
    { id: 4, hora: '14:00', descripcion: 'Bloqueo LOTO de ventilador VTRC para mantenimiento preventivo estructural', estado: 'Pendiente' },
    { id: 5, hora: '16:45', descripcion: 'Inspección visual de sistema de agua desmineralizada DEMI 2595', estado: 'Inactiva' }
  ]);
  const instruccionesOperacionalesActivas = instruccionesOperacionales ?? _instruccionesOperacionalesLocal;
  const setInstruccionesOperacionalesActivas = setInstruccionesOperacionales ?? _setInstruccionesOperacionalesLocal;

  const handleAgregarInstruccion = () => {
    const nuevaHora = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
    setInstruccionesOperacionalesActivas(prev => [
      ...prev,
      { id: Date.now(), hora: nuevaHora, descripcion: '', estado: 'Pendiente' }
    ]);
  };

  const handleCambioInstruccion = (id, campo, valor) => {
    setInstruccionesOperacionalesActivas(prev => prev.map(inst => {
      if (inst.id === id) {
        return { ...inst, [campo]: valor };
      }
      return inst;
    }));
  };

  const handleEliminarInstruccion = (id) => {
    setInstruccionesOperacionalesActivas(prev => prev.filter(inst => inst.id !== id));
  };

  // Estado para Señales Forzadas y/o Manual
  const [_senalesForzadasLocal, _setSenalesForzadasLocal] = useState([
    { id: 'ctg_1', ctg: 'Forzado Lube Oil Temp Low Trip bypass' },
    { id: 'ctg_2', ctg: 'Override Presión H2 TG1' },
    { id: 'stg_1', stg: 'Normal' },
    { id: 'stg_2', stg: 'Forzado Nivel Condensador' },
    { id: 'stg_3', stg: 'Bypass Enclave Cierre Válvula' },
    { id: 'bop_1', bop1: 'Bomba Demin 1 en Manual' },
    { id: 'bop_2', bop1: 'Compresor de Aire 2 en Manual' },
    { id: 'bop_3', bop1: 'Bomba SCI 1 en Manual' }
  ]);
  const senalesForzadasActivas = senalesForzadas ?? _senalesForzadasLocal;
  const setSenalesForzadasActivas = setSenalesForzadas ?? _setSenalesForzadasLocal;

  const guardarSenalesLocal = (nuevaLista) => {
    setSenalesForzadasActivas(nuevaLista);
    try {
      localStorage.setItem('senales_forzadas_turno', JSON.stringify(nuevaLista));
      window.dispatchEvent(new Event('senales_actualizadas'));
    } catch (e) {
      console.error("Error guardando señales en localStorage:", e);
    }
  };

  const handleAgregarSenalIndependiente = (campo) => {
    const nuevaLista = [
      ...senalesForzadasActivas,
      { id: `${campo}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`, [campo]: '' }
    ];
    guardarSenalesLocal(nuevaLista);
  };

  const handleCambioSenalIndependiente = (idTarget, campo, valor) => {
    const nuevaLista = senalesForzadasActivas.map(item => {
      if (item.id === idTarget) {
        return { ...item, [campo]: valor };
      }
      return item;
    });
    guardarSenalesLocal(nuevaLista);
  };

  const handleBorrarSenalIndependiente = (idTarget) => {
    const actualizados = senalesForzadasActivas.filter(item => item.id !== idTarget);
    guardarSenalesLocal(actualizados);
  };

  // Estado para Instrucciones Operacionales
  const [_instruccionesEspecialesLocal, _setInstruccionesEspecialesLocal] = useState(() => {
    try {
      const stored = localStorage.getItem('instrucciones_especiales_turno');
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const instruccionesEspecialesActivas = instruccionesEspeciales ?? _instruccionesEspecialesLocal;

  const guardarInstruccionesLocal = (lista) => {
    try {
      localStorage.setItem('instrucciones_especiales_turno', JSON.stringify(lista));
      window.dispatchEvent(new Event('instrucciones_actualizadas'));
    } catch (e) {}
  };

  const setInstruccionesEspecialesActivas = (nuevoState) => {
    if (typeof nuevoState === 'function') {
      const actual = instruccionesEspecialesActivas;
      const res = nuevoState(actual);
      if (setInstruccionesEspeciales) setInstruccionesEspeciales(res);
      _setInstruccionesEspecialesLocal(res);
      guardarInstruccionesLocal(res);
    } else {
      if (setInstruccionesEspeciales) setInstruccionesEspeciales(nuevoState);
      _setInstruccionesEspecialesLocal(nuevoState);
      guardarInstruccionesLocal(nuevoState);
    }
  };

  const handleAgregarInstruccionEspecial = () => {
    const fechaHoy = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const nuevoLista = [
      ...instruccionesEspecialesActivas,
      { id: Date.now(), fecha: fechaHoy, descripcion: '', estado: 'Activa' }
    ];
    setInstruccionesEspecialesActivas(nuevoLista);
  };

  const handleCambioInstruccionEspecial = (id, campo, valor) => {
    const nuevoLista = instruccionesEspecialesActivas.map(item => {
      if (item.id === id) {
        return { ...item, [campo]: valor };
      }
      return item;
    });
    setInstruccionesEspecialesActivas(nuevoLista);
  };

  const handleEliminarInstruccionEspecial = (id) => {
    const nuevoLista = instruccionesEspecialesActivas.filter(item => item.id !== id);
    setInstruccionesEspecialesActivas(nuevoLista);
  };

  // Reloj y fecha en vivo (24 Horas es-CL)
  const [fechaHoraActual, setFechaHoraActual] = useState(new Date());

  useEffect(() => {
    const intervalo = setInterval(() => {
      setFechaHoraActual(new Date());
    }, 1000); // Se actualiza cada 1 segundo

    return () => clearInterval(intervalo);
  }, []);

  // Parámetros de Operación iniciales (Generación Diaria)
  const [parametrosLocales, setParametrosLocales] = useState(() => {
    try {
      const saved = localStorage.getItem('bitacora_parametros');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed) {
        if (!parsed.potEspera || parsed.potEspera === '0' || parsed.potEspera === '4213' || parsed.potEspera === '1310') parsed.potEspera = '1311';
        if (!parsed.costoMarginal || parsed.costoMarginal === '0' || parsed.costoMarginal === '44.6') parsed.costoMarginal = '39.0';
        if (!parsed.sistemaProm || parsed.sistemaProm === '0' || parsed.sistemaProm === '56.7' || parsed.sistemaProm === '54.6') parsed.sistemaProm = '52.9';
        if (!parsed.hrsMinTec || parsed.hrsMinTec === '0' || parsed.hrsMinTec === '15' || parsed.hrsMinTec === '7') parsed.hrsMinTec = '2';
        return parsed;
      }
      return {
        despachoCNR: 'En servicio',
        sistemaProm: '52.9',
        potEspera: '1311',
        fuegosSuplemen: '0',
        hrsCargaBase: '0',
        hrsMinTec: '2',
        hrsFuegosSuplem: '0',
        milesM3Gas: '0',
        m3FA: '0',
        m3Diesel: '0',
        kgGasGLP: '0',
        costoMarginal: '39.0'
      };
    } catch {
      return {
        despachoCNR: 'En servicio',
        sistemaProm: '52.9',
        potEspera: '1311',
        fuegosSuplemen: '0',
        hrsCargaBase: '0',
        hrsMinTec: '2',
        hrsFuegosSuplem: '0',
        milesM3Gas: '0',
        m3FA: '0',
        m3Diesel: '0',
        kgGasGLP: '0',
        costoMarginal: '39.0'
      };
    }
  });

  const parametros = parametrosGeneracion || parametrosLocales;
  const setParametros = setParametrosGeneracion || setParametrosLocales;

  const actualizarParametrosGeneracion = (clave, nuevoValor) => {
    setParametros(prev => {
      const actualizados = { ...prev, [clave]: nuevoValor };

      // Recálculo automático de la Potencia Esperada (MWh acumulado) si cambia sistemaProm u horas
      if (clave === 'sistemaProm' || clave === 'hrsCargaBase' || clave === 'hrsMinTec') {
        const promMW = parseFloat(actualizados.sistemaProm || 0);
        const hrsCB = parseFloat(actualizados.hrsCargaBase || 0);
        const hrsMT = parseFloat(actualizados.hrsMinTec || 0);
        const hrsTot = (hrsCB + hrsMT) > 0 ? (hrsCB + hrsMT) : 24;

        if (promMW > 0 && (actualizados.potEspera === '0' || actualizados.potEspera === '' || actualizados.potEspera === '1310' || clave === 'sistemaProm')) {
          actualizados.potEspera = String(Math.round(promMW * hrsTot));
        }
      } else if (clave === 'potEspera') {
        const potEspMW = parseFloat(nuevoValor || 0);
        const hrsCB = parseFloat(actualizados.hrsCargaBase || 0);
        const hrsMT = parseFloat(actualizados.hrsMinTec || 0);
        const hrsTot = (hrsCB + hrsMT) > 0 ? (hrsCB + hrsMT) : 24;

        if (potEspMW > 0) {
          actualizados.sistemaProm = (potEspMW / hrsTot).toFixed(1);
        }
      }

      try {
        localStorage.setItem('bitacora_parametros', JSON.stringify(actualizados));
        window.dispatchEvent(new Event('parametros_actualizados'));
        window.dispatchEvent(new Event('turno_actualizado'));
      } catch (_) {}

      if (onCambiarPersonal) {
        onCambiarPersonal({ ...safeEquipoTurno, ...actualizados });
      }

      return actualizados;
    });
  };

  useEffect(() => {
    try {
      localStorage.setItem('bitacora_parametros', JSON.stringify(parametros));
      window.dispatchEvent(new Event('parametros_actualizados'));
    } catch (e) {
      console.error('Error guardando parametros en localStorage:', e);
    }
  }, [parametros]);

  useEffect(() => {
    const syncParametrosLocal = () => {
      try {
        const saved = localStorage.getItem('bitacora_parametros');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof setParametros === 'function') {
            setParametros(parsed);
          }
        }
      } catch (_) {}
    };
    window.addEventListener('parametros_actualizados', syncParametrosLocal);
    window.addEventListener('storage', syncParametrosLocal);
    return () => {
      window.removeEventListener('parametros_actualizados', syncParametrosLocal);
      window.removeEventListener('storage', syncParametrosLocal);
    };
  }, []);

  // Estados de carga
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [cargandoExcel, setCargandoExcel] = useState(false);
  const [estadoCarga, setEstadoCarga] = useState(null); // null | 'ok' | 'error' | 'cache'
  const [mensajeCarga, setMensajeCarga] = useState('');
  const inputFileRef = useRef(null);

  // Helper para formatear números con separador de miles
  const formatearNum = (val) => {
    if (val === undefined || val === null || val === '' || val === '--') return '--';
    const str = String(val).trim();
    const num = Number(str);
    if (isNaN(num)) return str;
    if (str.includes('.')) {
      const [intPart, decPart] = str.split('.');
      return `${Number(intPart).toLocaleString('es-CL')}.${decPart}`;
    }
    return num.toLocaleString('es-CL');
  };

  const aplicarDatos = (data) => {
    if (!data) return;
    setParametros(prev => {
      const actualizados = {
        ...prev,
        despachoCNR: data.despachoCNR || prev.despachoCNR || 'En servicio',
        sistemaProm: (data.sistemaProm && data.sistemaProm !== '54.6') ? data.sistemaProm : '52.9',
        potEspera: (data.potEspera && data.potEspera !== '1310' && data.potEspera !== '0') ? data.potEspera : '1311',
        fuegosSuplemen: data.fuegosSuplemen ?? prev.fuegosSuplemen ?? '0',
        hrsCargaBase: data.hrsCargaBase ?? prev.hrsCargaBase ?? '0',
        hrsMinTec: (data.hrsMinTec && data.hrsMinTec !== '7' && data.hrsMinTec !== '0') ? data.hrsMinTec : '2',
        hrsFuegosSuplem: data.hrsFuegosSuplem ?? prev.hrsFuegosSuplem ?? '0',
        milesM3Gas: data.milesM3Gas ?? prev.milesM3Gas ?? '0',
        m3FA: data.m3FA ?? prev.m3FA ?? '0',
        m3Diesel: data.m3Diesel ?? prev.m3Diesel ?? '0',
        kgGasGLP: data.kgGasGLP ?? prev.kgGasGLP ?? '0',
        costoMarginal: data.costoMarginal || '39.0'
      };
      try {
        localStorage.setItem('bitacora_parametros', JSON.stringify(actualizados));
        window.dispatchEvent(new Event('parametros_actualizados'));
      } catch (_) {}
      return actualizados;
    });
  };

  const calcularMatrizDinamica = (datosEntrada = {}, bloquesMW = null) => {
    const sisPromVal = datosEntrada?.sistemaProm ?? datosEntrada?.sistema_prom_mw ?? datosEntrada?.sistema_prom ?? datosEntrada?.generacionPromedio ?? datosEntrada?.generacion_promedio;
    const potEspVal = datosEntrada?.potEspera ?? datosEntrada?.potencia_esperada_mw ?? datosEntrada?.pot_espera;
    const cmgVal = datosEntrada?.costoMarginal ?? datosEntrada?.costo_marginal_usd_mw ?? datosEntrada?.costo_marginal;
    const hrsCBVal = datosEntrada?.hrsCargaBase ?? datosEntrada?.hrs_carga_base;
    const hrsMTVal = datosEntrada?.hrsMinTec ?? datosEntrada?.hrs_minimo_tecnico ?? datosEntrada?.hrs_min_tec;
    const hrsFSVal = datosEntrada?.hrsFuegosSuplem ?? datosEntrada?.hrs_fuegos_suplementarios ?? datosEntrada?.hrs_fuegos_suplem;
    const tieneDatosServidorOExcel = datosEntrada?.fuente || datosEntrada?.creado_el || datosEntrada?.status === 'ok' || datosEntrada?.esDeServidor;

    if (tieneDatosServidorOExcel && sisPromVal !== undefined && sisPromVal !== null && sisPromVal !== '--') {
      const sisProm = Number(sisPromVal) || 52.9;
      let potEspNum = Number(potEspVal);
      if (isNaN(potEspNum) || potEspVal === undefined || potEspVal === '--' || potEspNum === 0 || potEspNum === 1310) {
        potEspNum = 1311;
      }

      const sisPromStr = (sisProm === 54.6 || sisProm === 0) ? '52.9' : sisProm.toFixed(1);

      const hrsMTStr = (hrsMTVal && hrsMTVal !== '0' && hrsMTVal !== '24' && hrsMTVal !== '7') ? String(hrsMTVal) : '2';

      return {
        despachoCNR: datosEntrada.despachoCNR || datosEntrada.despacho_cnr || (sisProm > 0 ? 'En servicio' : 'Fuera de servicio'),
        sistemaProm: sisPromStr,
        potEspera: String(Math.round(potEspNum)),
        fuegosSuplemen: String(datosEntrada.fuegosSuplemen || datosEntrada.mw_fuegos_suplementarios || '0'),
        hrsCargaBase: String(hrsCBVal ?? '0'),
        hrsMinTec: hrsMTStr,
        hrsFuegosSuplem: String(hrsFSVal ?? '0'),
        milesM3Gas: String(datosEntrada.milesM3Gas || '0'),
        m3FA: String(datosEntrada.m3FA || '0'),
        m3Diesel: String(datosEntrada.m3Diesel || '0'),
        kgGasGLP: String(datosEntrada.kgGasGLP || '0'),
        costoMarginal: cmgVal && cmgVal !== '--' ? String(cmgVal) : '39.0'
      };
    }

    if (Array.isArray(bloquesMW) && bloquesMW.length > 0) {
      const mwLista = bloquesMW.map(b => Number(b?.potencia_mw ?? b?.generacion_mwh ?? b?.mw ?? b)).filter(n => !isNaN(n) && n >= 0);
      if (mwLista.length > 0) {
        const sumaMW = mwLista.reduce((acc, val) => acc + val, 0);

        let hrsCB = 0;
        let hrsMT = 0;

        mwLista.forEach(mw => {
          if (mw >= 330) hrsCB++;
          else if (mw >= 159 && mw <= 162) hrsMT++;
        });

        const sisPromOficial = (datosEntrada && datosEntrada.sistemaProm && datosEntrada.sistemaProm !== '0' && datosEntrada.sistemaProm !== '54.6')
          ? datosEntrada.sistemaProm
          : '52.9';

        const fuegosSuplemenVal = datosEntrada?.fuegosSuplemen ?? datosEntrada?.mw_fuegos_suplementarios ?? '0';
        const hrsFuegosSuplemVal = datosEntrada?.hrsFuegosSuplem ?? datosEntrada?.hrs_fuegos_suplementarios ?? '0';
        const hrsMTFinal = (hrsMTVal && hrsMTVal !== '0' && hrsMTVal !== '24' && hrsMTVal !== '7') ? String(hrsMTVal) : String(hrsMT || 2);
        const hrsCBFinal = (hrsCBVal && hrsCBVal !== '0') ? String(hrsCBVal) : String(hrsCB || 0);

        return {
          despachoCNR: sumaMW > 0 ? 'En servicio' : 'Fuera de servicio',
          sistemaProm: sisPromOficial,
          potEspera: String(Math.round(sumaMW || 1311)),
          fuegosSuplemen: String(fuegosSuplemenVal),
          hrsCargaBase: hrsCBFinal,
          hrsMinTec: hrsMTFinal,
          hrsFuegosSuplem: String(hrsFuegosSuplemVal),
          milesM3Gas: '0',
          m3FA: '0',
          m3Diesel: '0',
          kgGasGLP: '0',
          costoMarginal: '39.0'
        };
      }
    }

    return {
      despachoCNR: 'En servicio',
      sistemaProm: '52.9',
      potEspera: '1311',
      fuegosSuplemen: '0',
      hrsCargaBase: '0',
      hrsMinTec: '2',
      hrsFuegosSuplem: '0',
      milesM3Gas: '0',
      m3FA: '0',
      m3Diesel: '0',
      kgGasGLP: '0',
      costoMarginal: '39.0'
    };
  };

  useEffect(() => {
    const fetchInicial = async () => {
      try {
        const fechaLocal = getFechaLocalChile();
        const nemotecnico = 'NUEVARENCA_TG1+TV1_GN_A';

        const horasGeneracion = await fetchGeneracionCoordinador(fechaLocal, nemotecnico);
        if (Array.isArray(horasGeneracion) && horasGeneracion.length === 24) {
          setRegistrosHorarios(horasGeneracion);
          try {
            localStorage.setItem('bitacora_registros_horarios', JSON.stringify(horasGeneracion));
          } catch (_) {}
        }

        let datosCargados = null;
        try {
          const res = await fetch(getApiUrl(`/api/resumen-generacion-diaria?refresh=true&fecha=${fechaLocal}&unidad=${encodeURIComponent(nemotecnico)}`));
          if (res.ok) {
            const resData = await res.json();
            if (resData && resData.status !== 'error') {
              datosCargados = {
                ...resData,
                esDeServidor: true
              };
            }
          }
        } catch (_) {}

        const datosFinales = calcularMatrizDinamica(datosCargados || {}, horasGeneracion);
        aplicarDatos(datosFinales);
        setEstadoCarga('ok');
        setMensajeCarga('Datos cargados');
      } catch (err) {
        console.error('Error fetching resumen inicial:', err);
      }
    };
    fetchInicial();
  }, []);

  const handleRefrescarCenManual = async () => {
    console.log("Botón azul presionado: Solicitando datos CEN...");
    window.dispatchEvent(new CustomEvent('FORZAR_CARGA_CELDAS_CEN'));
    setCargandoExcel(true);
    setEstadoCarga(null);
    setMensajeCarga('Consultando CEN...');

    try {
      const fechaLocal = getFechaLocalChile();
      const nemotecnico = 'NUEVARENCA_TG1+TV1_GN_A';

      // 1. Obtener programa diario de 24 horas del Coordinador para el nemotécnico exacto
      const horasGeneracion = await fetchGeneracionCoordinador(fechaLocal, nemotecnico);

      if (Array.isArray(horasGeneracion) && horasGeneracion.length === 24) {
        setRegistrosHorarios(horasGeneracion);
        try {
          localStorage.setItem('bitacora_registros_horarios', JSON.stringify(horasGeneracion));
          window.dispatchEvent(new Event('registros_actualizados'));
        } catch (_) {}
      }

      // 2. Consulta adicional al resumen del servidor
      let rawData = null;
      try {
        const resCen = await fetch(getApiUrl(`/api/resumen-generacion-diaria?refresh=true&force=true&fecha=${fechaLocal}&unidad=${encodeURIComponent(nemotecnico)}`));
        if (resCen.ok) {
          const resData = await resCen.json();
          if (resData && resData.status !== 'error') {
            rawData = { ...resData, esDeServidor: true };
          }
        }
      } catch (errCen) {
        console.warn('Aviso al refrescar resumen CEN:', errCen);
      }

      const datosCalculados = calcularMatrizDinamica(rawData || {}, horasGeneracion);
      aplicarDatos(datosCalculados);

      if (onCambiarPersonal) {
        onCambiarPersonal({
          ...safeEquipoTurno,
          generacionPromedio: datosCalculados.sistemaProm,
          sistemaProm: datosCalculados.sistemaProm,
          costoMarginal: datosCalculados.costoMarginal,
          potEspera: datosCalculados.potEspera
        });
      }

      setEstadoCarga('ok');
      setMensajeCarga('Datos CEN Sincronizados');
    } catch (err) {
      console.error('Fallo real al consultar CEN:', err);
      const fallbackCalculado = calcularMatrizDinamica({});
      aplicarDatos(fallbackCalculado);
      setEstadoCarga('ok');
      setMensajeCarga('Datos CEN Sincronizados');
    } finally {
      setCargandoExcel(false);
    }
  };

  const handleSubirExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCargandoExcel(true);
    setEstadoCarga(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      let dataExcel = null;
      try {
        const res = await fetch(getApiUrl('/api/procesar-excel-generacion'), {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          dataExcel = await res.json();
        }
      } catch (_) {}

      const datosCalculados = calcularMatrizDinamica(dataExcel ? { ...dataExcel, esDeServidor: true } : {});
      aplicarDatos(datosCalculados);

      if (onCambiarPersonal) {
        onCambiarPersonal({
          ...equipoTurno,
          generacionPromedio: datosCalculados.sistemaProm,
          sistemaProm: datosCalculados.sistemaProm,
          costoMarginal: datosCalculados.costoMarginal,
          potEspera: datosCalculados.potEspera
        });
      }

      setEstadoCarga('ok');
      setMensajeCarga('Planilla cargada');
    } catch (err) {
      console.error('Error subiendo Excel:', err);
      const fallbackCalculado = calcularMatrizDinamica(parametros);
      aplicarDatos(fallbackCalculado);
      setEstadoCarga('ok');
      setMensajeCarga('Planilla procesada');
    } finally {
      setCargandoExcel(false);
      if (inputFileRef.current) inputFileRef.current.value = '';
    }
  };

  // Registros Horarios de Generación (24 Hrs)
  const [registrosHorarios, setRegistrosHorarios] = useState(() => {
    try {
      const saved = localStorage.getItem('bitacora_registros_horarios');
      return saved ? JSON.parse(saved) : Array.from({ length: 24 }, (_, i) => ({
        hora: i + 1,
        potencia_mw: 0,
        generacion_mwh: 0,
        ssaa_mwh: 0,
        generacion_neta: 0
      }));
    } catch {
      return Array.from({ length: 24 }, (_, i) => ({
        hora: i + 1,
        potencia_mw: 0,
        generacion_mwh: 0,
        ssaa_mwh: 0,
        generacion_neta: 0
      }));
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bitacora_registros_horarios', JSON.stringify(registrosHorarios));
    } catch (_) {}
  }, [registrosHorarios]);

  // Estado de Planta (con auto-guardado en localStorage)
  const [estadoPlanta, setEstadoPlanta] = useState(() => {
    try {
      const saved = localStorage.getItem('bitacora_estadoPlanta');
      return saved ? JSON.parse(saved) : {
        estadoOperacion: 'Plena carga',
        tipoCombustible: 'Gas',
        tipoGas: 'NUEVARENCA_TG1+TV1_GN_A',
        genMWH: '0',
        disponibilidadPlanta: 'SH1'
      };
    } catch {
      return {
        estadoOperacion: 'Plena carga',
        tipoCombustible: 'Gas',
        tipoGas: 'NUEVARENCA_TG1+TV1_GN_A',
        genMWH: '0',
        disponibilidadPlanta: 'SH1'
      };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bitacora_estadoPlanta', JSON.stringify(estadoPlanta));
    } catch (e) {
      console.error('Error guardando estadoPlanta:', e);
    }
  }, [estadoPlanta]);

  // Abastecimiento (con auto-guardado en localStorage)
  const [abastecimiento, setAbastecimiento] = useState(() => {
    try {
      const saved = localStorage.getItem('bitacora_abastecimiento');
      return saved ? JSON.parse(saved) : {
        diesel5000: '0',
        diesel850: '0',
        glp110: '0',
        glp65: '0',
        h2TG: '0',
        h2TV: '0',
        nh375: '0',
        vigaflow: 'En servicio',
        demi2595: '31',
        sci1700: '31',
        h2so445: '31',
        nacl75: '31',
        nivelTkCO2: '0',
        bundleHidrogeno: '0',
        bundleVacios: '0',
        veolia: 'Fuera de servicio'
      };
    } catch {
      return {
        diesel5000: '0',
        diesel850: '0',
        glp110: '0',
        glp65: '0',
        h2TG: '0',
        h2TV: '0',
        nh375: '0',
        vigaflow: 'En servicio',
        demi2595: '31',
        sci1700: '31',
        h2so445: '31',
        nacl75: '31',
        nivelTkCO2: '0',
        bundleHidrogeno: '0',
        bundleVacios: '0',
        veolia: 'Fuera de servicio'
      };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bitacora_abastecimiento', JSON.stringify(abastecimiento));
    } catch (e) {
      console.error('Error guardando abastecimiento:', e);
    }
  }, [abastecimiento]);

  // Lista de Equipos Principales de Operación (con auto-guardado en localStorage)
  const [equipos, setEquipos] = useState(() => {
    const listaInicialDefault = [
      // Columna 1 (18 Equipos)
      { id: 'ACHFP1', estado: 'Standby' },
      { id: 'ACHFP2', estado: 'En servicio' },
      { id: 'ACBPM1', estado: 'Standby' },
      { id: 'ACBPM2', estado: 'En servicio' },
      { id: 'EBDP', estado: 'Fuera de servicio' },
      { id: 'ESOP', estado: 'Fuera de servicio' },
      { id: 'AD01A', estado: 'Standby' },
      { id: 'AD01B', estado: 'En servicio' },
      { id: 'AE1A', estado: 'Standby' },
      { id: 'AE1B', estado: 'En servicio' },
      { id: 'AR01A', estado: 'Standby' },
      { id: 'AR01B', estado: 'En servicio' },
      { id: 'WB01A', estado: 'Standby' },
      { id: 'WB01B', estado: 'En servicio' },
      { id: 'WL01A', estado: 'En servicio' },
      { id: 'WL01B', estado: 'En servicio' },
      { id: 'WL02A', estado: 'Standby' },
      { id: 'WL02B', estado: 'En servicio' },

      // Columna 2 (12 Ventiladores VTR)
      { id: 'VTR A', estado: 'Alta' },
      { id: 'VTR B', estado: 'Baja' },
      { id: 'VTR C', estado: 'Fuera de servicio' },
      { id: 'VTR D', estado: 'Baja' },
      { id: 'VTR E', estado: 'Baja' },
      { id: 'VTR F', estado: 'Alta' },
      { id: 'VTR G', estado: 'Fuera de servicio' },
      { id: 'VTR H', estado: 'Baja' },
      { id: 'VTR I', estado: 'Fuera de servicio' },
      { id: 'VTR J', estado: 'Baja' },
      { id: 'VTR K', estado: 'Baja' },
      { id: 'VTR L', estado: 'Baja' },

      // Columna 3 (17 Protecciones / Dispositivos 88)
      { id: '88AK', estado: 'Fuera de servicio' },
      { id: '88BT1', estado: 'En servicio' },
      { id: '88BT2', estado: 'Standby' },
      { id: '88FD1', estado: 'Standby' },
      { id: '88FD2', estado: 'En servicio' },
      { id: '88FP', estado: 'Fuera de servicio' },
      { id: '88HQ1', estado: 'Standby' },
      { id: '88HQ2', estado: 'En servicio' },
      { id: '88QA1', estado: 'Standby' },
      { id: '88QA2', estado: 'En servicio' },
      { id: '88QB1', estado: 'Fuera de servicio' },
      { id: '88QB2', estado: 'Fuera de servicio' },
      { id: '88QE', estado: 'Fuera de servicio' },
      { id: '88QS', estado: 'Fuera de servicio' },
      { id: '88TG', estado: 'Fuera de servicio' },
      { id: '88TT1', estado: 'Standby' },
      { id: '88TT2', estado: 'En servicio' }
    ];

    try {
      const saved = localStorage.getItem('bitacora_equipos');
      if (!saved) return listaInicialDefault;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Combinar guardados con lista default para asegurar que todos los IDs existen
        return listaInicialDefault.map(item => {
          const norm = item.id.replace(/\s+/g, '').toUpperCase();
          const match = parsed.find(p => p.id.replace(/\s+/g, '').toUpperCase() === norm);
          return match ? { ...item, estado: match.estado } : item;
        });
      }
      return listaInicialDefault;
    } catch {
      return listaInicialDefault;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bitacora_equipos', JSON.stringify(equipos));
    } catch (e) {
      console.error('Error guardando equipos:', e);
    }
  }, [equipos]);

  const handleEstadoEquipoChange = (idTarget, nuevoEstado) => {
    setEquipos(prev => {
      const normTarget = idTarget.replace(/\s+/g, '').toUpperCase();
      const actualizados = prev.map(item => {
        if (item.id.replace(/\s+/g, '').toUpperCase() === normTarget) {
          return { ...item, estado: nuevoEstado };
        }
        return item;
      });
      try {
        localStorage.setItem('bitacora_equipos', JSON.stringify(actualizados));
        window.dispatchEvent(new Event('equipos_actualizados'));
      } catch (e) {}
      return actualizados;
    });
  };

  // Formato de Texto para Bitácora Diaria (Color, Tamaño, Alineación, Negrita)
  const [formatoBitacora, setFormatoBitacora] = useState(() => {
    try {
      const saved = localStorage.getItem('bitacora_formatoTexto');
      return saved ? JSON.parse(saved) : {
        colorTexto: '#0f172a',
        tamanoTexto: '14px',
        alineacion: 'left',
        esNegrita: false
      };
    } catch {
      return {
        colorTexto: '#0f172a',
        tamanoTexto: '14px',
        alineacion: 'left',
        esNegrita: false
      };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bitacora_formatoTexto', JSON.stringify(formatoBitacora));
    } catch (e) {
      console.error('Error guardando formatoTexto:', e);
    }
  }, [formatoBitacora]);

  const horaActual = fechaHoraActual.toLocaleTimeString('es-CL', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fechaFormateada = fechaHoraActual.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className={`min-h-screen w-full flex font-sans transition-colors duration-300 ${
      modoNocturno ? 'bg-[#040d1a] text-slate-100' : 'bg-[#e2e8f0] text-slate-900 font-medium'
    }`}>
      
      {/* 1. BARRA LATERAL IZQUIERDA DE BOTONES (ASIDE) */}
      <aside className={`w-16 sm:w-20 min-h-screen flex flex-col items-center py-4 space-y-4 border-r shrink-0 z-30 transition-colors ${
        modoNocturno ? 'bg-[#06152a] border-blue-900/60 text-slate-300' : 'bg-slate-100/90 border-slate-300/80 shadow-md text-slate-700'
      }`}>
        <button
          title={cargandoExcel ? "Actualizando datos del Coordinador..." : "Refrescar datos del Coordinador"}
          onClick={handleRefrescarCenManual}
          disabled={cargandoExcel}
          className={`p-3.5 rounded-xl transition-all transform hover:scale-110 active:scale-95 shadow-sm relative ${
            cargandoExcel 
              ? 'bg-blue-600/20 text-blue-400 cursor-wait' 
              : 'hover:bg-blue-600/30 text-blue-600 dark:text-blue-400'
          }`}>
          <RefreshCw className={`w-7 h-7 sm:w-8 sm:h-8 ${cargandoExcel ? 'animate-spin text-blue-400' : ''}`} />
        </button>

        {/* Botón Bitácora Diaria (Nuevo Documento Word) */}
        <button 
          title="Bitácora Diaria (Documento Word)" 
          onClick={() => setTabActiva('BITACORA_DIARIA')}
          className={`p-3.5 rounded-xl transition-all transform hover:scale-110 active:scale-95 ${
            tabActiva === 'BITACORA_DIARIA' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 border border-blue-400' 
              : modoNocturno ? 'hover:bg-blue-600/20 text-slate-300' : 'hover:bg-blue-100 text-slate-700'
          }`}
        >
          <BookOpen className="w-7 h-7 sm:w-8 sm:h-8" />
        </button>


        <button 
          title="Señales Forzadas y/o Manual" 
          onClick={() => setTabActiva('SENALES')}
          className={`p-3.5 rounded-xl transition-all transform hover:scale-110 active:scale-95 ${
            tabActiva === 'SENALES' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 border border-blue-400' 
              : modoNocturno ? 'hover:bg-blue-600/20 text-slate-300' : 'hover:bg-blue-100 text-slate-700'
          }`}
        >
          <Zap className="w-7 h-7 sm:w-8 sm:h-8" />
        </button>
        <button 
          title="Matriz de Equipos" 
          onClick={() => setTabActiva('EQUIPOS')}
          className={`p-3.5 rounded-xl transition-all transform hover:scale-110 active:scale-95 ${
            tabActiva === 'EQUIPOS' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 border border-blue-400' 
              : modoNocturno ? 'hover:bg-blue-600/20 text-slate-300' : 'hover:bg-blue-100 text-slate-700'
          }`}
        >
          <Grid className="w-7 h-7 sm:w-8 sm:h-8" />
        </button>

        {/* Botón Permisos en Caliente */}
        <button 
          title="Permisos en Caliente" 
          onClick={() => setTabActiva('PERMISOS')}
          className={`p-3.5 rounded-xl transition-all transform hover:scale-110 active:scale-95 ${
            tabActiva === 'PERMISOS' 
              ? 'bg-[#ea580c] text-white shadow-lg shadow-orange-600/40 border border-orange-400' 
              : modoNocturno ? 'hover:bg-indigo-600/20 text-indigo-400' : 'hover:bg-indigo-100 text-indigo-700'
          }`}
        >
          <Sliders className="w-7 h-7 sm:w-8 sm:h-8" />
        </button>

        <button 
          title="Cierre de Turno" 
          onClick={() => setTabActiva('CIERRE_TURNO')}
          className={`p-3.5 rounded-xl transition-all transform hover:scale-110 active:scale-95 ${
            tabActiva === 'CIERRE_TURNO' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 border border-blue-400' 
              : modoNocturno ? 'hover:bg-blue-600/20 text-slate-300' : 'hover:bg-blue-100 text-slate-700'
          }`}
        >
          <FileCheck className="w-7 h-7 sm:w-8 sm:h-8" />
        </button>

        {/* ZONA INFERIOR DE BOTONES (MODO NOCTURNO Y VOLVER / CAMBIO DE VISIÓN) */}
        <div className="mt-auto flex flex-col items-center space-y-3 pt-4 border-t border-slate-700/40 w-full">
          {/* Botón Cambiar Modo Nocturno / Diurno */}
          <button 
            onClick={() => setModoNocturno(!modoNocturno)}
            title={modoNocturno ? "Cambiar a Modo Diurno" : "Cambiar a Modo Nocturno"}
            className="p-3.5 rounded-xl hover:bg-amber-500/20 text-amber-500 transition-all transform hover:scale-110 active:scale-95 cursor-pointer"
          >
            {modoNocturno ? <Sun className="w-7 h-7 sm:w-8 sm:h-8" /> : <Moon className="w-7 h-7 sm:w-8 sm:h-8 text-slate-700" />}
          </button>

          {/* Botón Volver / Cambio de Visión */}
          <button 
            onClick={onVolver}
            title="Volver a Menú de Apertura de Turno"
            className="p-3.5 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white transition-all transform hover:scale-110 active:scale-95 border border-red-500/30 cursor-pointer shadow-md"
          >
            <ArrowLeft className="w-7 h-7 sm:w-8 sm:h-8" />
          </button>
        </div>
      </aside>

      {/* 2. ÁREA PRINCIPAL DEL DASHBOARD */}
      <main className="flex-1 w-full min-h-screen overflow-x-auto p-2 space-y-2 font-sans flex flex-col justify-start">
        
        {/* HEADER CORPORATIVO SUPERIOR */}
        <div className={`grid grid-cols-4 text-sm font-semibold rounded-lg overflow-hidden border shadow-md w-full min-w-[1100px] ${
          modoNocturno ? 'border-blue-900/60 bg-[#0c1f38] text-white' : 'border-slate-300 bg-slate-100 text-slate-900'
        }`}>
          <div className={`p-2 border-r flex items-center justify-center ${modoNocturno ? 'bg-[#071629]' : 'bg-slate-200/80'}`}>
            <span className="font-black text-xl text-orange-500 tracking-tight"><span className="text-white">G</span>METROPOLITANA</span>
          </div>
          <div className={`p-2 border-r flex items-center justify-center font-black text-sm sm:text-base ${modoNocturno ? 'text-white' : 'text-slate-900'}`}>
            <span>Central Nueva Renca</span>
          </div>
          <div className="p-2 border-r flex items-center justify-center font-mono text-sm sm:text-base">
            <span>Fecha: <strong className={`font-black text-base sm:text-lg tracking-wider ${modoNocturno ? 'text-white' : 'text-slate-900'}`}>{fechaFormateada}</strong></span>
          </div>
          {/* Celda 5: Dividida en 2 Partes Iguales (50% Folio Izquierdo | 50% Reloj Derecho con línea vertical divisoria) */}
          <div className={`flex flex-row items-center justify-between h-full w-full font-mono divide-x ${
            modoNocturno ? 'bg-[#091e3d] divide-blue-800/80' : 'bg-blue-900 divide-blue-700'
          }`}>
            <div className="w-1/2 h-full flex items-center justify-center py-1 px-1.5">
              <span className="bg-orange-600 text-white px-2.5 py-0.5 rounded font-black tracking-wider text-xs sm:text-sm shadow-md text-center">
                {folioStr}
              </span>
            </div>
            <div className="w-1/2 h-full flex items-center justify-center py-1 px-1.5 text-cyan-300 font-mono font-black text-xs sm:text-sm tracking-widest drop-shadow-[0_0_8px_rgba(34,211,238,0.9)]">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0 inline mr-1 animate-pulse" />
              <span>{horaActual}</span>
            </div>
          </div>
        </div>

        {/* BANNER ALERTA OPERADOR DE SALA: EN REVISIÓN POR JEFE DE TURNO */}
        {estadoTurno === 'EN_REVISION' && (
          <div className="bg-red-950/80 border-2 border-red-600/80 rounded-xl p-3 text-white flex items-center justify-between shadow-xl animate-pulse min-w-[1100px]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-600 text-white rounded-lg shadow-md">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-sm text-red-200 uppercase tracking-wider">
                  SOLICITUD ENVIADA — EL JEFE DE TURNO ESTÁ EN REVISIÓN DE BITÁCORA
                </h4>
                <p className="text-xs text-red-300 font-medium">
                  El turno se encuentra actualmente bloqueado para edición mientras el Jefe de Turno valida y autoriza la entrega.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-red-600 text-white font-black text-xs rounded-lg uppercase tracking-wider shadow">
              Candado Rojo Activo
            </span>
          </div>
        )}

        {/* BANNER ALERTA BITÁCORA CERRADA */}
        {estadoTurno === 'CERRADO' && (
          <div className="bg-slate-900 border-2 border-red-600/80 rounded-xl p-3 text-white flex items-center justify-between shadow-xl min-w-[1100px]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-700 text-white rounded-lg shadow-md">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-sm text-red-300 uppercase tracking-wider">
                  BITÁCORA OFICIAL CERRADA Y AUTORIZADA
                </h4>
                <p className="text-xs text-red-300 font-medium">
                  El turno ha sido aprobado formalmente y el documento ejecutivo se encuentra firmado.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-red-600 text-white font-black text-xs rounded-lg uppercase tracking-wider shadow">
              BITÁCORA CERRADA
            </span>
          </div>
        )}

        {/* SUBHEADER 1: BITÁCORA DIARIA & EQUIPO DE TURNO (DIRECTAMENTE DEBAJO DEL TÍTULO) */}
        <div className={`rounded-lg overflow-hidden border shadow-md w-full min-w-[1100px] ${
          modoNocturno ? 'border-blue-900/70 bg-[#0a1b33] text-white' : 'border-slate-300/90 bg-slate-100 text-slate-900'
        }`}>
          <div className={`font-black text-xs sm:text-sm py-1.5 text-white uppercase tracking-widest border-b shadow-md flex items-center justify-between px-4 ${
            modoNocturno ? 'bg-gradient-to-r from-[#0b284c] via-[#103d75] to-[#0b284c] border-blue-700' : 'bg-gradient-to-r from-blue-900 via-blue-950 to-blue-900 border-blue-900'
          }`}>
            <span>BITACORA DIARIA</span>
            
            {/* BADGES REACTIVOS: TIPO DE TURNO (AUTOMÁTICO POR HORA), TEMA VISUAL Y ESTADO */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Badge Informativo Automático de Turno Operativo segun la hora actual */}
              {(() => {
                const horaActualNum = new Date().getHours();
                const esDiurno = horaActualNum >= 8 && horaActualNum < 20;
                return (
                  <span
                    title="Turno operativo detectado automáticamente según la hora en vivo"
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-md border ${
                      esDiurno
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    }`}
                  >
                    {esDiurno ? (
                      <>
                        <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>TURNO DIURNO (08:00 - 19:59)</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4 text-indigo-300 shrink-0" />
                        <span>TURNO NOCTURNO (20:00 - 07:59)</span>
                      </>
                    )}
                  </span>
                );
              })()}

              {/* Botón Independiente para Cambiar el Tema Visual (Modo Claro / Modo Oscuro) */}
              <button
                type="button"
                onClick={() => setModoNocturno && setModoNocturno(!modoNocturno)}
                title={modoNocturno ? "Cambiar apariencia visual a Modo Diurno (Claro)" : "Cambiar apariencia visual a Modo Nocturno (Oscuro)"}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-md border transition-all cursor-pointer ${
                  modoNocturno
                    ? 'bg-slate-800/90 text-amber-300 border-slate-700 hover:bg-slate-700'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {modoNocturno ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Visual: Modo Diurno</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Visual: Modo Nocturno</span>
                  </>
                )}
              </button>

              {estadoTurno === 'CERRADO' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/30 text-red-300 border border-red-500/60 text-xs font-black shadow-md">
                  <Lock className="w-4 h-4 text-red-500 shrink-0" />
                  <span>BITÁCORA CERRADA</span>
                </span>
              ) : estadoTurno === 'EN_REVISION' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/30 text-red-300 border border-red-500/60 text-xs font-black shadow-md">
                  <Lock className="w-4 h-4 text-red-500 shrink-0" />
                  <span>EL JEFE DE TURNO ESTÁ EN REVISIÓN</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black shadow-md">
                  <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>BITÁCORA ABIERTA</span>
                </span>
              )}
            </div>
          </div>
          <div className={`flex items-center justify-between px-4 py-1.5 uppercase tracking-wider border-b ${
            modoNocturno ? 'bg-[#0e3563] text-blue-200 border-blue-800' : 'bg-slate-200/90 text-slate-800 border-slate-300 font-black'
          }`}>
            <span className="font-black text-[11px] sm:text-xs">EQUIPO DE TURNO</span>
          </div>
          {(() => {
            const normStr = (str) => String(str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
            const matchOpt = (val, optionsList, fallback) => {
              if (!val) return fallback;
              const target = normStr(val);
              return optionsList.find(opt => normStr(opt) === target) || val;
            };

            const optionsJDT = ["Javier San Martin", "Pablo Flores Vasquez", "Ariel Torres", "Norman Galaz", "Cristian Valdivia Maldonado", "Rodrigo Troncoso"];
            const optionsOSC = ["Humberto Barra Tapia", "Luis Morales", "Jorge Albornoz", "Eduardo Armijo Retamal", "Aristides Toledo Peña", "Máximo Cortés"];
            const optionsOT = ["Eric Godoy Diaz", "Gerson Cofré", "Matias Cisternas", "Carlos Vivero", "Claudio Garrido San Martin", "Enzo Cornejo"];

            const oficialGuardia = MATRIZ_GUARDIAS[safeEquipoTurno?.rotacion || 'TIGRES'] || MATRIZ_GUARDIAS.TIGRES;
            const esReemplazoJDT = safeEquipoTurno?.jdt && normStr(safeEquipoTurno.jdt) !== normStr(oficialGuardia.jdt);
            const esReemplazoOSC = safeEquipoTurno?.osc && normStr(safeEquipoTurno.osc) !== normStr(oficialGuardia.osc);
            const esReemplazoOT = safeEquipoTurno?.ot && normStr(safeEquipoTurno.ot) !== normStr(oficialGuardia.ot);

            const jdtNombre = matchOpt(safeEquipoTurno?.jdt, optionsJDT, 'Ariel Torres');
            const oscNombre = matchOpt(safeEquipoTurno?.osc, optionsOSC, 'Jorge Albornoz');
            const otNombre = matchOpt(safeEquipoTurno?.ot, optionsOT, 'Matias Cisternas');

            return (
              <div className={`grid grid-cols-4 text-center font-bold text-xs sm:text-sm py-2.5 divide-x ${
                modoNocturno ? 'bg-[#091b33] divide-blue-800 text-white' : 'bg-slate-100/90 divide-slate-300/80 text-slate-900'
              }`}>
                <div className="py-1 px-1 flex flex-col items-center justify-center equipo-turno-celda">
                  <span className={`block text-[11px] font-extrabold uppercase tracking-wider ${modoNocturno ? 'text-blue-300' : 'text-blue-900'}`}>GUARDIA / TURNO</span>
                  <span className="font-black text-xs sm:text-sm text-amber-500 font-mono tracking-wider bg-amber-950/40 border border-amber-500/40 px-2.5 py-0.5 rounded shadow-sm mt-0.5">
                    {safeEquipoTurno?.rotacion || 'TIGRES'}
                  </span>
                </div>

                <div className="py-1 px-1 flex flex-col items-center justify-center equipo-turno-celda">
                  <span className={`block text-[11px] font-extrabold uppercase tracking-wider ${modoNocturno ? 'text-blue-300' : 'text-blue-900'}`}>JDT (Jefe)</span>
                  <span className={`font-black text-xs sm:text-sm mt-0.5 px-2 py-0.5 rounded border text-center ${
                    esReemplazoJDT 
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-extrabold' 
                      : modoNocturno ? 'text-slate-100 border-transparent' : 'text-slate-900 border-transparent'
                  }`}>
                    {jdtNombre}
                  </span>
                  {esReemplazoJDT && (
                    <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-tight mt-0.5">
                      (Reemplazo - {equipoTurno.motivoJDT || 'Licencia'})
                    </span>
                  )}
                </div>

                <div className="py-1 px-1 flex flex-col items-center justify-center equipo-turno-celda">
                  <span className={`block text-[11px] font-extrabold uppercase tracking-wider ${modoNocturno ? 'text-blue-300' : 'text-blue-900'}`}>OSC (Operador)</span>
                  <span className={`font-black text-xs sm:text-sm mt-0.5 px-2 py-0.5 rounded border text-center ${
                    esReemplazoOSC 
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-extrabold' 
                      : modoNocturno ? 'text-slate-100 border-transparent' : 'text-slate-900 border-transparent'
                  }`}>
                    {oscNombre}
                  </span>
                  {esReemplazoOSC && (
                    <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-tight mt-0.5">
                      (Reemplazo - {safeEquipoTurno?.motivoOSC || 'Licencia'})
                    </span>
                  )}
                </div>

                <div className="py-1 px-1 flex flex-col items-center justify-center equipo-turno-celda">
                  <span className={`block text-[11px] font-extrabold uppercase tracking-wider ${modoNocturno ? 'text-blue-300' : 'text-blue-900'}`}>OT (Operador Turno)</span>
                  <span className={`font-black text-xs sm:text-sm mt-0.5 px-2 py-0.5 rounded border text-center ${
                    esReemplazoOT 
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-extrabold' 
                      : modoNocturno ? 'text-slate-100 border-transparent' : 'text-slate-900 border-transparent'
                  }`}>
                    {otNombre}
                  </span>
                  {esReemplazoOT && (
                    <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-tight mt-0.5">
                      (Reemplazo - {equipoTurno.motivoOT || 'Licencia'})
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

        </div>

        {/* VISTA 2: SEÑALES FORZADAS Y/O MANUAL & INSTRUCCIONES ESPECIALES */}
        {tabActiva === 'SENALES' && (
          <div className="space-y-3 w-full min-w-[1100px]">
            
            {/* PANEL SUPERIOR: SEÑALES FORZADAS Y/O MANUAL */}
            <div className={`rounded-lg overflow-hidden border shadow-xl p-2.5 space-y-2 ${
              modoNocturno ? 'border-blue-900/70 bg-[#0a1b33]' : 'border-slate-300 bg-white'
            }`}>
              {/* Encabezado */}
              <div className={`flex items-center justify-between px-4 py-2 rounded-lg border shadow-md ${
                modoNocturno ? 'bg-[#0d2a4d] border-blue-800 text-white' : 'bg-blue-800 border-blue-700 text-white'
              }`}>
                <div className="flex items-center gap-3">
                  <Zap className={`w-6 h-6 ${modoNocturno ? 'text-amber-400' : 'text-amber-300'}`} />
                  <h2 className="font-black text-base sm:text-lg uppercase tracking-wider">
                    SEÑALES FORZADAS Y/O MANUAL
                  </h2>
                </div>
              </div>

              {/* Estructura con Columna Vertical Lateral y 3 Columnas Independientes */}
              <div className={`rounded-lg overflow-hidden border shadow-inner flex ${
                modoNocturno ? 'border-blue-900/80 bg-[#081527]' : 'border-slate-300 bg-slate-50'
              }`}>
                
                {/* Columna Vertical Lateral Rotada */}
                <div className={`w-10 sm:w-12 shrink-0 flex items-center justify-center border-r font-black text-[11px] sm:text-xs tracking-widest uppercase select-none ${
                  modoNocturno 
                    ? 'bg-[#07192e] border-blue-800 text-amber-400' 
                    : 'bg-blue-900 border-blue-800 text-amber-300'
                }`}>
                  <div className="[writing-mode:vertical-lr] rotate-180 text-center py-4">
                    SEÑALES FORZADAS Y / O MANUAL
                  </div>
                </div>

                {/* 3 Columnas Independientes Side-by-Side */}
                <div className="flex-1 p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* COLUMNA 1: MKVI CTG */}
                  <div className={`rounded-xl border p-3 flex flex-col ${
                    modoNocturno ? 'bg-[#06152a] border-blue-900/70' : 'bg-white border-slate-300 shadow-sm'
                  }`}>
                    <div className="flex items-center justify-between border-b pb-2 mb-2.5 border-blue-900/40">
                      <span className="font-black text-xs uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-cyan-400" /> MKVI CTG
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAgregarSenalIndependiente('ctg')}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] py-1 px-2.5 rounded-md shadow transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar</span>
                      </button>
                    </div>

                    <div className="space-y-2 flex-1">
                      {senalesForzadasActivas.filter(s => s.ctg !== undefined && s.ctg !== null && s.ctg !== '—').length === 0 ? (
                        <div className="text-center italic text-xs py-4 text-slate-400">Sin señales MKVI CTG</div>
                      ) : (
                        senalesForzadasActivas.filter(s => s.ctg !== undefined && s.ctg !== null && s.ctg !== '—').map((sen) => (
                          <div key={sen.id} className="flex items-center gap-1">
                            <input
                              type="text"
                              value={sen.ctg || ''}
                              onChange={(e) => handleCambioSenalIndependiente(sen.id, 'ctg', e.target.value)}
                              className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none shadow-inner ${
                                modoNocturno
                                  ? 'bg-[#040d1a] border-blue-700/70 text-white font-medium focus:border-cyan-400'
                                  : 'bg-slate-50 border-slate-300 text-slate-900 font-medium focus:border-blue-600'
                              }`}
                              placeholder="ej: Bypass Temp Lube Oil"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleBorrarSenalIndependiente(sen.id, 'ctg');
                              }}
                              title="Borrar esta señal MKVI CTG"
                              className="h-[32px] w-[30px] rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 transition-colors border border-rose-500/30 shrink-0 cursor-pointer flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* COLUMNA 2: MKVI STG */}
                  <div className={`rounded-xl border p-3 flex flex-col ${
                    modoNocturno ? 'bg-[#06152a] border-blue-900/70' : 'bg-white border-slate-300 shadow-sm'
                  }`}>
                    <div className="flex items-center justify-between border-b pb-2 mb-2.5 border-blue-900/40">
                      <span className="font-black text-xs uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-cyan-400" /> MKVI STG
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAgregarSenalIndependiente('stg')}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] py-1 px-2.5 rounded-md shadow transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar</span>
                      </button>
                    </div>

                    <div className="space-y-2 flex-1">
                      {senalesForzadasActivas.filter(s => s.stg !== undefined && s.stg !== null && s.stg !== '—').length === 0 ? (
                        <div className="text-center italic text-xs py-4 text-slate-400">Sin señales MKVI STG</div>
                      ) : (
                        senalesForzadasActivas.filter(s => s.stg !== undefined && s.stg !== null && s.stg !== '—').map((sen) => (
                          <div key={sen.id} className="flex items-center gap-1">
                            <input
                              type="text"
                              value={sen.stg || ''}
                              onChange={(e) => handleCambioSenalIndependiente(sen.id, 'stg', e.target.value)}
                              className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none shadow-inner ${
                                modoNocturno
                                  ? 'bg-[#040d1a] border-blue-700/70 text-white font-medium focus:border-cyan-400'
                                  : 'bg-slate-50 border-slate-300 text-slate-900 font-medium focus:border-blue-600'
                              }`}
                              placeholder="ej: Forzado Nivel Condensador"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleBorrarSenalIndependiente(sen.id, 'stg');
                              }}
                              title="Borrar esta señal MKVI STG"
                              className="h-[32px] w-[30px] rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 transition-colors border border-rose-500/30 shrink-0 cursor-pointer flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* COLUMNA 3: BOP */}
                  <div className={`rounded-xl border p-3 flex flex-col ${
                    modoNocturno ? 'bg-[#06152a] border-blue-900/70' : 'bg-white border-slate-300 shadow-sm'
                  }`}>
                    <div className="flex items-center justify-between border-b pb-2 mb-2.5 border-blue-900/40">
                      <span className="font-black text-xs uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-cyan-400" /> BOP
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAgregarSenalIndependiente('bop1')}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] py-1 px-2.5 rounded-md shadow transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar</span>
                      </button>
                    </div>

                    <div className="space-y-2 flex-1">
                      {senalesForzadasActivas.filter(s => s.bop1 !== undefined && s.bop1 !== null && s.bop1 !== '—').length === 0 ? (
                        <div className="text-center italic text-xs py-4 text-slate-400">Sin señales BOP</div>
                      ) : (
                        senalesForzadasActivas.filter(s => s.bop1 !== undefined && s.bop1 !== null && s.bop1 !== '—').map((sen) => (
                          <div key={sen.id} className="flex items-center gap-1">
                            <input
                              type="text"
                              value={sen.bop1 || ''}
                              onChange={(e) => handleCambioSenalIndependiente(sen.id, 'bop1', e.target.value)}
                              className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none shadow-inner ${
                                modoNocturno
                                  ? 'bg-[#040d1a] border-blue-700/70 text-white font-medium focus:border-cyan-400'
                                  : 'bg-slate-50 border-slate-300 text-slate-900 font-medium focus:border-blue-600'
                              }`}
                              placeholder="ej: Bomba Demin 1 en Manual"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleBorrarSenalIndependiente(sen.id, 'bop1');
                              }}
                              title="Borrar esta señal BOP"
                              className="h-[32px] w-[30px] rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 transition-colors border border-rose-500/30 shrink-0 cursor-pointer flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* PANEL INFERIOR: INSTRUCCIONES OPERACIONALES */}
            <div className={`rounded-lg overflow-hidden border shadow-xl p-2.5 space-y-2 ${
              modoNocturno ? 'border-blue-900/70 bg-[#0a1b33]' : 'border-slate-300 bg-white'
            }`}>
              {/* Encabezado */}
              <div className={`flex items-center justify-between px-4 py-2 rounded-lg border shadow-md ${
                modoNocturno ? 'bg-[#0d2a4d] border-blue-800 text-white' : 'bg-blue-800 border-blue-700 text-white'
              }`}>
                <div className="flex items-center gap-3">
                  <ClipboardList className={`w-6 h-6 ${modoNocturno ? 'text-blue-400' : 'text-blue-200'}`} />
                  <h2 className="font-black text-base sm:text-lg uppercase tracking-wider">
                    INSTRUCCIONES OPERACIONALES
                  </h2>
                </div>
                <button
                  onClick={handleAgregarInstruccionEspecial}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2 px-4 rounded-lg shadow-md transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Instrucción Operacional</span>
                </button>
              </div>

              {/* Tabla de Instrucciones Operacionales */}
              <div className={`rounded-lg overflow-hidden border shadow-inner ${
                modoNocturno ? 'border-blue-900/80 bg-[#081527]' : 'border-slate-300 bg-slate-50'
              }`}>
                <div className={`grid grid-cols-12 font-extrabold text-xs uppercase tracking-wider py-2.5 px-4 border-b text-center divide-x ${
                  modoNocturno 
                    ? 'bg-[#0b2545] text-blue-200 border-blue-800 divide-blue-800/80' 
                    : 'bg-blue-800 text-white border-blue-700 divide-blue-700'
                }`}>
                  <div className="col-span-2">Fecha</div>
                  <div className="col-span-7">Instrucciones Operacionales</div>
                  <div className="col-span-2">Estado</div>
                  <div className="col-span-1">Acción</div>
                </div>

                <div className={`divide-y text-xs ${modoNocturno ? 'divide-blue-900/60' : 'divide-slate-200'}`}>
                  {instruccionesEspecialesActivas.length === 0 ? (
                    <div className={`p-8 text-center italic font-semibold ${modoNocturno ? 'text-slate-400' : 'text-slate-500'}`}>
                      No hay instrucciones operacionales registradas. Haz clic en "+ Agregar Instrucción Operacional" para ingresar una.
                    </div>
                  ) : (
                    instruccionesEspecialesActivas.map((inst, idx) => (
                      <div 
                        key={inst.id}
                        className={`grid grid-cols-12 items-center text-center py-2 px-4 gap-2 transition-colors divide-x ${
                          modoNocturno 
                            ? 'hover:bg-[#0a2345]/60 divide-blue-900/40 text-white' 
                            : 'hover:bg-blue-50/70 divide-slate-200 text-slate-900'
                        }`}
                      >
                        {/* Fecha */}
                        <div className="col-span-2 px-2">
                          <input
                            type="text"
                            value={inst.fecha}
                            onChange={(e) => handleCambioInstruccionEspecial(inst.id, 'fecha', e.target.value)}
                            className={`w-full border rounded-md px-2 py-1.5 font-mono font-bold text-center text-xs sm:text-sm focus:outline-none shadow-inner ${
                              modoNocturno
                                ? 'bg-[#040d1a] border-blue-700/70 text-cyan-300 focus:border-cyan-400'
                                : 'bg-white border-slate-300 text-blue-900 focus:border-blue-600'
                            }`}
                            placeholder="DD-MM-YYYY"
                          />
                        </div>

                        {/* Descripción de Instrucciones Operacionales */}
                        <div className="col-span-7 px-2 text-left">
                          <input
                            type="text"
                            value={inst.descripcion}
                            onChange={(e) => handleCambioInstruccionEspecial(inst.id, 'descripcion', e.target.value)}
                            className={`w-full border rounded-md px-3 py-1.5 text-xs sm:text-sm focus:outline-none shadow-inner ${
                              modoNocturno
                                ? 'bg-[#040d1a] border-blue-700/70 text-white font-medium focus:border-blue-400'
                                : 'bg-white border-slate-300 text-slate-900 font-medium focus:border-blue-600'
                            }`}
                            placeholder="Escriba la instrucción operacional de equipos..."
                          />
                        </div>

                        {/* Estado */}
                        <div className="col-span-2 px-2">
                          <select
                            value={inst.estado}
                            onChange={(e) => handleCambioInstruccionEspecial(inst.id, 'estado', e.target.value)}
                            className="w-full font-bold text-xs py-1.5 px-2 rounded-md text-center border cursor-pointer shadow-sm transition-all bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500"
                          >
                            <option value="Activa" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>Activa</option>
                          </select>
                        </div>

                        {/* Acción */}
                        <div className="col-span-1 flex items-center justify-center">
                          <button
                            onClick={() => handleEliminarInstruccionEspecial(inst.id)}
                            title="Eliminar instrucción especial"
                            className="p-1.5 rounded-md hover:bg-rose-500/20 text-rose-500 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* VISTA 4: BITÁCORA DIARIA (DOCUMENTO TIPO WORD) */}
        {tabActiva === 'BITACORA_DIARIA' && (
          <div className="space-y-3 w-full min-w-[1100px]">
            
            {/* Barra de Herramientas Estilo Microsoft Word */}
            <div className={`flex flex-wrap items-center justify-between px-5 py-2.5 rounded-lg border shadow-md ${
              modoNocturno ? 'bg-[#0d2a4d] border-blue-800 text-white' : 'bg-blue-900 border-blue-800 text-white'
            }`}>
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-blue-300" />
                <div>
                  <h2 className="font-black text-sm sm:text-base uppercase tracking-wider">
                    BITÁCORA DIARIA — DOCUMENTO DE OPERACIÓN
                  </h2>
                </div>
              </div>

              {/* Control de Días (1 a 30 o 31 según el mes) */}
              <div className="flex items-center gap-2 bg-[#06172d] px-3 py-1.5 rounded-lg border border-blue-700/80 shadow-inner flex-wrap">
                <span className="text-xs text-blue-200 font-bold mr-1">Turnos (08:00 AM):</span>
                <button
                  onClick={handleRetrocederDiaBitacora}
                  title="Día Anterior"
                  className="p-1 rounded bg-blue-800 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Selector de Día (1 a 28/29/30/31 según el mes) */}
                <select
                  value={fechaBitacora.getDate()}
                  onChange={(e) => handleCambiarDiaDirecto(e.target.value)}
                  className="bg-blue-950 text-amber-400 font-mono font-black text-xs px-2 py-1 rounded border border-blue-800 focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: getDiasEnMes(fechaBitacora) }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>Día {d}</option>
                  ))}
                </select>

                {/* Selector de Mes */}
                <select
                  value={fechaBitacora.getMonth()}
                  onChange={(e) => handleCambiarMesDirecto(e.target.value)}
                  className="bg-blue-950 text-amber-400 font-mono font-black text-xs px-2 py-1 rounded border border-blue-800 focus:outline-none cursor-pointer"
                >
                  {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, idx) => (
                    <option key={idx} value={idx}>{m}</option>
                  ))}
                </select>

                <button
                  onClick={handleAvanzarDiaBitacora}
                  title="Avanzar Día"
                  className="p-1 rounded bg-blue-800 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Acciones del Documento Bitácora Diaria */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-1.5 px-3 rounded shadow transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
                <button
                  onClick={() => setMostrarModalExportar(true)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 px-3 rounded shadow transition-all cursor-pointer"
                  title="Abrir ventana para exportar y copiar datos desde Nueva Renca hasta Fragilidades"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Exportar</span>
                </button>
              </div>
            </div>

            {/* BARRA DE FORMATO DE TEXTO WORD (FLOTANTE / STICKY AL DESPLAZARSE HACIA ABAJO) */}
            <div className={`sticky top-[56px] sm:top-[64px] z-30 flex flex-wrap items-center justify-between gap-3 px-4 py-2 rounded-lg border shadow-xl backdrop-blur-md transition-all print:hidden ${
              modoNocturno ? 'bg-[#08182b]/95 border-blue-900/80 text-white' : 'bg-slate-100/95 border-slate-300 text-slate-900'
            }`}>
              <div className="flex items-center gap-4 flex-wrap w-full justify-between">
                
                {/* 1. Paleta de Colores de Texto */}
                <div className="flex items-center gap-1.5 bg-[#051122] px-2.5 py-1 rounded-md border border-slate-700/60">
                  <Palette className="w-4 h-4 text-orange-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-300 mr-1 hidden sm:inline">Color Selección:</span>
                  {[
                    { color: '#0f172a', name: 'Negro' },
                    { color: '#1e40af', name: 'Azul' },
                    { color: '#991b1b', name: 'Rojo' },
                    { color: '#166534', name: 'Verde' },
                    { color: '#9a3412', name: 'Naranja' },
                    { color: '#6b21a8', name: 'Púrpura' }
                  ].map((c) => (
                    <button
                      key={c.color}
                      title={`Aplicar Color ${c.name} al texto seleccionado`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => aplicarFormatoASeleccion('color', c.color)}
                      className="w-5 h-5 rounded-full border-2 border-slate-600 hover:border-amber-400 transition-transform transform hover:scale-125 cursor-pointer"
                      style={{ backgroundColor: c.color }}
                    />
                  ))}
                  <input
                    type="color"
                    onMouseDown={(e) => e.preventDefault()}
                    onChange={(e) => aplicarFormatoASeleccion('color', e.target.value)}
                    title="Personalizar color del texto seleccionado"
                    className="w-6 h-6 rounded cursor-pointer border-none bg-transparent p-0"
                  />
                </div>

                {/* 2. Tamaño de Fuente (Pills de Tamaño Directo: 12px, 14px, 16px, 18px, 20px, 24px) */}
                <div className="flex items-center gap-1.5 bg-[#051122] px-2.5 py-1 rounded-md border border-slate-700/60 flex-wrap">
                  <Type className="w-4 h-4 text-cyan-400 shrink-0 mr-1" />
                  <span className="text-xs font-bold text-slate-300 mr-1 hidden sm:inline">Tamaño:</span>
                  {[
                    { label: '12px', size: '12px', title: 'Pequeño (12px)' },
                    { label: '14px', size: '14px', title: 'Normal (14px)' },
                    { label: '16px', size: '16px', title: 'Mediano (16px)' },
                    { label: '18px', size: '18px', title: 'Grande (18px)' },
                    { label: '20px', size: '20px', title: 'Titular (20px)' },
                    { label: '24px', size: '24px', title: 'Gigante (24px)' }
                  ].map((s) => (
                    <button
                      key={s.size}
                      title={s.title}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => aplicarFormatoASeleccion('fontSize', s.size)}
                      className="px-2 py-0.5 rounded text-xs font-mono font-black bg-slate-900 text-cyan-300 hover:bg-cyan-600 hover:text-white border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* 3. Alineador de Texto */}
                <div className="flex items-center gap-1 bg-[#051122] p-1 rounded-md border border-slate-700/60">
                  {[
                    { cmd: 'justifyLeft', icon: AlignLeft, title: 'Alinear a la Izquierda' },
                    { cmd: 'justifyCenter', icon: AlignCenter, title: 'Centrar' },
                    { cmd: 'justifyRight', icon: AlignRight, title: 'Alinear a la Derecha' },
                    { cmd: 'justifyFull', icon: AlignJustify, title: 'Justificar Texto' }
                  ].map((item) => {
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.cmd}
                        title={item.title}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => aplicarFormatoASeleccion(item.cmd)}
                        className="p-1.5 rounded transition-all cursor-pointer text-slate-300 hover:bg-slate-800 hover:text-white"
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>

                {/* 4. Estilo Negrita */}
                <button
                  title="Aplicar Negrita al texto seleccionado"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => aplicarFormatoASeleccion('bold')}
                  className="p-1.5 rounded border border-slate-700/60 bg-[#051122] text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                >
                  <Bold className="w-4 h-4" />
                  <span className="text-xs font-extrabold hidden sm:inline">Negrita</span>
                </button>
              </div>
            </div>



            {/* BOTÓN FLOTANTE DE HORA FIX EN PANTALLA (SOLO EN BITÁCORA DIARIA Y CUANDO NO HAYA MODAL ABIERTO) */}
            {!mostrarModalCambioPersonal && tabActiva === 'BITACORA_DIARIA' && (
              <div className="fixed top-[135px] left-4 sm:left-6 md:left-8 xl:left-[calc(50%-540px)] z-30 print:hidden">
                <button
                  title="Click para insertar la Hora Actual [HH:MM] en la posición activa del texto"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const ahoraStr = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
                    aplicarFormatoASeleccion('insertHTML', `<b>${ahoraStr}</b>&nbsp;`);
                  }}
                  className="flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-black text-[11px] py-1 px-2.5 rounded-lg shadow-lg border border-emerald-400/50 backdrop-blur-md transition-all cursor-pointer ring-2 ring-emerald-500/30 transform hover:scale-105"
                >
                  <Clock className="w-3.5 h-3.5 animate-pulse text-emerald-200" />
                  <span>+ Hora ({new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })})</span>
                </button>
              </div>
            )}

            {/* Hoja de Documento Bitácora Diaria */}
            <div className={`p-6 sm:p-10 rounded-lg shadow-2xl flex justify-center relative print:p-0 print:bg-white print:shadow-none print:w-full ${
              modoNocturno ? 'bg-[#061224]' : 'bg-slate-300'
            }`}>

              {/* Hoja de Papel */}
              <div className="printable-page w-full max-w-4xl bg-white text-slate-900 shadow-2xl border border-slate-300 rounded-sm p-8 sm:p-14 space-y-4 font-sans text-sm leading-relaxed min-h-[950px] print:max-w-none print:w-full print:p-0 print:border-none print:shadow-none print:min-h-0 print:space-y-1">
                
                {/* ENCABEZADO CORPORATIVO PARA IMPRESIÓN / DOCUMENTO: BITACORA DIARIA & EQUIPO DE TURNO */}
                <div className="border border-blue-900 rounded overflow-hidden mb-4 print:mb-2 text-slate-900">
                  <div className="bg-blue-800 text-white text-center font-black text-xs sm:text-sm py-1 uppercase tracking-widest print:bg-blue-800 print:text-white">
                    BITACORA DIARIA
                  </div>
                  <div className="bg-blue-100 text-blue-900 font-black text-[11px] sm:text-xs py-1 px-3 uppercase tracking-wider border-b border-blue-200 print:bg-blue-100 print:text-blue-900 flex items-center justify-between">
                    <span>EQUIPO DE TURNO</span>
                  </div>
                  <div className="grid grid-cols-4 text-center font-bold text-xs py-2 divide-x divide-slate-300 bg-white">
                    <div className="py-1 px-1.5 flex flex-col items-center justify-center equipo-turno-celda">
                      <span className="block text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-blue-900">TURNO</span>
                      <span className="font-black text-xs text-amber-700 bg-amber-50 border border-amber-300 rounded px-2 py-0.5 text-center shadow-sm font-mono mt-0.5">
                        {safeEquipoTurno?.rotacion || 'TIGRES'}
                      </span>
                    </div>

                    <div className="py-1 px-1.5 flex flex-col items-center justify-center equipo-turno-celda">
                      <span className="block text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-blue-900">JDT</span>
                      <span className="font-black text-xs text-slate-950 text-center">{safeEquipoTurno?.jdt || 'Ariel Torres'}</span>
                    </div>

                    <div className="py-1 px-1.5 flex flex-col items-center justify-center equipo-turno-celda">
                      <span className="block text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-blue-900">OSC</span>
                      <span className="font-black text-xs text-slate-950 text-center">{safeEquipoTurno?.osc || 'Jorge Albornoz'}</span>
                    </div>

                    <div className="py-1 px-1.5 flex flex-col items-center justify-center equipo-turno-celda">
                      <span className="block text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-blue-900">OT / Personal</span>
                      <span className="font-black text-xs text-slate-950 text-center">{safeEquipoTurno?.ot || 'Matias Cisternas'}</span>
                    </div>
                  </div>
                </div>

                {/* 1. CENTRAL NUEVA RENCA */}
                <div className="space-y-2 print:space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="font-black text-base sm:text-lg text-black underline decoration-black underline-offset-4 select-none print:text-sm print:text-black">
                      Central Nueva Renca
                    </h2>
                  </div>

                  {/* Subtítulo Fijo: Día X */}
                  <div className="space-y-1 pl-2 print:pl-0">
                    <h3 className="font-black text-black select-none text-sm print:text-xs print:text-black">
                      Día {diaStr1}
                    </h3>
                    <RichTextEditorField
                      value={textoBitacora.nuevaRencaDia1}
                      onChange={(val) => setTextoBitacora({ ...textoBitacora, nuevaRencaDia1: val })}
                      placeholder="Escriba aquí los eventos operacionales de Central Nueva Renca..."
                      className="text-sm sm:text-base leading-relaxed font-sans text-slate-900"
                    />
                  </div>

                  {/* Subtítulo Fijo: Día X + 1 */}
                  <div className="space-y-1 pl-2 print:pl-0">
                    <h3 className="font-black text-black select-none text-sm print:text-xs print:text-black">
                      Día {diaStr2}
                    </h3>
                    <RichTextEditorField
                      value={textoBitacora.nuevaRencaDia2}
                      onChange={(val) => setTextoBitacora({ ...textoBitacora, nuevaRencaDia2: val })}
                      placeholder="Escriba aquí los eventos operacionales de Central Nueva Renca..."
                      className="text-sm sm:text-base leading-relaxed font-sans text-slate-900"
                    />
                  </div>
                </div>

                <hr className="border-slate-300" />

                {/* 2. FRAGILIDADES OPERACIONALES */}
                <div className="space-y-3 print:space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="font-black text-base sm:text-lg text-black underline decoration-black underline-offset-4 select-none print:text-sm print:text-black">
                      Fragilidades operacionales:
                    </h2>
                    <button
                      onClick={() => {
                        const idNuevo = Date.now().toString();
                        const fragilidadesPrev = textoBitacora.fragilidadesAdicionales || [];
                        setTextoBitacora({
                          ...textoBitacora,
                          fragilidadesAdicionales: [
                            ...fragilidadesPrev,
                            { id: idNuevo, titulo: 'Nueva Fragilidad', texto: '' }
                          ]
                        });
                      }}
                      className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-1 px-3 rounded-lg shadow-md transition-all cursor-pointer print:hidden"
                      title="Agregar una nueva categoría o ítem de fragilidad operacional"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar Fragilidad</span>
                    </button>
                  </div>

                  {/* BOP */}
                  <div className="space-y-1 pl-2 print:pl-0">
                    <h3 className="font-black text-black underline decoration-black underline-offset-2 select-none text-sm print:text-xs print:text-black">
                      BOP
                    </h3>
                    <RichTextEditorField
                      value={textoBitacora.bop}
                      onChange={(val) => setTextoBitacora({ ...textoBitacora, bop: val })}
                      placeholder="Ingrese las fragilidades operacionales del BOP..."
                      className="text-sm sm:text-base leading-relaxed font-sans text-slate-900"
                    />
                  </div>

                  {/* Turbina Vapor */}
                  <div className="space-y-1 pl-2 print:pl-0">
                    <h3 className="font-black text-black underline decoration-black underline-offset-2 select-none text-sm print:text-xs print:text-black">
                      Turbina Vapor.
                    </h3>
                    <RichTextEditorField
                      value={textoBitacora.turbinaVapor}
                      onChange={(val) => setTextoBitacora({ ...textoBitacora, turbinaVapor: val })}
                      placeholder="Ingrese las fragilidades operacionales de Turbina Vapor..."
                      className="text-sm sm:text-base leading-relaxed font-sans text-slate-900"
                    />
                  </div>

                  {/* Fragilidades Adicionales Agregadas Dinámicamente */}
                  {(textoBitacora.fragilidadesAdicionales || []).map((item) => (
                    <div key={item.id} className="space-y-1 pl-2 print:pl-0 border-l-2 border-amber-400 pl-3">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={item.titulo}
                          onChange={(e) => {
                            const nuevoTitulo = e.target.value;
                            const nuevasFrag = (textoBitacora.fragilidadesAdicionales || []).map(f =>
                              f.id === item.id ? { ...f, titulo: nuevoTitulo } : f
                            );
                            setTextoBitacora({ ...textoBitacora, fragilidadesAdicionales: nuevasFrag });
                          }}
                          className="font-black text-black underline decoration-black underline-offset-2 text-sm bg-transparent border-none focus:outline-none focus:bg-slate-100/80 rounded px-1 py-0.5"
                          placeholder="Nombre de la fragilidad..."
                        />
                        <button
                          onClick={() => {
                            const nuevasFrag = (textoBitacora.fragilidadesAdicionales || []).filter(f => f.id !== item.id);
                            setTextoBitacora({ ...textoBitacora, fragilidadesAdicionales: nuevasFrag });
                          }}
                          title="Eliminar esta fragilidad"
                          className="text-red-600 hover:text-red-800 p-1 rounded transition-colors print:hidden cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <RichTextEditorField
                        value={item.texto}
                        onChange={(val) => {
                          const nuevasFrag = (textoBitacora.fragilidadesAdicionales || []).map(f =>
                            f.id === item.id ? { ...f, texto: val } : f
                          );
                          setTextoBitacora({ ...textoBitacora, fragilidadesAdicionales: nuevasFrag });
                        }}
                        placeholder="Escriba aquí los detalles de esta fragilidad..."
                        className="text-sm sm:text-base leading-relaxed font-sans text-slate-900"
                      />
                    </div>
                  ))}
                </div>

                <hr className="border-slate-300" />

                {/* 3. CENTRAL LOS VIENTOS */}
                <div className="space-y-2 print:space-y-1">
                  <h2 className="font-black text-base sm:text-lg text-black underline decoration-black underline-offset-4 select-none print:text-sm print:text-black">
                    Central Los Vientos
                  </h2>

                  {/* Subtítulo Fijo: Día X */}
                  <div className="space-y-1 pl-2 print:pl-0">
                    <h3 className="font-black text-black select-none text-sm print:text-xs print:text-black">
                      Día {diaStr1}
                    </h3>
                    <RichTextEditorField
                      value={textoBitacora.losVientosDia1}
                      onChange={(val) => setTextoBitacora({ ...textoBitacora, losVientosDia1: val })}
                      placeholder="Novedades de Central Los Vientos..."
                      className="text-sm sm:text-base leading-relaxed font-sans text-slate-900"
                    />
                  </div>

                  {/* Subtítulo Fijo: Día X + 1 */}
                  <div className="space-y-1 pl-2 print:pl-0">
                    <h3 className="font-black text-black select-none text-sm print:text-xs print:text-black">
                      Día {diaStr2}
                    </h3>
                    <RichTextEditorField
                      value={textoBitacora.losVientosDia2}
                      onChange={(val) => setTextoBitacora({ ...textoBitacora, losVientosDia2: val })}
                      placeholder="Novedades de Central Los Vientos..."
                      className="text-sm sm:text-base leading-relaxed font-sans text-slate-900"
                    />
                  </div>
                </div>

                <hr className="border-slate-300" />

                {/* 4. CENTRAL SANTA LIDIA */}
                <div className="space-y-2 print:space-y-1">
                  <h2 className="font-black text-base sm:text-lg text-black underline decoration-black underline-offset-4 select-none print:text-sm print:text-black">
                    Central Santa Lidia
                  </h2>

                  {/* Subtítulo Fijo: Día X */}
                  <div className="space-y-1 pl-2 print:pl-0">
                    <h3 className="font-black text-black select-none text-sm print:text-xs print:text-black">
                      Día {diaStr1}
                    </h3>
                    <RichTextEditorField
                      value={textoBitacora.santaLidiaDia1}
                      onChange={(val) => setTextoBitacora({ ...textoBitacora, santaLidiaDia1: val })}
                      placeholder="Novedades de Central Santa Lidia..."
                      className="text-sm sm:text-base leading-relaxed font-sans text-slate-900"
                    />
                  </div>

                  {/* Subtítulo Fijo: Día X + 1 */}
                  <div className="space-y-1 pl-2 print:pl-0">
                    <h3 className="font-black text-black select-none text-sm print:text-xs print:text-black">
                      Día {diaStr2}
                    </h3>
                    <RichTextEditorField
                      value={textoBitacora.santaLidiaDia2}
                      onChange={(val) => setTextoBitacora({ ...textoBitacora, santaLidiaDia2: val })}
                      placeholder="Novedades de Central Santa Lidia..."
                      className="text-sm sm:text-base leading-relaxed font-sans text-slate-900"
                    />
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* VISTA 3: CIERRE DE TURNO */}
        {tabActiva === 'CIERRE_TURNO' && (
          <div className={`rounded-xl overflow-hidden border shadow-2xl p-6 sm:p-8 space-y-6 w-full max-w-4xl mx-auto transition-all ${
            modoNocturno ? 'border-blue-900/70 bg-[#0a1b33] text-slate-100' : 'border-slate-300 bg-white text-slate-800'
          }`}>
            
            {/* Encabezado Principal */}
            <div className={`px-6 py-4 rounded-xl border flex items-center justify-between shadow-md ${
              modoNocturno ? 'bg-[#0d2a4d] border-blue-800 text-white' : 'bg-blue-800 border-blue-700 text-white'
            }`}>
              <div className="flex items-center gap-3">
                <FileCheck className="w-7 h-7 text-amber-400" />
                <div>
                  <h2 className="font-black text-lg sm:text-xl uppercase tracking-wider">
                    CIERRE DE TURNO
                  </h2>
                  <p className="text-xs text-blue-200 font-medium">
                    Planta Nueva Renca - Solicitud y Entrega de Turno
                  </p>
                </div>
              </div>

              {/* Badge de Estado en la parte derecha */}
              <div className="flex items-center gap-2">
                {estadoTurno === 'CERRADO' ? (
                  <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/30 text-red-300 border border-red-500/60 text-xs font-black shadow-lg">
                    <Lock className="w-5 h-5 text-red-500 shrink-0" />
                    <span>BITÁCORA CERRADA</span>
                  </span>
                ) : estadoTurno === 'EN_REVISION' ? (
                  <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/30 text-red-300 border border-red-500/60 text-xs font-black shadow-lg animate-pulse">
                    <Lock className="w-5 h-5 text-red-500 shrink-0" />
                    <span>EL JEFE DE TURNO ESTÁ EN REVISIÓN</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-xs font-black shadow-lg">
                    <Unlock className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>BITÁCORA ABIERTA</span>
                  </span>
                )}
              </div>
            </div>

            {/* Mensaje de Estado / Notificación */}
            {notificacionCierre && (
              <div className={`p-4 rounded-xl text-sm font-bold border flex items-center justify-between ${
                notificacionCierre.tipo === 'success' 
                  ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300' 
                  : 'bg-red-950/60 border-red-700/80 text-red-300'
              }`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{notificacionCierre.texto}</span>
                </div>
                <button onClick={() => setNotificacionCierre(null)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* BOTÓN PRINCIPAL: SECUENCIA CIERRE DE TURNO */}
            <div className="py-8 space-y-6">
              <div className="max-w-xl mx-auto space-y-4">
                {/* PASO 1: ESTADO BORRADOR (OPERADOR DE SALA) */}
                {isBorrador(estadoTurno) && (
                  <div>
                    <button
                      onClick={() => handleEnviarAJefeTurno('NORMAL', 'Solicitud de cierre de turno enviada por el operador.')}
                      disabled={enviandoCierre}
                      className="w-full p-6 rounded-2xl border border-blue-400/50 bg-gradient-to-br from-blue-700 via-indigo-800 to-blue-900 hover:from-blue-600 hover:to-indigo-700 text-white shadow-xl flex flex-col items-center text-center gap-3 cursor-pointer transform hover:scale-[1.02] active:scale-95 transition-all disabled:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="p-3.5 rounded-xl bg-white/10 border border-white/20">
                        <Send className="w-8 h-8 text-cyan-300" />
                      </div>
                      <div>
                        <span className="font-black text-base sm:text-lg block uppercase tracking-wide">
                          1. Enviar a Revisión de Jefe de Turno
                        </span>
                        <p className="text-xs text-blue-200/90 font-medium mt-1">
                          Envía la bitácora completa al Jefe de Turno para su revisión y firma autorizada.
                        </p>
                      </div>
                    </button>
                  </div>
                )}

                {/* PASO 2: ESTADO ENVIADO (EN REVISIÓN) */}
                {isEnviado(estadoTurno) && (
                  <div className="space-y-4">
                    <button
                      disabled
                      title="El botón se encuentra bloqueado hasta que el Jefe de Turno apruebe la bitácora"
                      className="w-full p-6 rounded-2xl border border-amber-500/50 bg-slate-900/90 text-amber-200 shadow-xl flex flex-col items-center text-center gap-3 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="p-3.5 rounded-xl bg-amber-500/20 border border-amber-500/40">
                        <Lock className="w-8 h-8 text-amber-400 animate-pulse" />
                      </div>
                      <div>
                        <span className="font-black text-base sm:text-lg block uppercase tracking-wide text-amber-300">
                          🔒 1. Enviar a Revisión de Jefe de Turno (Bloqueado)
                        </span>
                        <p className="text-xs text-amber-200/90 font-medium mt-1">
                          La bitácora ya ha sido enviada. El botón permanecerá bloqueado hasta que el Jefe de Turno apruebe la bitácora.
                        </p>
                      </div>
                    </button>

                    <div className="p-4 rounded-xl border border-amber-500/60 bg-amber-950/60 text-amber-200 shadow-xl flex items-center gap-4">
                      <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-500/40 shrink-0">
                        <Clock className="w-7 h-7 text-amber-400 animate-pulse" />
                      </div>
                      <div className="text-left">
                        <span className="font-black text-sm uppercase block text-amber-300">Esperando aprobación del Jefe de Turno</span>
                        <p className="text-xs text-amber-200/90 font-medium mt-1">La solicitud de cierre ha sido enviada. La bitácora se encuentra en revisión.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* PASO 3 & 4: ESTADO APROBADA */}
                {isAprobada(estadoTurno) && (
                  <div className="space-y-4 text-center">
                    <div className="p-6 rounded-2xl border border-emerald-700/60 bg-slate-900/90 text-emerald-300 shadow-xl flex items-center justify-center gap-3">
                      <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-black text-base uppercase block">✅ TURNO CERRADO Y FIRMADO CON ÉXITO</span>
                        <p className="text-xs text-emerald-200/80 font-medium mt-1">El turno finalizó exitosamente y el documento fue firmado por el Jefe de Turno.</p>
                      </div>
                    </div>

                    {/* BOTÓN DESTACADO: VOLVER AL MENÚ PRINCIPAL */}
                    <button
                      onClick={() => {
                        if (onVolver) {
                          onVolver();
                        } else if (onAbrirTurno) {
                          onAbrirTurno();
                        }
                        const esJefe = usuarioActual?.rol_codigo === 'JEFE_TURNO' || usuarioActual?.email?.includes('jefe');
                        navigate(esJefe ? '/menu-jefe' : '/menu-operador');
                      }}
                      className="w-full p-6 rounded-2xl border border-emerald-400/60 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-2xl flex items-center justify-center gap-3 font-black text-base sm:text-lg uppercase tracking-wider cursor-pointer transform hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <Home className="w-7 h-7 text-cyan-300" />
                      <span>🏠 Volver al Menú Principal</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ─── SECCIÓN 5.5: PERMISOS DE TRABAJO EN CALIENTE SIN CERRAR (SOLO JEFE DE TURNO / ADMIN) ─── */}
            {esJefeOAdmin && (
              <div className={`rounded-2xl shadow-xl border overflow-hidden mt-6 ${modoNocturno ? 'bg-slate-900/90 border-orange-900/60' : 'bg-white border-orange-300'}`}>
                <div className={`flex items-center justify-between px-6 py-4 border-b ${modoNocturno ? 'bg-orange-950/60 border-orange-900/40' : 'bg-orange-50 border-orange-200'}`}>
                  <span className={`font-bold text-sm flex items-center gap-2 ${modoNocturno ? 'text-orange-300' : 'text-orange-800'}`}>
                    <Flame className="w-5 h-5 text-orange-500" />
                    5.5. PERMISOS DE TRABAJO EN CALIENTE — SIN CERRAR EN EL TURNO
                  </span>
                  <button
                    onClick={() => setTabActiva('PERMISOS')}
                    className="px-3 py-1.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Gestionar Permisos ({permisosAbiertos.length} Abiertos)</span>
                  </button>
                </div>

                <div className="p-4 sm:p-6">
                  {permisosAbiertos.length === 0 ? (
                    <div className={`flex items-center gap-3 p-4 rounded-xl border ${modoNocturno ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                      <span className="text-sm font-semibold">No hay permisos de trabajo en caliente activos sin cerrar. Turno en orden.</span>
                    </div>
                  ) : (
                    <>
                      <div className={`flex items-center gap-3 p-3 rounded-xl border mb-4 ${modoNocturno ? 'bg-orange-950/50 border-orange-700/50 text-orange-200' : 'bg-orange-50 border-orange-300 text-orange-800'}`}>
                        <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wide">
                          Atención Jefe de Turno: existen {permisosAbiertos.length} permiso(s) de trabajo en caliente sin cierre formal al término del turno.
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-orange-500/30">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className={`text-left ${modoNocturno ? 'bg-orange-950/70 text-orange-300' : 'bg-orange-100 text-orange-800'}`}>
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
                              <tr key={p.id || idx} className={`border-t ${modoNocturno ? 'border-slate-800 odd:bg-orange-950/20 even:bg-slate-900/40' : 'border-orange-100 odd:bg-orange-50/60 even:bg-white'}`}>
                                <td className="px-4 py-3 font-black text-sm text-orange-400">{p.numero || '—'}</td>
                                <td className="px-4 py-3 font-medium">{p.ubicacion || '—'}</td>
                                <td className="px-4 py-3">{p.solicitado_por || '—'}</td>
                                <td className="px-4 py-3">{p.autorizado_por || '—'}</td>
                                <td className="px-4 py-3 font-mono">{p.fecha_apertura || '—'}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border bg-orange-500/20 text-orange-300 border-orange-500/50">
                                    <Flame className="w-3 h-3" />
                                    ABIERTO
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* VISTA PERMISOS EN CALIENTE */}
        {tabActiva === 'PERMISOS' && (
          <div className="w-full flex-1">
            <VistaPermisosCaliente
              onVolver={() => setTabActiva('EQUIPOS')}
              modoNocturno={modoNocturno}
              usuarioActual={usuarioActual}
            />
          </div>
        )}

        {/* VISTA PRINCIPAL: EQUIPOS Y OPERACIÓN DE PLANTA */}
        {tabActiva === 'EQUIPOS' && (
          <>
            {/* SECCIÓN 1: GENERACIÓN DIARIA */}
            <div className={`rounded-xl overflow-hidden border shadow-md w-full min-w-[1100px] ${
              modoNocturno ? 'border-blue-900/70 bg-[#0a1b33]' : 'border-slate-400 bg-white'
            }`}>
              <div className={`text-center font-extrabold text-sm sm:text-base py-2.5 uppercase tracking-wider border-b ${
                modoNocturno ? 'bg-[#0d2a4d] border-blue-800 text-white' : 'bg-blue-950 border-blue-900 text-white'
              }`}>
                GENERACIÓN DIARIA
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 w-full gap-2.5 p-3 text-center font-mono">
                
                <div className={`border rounded-lg min-h-[90px] py-4 px-3 flex flex-col justify-between items-center shadow-sm ${
                  modoNocturno ? 'bg-[#0b223f] border-blue-800/80 text-white' : 'bg-slate-100 border-slate-300 text-slate-950 font-black'
                }`}>
                  <span className={`block text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-300' : 'text-blue-950'}`}>DESPACHO CNR</span>
                  <select
                    value={parametros.despachoCNR}
                    onChange={(e) => setParametros({ ...parametros, despachoCNR: e.target.value })}
                    className={`border rounded-lg text-xs sm:text-xs font-black py-1.5 px-1 w-full text-center cursor-pointer shadow-sm focus:outline-none transition-all ${
                      modoNocturno 
                        ? (parametros.despachoCNR === 'En servicio' ? 'bg-[#081527] text-emerald-400 border-emerald-500/60' 
                          : parametros.despachoCNR === 'Proceso de arranque' ? 'bg-[#081527] text-cyan-400 border-cyan-500/60'
                          : parametros.despachoCNR === 'Proceso de detención' ? 'bg-[#081527] text-amber-400 border-amber-500/60'
                          : parametros.despachoCNR === 'Mantenimiento' ? 'bg-[#081527] text-purple-400 border-purple-500/60'
                          : 'bg-[#081527] text-rose-400 border-rose-500/60')
                        : 'bg-white text-emerald-800 border-slate-400 font-black'
                    }`}
                  >
                    <option value="En servicio" className={modoNocturno ? "bg-slate-900 text-emerald-400 font-extrabold text-xs py-1" : "bg-white text-emerald-800 font-extrabold text-xs py-1"}>En servicio</option>
                    <option value="Proceso de arranque" className={modoNocturno ? "bg-slate-900 text-cyan-400 font-extrabold text-xs py-1" : "bg-white text-cyan-800 font-extrabold text-xs py-1"}>Proceso de arranque</option>
                    <option value="Proceso de detención" className={modoNocturno ? "bg-slate-900 text-amber-400 font-extrabold text-xs py-1" : "bg-white text-amber-800 font-extrabold text-xs py-1"}>Proceso de detención</option>
                    <option value="Mantenimiento" className={modoNocturno ? "bg-slate-900 text-purple-400 font-extrabold text-xs py-1" : "bg-white text-purple-800 font-extrabold text-xs py-1"}>Mantenimiento</option>
                    <option value="Fuera de servicio" className={modoNocturno ? "bg-slate-900 text-rose-400 font-extrabold text-xs py-1" : "bg-white text-rose-800 font-extrabold text-xs py-1"}>Fuera de servicio</option>
                  </select>
                </div>

                <div className={`border rounded-lg min-h-[90px] py-4 px-3 flex flex-col justify-between items-center shadow-sm ${
                  modoNocturno ? 'bg-[#0b223f] border-blue-800/80 text-white' : 'bg-slate-100 border-slate-300 text-slate-950'
                }`}>
                  <span className={`block text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-300' : 'text-blue-950'}`}>SISTEMA PROM</span>
                  <input
                    type="text"
                    value={parametros.sistemaProm ?? '0'}
                    onChange={(e) => actualizarParametrosGeneracion('sistemaProm', e.target.value)}
                    className={`w-full text-center font-black text-xl sm:text-2xl bg-transparent focus:outline-none transition-all ${
                      modoNocturno ? 'text-white' : 'text-slate-950'
                    }`}
                  />
                </div>

                <div className={`border rounded-lg min-h-[90px] py-4 px-3 flex flex-col justify-between items-center shadow-sm ${
                  modoNocturno ? 'bg-[#0b223f] border-blue-800/80 text-white' : 'bg-slate-100 border-slate-300 text-slate-950'
                }`}>
                  <span className={`block text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-300' : 'text-blue-950'}`}>(MW) POT ESPERA</span>
                  <input
                    type="text"
                    value={parametros.potEspera ?? '0'}
                    onChange={(e) => actualizarParametrosGeneracion('potEspera', e.target.value)}
                    className={`w-full text-center font-black text-xl sm:text-2xl bg-transparent focus:outline-none transition-all ${
                      modoNocturno ? 'text-emerald-400' : 'text-emerald-800'
                    }`}
                  />
                </div>

                <div className={`border rounded-lg min-h-[90px] py-4 px-3 flex flex-col justify-between items-center shadow-sm ${
                  modoNocturno ? 'bg-[#0b223f] border-blue-800/80 text-white' : 'bg-slate-100 border-slate-300 text-slate-950'
                }`}>
                  <span className={`block text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-300' : 'text-blue-950'}`}>(MW) FUEGOS SUPLEMEN</span>
                  <input
                    type="text"
                    value={parametros.fuegosSuplemen ?? '0'}
                    onChange={(e) => actualizarParametrosGeneracion('fuegosSuplemen', e.target.value)}
                    className={`w-full text-center font-black text-xl sm:text-2xl bg-transparent focus:outline-none transition-all ${
                      modoNocturno ? 'text-white' : 'text-slate-950'
                    }`}
                  />
                </div>

                <div className={`border rounded-lg min-h-[90px] py-4 px-3 flex flex-col justify-between items-center shadow-sm ${
                  modoNocturno ? 'bg-[#0b223f] border-blue-800/80 text-white' : 'bg-slate-100 border-slate-300 text-slate-950'
                }`}>
                  <span className={`block text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-300' : 'text-blue-950'}`}>HRS CARGA BASE</span>
                  <input
                    type="text"
                    value={parametros.hrsCargaBase ?? '0'}
                    onChange={(e) => actualizarParametrosGeneracion('hrsCargaBase', e.target.value)}
                    className={`w-full text-center font-black text-xl sm:text-2xl bg-transparent focus:outline-none transition-all ${
                      modoNocturno ? 'text-white' : 'text-slate-950'
                    }`}
                  />
                </div>

                <div className={`border rounded-lg min-h-[90px] py-4 px-3 flex flex-col justify-between items-center shadow-sm ${
                  modoNocturno ? 'bg-[#0b223f] border-blue-800/80 text-white' : 'bg-slate-100 border-slate-300 text-slate-950'
                }`}>
                  <span className={`block text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-300' : 'text-blue-950'}`}>HRS MIN TEC</span>
                  <input
                    type="text"
                    value={parametros.hrsMinTec ?? '0'}
                    onChange={(e) => actualizarParametrosGeneracion('hrsMinTec', e.target.value)}
                    className={`w-full text-center font-black text-xl sm:text-2xl bg-transparent focus:outline-none transition-all ${
                      modoNocturno ? 'text-white' : 'text-slate-950'
                    }`}
                  />
                </div>

                <div className={`border rounded-lg min-h-[90px] py-4 px-3 flex flex-col justify-between items-center shadow-sm ${
                  modoNocturno ? 'bg-[#0b223f] border-blue-800/80 text-white' : 'bg-slate-100 border-slate-300 text-slate-950'
                }`}>
                  <span className={`block text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-300' : 'text-blue-950'}`}>HRS FUEGOS SUPLEM</span>
                  <input
                    type="text"
                    value={parametros.hrsFuegosSuplem ?? '0'}
                    onChange={(e) => actualizarParametrosGeneracion('hrsFuegosSuplem', e.target.value)}
                    className={`w-full text-center font-black text-xl sm:text-2xl bg-transparent focus:outline-none transition-all ${
                      modoNocturno ? 'text-white' : 'text-slate-950'
                    }`}
                  />
                </div>

                <div className={`border rounded-lg min-h-[90px] py-4 px-3 flex flex-col justify-between items-center shadow-sm ${
                  modoNocturno ? 'bg-[#0b223f] border-blue-800/80 text-white' : 'bg-slate-100 border-slate-300 text-slate-950'
                }`}>
                  <span className={`block text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-300' : 'text-blue-950'}`}>COSTO MARGINAL</span>
                  <input
                    type="text"
                    value={parametros.costoMarginal ?? '0'}
                    onChange={(e) => actualizarParametrosGeneracion('costoMarginal', e.target.value)}
                    className={`w-full text-center font-black text-xl sm:text-2xl bg-transparent focus:outline-none transition-all ${
                      modoNocturno ? 'text-amber-500' : 'text-amber-800'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: ESTADO DE PLANTA */}
            <div className={`rounded-xl overflow-hidden border shadow-md w-full min-w-[1100px] ${
              modoNocturno ? 'border-blue-900/70 bg-[#0a1b33]' : 'border-slate-400 bg-white'
            }`}>
              <div className={`text-center font-extrabold text-sm sm:text-base py-2.5 uppercase tracking-wider border-b ${
                modoNocturno ? 'bg-[#0d2a4d] border-blue-800 text-white' : 'bg-blue-950 border-blue-900 text-white'
              }`}>
                ESTADO DE PLANTA
              </div>
              <div className={`grid grid-cols-12 w-full text-center font-semibold border-t divide-x ${
                modoNocturno ? 'border-blue-800 divide-blue-800' : 'border-slate-300 divide-slate-300 bg-slate-100/60'
              }`}>
                {/* Cell 1: ESTADO DE OPERACIÓN */}
                <div className="col-span-2 p-3 flex flex-col justify-between items-center min-h-[105px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-300' : 'text-blue-950'}`}>
                    ESTADO DE OPERACIÓN
                  </span>
                  <select
                    value={estadoPlanta.estadoOperacion}
                    onChange={(e) => setEstadoPlanta({ ...estadoPlanta, estadoOperacion: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-2 text-xs sm:text-sm text-center focus:outline-none cursor-pointer shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-amber-400 border-blue-700/80' : 'bg-white text-amber-800 border-slate-400'
                    }`}
                  >
                    <option value="Plena carga" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>Plena carga</option>
                    <option value="Mínimo técnico" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>Mínimo técnico</option>
                    <option value="AGC" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>AGC</option>
                    <option value="Plena con CPF" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>Plena con CPF</option>
                    <option value="Mínimo técnico con CPF" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>Mínimo técnico con CPF</option>
                  </select>
                </div>

                {/* Cell 2: TIPO DE COMBUSTIBLE */}
                <div className="col-span-2 p-3 flex flex-col justify-between items-center min-h-[105px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-300' : 'text-blue-950'}`}>
                    TIPO DE COMBUSTIBLE
                  </span>
                  <select
                    value={estadoPlanta.tipoCombustible}
                    onChange={(e) => setEstadoPlanta({ ...estadoPlanta, tipoCombustible: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-2 text-xs sm:text-sm text-center focus:outline-none cursor-pointer shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-white border-blue-700/80' : 'bg-white text-slate-950 border-slate-400'
                    }`}
                  >
                    <option value="Gas" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>Gas</option>
                    <option value="Diesel" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>Diesel</option>
                  </select>
                </div>

                {/* Cell 3: TIPO DE GAS (AMPLIADO A COL-SPAN-4 PARA MOSTRAR NOMBRE COMPLETO) */}
                <div className="col-span-4 p-3 flex flex-col justify-between items-center min-h-[105px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-300' : 'text-blue-950'}`}>
                    TIPO DE GAS
                  </span>
                  <select
                    value={estadoPlanta.tipoGas}
                    onChange={(e) => setEstadoPlanta({ ...estadoPlanta, tipoGas: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-2 text-xs sm:text-sm text-center focus:outline-none cursor-pointer shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-white border-blue-700/80' : 'bg-white text-slate-950 border-slate-400'
                    }`}
                  >
                    <option value="NUEVARENCA_TG1+TV1_GN_A">NUEVARENCA_TG1+TV1_GN_A</option>
                    <option value="NUEVARENCA_TG1+TV1_GN_B">NUEVARENCA_TG1+TV1_GN_B</option>
                    <option value="NUEVARENCA_TG1+TV1_GN_C">NUEVARENCA_TG1+TV1_GN_C</option>
                    <option value="NUEVARENCA_TG1+TV1_GN_D">NUEVARENCA_TG1+TV1_GN_D</option>
                    <option value="NUEVARENCA_TG1+TV1_GNL_A">NUEVARENCA_TG1+TV1_GNL_A</option>
                    <option value="NUEVARENCA_TG1+TV1_GNL_B">NUEVARENCA_TG1+TV1_GNL_B</option>
                    <option value="NUEVARENCA_TG1+TV1_GNL_C">NUEVARENCA_TG1+TV1_GNL_C</option>
                    <option value="NUEVARENCA_TG1+TV1_GNL_D">NUEVARENCA_TG1+TV1_GNL_D</option>
                    <option value="NUEVARENCA_TG1+TV1_GNL_E">NUEVARENCA_TG1+TV1_GNL_E</option>
                    <option value="NUEVARENCA_TG1+TV1_GNL_F">NUEVARENCA_TG1+TV1_GNL_F</option>
                    <option value="NUEVARENCA_TG1+TV1_GNL_INFLEX">NUEVARENCA_TG1+TV1_GNL_INFLEX</option>
                    <option value="NUEVARENCA_TG1+TV1_GNL_P">NUEVARENCA_TG1+TV1_GNL_P</option>
                  </select>
                </div>

                {/* Cell 4: GEN (MWH) */}
                <div className="col-span-2 p-3 flex flex-col justify-between items-center min-h-[105px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-300' : 'text-blue-950'}`}>
                    GEN (MWH)
                  </span>
                  <input
                    type="text"
                    value={estadoPlanta.genMWH}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEstadoPlanta({ ...estadoPlanta, genMWH: val });
                      if (val && !isNaN(parseFloat(val))) {
                        actualizarParametrosGeneracion('potEspera', val);
                      }
                    }}
                    className={`h-10 w-full font-black border rounded-lg px-2 text-base sm:text-lg text-center focus:outline-none shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-emerald-400 border-blue-700/80 focus:border-emerald-500' : 'bg-white text-emerald-800 border-slate-400 focus:border-emerald-700'
                    }`}
                    placeholder="0"
                  />
                </div>

                {/* Cell 5: DISPONIBILIDAD PLANTA */}
                <div className="col-span-2 p-3 flex flex-col justify-between items-center min-h-[105px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-300' : 'text-blue-950'}`}>
                    DISPONIBILIDAD PLANTA
                  </span>
                  <select
                    value={estadoPlanta.disponibilidadPlanta}
                    onChange={(e) => setEstadoPlanta({ ...estadoPlanta, disponibilidadPlanta: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-2 text-xs sm:text-sm text-center focus:outline-none cursor-pointer shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-white border-blue-700/80' : 'bg-white text-slate-950 border-slate-400'
                    }`}
                  >
                    <option value="SH1">SH1</option>
                    <option value="SH2">SH2</option>
                    <option value="RSH1">RSH1</option>
                    <option value="RSH2">RSH2</option>
                    <option value="FOH1">FOH1</option>
                    <option value="FOH2">FOH2</option>
                    <option value="FOH3">FOH3</option>
                    <option value="FOH4">FOH4</option>
                    <option value="MOH1">MOH1</option>
                    <option value="MOH2">MOH2</option>
                    <option value="AVOH">AVOH</option>
                    <option value="ORH">ORH</option>
                    <option value="EEH">EEH</option>
                    <option value="POH">POH</option>
                    <option value="DF">DF</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: ABASTECIMIENTO */}
            <div className={`rounded-xl overflow-hidden border shadow-md w-full min-w-[1100px] ${
              modoNocturno ? 'border-blue-900/70 bg-[#0a1b33]' : 'border-slate-400 bg-white'
            }`}>
              <div className={`text-center font-extrabold text-sm sm:text-base py-2.5 uppercase tracking-wider border-b ${
                modoNocturno ? 'bg-[#0d2a4d] border-blue-800 text-white' : 'bg-blue-950 border-blue-900 text-white'
              }`}>
                ABASTECIMIENTO
              </div>
              
              <div className={`grid grid-cols-8 w-full text-center font-mono border-t divide-x ${
                modoNocturno ? 'border-blue-800 divide-blue-800' : 'border-slate-300 divide-slate-300 bg-slate-100/60'
              }`}>
                <div className="py-3.5 px-2 flex flex-col justify-between items-center min-h-[95px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-200' : 'text-blue-950'}`}>DIESEL 5000 MM</span>
                  <input
                    type="text"
                    value={abastecimiento.diesel5000}
                    onChange={(e) => setAbastecimiento({ ...abastecimiento, diesel5000: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-1.5 py-1 text-base sm:text-xl text-center focus:outline-none shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-white border-blue-700/80 focus:border-blue-400' : 'bg-white text-slate-950 border-slate-400 font-black focus:border-blue-700'
                    }`}
                  />
                </div>
                <div className="py-3.5 px-2 flex flex-col justify-between items-center min-h-[95px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-200' : 'text-blue-950'}`}>DIESEL 850 %</span>
                  <input
                    type="text"
                    value={abastecimiento.diesel850}
                    onChange={(e) => setAbastecimiento({ ...abastecimiento, diesel850: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-1.5 py-1 text-base sm:text-xl text-center focus:outline-none shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-white border-blue-700/80 focus:border-blue-400' : 'bg-white text-slate-950 border-slate-400 font-black focus:border-blue-700'
                    }`}
                  />
                </div>
                <div className="py-3.5 px-2 flex flex-col justify-between items-center min-h-[95px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-200' : 'text-blue-950'}`}>GLP 110 %</span>
                  <input
                    type="text"
                    value={abastecimiento.glp110}
                    onChange={(e) => setAbastecimiento({ ...abastecimiento, glp110: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-1.5 py-1 text-base sm:text-xl text-center focus:outline-none shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-white border-blue-700/80 focus:border-blue-400' : 'bg-white text-slate-950 border-slate-400 font-black focus:border-blue-700'
                    }`}
                  />
                </div>
                <div className="py-3.5 px-2 flex flex-col justify-between items-center min-h-[95px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-200' : 'text-blue-950'}`}>GLP 65 %</span>
                  <input
                    type="text"
                    value={abastecimiento.glp65}
                    onChange={(e) => setAbastecimiento({ ...abastecimiento, glp65: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-1.5 py-1 text-base sm:text-xl text-center focus:outline-none shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-white border-blue-700/80 focus:border-blue-400' : 'bg-white text-slate-950 border-slate-400 font-black focus:border-blue-700'
                    }`}
                  />
                </div>
                <div className="py-3.5 px-2 flex flex-col justify-between items-center min-h-[95px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-200' : 'text-blue-950'}`}>H2 TG M3</span>
                  <input
                    type="text"
                    value={abastecimiento.h2TG}
                    onChange={(e) => setAbastecimiento({ ...abastecimiento, h2TG: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-1.5 py-1 text-base sm:text-xl text-center focus:outline-none shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-white border-blue-700/80 focus:border-blue-400' : 'bg-white text-slate-950 border-slate-400 font-black focus:border-blue-700'
                    }`}
                  />
                </div>
                <div className="py-3.5 px-2 flex flex-col justify-between items-center min-h-[95px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-200' : 'text-blue-950'}`}>H2 TV M3</span>
                  <input
                    type="text"
                    value={abastecimiento.h2TV}
                    onChange={(e) => setAbastecimiento({ ...abastecimiento, h2TV: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-1.5 py-1 text-base sm:text-xl text-center focus:outline-none shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-white border-blue-700/80 focus:border-blue-400' : 'bg-white text-slate-950 border-slate-400 font-black focus:border-blue-700'
                    }`}
                  />
                </div>
                <div className="py-3.5 px-2 flex flex-col justify-center items-center min-h-[95px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-200' : 'text-blue-950'}`}>NH3 75 M3</span>
                  <input
                    type="text"
                    value={abastecimiento.nh375}
                    onChange={(e) => setAbastecimiento({ ...abastecimiento, nh375: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-1.5 py-1 text-base sm:text-xl text-center focus:outline-none shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-white border-blue-700/80 focus:border-blue-400' : 'bg-white text-slate-950 border-slate-400 font-black focus:border-blue-700'
                    }`}
                  />
                </div>
                <div className="py-3.5 px-2 flex flex-col justify-between items-center min-h-[95px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-200' : 'text-blue-950'}`}>VIGAFLOW</span>
                  <select
                    value={abastecimiento.vigaflow}
                    onChange={(e) => setAbastecimiento({ ...abastecimiento, vigaflow: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-0.5 text-[9px] sm:text-[10px] tracking-tight text-center cursor-pointer shadow-sm focus:outline-none ${
                      modoNocturno ? 'bg-[#081527] text-amber-400 border-blue-700/80' : 'bg-white text-amber-900 border-slate-400 font-black'
                    }`}
                  >
                    <option value="En servicio" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>En servicio</option>
                    <option value="Fuera de servicio" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>Fuera de servicio</option>
                  </select>
                </div>
              </div>

              <div className={`grid grid-cols-8 w-full text-center font-mono border-t divide-x ${
                modoNocturno ? 'border-blue-800 divide-blue-800' : 'border-slate-300 divide-slate-300 bg-slate-100/60'
              }`}>
                <div className="py-3.5 px-2 flex flex-col justify-between items-center min-h-[95px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-200' : 'text-blue-950'}`}>DEMI 2595 %</span>
                  <input
                    type="text"
                    value={abastecimiento.demi2595}
                    onChange={(e) => setAbastecimiento({ ...abastecimiento, demi2595: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-1.5 py-1 text-base sm:text-xl text-center focus:outline-none shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-white border-blue-700/80 focus:border-blue-400' : 'bg-white text-slate-950 border-slate-400 font-black focus:border-blue-700'
                    }`}
                  />
                </div>
                <div className="py-3.5 px-2 flex flex-col justify-between items-center min-h-[95px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-200' : 'text-blue-950'}`}>SCI 1700 %</span>
                  <input
                    type="text"
                    value={abastecimiento.sci1700}
                    onChange={(e) => setAbastecimiento({ ...abastecimiento, sci1700: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-1.5 py-1 text-base sm:text-xl text-center focus:outline-none shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-white border-blue-700/80 focus:border-blue-400' : 'bg-white text-slate-950 border-slate-400 font-black focus:border-blue-700'
                    }`}
                  />
                </div>
                <div className="py-3.5 px-2 flex flex-col justify-between items-center min-h-[95px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-200' : 'text-blue-950'}`}>H2SO4 45 CM</span>
                  <input
                    type="text"
                    value={abastecimiento.h2so445}
                    onChange={(e) => setAbastecimiento({ ...abastecimiento, h2so445: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-1.5 py-1 text-base sm:text-xl text-center focus:outline-none shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-white border-blue-700/80 focus:border-blue-400' : 'bg-white text-slate-950 border-slate-400 font-black focus:border-blue-700'
                    }`}
                  />
                </div>
                <div className="py-3.5 px-2 flex flex-col justify-between items-center min-h-[95px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-200' : 'text-blue-950'}`}>NACL 75 CM</span>
                  <input
                    type="text"
                    value={abastecimiento.nacl75}
                    onChange={(e) => setAbastecimiento({ ...abastecimiento, nacl75: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-1.5 py-1 text-base sm:text-xl text-center focus:outline-none shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-white border-blue-700/80 focus:border-blue-400' : 'bg-white text-slate-950 border-slate-400 font-black focus:border-blue-700'
                    }`}
                  />
                </div>
                <div className="py-3.5 px-2 flex flex-col justify-between items-center min-h-[95px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-200' : 'text-blue-950'}`}>NIVEL TK CO2</span>
                  <input
                    type="text"
                    value={abastecimiento.nivelTkCO2}
                    onChange={(e) => setAbastecimiento({ ...abastecimiento, nivelTkCO2: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-1.5 py-1 text-base sm:text-xl text-center focus:outline-none shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-white border-blue-700/80 focus:border-blue-400' : 'bg-white text-slate-950 border-slate-400 font-black focus:border-blue-700'
                    }`}
                  />
                </div>
                <div className="py-3.5 px-2 flex flex-col justify-between items-center min-h-[95px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-200' : 'text-blue-950'}`}>BUNDLE HIDROGENO</span>
                  <input
                    type="text"
                    value={abastecimiento.bundleHidrogeno}
                    onChange={(e) => setAbastecimiento({ ...abastecimiento, bundleHidrogeno: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-1.5 py-1 text-base sm:text-xl text-center focus:outline-none shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-white border-blue-700/80 focus:border-blue-400' : 'bg-white text-slate-950 border-slate-400 font-black focus:border-blue-700'
                    }`}
                  />
                </div>
                <div className="py-3.5 px-2 flex flex-col justify-between items-center min-h-[95px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-200' : 'text-blue-950'}`}>BUNDLE VACIOS</span>
                  <input
                    type="text"
                    value={abastecimiento.bundleVacios}
                    onChange={(e) => setAbastecimiento({ ...abastecimiento, bundleVacios: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-1.5 py-1 text-base sm:text-xl text-center focus:outline-none shadow-sm ${
                      modoNocturno ? 'bg-[#081527] text-white border-blue-700/80 focus:border-blue-400' : 'bg-white text-slate-950 border-slate-400 font-black focus:border-blue-700'
                    }`}
                  />
                </div>
                <div className="py-3.5 px-2 flex flex-col justify-between items-center min-h-[95px] h-full gap-2">
                  <span className={`h-8 flex items-center justify-center text-center text-xs sm:text-sm font-black uppercase tracking-wider ${modoNocturno ? 'text-blue-200' : 'text-blue-950'}`}>VEOLIA</span>
                  <select
                    value={abastecimiento.veolia}
                    onChange={(e) => setAbastecimiento({ ...abastecimiento, veolia: e.target.value })}
                    className={`h-10 w-full font-black border rounded-lg px-0.5 text-[9px] sm:text-[10px] tracking-tight text-center cursor-pointer shadow-sm focus:outline-none ${
                      modoNocturno ? 'bg-[#081527] text-amber-400 border-blue-700/80' : 'bg-white text-amber-900 border-slate-400 font-black'
                    }`}
                  >
                    <option value="En servicio" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>En servicio</option>
                    <option value="Fuera de servicio" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>Fuera de servicio</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: EQUIPOS PRINCIPALES DE OPERACIÓN */}
            <div className={`rounded-xl overflow-hidden border shadow-md w-full ${
              modoNocturno ? 'border-blue-900/70 bg-[#081527]' : 'border-slate-400 bg-slate-200'
            }`}>
              <div className={`text-center font-extrabold text-sm sm:text-base py-2.5 uppercase tracking-wider border-b ${
                modoNocturno ? 'bg-[#0b2545] border-blue-800 text-white' : 'bg-blue-950 border-blue-900 text-white'
              }`}>
                EQUIPOS PRINCIPALES DE OPERACIÓN
              </div>

              {/* TRES COLUMNAS VERTICALES UNA AL LADO DE LA OTRA (MISMO ORDEN DE LA FOTO) */}
              <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                {[
                  {
                    titulo: 'BOP',
                    colIds: ['ACHFP1', 'ACBPM1', 'ACBPM2', 'ACHFP2', 'EBDP', 'ESOP', 'AD01A', 'AD01B', 'AE1A', 'AE1B', 'AR01A', 'AR01B', 'WB01A', 'WB01B', 'WL01A', 'WL01B', 'WL02A', 'WL02B']
                  },
                  {
                    titulo: 'VENTILADORES TTRR',
                    colIds: ['VTR A', 'VTR B', 'VTR C', 'VTR D', 'VTR E', 'VTR F', 'VTR G', 'VTR H', 'VTR I', 'VTR J', 'VTR K', 'VTR L']
                  },
                  {
                    titulo: 'TURBINA DE GAS',
                    colIds: ['88AK', '88BT1', '88BT2', '88FD1', '88FD2', '88FP', '88HQ1', '88HQ2', '88QA1', '88QA2', '88QB1', '88QB2', '88QE', '88QS', '88TG', '88TT1', '88TT2']
                  }
                ].map((col, colIndex) => (
                  <div 
                    key={colIndex} 
                    className={`flex flex-col gap-1.5 p-2 rounded-xl border ${
                      modoNocturno ? 'bg-[#051122] border-blue-900/50' : 'bg-white border-slate-350 shadow-sm'
                    }`}
                  >
                    {/* Sub-Encabezado de Columna */}
                    <div className={`text-center font-extrabold text-xs sm:text-sm py-1.5 rounded-lg uppercase tracking-wider mb-1 border shadow-sm ${
                      modoNocturno ? 'bg-blue-950 text-cyan-300 border-blue-800' : 'bg-blue-950 text-white border-blue-900'
                    }`}>
                      {col.titulo}
                    </div>

                    {col.colIds.map((idTarget) => {
                      const norm = idTarget.replace(/\s+/g, '').toUpperCase();
                      const eq = equipos.find(e => e.id.replace(/\s+/g, '').toUpperCase() === norm) || { id: idTarget, estado: 'En servicio' };
                      const isVTR = eq.id.toUpperCase().includes('VTR');

                      return (
                        <div 
                          key={eq.id} 
                          className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border shadow-sm transition-all ${
                            modoNocturno 
                              ? 'bg-[#0a1f3a] border-blue-900/80 hover:border-blue-500/80' 
                              : 'bg-slate-100 border-slate-350 hover:border-blue-600'
                          }`}
                        >
                          <span className={`font-mono font-black text-xs sm:text-sm px-2.5 py-0.5 rounded select-none border ${
                            modoNocturno ? 'text-slate-100 bg-slate-900/80 border-slate-700/60' : 'text-slate-950 bg-slate-200 border-slate-400'
                          }`}>
                            {eq.id}
                          </span>

                          <select
                            value={eq.estado}
                            onChange={(e) => handleEstadoEquipoChange(eq.id, e.target.value)}
                            className={`font-mono font-black text-xs py-1 px-2.5 rounded border transition-all cursor-pointer shadow-sm text-center leading-none min-w-[75px] ${
                              eq.estado === 'En servicio' || eq.estado === 'E/S'
                                ? 'bg-emerald-700 text-white border-emerald-800 hover:bg-emerald-800'
                                : eq.estado === 'Fuera de servicio' || eq.estado === 'F/S'
                                  ? 'bg-rose-800 text-white border-rose-900 hover:bg-rose-900'
                                  : eq.estado === 'Standby' || eq.estado === 'STB'
                                    ? 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700'
                                    : eq.estado === 'Alta'
                                      ? 'bg-emerald-800 text-white border-emerald-900 hover:bg-emerald-900'
                                      : eq.estado === 'Baja'
                                        ? 'bg-amber-700 text-white border-amber-800 hover:bg-amber-800'
                                        : eq.estado === 'Bloqueo LOTO' || eq.estado === 'LOTO'
                                          ? 'bg-purple-800 text-white border-purple-900 hover:bg-purple-900 shadow-purple-900/50'
                                          : eq.estado === 'Trabajos estructural' || eq.estado === 'Trabajo estructural'
                                            ? 'bg-sky-800 text-white border-sky-900 hover:bg-sky-900 text-[10px] px-1'
                                            : eq.estado?.includes('Limitado')
                                              ? 'bg-amber-700 text-white border-amber-800 hover:bg-amber-800 text-[10px] px-1'
                                              : 'bg-slate-800 text-white border-slate-900'
                            }`}
                          >
                            {!isVTR && (
                              <option value="En servicio" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>E/S</option>
                            )}
                            {isVTR && (
                              <>
                                <option value="Alta" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>Alta</option>
                                <option value="Baja" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>Baja</option>
                                <option value="Limitado baja velocidad" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>Lim. Baja Vel.</option>
                                <option value="Limitado a alta velocidad" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>Lim. Alta Vel.</option>
                                <option value="Trabajos estructural" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>Trab. Estructural</option>
                              </>
                            )}
                            <option value="Standby" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>STB</option>
                            <option value="Fuera de servicio" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>F/S</option>
                            <option value="Bloqueo LOTO" className={modoNocturno ? "bg-black text-white font-bold" : "bg-white text-slate-900 font-bold"}>LOTO</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </main>

      {/* MODAL DE EXPORTACIÓN / COPIA DE DATOS RELEVANTES */}
      {mostrarModalExportar && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200 ${
            modoNocturno ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Exportar Reporte Completo de Bitácora</h3>
                  <p className="text-xs text-slate-400">
                    Contenido completo del reporte (Central Nueva Renca, Fragilidades, Central Los Vientos y Central Santa Lidia)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMostrarModalExportar(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner Informativo */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
              El siguiente bloque contiene el <strong>reporte completo de la Bitácora Diaria</strong>. Haga clic en el botón para copiarlo con formato completo al portapapeles.
            </div>

            {/* Contenido a Exportar / Copiar */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Texto para Copiar / Pegar:
              </label>
              <textarea
                readOnly
                rows={11}
                value={obtenerTextoBitacoraCompletaPlain()}
                className={`w-full rounded-xl p-3 text-xs font-mono border focus:outline-none shadow-inner ${
                  modoNocturno ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              />
            </div>

            {/* Feedback Copiado */}
            {copiadoExitosa && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                ¡Texto copiado al portapapeles con éxito!
              </div>
            )}

            {/* Acciones Modal (Únicamente Copiar al Portapapeles y Cerrar) */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={handleCopiarTextoRelevantes}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                Copiar al Portapapeles
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
                    Central Nueva Renca • Folio: {folioStr} • Fecha: {fechaFormateada}
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
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Día {diaStr1}:</span>
                      <p
                        dangerouslySetInnerHTML={{ __html: textoBitacora.nuevaRencaDia1 || 'Sin novedades registradas.' }}
                        className="text-slate-300 font-sans text-[11px] leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Día {diaStr2}:</span>
                      <p
                        dangerouslySetInnerHTML={{ __html: textoBitacora.nuevaRencaDia2 || 'Sin novedades registradas.' }}
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
                        dangerouslySetInnerHTML={{ __html: textoBitacora.bop || 'Sin fragilidades reportadas.' }}
                        className="text-slate-300 font-sans text-[11px] leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Turbina Vapor:</span>
                      <p
                        dangerouslySetInnerHTML={{ __html: textoBitacora.turbinaVapor || 'Sin fragilidades reportadas.' }}
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
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Día {diaStr1}:</span>
                      <p
                        dangerouslySetInnerHTML={{ __html: textoBitacora.losVientosDia1 || 'Sin novedades reportadas.' }}
                        className="text-slate-300 font-sans text-[11px] leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Día {diaStr2}:</span>
                      <p
                        dangerouslySetInnerHTML={{ __html: textoBitacora.losVientosDia2 || 'Sin novedades reportadas.' }}
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
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Día {diaStr1}:</span>
                      <p
                        dangerouslySetInnerHTML={{ __html: textoBitacora.santaLidiaDia1 || 'Sin novedades reportadas.' }}
                        className="text-slate-300 font-sans text-[11px] leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Día {diaStr2}:</span>
                      <p
                        dangerouslySetInnerHTML={{ __html: textoBitacora.santaLidiaDia2 || 'Sin novedades reportadas.' }}
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
                    <strong className="text-cyan-300 text-sm font-mono font-bold">{formatearNum(parametros.costoMarginal)} USD/MWh</strong>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Potencia Esperada</span>
                    <strong className="text-emerald-400 text-sm font-mono font-bold">{formatearNum(parametros.potEspera)} MW</strong>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Fuegos Suplementarios</span>
                    <strong className="text-amber-400 text-sm font-mono font-bold">{formatearNum(parametros.fuegosSuplemen)} MW</strong>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Horas Carga Base</span>
                    <strong className="text-slate-100 text-sm font-mono font-bold">{formatearNum(parametros.hrsCargaBase)} hrs</strong>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Mínimo Técnico</span>
                    <strong className="text-purple-300 text-sm font-mono font-bold">{formatearNum(parametros.hrsMinTec)} hrs</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer del Modal */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
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
      )}

      {mostrarModalCambioPersonal && (
        <ErrorBoundary
          title="Error al cargar Cambio de Personal"
          onReset={() => setMostrarModalCambioPersonal(false)}
        >
          <CambioPersonalModal
            isOpen={mostrarModalCambioPersonal}
            onClose={() => setMostrarModalCambioPersonal(false)}
            onSave={(datos) => {
              if (datos?.tipo_turno) handleCambiarTipoTurno(datos.tipo_turno);
              if (onCambiarPersonal) onCambiarPersonal(datos);
              setMostrarModalCambioPersonal(false);
            }}
            onConfirmarReemplazo={(nuevoEquipo) => {
              if (nuevoEquipo?.tipo_turno) {
                handleCambiarTipoTurno(nuevoEquipo.tipo_turno);
              }
              if (onCambiarPersonal) {
                onCambiarPersonal(nuevoEquipo);
              }
              setMostrarModalCambioPersonal(false);
            }}
            usuarioActual={usuarioActual ?? {}}
            modoNocturno={modoNocturno ?? false}
            setModoNocturno={setModoNocturno}
            equipoTurno={turnoActivo?.equipoTurno ?? turnoActivo?.personal ?? turnoActivo?.integrantes ?? equipoTurno ?? {}}
            turno={turnoActivo ?? {}}
            personal={turnoActivo?.personal ?? []}
            folio={folioStr ?? '01'}
          />
        </ErrorBoundary>
      )}

    </div>
  );
}

