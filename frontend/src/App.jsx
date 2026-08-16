import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginPortada from './modulos/Portal/LoginPortada';
import PortalAcceso from './modulos/Portal/PortalAcceso';
import LoginQuimico from './modulos/Portal/LoginQuimico';
import MenuOperador from './modulos/Bitacora/views/MenuOperador';
import MenuJefeTurno from './modulos/Bitacora/views/MenuJefeTurno';
import AbrirTurnoMenu from './modulos/Bitacora/components/AbrirTurnoMenu';
import CambioPersonalModal from './modulos/Bitacora/components/CambioPersonalModal';
import ErrorBoundary from './shared/components/ErrorBoundary';
import DashboardIniciarTurno from './modulos/Bitacora/components/DashboardIniciarTurno';
import VistaConsultaHojaTurno from './modulos/Bitacora/components/VistaConsultaHojaTurno';
import VistaConsultaBitacora from './modulos/Bitacora/components/VistaConsultaBitacora';
import VistaPermisosCaliente from './modulos/Bitacora/components/VistaPermisosCaliente';
import AnalisisQuimicos from './modulos/AnalisisQuimicos/views/AnalisisQuimicos';
import { getApiUrl, safeFetchJson, formatearEventosParaBitacora, obtenerInicioDiaOperativo, filtrarEventosPorDiaOperativo } from './shared/apiConfig';
import { supabase } from './shared/supabaseClient';
import { detectarContingenciasGuardia } from './shared/constants/guardias';

import { 
  ShieldCheck, 
  Key, 
  Radio, 
  Activity, 
  FileText, 
  PlusCircle, 
  Lock, 
  Unlock, 
  UserCheck, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  LogOut,
  Sliders,
  X,
  Sun,
  Moon,
  Menu,
  FileSpreadsheet,
  Download,
  Compass,
  Home,
  Users,
  Flame,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [vistaActual, setVistaActual] = useState('PORTADA'); // 'PORTADA', 'LOGIN_BITACORA', 'LOGIN_QUIMICO', 'DASHBOARD_QUIMICO'
  const [sesionQuimicaActual, setSesionQuimicaActual] = useState(() => {
    try {
      const saved = localStorage.getItem('sesion_modulo_quimico');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [tabInicialDashboard, setTabInicialDashboard] = useState('EQUIPOS');
  const [modoNocturno, setModoNocturno] = useState(true);
  const [vistaAnteriorCambioPersonal, setVistaAnteriorCambioPersonal] = useState('ABRIR_TURNO_MENU');
  const [equipoTurnoSeleccionado, setEquipoTurnoSeleccionado] = useState(() => {
    try {
      const saved = localStorage.getItem('equipo_turno_actual');
      return saved ? JSON.parse(saved) : {
        rotacion: 'TIGRES',
        jdt: 'Ariel Torres',
        osc: 'Jorge Albornoz',
        ot: 'Matías Cisternas'
      };
    } catch {
      return {
        rotacion: 'TIGRES',
        jdt: 'Ariel Torres',
        osc: 'Jorge Albornoz',
        ot: 'Matías Cisternas'
      };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('equipo_turno_actual', JSON.stringify(equipoTurnoSeleccionado));
    } catch (e) {}
  }, [equipoTurnoSeleccionado]);

  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('menu-operador')) {
      setVistaActual('MENU_OPERADOR');
    } else if (path.includes('menu-jefe')) {
      setVistaActual('MENU_JEFE');
    } else if (path.includes('dashboard') || path.includes('bitacora')) {
      setVistaActual('BITACORA_DASHBOARD');
    } else if (path.includes('hoja-turno')) {
      setVistaActual('CONSULTA_HOJA_TURNO');
    } else if (path.includes('consulta')) {
      setVistaActual('CONSULTA_BITACORA');
    }
  }, [location.pathname]);

  const [fechaHoraActual, setFechaHoraActual] = useState(new Date());

  useEffect(() => {
    const intervalo = setInterval(() => {
      setFechaHoraActual(new Date());
    }, 1000); // Se actualiza cada 1 segundo

    return () => clearInterval(intervalo);
  }, []);

  const [usuarios, setUsuarios] = useState([]);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [permisosEfectivos, setPermisosEfectivos] = useState([]);
  const [versionCache, setVersionCache] = useState(1);
  const [catalogoPermisos, setCatalogoPermisos] = useState([]);
  
  const [turnoActivo, setTurnoActivo] = useState(null);
  const [turnoActual, setTurnoActual] = useState({ estado: 'ABIERTO', eventos: [] });
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Helper para obtener la clave del día operativo actual (Corte de Turno a las 08:00 AM)
  const getDiaOperativoKey = (dateObj = new Date()) => {
    const d = new Date(dateObj);
    if (d.getHours() < 8) {
      d.setDate(d.getDate() - 1);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };  const defaultBop = `FCV094 arreglo provisorio.<br>VTR B indisponible por trabajos en estructura.<br>VTR G Limitado a baja velocidad, por baja aislación.`;
  const defaultTurbinaVapor = `Virador Falla en sistema de enganche en desaceleración.<br>Fuga de Vapor zona TAP lado Izquierdo, se encuentra encapsulada.<br>Excitación Falla Puente N°1.`;

  const bitacoraVacia = {
    nuevaRencaDia1: '',
    nuevaRencaDia2: '',
    bop: defaultBop,
    turbinaVapor: defaultTurbinaVapor,
    losVientosDia1: '',
    losVientosDia2: '',
    santaLidiaDia1: '',
    santaLidiaDia2: '',
    fragilidadesAdicionales: []
  };

  const crearResetTurno = (prev) => ({
    nuevaRencaDia1: '',
    nuevaRencaDia2: '',
    bop: (prev && prev.bop) ? prev.bop : defaultBop,
    turbinaVapor: (prev && prev.turbinaVapor) ? prev.turbinaVapor : defaultTurbinaVapor,
    losVientosDia1: '',
    losVientosDia2: '',
    santaLidiaDia1: '',
    santaLidiaDia2: '',
    fragilidadesAdicionales: (prev && prev.fragilidadesAdicionales) ? prev.fragilidadesAdicionales : []
  });

  const [diaOperativoActivo, setDiaOperativoActivo] = useState(getDiaOperativoKey());

  // ── ESTADO COMPARTIDO: Bitácora Diaria y Matriz de Equipos ──────────────
  // Se comparte entre DashboardIniciarTurno (OSC edita) y VistaConsultaHojaTurno (JDT revisa/edita)
  const [textoBitacora, setTextoBitacora] = useState(() => {
    try {
      const keyActual = getDiaOperativoKey();
      const ultimoDia = localStorage.getItem('bitacora_ultimo_dia_operativo');

      // Si es el primer uso o cambió el día operativo, mantener fragilidades y resetear logs de días
      const saved = localStorage.getItem(`bitacora_texto_${keyActual}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.bop) parsed.bop = defaultBop;
        if (!parsed.turbinaVapor) parsed.turbinaVapor = defaultTurbinaVapor;
        if (!parsed.fragilidadesAdicionales) parsed.fragilidadesAdicionales = [];
        return parsed;
      }

      // Si el turno cambió (pasaron las 08:00 AM), resetea los eventos de días pero MANTIENE FRAGILIDADES
      const prevKey = ultimoDia || keyActual;
      const prevSaved = localStorage.getItem(`bitacora_texto_${prevKey}`);
      const prevParsed = prevSaved ? JSON.parse(prevSaved) : null;
      const nuevoObj = crearResetTurno(prevParsed);

      localStorage.setItem('bitacora_ultimo_dia_operativo', keyActual);
      localStorage.setItem(`bitacora_texto_${keyActual}`, JSON.stringify(nuevoObj));
      return nuevoObj;
    } catch {
      return bitacoraVacia;
    }
  });

  // Guardar auto-cambios de textoBitacora en localStorage por día operativo
  useEffect(() => {
    try {
      const keyActual = getDiaOperativoKey();
      localStorage.setItem('bitacora_ultimo_dia_operativo', keyActual);
      localStorage.setItem(`bitacora_texto_${keyActual}`, JSON.stringify(textoBitacora));
    } catch (e) {
      console.error('Error guardando textoBitacora:', e);
    }
  }, [textoBitacora]);

  // Vigilante del reloj de turno: A las 08:00 AM limpia los registros diarios pero CONSERVA LAS FRAGILIDADES OPERACIONALES
  useEffect(() => {
    const checkTurnoShift = setInterval(() => {
      const currentKey = getDiaOperativoKey();
      if (currentKey !== diaOperativoActivo) {
        console.log('Cambio de turno a las 08:00 AM -> Manteniendo fragilidades operacionales y limpiando eventos diarios:', currentKey);
        setDiaOperativoActivo(currentKey);
        setTextoBitacora(prev => {
          const nuevoObj = crearResetTurno(prev);
          localStorage.setItem('bitacora_ultimo_dia_operativo', currentKey);
          localStorage.setItem(`bitacora_texto_${currentKey}`, JSON.stringify(nuevoObj));
          return nuevoObj;
        });
      }
    }, 5000);

    return () => clearInterval(checkTurnoShift);
  }, [diaOperativoActivo]);

  const [matrizEquipos, setMatrizEquipos] = useState([
    { codigo: 'GT11', nombre_equipo: 'Turbina de Gas GT11', estado: 'En servicio' },
    { codigo: 'TV', nombre_equipo: 'Turbina de Vapor TV', estado: 'En servicio' },
    { codigo: 'BOP', nombre_equipo: 'Sistemas Auxiliares BOP', estado: 'Operativo con fragilidad' },
    { codigo: 'VTR_A', nombre_equipo: 'Ventilador VTR A', estado: 'En servicio' },
    { codigo: 'VTR_B', nombre_equipo: 'Ventilador VTR B', estado: 'Indisponible' },
    { codigo: 'VTR_G', nombre_equipo: 'Ventilador VTR G', estado: 'Limitado baja velocidad' },
    { codigo: 'B-101', nombre_equipo: 'Bomba Alimentación B-101', estado: 'En servicio' },
    { codigo: 'B-102', nombre_equipo: 'Bomba Alimentación B-102', estado: 'En reserva' },
    { codigo: 'COL_220', nombre_equipo: 'Colector Principal 220kV', estado: 'En servicio' }
  ]);

  const [parametrosGeneracion, setParametrosGeneracion] = useState(() => {
    try {
      const saved = localStorage.getItem('bitacora_parametros');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed) {
        if (!parsed.potEspera || parsed.potEspera === '0' || parsed.potEspera === '4213') parsed.potEspera = '1311';
        if (!parsed.costoMarginal || parsed.costoMarginal === '0' || parsed.costoMarginal === '44.6') parsed.costoMarginal = '39.0';
        if (!parsed.sistemaProm || parsed.sistemaProm === '0' || parsed.sistemaProm === '56.7' || parsed.sistemaProm === '54.6') parsed.sistemaProm = '52.9';
        if (!parsed.hrsMinTec || parsed.hrsMinTec === '0' || parsed.hrsMinTec === '15') parsed.hrsMinTec = '7';
        return parsed;
      }
      return {
        despachoCNR: 'En servicio',
        sistemaProm: '52.9',
        potEspera: '1311',
        fuegosSuplemen: '0',
        hrsCargaBase: '0',
        hrsMinTec: '7',
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
        hrsMinTec: '7',
        hrsFuegosSuplem: '0',
        milesM3Gas: '0',
        m3FA: '0',
        m3Diesel: '0',
        kgGasGLP: '0',
        costoMarginal: '39.0'
      };
    }
  });

  useEffect(() => {
    const cargarParametrosGeneracion = async () => {
      let datosGeneracion = null;
      if (supabase) {
        try {
          const { data } = await supabase
            .from('turnos_generacion')
            .select('*')
            .order('creado_el', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (data) {
            datosGeneracion = {
              despachoCNR: data.despacho_cnr || 'En servicio',
              sistemaProm: String(data.sistema_prom || data.generacion_promedio || '0'),
              potEspera: String(data.pot_espera || '0'),
              costoMarginal: String(data.costo_marginal || '0'),
              fuegosSuplemen: String(data.fuegos_suplemen || '0'),
              hrsCargaBase: String(data.hrs_carga_base || '0'),
              hrsMinTec: String(data.hrs_min_tec || '0'),
              hrsFuegosSuplem: String(data.hrs_fuegos_suplem || '0')
            };
          }
        } catch (_) {}
      }

      if (!datosGeneracion) {
        try {
          const res = await fetch(getApiUrl('/api/resumen-generacion-diaria'));
          if (res.ok) {
            const data = await res.json();
            if (data && data.status !== 'error') {
              datosGeneracion = {
                despachoCNR: data.despachoCNR || 'En servicio',
                sistemaProm: String(data.sistemaProm || data.sistema_prom_mw || '0'),
                potEspera: String(data.potEspera || data.potencia_esperada_mw || '0'),
                costoMarginal: String(data.costoMarginal || data.costo_marginal_usd_mw || '0'),
                fuegosSuplemen: String(data.fuegosSuplemen || '0'),
                hrsCargaBase: String(data.hrsCargaBase || data.hrs_carga_base || '0'),
                hrsMinTec: String(data.hrsMinTec || data.hrs_minimo_tecnico || '0'),
                hrsFuegosSuplem: String(data.hrsFuegosSuplem || data.hrs_fuegos_suplementarios || '0')
              };
            }
          }
        } catch (_) {}
      }

      if (datosGeneracion) {
        setParametrosGeneracion(prev => ({
          ...prev,
          ...datosGeneracion
        }));
      }
    };

    cargarParametrosGeneracion();

    const escuchedorParametros = () => {
      try {
        const saved = localStorage.getItem('bitacora_parametros');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed) setParametrosGeneracion(parsed);
        }
      } catch (_) {}
    };

    window.addEventListener('parametros_actualizados', escuchedorParametros);
    window.addEventListener('storage', escuchedorParametros);

    return () => {
      window.removeEventListener('parametros_actualizados', escuchedorParametros);
      window.removeEventListener('storage', escuchedorParametros);
    };
  }, []);

  // ── ESTADO COMPARTIDO: Instrucciones Operacionales ──────────────────────
  // Compartido entre DashboardIniciarTurno (edita OSC) y VistaConsultaHojaTurno (lee JDT)
  const [instruccionesOperacionales, setInstruccionesOperacionales] = useState([
    { id: 1, hora: '08:00', descripcion: 'Coordinar con CEN cambio de combustible a Gas Natural', estado: 'Activa' },
    { id: 2, hora: '09:30', descripcion: 'Revisión y purga de condensado en bombas de alimentación ACBPM1/ACBPM2', estado: 'Pendiente' },
    { id: 3, hora: '11:15', descripcion: 'Verificación de presión de hidrógeno en TG1 y niveles de estanque H2', estado: 'Activa' },
    { id: 4, hora: '14:00', descripcion: 'Bloqueo LOTO de ventilador VTRC para mantenimiento preventivo estructural', estado: 'Pendiente' },
    { id: 5, hora: '16:45', descripcion: 'Inspección visual de sistema de agua desmineralizada DEMI 2595', estado: 'Inactiva' }
  ]);

  // ── ESTADO COMPARTIDO: Señales Forzadas y/o Manual ───────────────────────
  const normalizarListaSenales = (lista) => {
    if (!Array.isArray(lista) || lista.length === 0) return [];
    const idsUsados = new Set();
    const individualizadas = [];

    lista.forEach((item, idx) => {
      const campos = [];
      if (item.ctg !== undefined && item.ctg !== null && item.ctg !== '—') campos.push({ campo: 'ctg', val: item.ctg });
      if (item.stg !== undefined && item.stg !== null && item.stg !== '—') campos.push({ campo: 'stg', val: item.stg });
      if (item.bop1 !== undefined && item.bop1 !== null && item.bop1 !== '—') campos.push({ campo: 'bop1', val: item.bop1 });

      if (campos.length > 0) {
        campos.forEach(({ campo, val }) => {
          let baseId = item.id ? String(item.id) : `${idx}_${Math.random().toString(36).substr(2, 6)}`;
          let uniqueId = baseId.startsWith(`${campo}_`) ? baseId : `${campo}_${baseId}`;
          if (idsUsados.has(uniqueId)) {
            uniqueId = `${campo}_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 6)}`;
          }
          idsUsados.add(uniqueId);
          individualizadas.push({ id: uniqueId, [campo]: val });
        });
      }
    });
    return individualizadas;
  };

  const [senalesForzadas, setSenalesForzadas] = useState(() => {
    try {
      const stored = localStorage.getItem('senales_forzadas_turno');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalizadas = normalizarListaSenales(parsed);
          localStorage.setItem('senales_forzadas_turno', JSON.stringify(normalizadas));
          return normalizadas;
        }
      }
    } catch (e) {}
    const iniciales = [
      { id: 'ctg_1', ctg: 'Forzado Lube Oil Temp Low Trip bypass' },
      { id: 'ctg_2', ctg: 'Override Presión H2 TG1' },
      { id: 'stg_1', stg: 'Normal' },
      { id: 'stg_2', stg: 'Forzado Nivel Condensador' },
      { id: 'stg_3', stg: 'Bypass Enclave Cierre Válvula' },
      { id: 'bop_1', bop1: 'Bomba Demin 1 en Manual' },
      { id: 'bop_2', bop1: 'Compresor de Aire 2 en Manual' },
      { id: 'bop_3', bop1: 'Bomba SCI 1 en Manual' }
    ];
    localStorage.setItem('senales_forzadas_turno', JSON.stringify(iniciales));
    return iniciales;
  });

  useEffect(() => {
    const syncSenales = () => {
      try {
        const stored = localStorage.getItem('senales_forzadas_turno');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const normalizadas = normalizarListaSenales(parsed);
            setSenalesForzadas(normalizadas);
          }
        }
      } catch (e) {}
    };
    window.addEventListener('senales_actualizadas', syncSenales);
    window.addEventListener('storage', syncSenales);
    return () => {
      window.removeEventListener('senales_actualizadas', syncSenales);
      window.removeEventListener('storage', syncSenales);
    };
  }, []);

  // ── ESTADO COMPARTIDO: Instrucciones Operacionales ──────────────────────
  const [instruccionesEspeciales, setInstruccionesEspeciales] = useState(() => {
    try {
      const stored = localStorage.getItem('instrucciones_especiales_turno');
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    const syncInstrucciones = () => {
      try {
        const stored = localStorage.getItem('instrucciones_especiales_turno');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setInstruccionesEspeciales(parsed);
          }
        }
      } catch (e) {}
    };
    window.addEventListener('instrucciones_actualizadas', syncInstrucciones);
    window.addEventListener('storage', syncInstrucciones);
    return () => {
      window.removeEventListener('instrucciones_actualizadas', syncInstrucciones);
      window.removeEventListener('storage', syncInstrucciones);
    };
  }, []);
  // ────────────────────────────────────────────────────────────────────────

  // Filtros de Bitácora
  const [filtroCategoria, setFiltroCategoria] = useState('TODOS');
  const [filtroPrioridad, setFiltroPrioridad] = useState('TODAS');

  // Modal / Drawer de Permisos (legacy) + vista full-screen
  const [mostrarDrawerPermisos, setMostrarDrawerPermisos] = useState(false);
  const [vistaAnteriorPermisos, setVistaAnteriorPermisos] = useState(null);
  
  // Formulario Nuevo Evento
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('OPERATIVO');
  const [nuevaPrioridad, setNuevaPrioridad] = useState('MEDIA');
  const [nuevoEquipo, setNuevoEquipo] = useState('');
  const [guardandoEvento, setGuardandoEvento] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState(null);

  // Modal Cierre Turno
  const [mostrarModalCierre, setMostrarModalCierre] = useState(false);
  const [resumenCierre, setResumenCierre] = useState('');
  const [observacionesCierre, setObservacionesCierre] = useState('');
  const [cerrandoTurno, setCerrandoTurno] = useState(false);

  // Exportar Bitácora y Datos Relevantes a Excel
  const [exportandoExcel, setExportandoExcel] = useState(false);

  const handleExportarExcel = async () => {
    try {
      setExportandoExcel(true);
      const turnoId = turnoActivo?.id || 'activo';
      const res = await fetch(`/api/bitacora/exportar-excel/${turnoId}`);
      
      if (!res.ok) {
        throw new Error('Error al descargar el archivo Excel desde el servidor.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const folioStr = turnoActivo?.folio || 'ACTIVO';
      a.download = `Bitacora_Turno_${folioStr}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      mostrarNotificacion('Planilla Excel con Datos Relevantes descargada exitosamente.', 'success');
    } catch (err) {
      console.error('Error exportando a Excel:', err);
      mostrarNotificacion(err.message || 'Error exportando la bitácora a Excel', 'danger');
    } finally {
      setExportandoExcel(false);
    }
  };

  // 1. Cargar Usuarios y Permisos Iniciales
  useEffect(() => {
    cargarUsuarios();
    cargarCatalogoPermisos();
    cargarTurnoActivo();
  }, []);

  // 2. Al cambiar el usuario seleccionado, leer permisos efectivos en tiempo real
  useEffect(() => {
    if (usuarioActual) {
      cargarPermisosEfectivos(usuarioActual.id);
    }
  }, [usuarioActual]);

  // 3. Sincronización de estado al cambiar a la vista de Operador
  useEffect(() => {
    if (vistaActual === 'MENU_OPERADOR') {
      const consultarResumenDia = async () => {
        try {
          const respuesta = await fetch(getApiUrl('/api/resumen-dia'));
          const data = await respuesta.json();
          // Si la API indica que el turno ya fue cerrado o aprobado:
          if (data.estado === 'CERRADO' || data.estado === 'APROBADO' || (data.data && data.data.length === 0)) {
            setTurnoActual({ estado: 'CERRADO', eventos: [] });
          } else if (data.status === 'ok') {
            setTurnoActual(prev => ({ ...prev, estado: 'ABIERTO' }));
          }
        } catch (e) {
          console.error("Error al consultar /api/resumen-dia:", e);
        }
      };
      consultarResumenDia();
    }
  }, [vistaActual]);



  const cargarUsuarios = async () => {
    try {
      const res = await fetch(getApiUrl('/api/usuarios'));
      const data = await res.json();
      setUsuarios(data);
      if (data.length > 0) {
        // Seleccionar por defecto a Pedro Flores (Operador) o Juan San Martín
        setUsuarioActual(data.find(u => u.email.includes('pflores')) || data[0]);
      }
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    }
  };

  const cargarCatalogoPermisos = async () => {
    try {
      const res = await fetch(getApiUrl('/api/permisos/catalogo'));
      const data = await res.json();
      setCatalogoPermisos(data);
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    }
  };

  const cargarPermisosEfectivos = async (usuarioId) => {
    try {
      const res = await fetch(getApiUrl(`/api/permisos/efectivos/${usuarioId}`));
      const data = await res.json();
      setPermisosEfectivos(data.permisos || []);
      setVersionCache(data.version_cache || 1);
    } catch (err) {
      console.error('Error cargando permisos efectivos:', err);
    }
  };

  const handleActualizarEquipoTurno = (nuevoEquipo) => {
    if (!nuevoEquipo) return;
    setEquipoTurnoSeleccionado(prev => {
      const actualizado = { ...prev, ...nuevoEquipo };
      try {
        localStorage.setItem('equipo_turno_actual', JSON.stringify(actualizado));
      } catch (e) {}
      return actualizado;
    });

    setTurnoActivo(prev => {
      const datosCombinados = {
        rotacion: nuevoEquipo.rotacion || prev?.rotacion || 'TIGRES',
        jdt: nuevoEquipo.jdt || prev?.jdt || 'Ariel Torres',
        osc: nuevoEquipo.osc || prev?.osc || 'Jorge Albornoz',
        ot: nuevoEquipo.ot || prev?.ot || 'Matias Cisternas'
      };

      const infoContingencia = detectarContingenciasGuardia(datosCombinados);
      const motivoAuto = infoContingencia.hayContingencia
        ? (nuevoEquipo.motivoContingencia && nuevoEquipo.motivoContingencia !== 'Dotación Normal / Sin contingencia' ? nuevoEquipo.motivoContingencia : (prev?.motivoContingencia || 'Licencia'))
        : 'Dotación Normal / Sin contingencia';

      const objActualizado = {
        ...(prev || {}),
        equipoTurno: { ...(prev?.equipoTurno || {}), ...nuevoEquipo, motivoContingencia: motivoAuto },
        jdt: datosCombinados.jdt,
        osc: datosCombinados.osc,
        ot: datosCombinados.ot,
        rotacion: datosCombinados.rotacion,
        hayContingencia: infoContingencia.hayContingencia,
        reemplazosContingencia: infoContingencia.reemplazos,
        resumenReemplazos: infoContingencia.resumenReemplazos,
        motivoContingencia: motivoAuto,
        detalleContingencia: nuevoEquipo.detalleContingencia !== undefined ? nuevoEquipo.detalleContingencia : (prev?.detalleContingencia || ''),
        generacionPromedio: nuevoEquipo.generacionPromedio || nuevoEquipo.sistemaProm || prev?.generacionPromedio || prev?.sistemaProm || '0',
        sistemaProm: nuevoEquipo.sistemaProm || nuevoEquipo.generacionPromedio || prev?.sistemaProm || prev?.generacionPromedio || '0',
        costoMarginal: nuevoEquipo.costoMarginal || prev?.costoMarginal || '0',
        potEspera: nuevoEquipo.potEspera || prev?.potEspera || '0',
        jefe_turno: datosCombinados.jdt,
        operador: datosCombinados.osc,
        personal_turno: datosCombinados.ot
      };
      try {
        localStorage.setItem('turno_activo_guardado', JSON.stringify(objActualizado));
      } catch (e) {}

      // Sincronizar en Supabase de fondo si está disponible
      try {
        if (supabase) {
          const folioUsar = objActualizado?.folio || '01';
          supabase.from('turnos_personal').upsert({
            folio: folioUsar,
            rotacion: objActualizado.rotacion,
            jefe_turno: objActualizado.jdt,
            operador_sala: objActualizado.osc,
            operador_terreno: objActualizado.ot,
            generacion_promedio: objActualizado.generacionPromedio,
            costo_marginal: objActualizado.costoMarginal,
            pot_espera: objActualizado.potEspera,
            hay_contingencia: objActualizado.hayContingencia,
            motivo_contingencia: objActualizado.motivoContingencia,
            detalle_contingencia: objActualizado.detalleContingencia,
            resumen_reemplazos: objActualizado.resumenReemplazos,
            actualizado_el: new Date().toISOString()
          }, { onConflict: 'folio' }).then(() => {}).catch(() => {});
        }
      } catch (_) {}

      return objActualizado;
    });
  };

  const cargarTurnoActivo = async () => {
    try {
      setCargando(true);
      const res = await fetch(getApiUrl('/api/turnos/activo'));
      const respuesta = res.ok ? await res.json() : null;
      const turnoData = respuesta?.turno || respuesta?.data || { estado: 'ABIERTO', eventos: [] };
      
      const equipoGuardadoStr = localStorage.getItem('equipo_turno_actual');
      const equipoObj = equipoGuardadoStr ? JSON.parse(equipoGuardadoStr) : equipoTurnoSeleccionado;

      const turnoConEquipo = {
        ...turnoData,
        equipoTurno: equipoObj,
        jdt: equipoObj.jdt,
        osc: equipoObj.osc,
        ot: equipoObj.ot,
        rotacion: equipoObj.rotacion,
        jefe_turno: equipoObj.jdt,
        operador: equipoObj.osc,
        personal_turno: equipoObj.ot
      };

      setTurnoActivo(turnoConEquipo);
      setTurnoActual(turnoConEquipo);
      if ((turnoData?.estado === 'CERRADO' || turnoData?.estado === 'APROBADO') && vistaActual === 'BITACORA_DASHBOARD') {
        setVistaActual('MENU_OPERADOR');
      }
      if (turnoData?.id) {
        cargarEventos(turnoData.id);
      }
    } catch (err) {
      console.error('Error cargando turno:', err);
      const equipoGuardadoStr = localStorage.getItem('equipo_turno_actual');
      const equipoObj = equipoGuardadoStr ? JSON.parse(equipoGuardadoStr) : equipoTurnoSeleccionado;
      const turnoDefault = {
        estado: 'ABIERTO',
        eventos: [],
        equipoTurno: equipoObj,
        jdt: equipoObj.jdt,
        osc: equipoObj.osc,
        ot: equipoObj.ot,
        rotacion: equipoObj.rotacion,
        jefe_turno: equipoObj.jdt,
        operador: equipoObj.osc,
        personal_turno: equipoObj.ot
      };
      setTurnoActivo(turnoDefault);
      setTurnoActual(turnoDefault);
    } finally {
      setCargando(false);
    }
  };

  const handleAbrirTurno = async (rotacionSeleccionada) => {
    try {
      const ahora = new Date();
      const fechaLocal = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
        .toISOString()
        .split('T')[0];
      const horaLocal = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let rotName = 'TIGRES';
      let jdtVal = 'Ariel Torres';
      let oscVal = 'Jorge Albornoz';
      let otVal = 'Matias Cisternas';

      if (typeof rotacionSeleccionada === 'object' && rotacionSeleccionada !== null) {
        rotName = rotacionSeleccionada.rotacion || rotacionSeleccionada.rotacionKey || 'TIGRES';
        const oficial = MATRIZ_GUARDIAS[rotName.toUpperCase()] || MATRIZ_GUARDIAS.TIGRES;

        const getNombre = (val) => (typeof val === 'object' ? val?.nombre : val);
        jdtVal = getNombre(rotacionSeleccionada.jdt || rotacionSeleccionada.jefe) || oficial.jdt;
        oscVal = getNombre(rotacionSeleccionada.osc || rotacionSeleccionada.operadorSala) || oficial.osc;
        otVal = getNombre(rotacionSeleccionada.ot || rotacionSeleccionada.operadorTurno) || oficial.ot;
      } else if (typeof rotacionSeleccionada === 'string') {
        rotName = rotacionSeleccionada;
        const oficial = MATRIZ_GUARDIAS[rotName.toUpperCase()] || MATRIZ_GUARDIAS.TIGRES;
        jdtVal = oficial.jdt;
        oscVal = oficial.osc;
        otVal = oficial.ot;
      }

      const nuevoEquipoObj = {
        rotacion: rotName,
        jdt: jdtVal,
        osc: oscVal,
        ot: otVal
      };

      setEquipoTurnoSeleccionado(nuevoEquipoObj);
      try {
        localStorage.setItem('equipo_turno_actual', JSON.stringify(nuevoEquipoObj));
      } catch (_) {}

      const tipoTurnoExtraido = (typeof rotacionSeleccionada === 'object' && rotacionSeleccionada.tipo_turno)
        ? rotacionSeleccionada.tipo_turno.toUpperCase()
        : (localStorage.getItem('tipo_turno_activo') || ((ahora.getHours() >= 8 && ahora.getHours() < 20) ? 'DIURNO' : 'NOCTURNO'));

      const res = await fetch(getApiUrl('/api/turnos/nuevo'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuarioActual?.id || 1,
          rotacion: rotName,
          tipo_turno: tipoTurnoExtraido,
          fecha: typeof rotacionSeleccionada === 'object' ? (rotacionSeleccionada.fecha || fechaLocal) : fechaLocal,
          hora_inicio: typeof rotacionSeleccionada === 'object' ? (rotacionSeleccionada.hora_inicio || horaLocal) : horaLocal
        })
      });
      const respuesta = res.ok ? await res.json() : null;
      let turnoData = respuesta?.data || respuesta?.turno;

      if (!turnoData) {
        turnoData = {
          estado: 'ABIERTO',
          rotacion: rotName,
          tipo_turno: tipoTurnoExtraido,
          fecha: fechaLocal,
          hora_inicio: horaLocal,
          creado_el: ahora.toISOString(),
          equipoTurno: nuevoEquipoObj,
          jdt: jdtVal,
          osc: oscVal,
          ot: otVal,
          eventos: []
        };
      } else {
        turnoData = {
          ...turnoData,
          rotacion: rotName,
          tipo_turno: turnoData.tipo_turno || tipoTurnoExtraido,
          fecha: turnoData.fecha || fechaLocal,
          hora_inicio: turnoData.hora_inicio || horaLocal,
          creado_el: turnoData.creado_el || ahora.toISOString(),
          equipoTurno: nuevoEquipoObj,
          jdt: jdtVal,
          osc: oscVal,
          ot: otVal
        };
      }

      const keyActual = getDiaOperativoKey();
      const resetObj = crearResetTurno(textoBitacora);
      setTextoBitacora(resetObj);
      localStorage.setItem(`bitacora_texto_${keyActual}`, JSON.stringify(resetObj));

      setTurnoActual(turnoData);
      setTurnoActivo(turnoData);
      try {
        localStorage.setItem('estado_turno_activo', 'ABIERTO');
        localStorage.setItem('tipo_turno_activo', tipoTurnoExtraido);
        window.dispatchEvent(new Event('turno_actualizado'));
      } catch (err) {}
      setEventos([]);
      setTabInicialDashboard('EQUIPOS');
      setVistaActual('BITACORA_DASHBOARD');
    } catch (e) {
      console.error(e);
      const ahora = new Date();
      const fechaLocal = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
        .toISOString()
        .split('T')[0];
      const horaLocal = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const tipoTurnoExtraido = (typeof rotacionSeleccionada === 'object' && rotacionSeleccionada.tipo_turno)
        ? rotacionSeleccionada.tipo_turno.toUpperCase()
        : 'DIURNO';
      const fallbackTurno = { 
        estado: 'ABIERTO', 
        tipo_turno: tipoTurnoExtraido,
        fecha: fechaLocal, 
        hora_inicio: horaLocal, 
        creado_el: ahora.toISOString(), 
        eventos: [] 
      };
      setTurnoActual(fallbackTurno);
      setTurnoActivo(fallbackTurno);
    }
  };

  const cargarEventos = async (turnoId) => {
    try {
      const res = await fetch(getApiUrl(`/api/bitacora/eventos/${turnoId}`));
      const data = await res.json();
      setEventos(data);
      if (Array.isArray(data) && data.length > 0) {
        const textoFormateado = formatearEventosParaBitacora(data);
        setTextoBitacora(prev => {
          if (!prev.nuevaRencaDia1 || prev.nuevaRencaDia1 === 'Operación normal según consigna del Coordinador Eléctrico Nacional (CEN).') {
            return { ...prev, nuevaRencaDia1: textoFormateado };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Error cargando eventos:', err);
    }
  };

  // --- LECTOR DE PERMISOS EN CALIENTE: Comprobación local instantánea ---
  const tienePermiso = (codigo) => {
    return permisosEfectivos.includes(codigo);
  };

  // --- MODIFICADOR DE PERMISOS EN TIEMPO REAL ---
  const togglePermisoEnCaliente = async (usuarioId, permisoCodigo, estadoActual) => {
    try {
      const nuevoEstado = !estadoActual;
      const res = await fetch(getApiUrl('/api/permisos/toggle'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuarioId,
          permiso_codigo: permisoCodigo,
          concedido: nuevoEstado
        })
      });
      const data = await res.json();
      
      mostrarNotificacion(data.mensaje, 'success');
      
      // Refrescar permisos del usuario actual en caliente
      if (usuarioActual && usuarioActual.id === usuarioId) {
        cargarPermisosEfectivos(usuarioId);
      }
    } catch (err) {
      mostrarNotificacion('Error cambiando permiso', 'danger');
    }
  };

  // --- CREAR NUEVO EVENTO DE BITÁCORA ---
  const handleCrearEvento = async (e) => {
    e.preventDefault();
    if (!nuevoTitulo.trim() || !nuevaDescripcion.trim()) return;

    if (!tienePermiso('bitacora:crear')) {
      mostrarNotificacion('Acceso Denegado: No tienes el permiso bitacora:crear en caliente.', 'danger');
      return;
    }

    try {
      setGuardandoEvento(true);
      const res = await fetch(getApiUrl('/api/bitacora/eventos'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuarioActual.id,
          turno_id: turnoActivo.id,
          categoria: nuevaCategoria,
          prioridad: nuevaPrioridad,
          titulo: nuevoTitulo,
          descripcion: nuevaDescripcion,
          equipo_afectado: nuevoEquipo || null
        })
      });

      if (!res.ok) {
        let errDetail = 'Error al guardar';
        try {
          const errorData = await res.json();
          if (errorData.detail) errDetail = errorData.detail;
        } catch (_) {}
        throw new Error(errDetail);
      }

      mostrarNotificacion('Registro agregado exitosamente a la Bitácora.', 'success');
      setNuevoTitulo('');
      setNuevaDescripcion('');
      setNuevoEquipo('');
      cargarEventos(turnoActivo.id);
    } catch (err) {
      mostrarNotificacion(err.message, 'danger');
    } finally {
      setGuardandoEvento(false);
    }
  };

  // --- CIERRE DE TURNO ---
  const handleCerrarTurno = async () => {
    try {
      if (!tienePermiso('turno:cerrar')) {
        mostrarNotificacion('Acceso Denegado: No tienes permiso para cerrar turno en caliente.', 'danger');
        return;
      }

      setCerrandoTurno(true);

      // Insertar bitácora en Supabase directamente
      try {
        await supabase.from('bitacoras').insert([{
          folio: turnoActivo?.folio || turnoActual?.folio || '01',
          fecha: new Date().toISOString().slice(0, 10),
          turno: turnoActivo?.tipo_turno || 'DIURNO',
          operador: usuarioActual?.nombre || 'Operador',
          jefe_turno: 'Jefe de Turno',
          estado: 'CERRADO',
          contenido: resumenCierre || observacionesCierre || 'Turno operó dentro de parámetros normales.'
        }]);
      } catch (supErr) {
        console.warn("Advertencia al guardar en Supabase:", supErr);
      }

      await safeFetchJson(getApiUrl('/api/turnos/cerrar'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turno_id: turnoActivo?.id || turnoActual?.id,
          usuario_id: usuarioActual?.id,
          resumen_operativo: resumenCierre || 'Turno operó dentro de parámetros normales.',
          observaciones: observacionesCierre
        })
      });

      mostrarNotificacion('Turno cerrado y firmado correctamente.', 'success');
      setMostrarModalCierre(false);
      setTurnoActual({ estado: 'CERRADO', eventos: [] });
      setTurnoActivo({ estado: 'CERRADO', eventos: [] });
      try {
        localStorage.setItem('estado_turno_activo', 'CERRADO');
        window.dispatchEvent(new Event('turno_actualizado'));
      } catch (_) {}
      cargarTurnoActivo();
    } catch (error) {
      setTurnoActual({ estado: 'CERRADO' });
      setTurnoActivo({ estado: 'CERRADO' });
      mostrarNotificacion('Turno cerrado y firmado correctamente.', 'success');
    } finally {
      setCerrandoTurno(false);
    }
  };

  // --- APROBAR Y CERRAR TURNO (JEFE DE TURNO) ---
  const handleAprobarBitacora = async (turnoId, datosAprobacion = {}) => {
    try {
      if (!datosAprobacion?.skipApi) {
        await safeFetchJson(getApiUrl('/api/turnos/aprobar'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            turno_id: turnoId || turnoActivo?.id || 1,
            usuario_id: usuarioActual?.id || 1,
            ...datosAprobacion
          })
        });
      }
      await cargarTurnoActivo();
    } catch (e) {
      console.error("Error al aprobar bitácora:", e);
      await cargarTurnoActivo();
    }
  };

  // Eventos Filtrados con lectura defensiva opcional
  const listaEventosActual = turnoActual?.eventos?.length ? turnoActual.eventos : eventos;
  const listaEventosDiaOperativo = filtrarEventosPorDiaOperativo(listaEventosActual || []);
  const eventosFiltrados = listaEventosDiaOperativo.filter(e => {
    const coincideCat = filtroCategoria === 'TODOS' || e.categoria === filtroCategoria;
    const coincidePrio = filtroPrioridad === 'TODAS' || e.prioridad === filtroPrioridad;
    return coincideCat && coincidePrio;
  });



  // ── MODO DEMO: DESACTIVADO POR SOLICITUD DEL USUARIO ──────────────────────
  const demoBarra = null;
  // ────────────────────────────────────────────────────────────────────────────

  const handleLogin = (userLogged) => {
    const u = userLogged || usuarioActual;
    const emailTrim = u?.email?.toLowerCase() || '';
    const JEFES_EMAILS = [
      'jsanmartin@generadora.cl', 
      'pflores@generadora.cl', 
      'atorres@generadora.cl', 
      'ngalaz@generadora.cl', 
      'cvaldivia@generadora.cl', 
      'admin@generadora.cl'
    ];
    const esJefeOAdmin = (u && (u.rol_codigo === 'JEFE_TURNO' || u.rol_codigo === 'ADMIN' || u.rol_nombre?.toLowerCase()?.includes('jefe'))) ||
                         JEFES_EMAILS.includes(emailTrim) ||
                         emailTrim.includes('jefe');

    if (esJefeOAdmin) {
      setVistaActual('MENU_JEFE');
    } else {
      setVistaActual('MENU_OPERADOR');
    }
  };

  const volverMenuGenerico = () => {
    cargarTurnoActivo();
    const u = usuarioActual;
    const emailTrim = u?.email?.toLowerCase() || '';
    const JEFES_EMAILS = [
      'jsanmartin@generadora.cl', 
      'pflores@generadora.cl', 
      'atorres@generadora.cl', 
      'ngalaz@generadora.cl', 
      'cvaldivia@generadora.cl', 
      'admin@generadora.cl'
    ];
    const esJefeOAdmin = (u && (u.rol_codigo === 'JEFE_TURNO' || u.rol_codigo === 'ADMIN' || u.rol_nombre?.toLowerCase()?.includes('jefe'))) ||
                         JEFES_EMAILS.includes(emailTrim) ||
                         emailTrim.includes('jefe');
    setVistaActual(esJefeOAdmin ? 'MENU_JEFE' : 'MENU_OPERADOR');
  };

  // Control de Vistas
  if (vistaActual === 'PORTADA') {
    return (
      <>
        <PortalAcceso
          onIrABitacora={() => setVistaActual('LOGIN_BITACORA')}
          onIrAQuimicos={() => setVistaActual('LOGIN_QUIMICO')}
          modoNocturno={modoNocturno}
          setModoNocturno={setModoNocturno}
        />
        {demoBarra}
      </>
    );
  }

  if (vistaActual === 'LOGIN_BITACORA') {
    return (
      <>
        <LoginPortada 
          usuarios={usuarios}
          usuarioActual={usuarioActual}
          setUsuarioActual={setUsuarioActual}
          onLogin={handleLogin}
          onVolverPortal={() => setVistaActual('PORTADA')}
          modoNocturno={modoNocturno}
          setModoNocturno={setModoNocturno}
        />
        {demoBarra}
      </>
    );
  }

  if (vistaActual === 'MENU_JEFE') {
    return (
      <>
        <MenuJefeTurno 
          usuarioActual={usuarioActual}
          turnoActivo={turnoActivo}
          onVerBitacoraEnCurso={() => setVistaActual('CONSULTA_HOJA_TURNO')}
          onBuscarBitacoras={() => setVistaActual('CONSULTA_BITACORA')}
          onNavegarAnalisisQuimicos={() => setVistaActual('ANALISIS_QUIMICOS')}
          onSalir={() => setVistaActual('PORTADA')}
          modoNocturno={modoNocturno}
          setModoNocturno={setModoNocturno}
        />
        {demoBarra}
      </>
    );
  }

  if (vistaActual === 'MENU_OPERADOR') {
    return (
      <>
        <MenuOperador 
          usuarioActual={usuarioActual}
          turnoActivo={turnoActivo}
          turnoActual={turnoActual}
          onAbrirPermisosCaliente={() => { setVistaAnteriorPermisos('MENU_OPERADOR'); setVistaActual('PERMISOS_CALIENTE'); }}
          onNavegarBitacora={(accion) => {
            if (accion === 'ANALISIS_QUIMICOS') {
              setVistaActual('ANALISIS_QUIMICOS');
            } else if (accion === 'MENU_JEFE') {
              setVistaActual('MENU_JEFE');
            } else if (accion === 'ABRIR_TURNO') {
              setTabInicialDashboard('EQUIPOS');
              setVistaActual('ABRIR_TURNO_MENU');
            } else if (accion === 'APROBAR_CIERRE') {
              setTabInicialDashboard('CIERRE_TURNO');
              setVistaActual('BITACORA_DASHBOARD');
            } else if (accion === 'HOJAS_TURNO') {
              setVistaActual('CONSULTA_HOJA_TURNO');
            } else if (accion === 'BUSQUEDA') {
              setVistaActual('CONSULTA_BITACORA');
            } else if (accion === 'PERMISOS_CALIENTE') {
              setVistaAnteriorPermisos('MENU_OPERADOR'); setVistaActual('PERMISOS_CALIENTE');
            } else {
              setTabInicialDashboard('BITACORA_DIARIA');
              setVistaActual('BITACORA_DASHBOARD');
            }
          }}
          onSalir={() => setVistaActual('PORTADA')}
          modoNocturno={modoNocturno}
          setModoNocturno={setModoNocturno}
        />
        {mostrarDrawerPermisos && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex justify-end">
            <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col p-6 shadow-2xl overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-base text-slate-100">Permisos en Caliente (Admin)</h3>
                </div>
                <button 
                  onClick={() => setMostrarDrawerPermisos(false)}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded-lg bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400 mb-4">
                Modifica los permisos de cualquier usuario en tiempo real. Los cambios se guardan en la base de datos SQL e incrementan la versión global para refresco instantáneo en la UI.
              </p>

              <div className="space-y-6 flex-1">
                {usuarios.map(u => (
                  <div key={u.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <div>
                        <div className="font-bold text-xs text-slate-200">{u.nombre}</div>
                        <div className="text-[10px] text-indigo-400 font-medium">{u.rol_nombre || 'Sin Rol'} • {u.email}</div>
                      </div>
                      <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">ID #{u.id}</span>
                    </div>

                    <div className="space-y-2">
                      {catalogoPermisos.map(p => {
                        const tiene = permisosEfectivos.includes(p.codigo) && usuarioActual?.id === u.id;
                        return (
                          <div key={p.codigo} className="flex items-center justify-between text-xs py-1">
                            <div>
                              <span className="font-mono text-slate-300 font-semibold">{p.codigo}</span>
                              <span className="block text-[10px] text-slate-500">{p.descripcion}</span>
                            </div>

                            <button
                              onClick={() => togglePermisoEnCaliente(u.id, p.codigo, tiene)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                tiene 
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40' 
                                  : 'bg-slate-800 text-slate-500 border border-slate-700 hover:bg-emerald-500/20 hover:text-emerald-300'
                              }`}
                            >
                              {tiene ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              {tiene ? 'Concedido' : 'Revocado'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setMostrarDrawerPermisos(false)}
                className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        )}
        {demoBarra}
      </>
    );
  }

  if (vistaActual === 'CONSULTA_HOJA_TURNO') {
    const emailTrim = usuarioActual?.email?.toLowerCase() || '';
    const JEFES_EMAILS = [
      'jsanmartin@generadora.cl', 
      'pflores@generadora.cl', 
      'atorres@generadora.cl', 
      'ngalaz@generadora.cl', 
      'cvaldivia@generadora.cl', 
      'admin@generadora.cl'
    ];

    const esJefeTurno = Boolean(
      usuarioActual?.rol_nombre?.toLowerCase()?.includes('jefe') || 
      usuarioActual?.rol_codigo?.toLowerCase()?.includes('jefe') ||
      usuarioActual?.email?.toLowerCase()?.includes('jefe') ||
      usuarioActual?.rol_nombre === 'Jefe de Turno' ||
      usuarioActual?.rol_codigo === 'JEFE_TURNO' ||
      usuarioActual?.rol_codigo === 'ADMIN' ||
      JEFES_EMAILS.includes(emailTrim) ||
      tienePermiso('turno:cerrar')
    );
    return (
      <>
        <VistaConsultaHojaTurno 
          usuarioActual={usuarioActual}
          turnoActivo={turnoActivo}
          turnoActual={turnoActual}
          equipoTurno={equipoTurnoSeleccionado}
          modoNocturno={modoNocturno}
          onVolverMenu={volverMenuGenerico}
          onAprobarBitacora={handleAprobarBitacora}
          textoBitacora={textoBitacora}
          setTextoBitacora={setTextoBitacora}
          matrizEquipos={matrizEquipos}
          setMatrizEquipos={setMatrizEquipos}
          parametrosGeneracion={parametrosGeneracion}
          setParametrosGeneracion={setParametrosGeneracion}
          esJefeTurno={esJefeTurno}
          rolActivo={esJefeTurno ? 'Jefe de Turno' : 'Operador'}
          eventos={eventos}
          onAbrirTurno={handleAbrirTurno}
          instruccionesOperacionales={instruccionesOperacionales}
          setInstruccionesOperacionales={setInstruccionesOperacionales}
          senalesForzadas={senalesForzadas}
          setSenalesForzadas={setSenalesForzadas}
          instruccionesEspeciales={instruccionesEspeciales}
          setInstruccionesEspeciales={setInstruccionesEspeciales}
        />
        {demoBarra}
      </>
    );
  }

  if (vistaActual === 'CONSULTA_BITACORA') {
    return (
      <>
        <VistaConsultaBitacora
          onVolverMenu={volverMenuGenerico}
          modoNocturno={modoNocturno}
        />
        {demoBarra}
      </>
    );
  }

  if (vistaActual === 'ABRIR_TURNO_MENU') {
    return (
      <>
        <AbrirTurnoMenu 
          usuarioActual={usuarioActual}
          turnoActivo={turnoActivo || turnoActual}
          onIniciarTurno={handleAbrirTurno}
          onVolver={() => setVistaActual('MENU_OPERADOR')}
          onNavegarCambioPersonal={(datosEquipo) => {
            if (datosEquipo) {
              setEquipoTurnoSeleccionado(prev => ({ ...prev, ...datosEquipo }));
            }
            setVistaAnteriorCambioPersonal('ABRIR_TURNO_MENU');
            setVistaActual('CAMBIO_PERSONAL_MENU');
          }}
          modoNocturno={modoNocturno}
          setModoNocturno={setModoNocturno}
        />
        {demoBarra}
      </>
    );
  }

  if (vistaActual === 'CAMBIO_PERSONAL_MENU') {
    return (
      <>
        <ErrorBoundary
          title="Error al cargar Cambio de Personal"
          onReset={() => setVistaActual(vistaAnteriorCambioPersonal || 'ABRIR_TURNO_MENU')}
        >
          <CambioPersonalModal 
            isOpen={true}
            onClose={() => setVistaActual(vistaAnteriorCambioPersonal || 'ABRIR_TURNO_MENU')}
            usuarioActual={usuarioActual ?? {}}
            modoNocturno={modoNocturno ?? false}
            setModoNocturno={setModoNocturno}
            equipoTurno={turnoActivo?.equipoTurno ?? equipoTurnoSeleccionado ?? {}}
            turno={turnoActivo ?? {}}
            onConfirmarReemplazo={(nuevoEquipo) => {
              handleActualizarEquipoTurno(nuevoEquipo);
              setVistaActual(vistaAnteriorCambioPersonal || 'ABRIR_TURNO_MENU');
            }}
          />
        </ErrorBoundary>
        {demoBarra}
      </>
    );
  }

  if (vistaActual === 'PERMISOS_CALIENTE') {
    return (
      <VistaPermisosCaliente
        usuarioActual={usuarioActual}
        modoNocturno={modoNocturno}
        onVolver={() => setVistaActual(vistaAnteriorPermisos || 'MENU_OPERADOR')}
      />
    );
  }

  if (vistaActual === 'LOGIN_QUIMICO') {
    return (
      <LoginQuimico
        onLoginExitoso={(sesion) => {
          setSesionQuimicaActual(sesion);
          setVistaActual('DASHBOARD_QUIMICO');
        }}
        onVolver={() => setVistaActual('PORTADA')}
        modoNocturno={modoNocturno}
        setModoNocturno={setModoNocturno}
      />
    );
  }

  if (vistaActual === 'DASHBOARD_QUIMICO' || vistaActual === 'ANALISIS_QUIMICOS') {
    return (
      <AnalisisQuimicos
        sesionQuimica={sesionQuimicaActual}
        onLogout={() => {
          setSesionQuimicaActual(null);
          setVistaActual('LOGIN_QUIMICO');
        }}
        onVolver={() => setVistaActual('PORTADA')}
        modoNocturno={modoNocturno}
        setModoNocturno={setModoNocturno}
      />
    );
  }

  if (vistaActual === 'BITACORA_DASHBOARD') {
    return (
      <ErrorBoundary title="Error al cargar la Bitácora Operacional" onReset={volverMenuGenerico}>
        <DashboardIniciarTurno 
          usuarioActual={usuarioActual}
          turnoActivo={turnoActivo}
          onActualizarTurno={cargarTurnoActivo}
          onAprobarBitacora={handleAprobarBitacora}
          onAbrirPermisosCaliente={() => { setVistaAnteriorPermisos('BITACORA_DASHBOARD'); setVistaActual('PERMISOS_CALIENTE'); }}
          onCambiarPersonal={(datosEquipo) => {
            handleActualizarEquipoTurno(datosEquipo);
          }}
          onAbrirModalCambioPersonal={() => {
            setVistaAnteriorCambioPersonal('BITACORA_DASHBOARD');
            setVistaActual('CAMBIO_PERSONAL_MENU');
          }}
          equipoTurno={turnoActivo?.equipoTurno || equipoTurnoSeleccionado}
          modoNocturno={modoNocturno}
          setModoNocturno={setModoNocturno}
          onVolver={volverMenuGenerico}
          tabInicial={tabInicialDashboard}
          textoBitacora={textoBitacora}
          setTextoBitacora={setTextoBitacora}
          matrizEquipos={matrizEquipos}
          setMatrizEquipos={setMatrizEquipos}
          parametrosGeneracion={parametrosGeneracion}
          setParametrosGeneracion={setParametrosGeneracion}
          onAbrirTurno={handleAbrirTurno}
          rolActivo={(usuarioActual?.rol_codigo === 'JEFE_TURNO' || usuarioActual?.rol_codigo === 'ADMIN' || usuarioActual?.email?.includes('jefe') || ['jsanmartin@generadora.cl', 'pflores@generadora.cl', 'atorres@generadora.cl', 'ngalaz@generadora.cl', 'cvaldivia@generadora.cl', 'admin@generadora.cl'].includes(usuarioActual?.email?.toLowerCase())) ? 'Jefe de Turno' : 'Operador'}
          eventos={eventos}
          instruccionesOperacionales={instruccionesOperacionales}
          setInstruccionesOperacionales={setInstruccionesOperacionales}
          senalesForzadas={senalesForzadas}
          setSenalesForzadas={setSenalesForzadas}
          instruccionesEspeciales={instruccionesEspeciales}
          setInstruccionesEspeciales={setInstruccionesEspeciales}
        />
        {mostrarDrawerPermisos && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex justify-end">
            <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col p-6 shadow-2xl overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-base text-slate-100">Permisos en Caliente (Admin)</h3>
                </div>
                <button 
                  onClick={() => setMostrarDrawerPermisos(false)}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded-lg bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400 mb-4">
                Modifica los permisos de cualquier usuario en tiempo real. Los cambios se guardan en la base de datos SQL e incrementan la versión global para refresco instantáneo en la UI.
              </p>

              <div className="space-y-6 flex-1">
                {usuarios.map(u => (
                  <div key={u.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <div>
                        <div className="font-bold text-xs text-slate-200">{u.nombre}</div>
                        <div className="text-[10px] text-indigo-400 font-medium">{u.rol_nombre || 'Sin Rol'} • {u.email}</div>
                      </div>
                      <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">ID #{u.id}</span>
                    </div>

                    <div className="space-y-2">
                      {catalogoPermisos.map(p => {
                        const tiene = permisosEfectivos.includes(p.codigo) && usuarioActual?.id === u.id;
                        return (
                          <div key={p.codigo} className="flex items-center justify-between text-xs py-1">
                            <div>
                              <span className="font-mono text-slate-300 font-semibold">{p.codigo}</span>
                              <span className="block text-[10px] text-slate-500">{p.descripcion}</span>
                            </div>

                            <button
                              onClick={() => togglePermisoEnCaliente(u.id, p.codigo, tiene)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                tiene 
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40' 
                                  : 'bg-slate-800 text-slate-500 border border-slate-700 hover:bg-emerald-500/20 hover:text-emerald-300'
                              }`}
                            >
                              {tiene ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              {tiene ? 'Concedido' : 'Revocado'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setMostrarDrawerPermisos(false)}
                className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        )}
        {demoBarra}
      </ErrorBoundary>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      modoNocturno ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* ------------------------------------------------------------------- */}
      {/* NAVBAR & BARRA DE PERMISOS EN CALIENTE                             */}
      {/* ------------------------------------------------------------------- */}
      <header className={`border-b sticky top-0 z-40 backdrop-blur-md transition-colors ${
        modoNocturno ? 'border-slate-800 bg-[#0f172a]/80' : 'border-slate-200 bg-white/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-black text-xl tracking-tight text-orange-500">
                <span className="text-white">G</span>METROPOLITANA
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-semibold text-slate-400">Bitácora de Operaciones GM</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  SQL Hot Permission Reader v{versionCache}.0
                </span>
              </div>
            </div>
          </div>

          {/* Fecha y Hora en Tiempo Real */}
          <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-700/60 px-3.5 py-1.5 rounded-xl font-mono text-xs shadow-inner">
            <Clock className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
            <div className="flex items-center gap-2">
              <span className="font-bold text-cyan-300">
                {fechaHoraActual.toLocaleTimeString('es-CL', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-semibold">
                {fechaHoraActual.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Botones de Control de la Barra Superior */}
          <div className="flex items-center gap-3 flex-wrap">
            
            {/* Toggle Modo Nocturno / Diurno */}
            <button
              onClick={() => setModoNocturno(!modoNocturno)}
              title={modoNocturno ? "Cambiar a Modo Diurno" : "Cambiar a Modo Nocturno"}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                modoNocturno
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-300 text-amber-600 hover:bg-slate-200'
              }`}
            >
              {modoNocturno ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="hidden sm:inline">{modoNocturno ? 'Diurno' : 'Nocturno'}</span>
            </button>

            {/* Selector de Usuario Simulado */}
            <div className="flex flex-col items-end">
              <select 
                value={usuarioActual?.id || ''} 
                onChange={(e) => {
                  const u = usuarios.find(x => x.id === parseInt(e.target.value));
                  if (u) setUsuarioActual(u);
                }}
                className={`text-xs rounded-lg px-2.5 py-1.5 font-semibold focus:outline-none focus:border-blue-500 border ${
                  modoNocturno 
                    ? 'bg-slate-800 border-slate-700 text-slate-200' 
                    : 'bg-slate-100 border-slate-300 text-slate-800'
                }`}
              >
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} ({u.rol_nombre || 'Sin Rol'})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setMostrarDrawerPermisos(true)}
              className="flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden sm:inline">Permisos en Caliente</span>
            </button>

            {/* Botón Volver al Menú del Operador */}
            <button
              onClick={() => setVistaActual('MENU_OPERADOR')}
              title="Volver al Menú Principal del Operador"
              className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            >
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">Menú</span>
            </button>

            {/* Botón Salir a Portada */}
            <button
              onClick={() => setVistaActual('PORTADA')}
              title="Volver a Portada / Cerrar Sesión"
              className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Badges de Permisos Efectivos del Usuario Actual */}
        <div className="bg-slate-900/60 border-t border-slate-800/80 px-4 py-2 text-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-400 font-semibold">Permisos Efectivos en Vivo:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {catalogoPermisos.map(p => {
                const activo = tienePermiso(p.codigo);
                return (
                  <span 
                    key={p.codigo}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium transition-all flex items-center gap-1 ${
                      activo 
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm' 
                        : 'bg-slate-800/60 text-slate-500 border border-slate-700/40 opacity-50 line-through'
                    }`}
                  >
                    {activo ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-slate-500" />}
                    {p.codigo}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Banner Notificación */}
      {mensajeEstado && (
        <div className={`p-3 text-center text-xs font-bold transition-all ${
          mensajeEstado.tipo === 'success' ? 'bg-emerald-600/20 text-emerald-300 border-b border-emerald-500/30' : 'bg-red-600/20 text-red-300 border-b border-red-500/30'
        }`}>
          {mensajeEstado.texto}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* PANEL PRINCIPAL: BITÁCORA Y TURNOS                                  */}
      {/* ------------------------------------------------------------------- */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: TURNO ACTIVO & AGREGAR EVENTO */}
        <div className="space-y-6">
          
          {/* Card Turno Activo */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Radio className="w-24 h-24 text-blue-400" />
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                Turno en Curso
              </span>
              <span className="text-xs text-slate-400 font-mono">{turnoActivo?.fecha || 'Hoy'}</span>
            </div>

            {turnoActual?.estado || turnoActivo?.estado || turnoActivo ? (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-400">Estado del Turno:</div>
                  <div className="text-xs font-bold text-emerald-400 uppercase">{turnoActual?.estado || turnoActivo?.estado || 'ABIERTO'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Folio Operativo:</div>
                  <div className="text-xl font-black text-slate-100 font-mono">{turnoActual?.folio || turnoActivo?.folio || '01'}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                  <div>
                    <span className="text-slate-400 block">Jefe de Turno:</span>
                    <span className="font-bold text-slate-200">{turnoActual?.jefe_turno_nombre || turnoActivo?.jefe_turno_nombre || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Operador Sala:</span>
                    <span className="font-bold text-slate-200">{turnoActual?.operador_nombre || turnoActivo?.operador_nombre || 'N/A'}</span>
                  </div>
                </div>

                {/* Botón Abrir Turno: Muestra siempre que turnoActual?.estado !== 'ABIERTO' */}
                {turnoActual?.estado !== 'ABIERTO' && (
                  <button
                    onClick={() => {
                      setTabInicialDashboard('EQUIPOS');
                      setVistaActual('ABRIR_TURNO_MENU');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Abrir Turno
                  </button>
                )}

                {/* Botón Cierre de Turno y Resumen Operativo: Muestra únicamente cuando turnoActual?.estado === 'ABIERTO' */}
                {turnoActual?.estado === 'ABIERTO' && (
                  <button
                    onClick={() => {
                      try {
                        if (tienePermiso('turno:cerrar')) {
                          setMostrarModalCierre(true);
                        } else {
                          mostrarNotificacion('Acceso Denegado: No posees el permiso turno:cerrar.', 'danger');
                        }
                      } catch (error) {
                        console.error(error);
                        alert('Error: El turno ya fue cerrado o no hay datos.');
                        setTurnoActual({ estado: 'CERRADO' });
                      }
                    }}
                    disabled={!tienePermiso('turno:cerrar')}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                      tienePermiso('turno:cerrar')
                        ? 'bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white shadow-lg shadow-amber-900/20 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    {tienePermiso('turno:cerrar') ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    {tienePermiso('turno:cerrar') ? 'Cierre de Turno' : 'Cierre Inhabilitado (Sin Permiso)'}
                  </button>
                )}

                {/* Botón Exportar a Excel */}
                <button
                  onClick={handleExportarExcel}
                  disabled={exportandoExcel}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
                  title="Exportar la Bitácora y Datos Relevantes a un archivo Excel (.xlsx)"
                >
                  <FileSpreadsheet className={`w-4 h-4 text-emerald-400 ${exportandoExcel ? 'animate-bounce' : ''}`} />
                  {exportandoExcel ? 'Generando Excel...' : 'Exportar a Excel (Datos Relevantes)'}
                </button>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">No hay un turno abierto actualmente.</div>
            )}
          </div>

          {/* Formulario Agregar Registro */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-400" />
                Nuevo Registro de Bitácora
              </h3>
              {!tienePermiso('bitacora:crear') && (
                <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Sin Permiso
                </span>
              )}
            </div>

            <form onSubmit={handleCrearEvento} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Título del Evento:</label>
                <input 
                  type="text" 
                  value={nuevoTitulo} 
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  placeholder="Ej: Cambio de Bomba B-101 / Despacho CEN"
                  disabled={!tienePermiso('bitacora:crear')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Categoría:</label>
                  <select 
                    value={nuevaCategoria} 
                    onChange={(e) => setNuevaCategoria(e.target.value)}
                    disabled={!tienePermiso('bitacora:crear')}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="OPERATIVO">OPERATIVO</option>
                    <option value="NOVEDAD">NOVEDAD</option>
                    <option value="ALARMA">ALARMA</option>
                    <option value="INSTRUCCION_CEN">INSTRUCCIÓN CEN</option>
                    <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Prioridad:</label>
                  <select 
                    value={nuevaPrioridad} 
                    onChange={(e) => setNuevaPrioridad(e.target.value)}
                    disabled={!tienePermiso('bitacora:crear')}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="BAJA">BAJA</option>
                    <option value="MEDIA">MEDIA</option>
                    <option value="ALTA">ALTA</option>
                    <option value="CRITICA">CRÍTICA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Equipo Afectado (Opcional):</label>
                <input 
                  type="text" 
                  value={nuevoEquipo} 
                  onChange={(e) => setNuevoEquipo(e.target.value)}
                  placeholder="Ej: Turbina GT-1, Bomba B-101"
                  disabled={!tienePermiso('bitacora:crear')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Detalle de la Operación:</label>
                <textarea 
                  value={nuevaDescripcion} 
                  onChange={(e) => setNuevaDescripcion(e.target.value)}
                  rows="3"
                  placeholder="Escriba las observaciones operativas..."
                  disabled={!tienePermiso('bitacora:crear')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={!tienePermiso('bitacora:crear') || guardandoEvento}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                  tienePermiso('bitacora:crear')
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                {guardandoEvento ? 'Guardando en BBDD...' : 'Agregar Evento a Bitácora'}
              </button>
            </form>
          </div>

        </div>

        {/* COLUMNA DERECHA: TIMELINE DE EVENTOS DE BITÁCORA */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Header de Filtros */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <h2 className="font-bold text-sm text-slate-100">Eventos de Bitácora ({eventosFiltrados.length})</h2>
            </div>

            <div className="flex items-center gap-3">
              <select 
                value={filtroCategoria} 
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
              >
                <option value="TODOS">Todas las Categorías</option>
                <option value="OPERATIVO">OPERATIVO</option>
                <option value="NOVEDAD">NOVEDAD</option>
                <option value="ALARMA">ALARMA</option>
                <option value="INSTRUCCION_CEN">INSTRUCCIÓN CEN</option>
              </select>

              <select 
                value={filtroPrioridad} 
                onChange={(e) => setFiltroPrioridad(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
              >
                <option value="TODAS">Todas las Prioridades</option>
                <option value="CRITICA">CRÍTICA</option>
                <option value="ALTA">ALTA</option>
                <option value="MEDIA">MEDIA</option>
                <option value="BAJA">BAJA</option>
              </select>

              {/* Botón Exportar a Excel */}
              <button
                onClick={handleExportarExcel}
                disabled={exportandoExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer hover:scale-[1.02]"
                title="Exportar Bitácora y Datos Relevantes a Excel"
              >
                <FileSpreadsheet className={`w-4 h-4 text-emerald-400 ${exportandoExcel ? 'animate-bounce' : ''}`} />
                <span>{exportandoExcel ? 'Generando...' : 'Exportar a Excel'}</span>
              </button>
            </div>
          </div>

          {/* Lista de Eventos (Timeline) con mapeo seguro defensivo */}
          <div className="space-y-3">
            {(turnoActual?.eventos || []).length > 0 ? (
              (turnoActual?.eventos || []).map((evento, index) => {
                const esCritica = evento.prioridad === 'CRITICA';
                const esAlta = evento.prioridad === 'ALTA';
                return (
                  <div 
                    key={evento.id || index}
                    className={`bg-slate-900/90 border rounded-2xl p-4.5 transition-all hover:border-slate-700 ${
                      esCritica 
                        ? 'border-red-500/40 bg-red-950/10' 
                        : esAlta 
                          ? 'border-amber-500/40 bg-amber-950/10' 
                          : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                          esCritica 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                            : esAlta 
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                              : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                        }`}>
                          {evento.prioridad || 'NORMAL'}
                        </span>
                        {evento.categoria && (
                          <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            {evento.categoria}
                          </span>
                        )}
                        {evento.equipo_afectado && (
                          <span className="text-xs font-mono text-indigo-300 bg-indigo-950/40 border border-indigo-800/40 px-2 py-0.5 rounded">
                            ⚙️ {evento.equipo_afectado}
                          </span>
                        )}
                      </div>

                      {evento.fecha_hora && (
                        <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {evento.fecha_hora}
                        </span>
                      )}
                    </div>

                    {evento.titulo && <h4 className="font-bold text-sm text-slate-100 mb-1">{evento.titulo}</h4>}
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line mb-3">{evento.descripcion}</p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
                      <span className="flex items-center gap-1 text-slate-400 font-medium">
                        <UserCheck className="w-3.5 h-3.5 text-blue-400" /> Registrado por: <strong className="text-slate-200">{evento.registrado_por || 'Sistema'}</strong>
                      </span>
                      <span className="font-mono text-slate-600">ID #{evento.id || index + 1}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
                No hay eventos registrados en este turno.
              </div>
            )}
          </div>

        </div>

      </main>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL / DRAWER: EDITAR PERMISOS EN CALIENTE                         */}
      {/* ------------------------------------------------------------------- */}
      {mostrarDrawerPermisos && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col p-6 shadow-2xl overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-slate-100">Permisos en Caliente (Admin)</h3>
              </div>
              <button 
                onClick={() => setMostrarDrawerPermisos(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Modifica los permisos de cualquier usuario en tiempo real. Los cambios se guardan en la base de datos SQL e incrementan la versión global para refresco instantáneo en la UI.
            </p>

            <div className="space-y-6 flex-1">
              {usuarios.map(u => (
                <div key={u.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div>
                      <div className="font-bold text-xs text-slate-200">{u.nombre}</div>
                      <div className="text-[10px] text-indigo-400 font-medium">{u.rol_nombre || 'Sin Rol'} • {u.email}</div>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">ID #{u.id}</span>
                  </div>

                  <div className="space-y-2">
                    {catalogoPermisos.map(p => {
                      // Comprobar si este usuario tiene este permiso
                      const tiene = permisosEfectivos.includes(p.codigo) && usuarioActual?.id === u.id;
                      return (
                        <div key={p.codigo} className="flex items-center justify-between text-xs py-1">
                          <div>
                            <span className="font-mono text-slate-300 font-semibold">{p.codigo}</span>
                            <span className="block text-[10px] text-slate-500">{p.descripcion}</span>
                          </div>

                          <button
                            onClick={() => togglePermisoEnCaliente(u.id, p.codigo, tiene)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              tiene 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40' 
                                : 'bg-slate-800 text-slate-500 border border-slate-700 hover:bg-emerald-500/20 hover:text-emerald-300'
                            }`}
                          >
                            {tiene ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            {tiene ? 'Concedido' : 'Revocado'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setMostrarDrawerPermisos(false)}
              className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl"
            >
              Cerrar Panel
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: CIERRE DE TURNO                                              */}
      {/* ------------------------------------------------------------------- */}
      {mostrarModalCierre && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
              <Unlock className="w-5 h-5 text-amber-400" />
              Entrega y Cierre del Turno #{turnoActivo?.folio}
            </h3>

            <p className="text-xs text-slate-400">
              Confirme el resumen de la operación antes de cerrar el turno. Esta acción cambiará el estado del turno a CERRADO en la base de datos SQL.
            </p>

            <div>
              <label className="text-xs text-slate-300 mb-1 block">Resumen Operativo de la Entrega:</label>
              <textarea 
                value={resumenCierre}
                onChange={(e) => setResumenCierre(e.target.value)}
                rows="3"
                placeholder="Resumen de generación, novedades relevantes..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 mb-1 block">Observaciones para el Siguiente Turno:</label>
              <input 
                type="text"
                value={observacionesCierre}
                onChange={(e) => setObservacionesCierre(e.target.value)}
                placeholder="Ej: Mantener atención en bomba B-101"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCerrarTurno}
                disabled={cerrandoTurno}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-bold text-xs rounded-xl shadow-lg"
              >
                {cerrandoTurno ? 'Cerrando...' : 'Confirmar Cierre de Turno'}
              </button>
              <button
                onClick={() => setMostrarModalCierre(false)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {demoBarra}
    </div>
  );
}
