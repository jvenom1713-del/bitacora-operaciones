import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  Calendar, 
  Clock, 
  Save, 
  Trash2, 
  RefreshCw, 
  History, 
  Shield, 
  LogOut, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Layers,
  Activity,
  Droplets
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import LoginQuimico from './LoginQuimico';
import GraficosTendenciaModal from './GraficosTendenciaModal';

// =======================================================
// CONFIGURACIÓN DE PUNTOS Y RANGOS OPERACIONALES DE CONTROL QUÍMICO
// =======================================================
const PUNTOS_MUESTREO = [
  {
    id: 'DOMOS',
    nombre: 'Domos (Alta y Media Presión)',
    subpuntos: [
      { id: 'DOMO_ALTA', nombre: 'Domo Alta Presión' },
      { id: 'DOMO_MEDIA', nombre: 'Domo Media Presión' }
    ],
    parametros: [
      { key: 'ph', label: 'pH', min: 9.0, max: 9.8, textRango: '9,0 - 9,8' },
      { key: 'fosfato', label: 'PO4', min: 0.2, max: 10.0, unit: 'ppm', textRango: '0,2 - 10 ppm' },
      { key: 'conductividad', label: 'Cond', maxStrict: 150.0, unit: 'uS/cm', textRango: '< 150 uS/cm' },
      { key: 'silice', label: 'Silice', maxStrict: 1.0, unit: 'ppm', textRango: '< 1 ppm' },
      { key: 'dureza', label: 'Dureza', maxStrict: 0.0, unit: 'ppm', textRango: '0 ppm' },
      { key: 'hierro', label: 'Hierro', maxStrict: 0.02, unit: 'ppm', textRango: '< 0,02 ppm' }
    ]
  },
  {
    id: 'VAPOR',
    nombre: 'Vapor (S/C Alta, Sat Alta, Sat Media, Sat Baja)',
    subpuntos: [
      { id: 'VAPOR_SC_ALTA', nombre: 'Vapor Sobrecalentado Alta' },
      { id: 'VAPOR_SAT_ALTA', nombre: 'Vapor Saturado Alta' },
      { id: 'VAPOR_SAT_MEDIA', nombre: 'Vapor Saturado Media' },
      { id: 'VAPOR_SAT_BAJA', nombre: 'Vapor Saturado Baja' }
    ],
    parametros: [
      { key: 'ph', label: 'pH', min: 8.8, max: 9.5, unit: '', textRango: '8,8 - 9,5' },
      { key: 'conductividad', label: 'Conductividad', maxStrict: 20.0, unit: 'µS/cm', textRango: '< 20 µS/cm' },
      { key: 'silice', label: 'Sílice (SiO2)', maxStrict: 20.0, unit: 'ppb', textRango: '< 20 ppb' },
      { key: 'sodio', label: 'Dureza (Na)', maxStrict: 0.0, unit: 'ppb', textRango: '0 ppb' }
    ]
  },
  {
    id: 'CONDENSADO',
    nombre: 'Condensado',
    subpuntos: [
      { id: 'CONDENSADO', nombre: 'Condensado Bomba Extracción' }
    ],
    parametros: [
      { key: 'ph', label: 'pH', min: 8.8, max: 9.4, textRango: '8,8 - 9,4' },
      { key: 'conductividad', label: 'Conductividad', maxStrict: 20.0, unit: 'uS/cm', textRango: '< 20 uS/cm' },
      { key: 'amoniaco', label: 'Amoniaco', maxStrict: 0.5, unit: 'ppm', textRango: '< 0,5 ppm' },
      { key: 'dureza', label: 'Dureza', maxStrict: 0.0, unit: 'ppm', textRango: '0 ppm' },
      { key: 'dosisAminaBps', label: 'Dosis Amina BPS', textRango: '-' }
    ]
  },
  {
    id: 'ALIMENTACION',
    nombre: 'Agua de Alimentación',
    subpuntos: [
      { id: 'AGUA_ALIMENTACION', nombre: 'Agua de Alimentación' }
    ],
    parametros: [
      { key: 'ph', label: 'pH', min: 8.8, max: 9.4, textRango: '8,8 - 9,4' },
      { key: 'conductividad', label: 'Conductividad', maxStrict: 20.0, unit: 'uS/cm', textRango: '< 20 uS/cm' },
      { key: 'oxigeno', label: 'Oxigeno (O2)', maxStrict: 20.0, unit: 'ppb', textRango: '< 20 ppb' },
      { key: 'cobre', label: 'Cobre', maxStrict: 2.0, unit: 'ppb', textRango: '< 2 ppb' },
      { key: 'hierro', label: 'Hierro', maxStrict: 0.02, unit: 'ppm', textRango: '< 0,02 ppm' }
    ]
  },
  {
    id: 'PLANTAS_AGUA',
    nombre: 'Plantas de Agua (Desmineralizada, Vigaflow, Veolia)',
    subpuntos: [
      { id: 'PLANTA_DESMI', nombre: 'Planta Desmineralizada' },
      { id: 'PLANTA_VIGAFLOW', nombre: 'Planta Vigaflow' },
      { id: 'PLANTA_VEOLIA', nombre: 'Planta Veolia' }
    ],
    parametros: [
      { key: 'conductividad', label: 'Conductividad', min: 0.0, max: 0.1, unit: 'µS/cm' },
      { key: 'silice', label: 'Sílice (SiO2)', min: 0.0, max: 0.01, unit: 'ppm' },
      { key: 'dureza', label: 'Dureza Total', min: 0.0, max: 0.5, unit: 'ppm' },
      { key: 'cloruros', label: 'Cloruros (Cl-)', min: 0.0, max: 1.0, unit: 'ppm' }
    ]
  },
  {
    id: 'CIRCULACION_CLORACION',
    nombre: 'Circulación y Cloración',
    subpuntos: [
      { id: 'AGUA_CIRCULACION', nombre: 'Agua de Circulación Torre' },
      { id: 'CLORACION', nombre: 'Sistema de Cloración / Hipoclorito' }
    ],
    parametros: [
      { key: 'ph', label: 'pH', min: 7.2, max: 8.2, unit: '' },
      { key: 'cloroLibre', label: 'Cloro Libre (Cl2)', min: 0.2, max: 1.0, unit: 'ppm' },
      { key: 'turbidez', label: 'Turbidez', min: 0.0, max: 5.0, unit: 'NTU' },
      { key: 'conductividad', label: 'Conductividad', min: 0.0, max: 1500.0, unit: 'µS/cm' }
    ]
  }
];

const HORAS_ESTANDAR = ['10:00', '16:00', '22:00', '05:00'];

const IMAGENES_CARRUSEL = [
  {
    url: '/quimica1.jpg',
    titulo: 'Laboratorio de Control Químico',
    subtitulo: 'Monitoreo continuo de parámetros de agua y vapor en ciclo térmico HRSG'
  },
  {
    url: '/quimica2.jpg',
    titulo: 'Análisis de Domos & Agua de Alimentación',
    subtitulo: 'Verificación periódica de pH, conductividad catiónica y sílice'
  },
  {
    url: '/quimica3.jpg',
    titulo: 'Plantas de Agua Desmineralizada y Servicios',
    subtitulo: 'Aseguramiento de agua ultrapura con tecnología Vigaflow y Veolia'
  }
];

// =======================================================
// COMPONENTE FilaMuestraRow DE RENDERIZADO SEGURO
// Previene crash de React Rules of Hooks en filas dinámicas
// =======================================================
function FilaMuestraRow({
  filaObj,
  subpuntoActivo,
  fechaSeleccionada,
  categoriaObjActiva,
  modoNocturno,
  obtenerFilaMuestra,
  esFueraDeRango,
  obtenerMotivoFueraRango,
  handleGuardarMuestra,
  handleEliminarFilaRow,
  handleCambiarHoraFilaExtra,
  onParamChange,
  guardando
}) {
  const hora = filaObj.hora || '';
  const filaMuestra = obtenerFilaMuestra(subpuntoActivo, hora);
  const [paramsLocal, setParamsLocal] = useState(() => filaMuestra.parametros || {});

  useEffect(() => {
    setParamsLocal(obtenerFilaMuestra(subpuntoActivo, hora).parametros || {});
  }, [subpuntoActivo, fechaSeleccionada, hora]);

  const isDeletable = Boolean(filaObj.isDeletable || !filaObj.esDefault);

  return (
    <tr className={modoNocturno ? 'hover:bg-slate-950/40' : 'hover:bg-slate-50'}>
      {/* Hora */}
      <td className="p-3.5 font-bold text-cyan-400 border-r border-slate-800/80 bg-slate-950/20 w-24">
        {!isDeletable ? (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{hora} hrs</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <input
              type="time"
              value={hora || ''}
              onChange={(e) => handleCambiarHoraFilaExtra(subpuntoActivo, hora, e.target.value)}
              className="w-20 px-1.5 py-1 bg-slate-950 text-cyan-300 font-mono font-bold text-xs border border-slate-700 rounded text-center focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-tight">Extra</span>
          </div>
        )}
      </td>

      {/* Inputs por cada Parámetro Químico con valores controlados seguros */}
      {categoriaObjActiva.parametros.map((param) => {
        const esDurezaOHierro = (param.key === 'dureza' || param.key === 'hierro');
        const esSiliceDomoMedia = (subpuntoActivo === 'DOMO_MEDIA' && param.key === 'silice');
        const esSiliceVaporSC = (subpuntoActivo === 'VAPOR_SC_ALTA' && param.key === 'silice');
        const deshabilitadoEnEsteHorario = (esDurezaOHierro || esSiliceDomoMedia || esSiliceVaporSC) && hora !== '10:00';

        if (deshabilitadoEnEsteHorario) {
          return (
            <td key={param.key} className="p-2 border-r border-slate-800/60 text-center w-28 min-w-[110px]">
              <div 
                className="w-full py-2 px-2 rounded-lg border border-slate-800/30 bg-slate-950/50 text-slate-600 font-mono font-bold text-xs select-none cursor-not-allowed flex items-center justify-center"
                title={`${param.label} solo se mide a las 10:00 hrs`}
              >
                -
              </div>
            </td>
          );
        }

        const valRaw = paramsLocal[param.key];
        const valActual = valRaw !== undefined && valRaw !== null ? String(valRaw) : '';
        const fueraRango = esFueraDeRango(param, valActual);

        return (
          <td key={param.key} className="p-2 border-r border-slate-800/60 text-center w-28 min-w-[110px]">
            <input
              type="text"
              value={valActual || ''}
              onChange={(e) => {
                const v = e.target.value;
                setParamsLocal(prev => {
                  const updated = { ...prev, [param.key]: v };
                  if (onParamChange) onParamChange(subpuntoActivo, hora, updated);
                  return updated;
                });
              }}
              placeholder=""
              className={`w-full text-center px-2 py-2 rounded-lg border font-mono font-bold text-xs transition-all focus:outline-none focus:ring-2 ${
                fueraRango
                  ? 'bg-red-950/80 border-red-500 text-red-300 font-extrabold focus:ring-red-500 animate-pulse'
                  : modoNocturno
                  ? 'bg-slate-950 border-slate-800 text-emerald-300 focus:ring-cyan-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:ring-cyan-500'
              }`}
            />
            {fueraRango && (
              <span className="text-[9px] font-bold text-red-400 block mt-0.5 whitespace-nowrap">
                {obtenerMotivoFueraRango(param, valActual)}
              </span>
            )}
          </td>
        );
      })}

      {/* Acciones CRUD */}
      <td className="p-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handleGuardarMuestra(subpuntoActivo, hora, paramsLocal)}
            disabled={guardando}
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-all cursor-pointer"
            title="Guardar Muestra y Auditar en Supabase"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Guardar</span>
          </button>

          {isDeletable ? (
            <button
              onClick={() => handleEliminarFilaRow(subpuntoActivo, filaObj)}
              disabled={guardando}
              className="p-2 rounded-lg bg-red-950/60 border border-red-800 text-red-400 hover:bg-red-900 transition-all cursor-pointer shrink-0"
              title="Eliminar esta fila extra"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="w-8 shrink-0" />
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AnalisisQuimicos({ sesionQuimica: sesionProp, onLogout: onLogoutProp, onVolver, modoNocturno, setModoNocturno }) {
  // 1. Estado de Autenticación de Módulo Químico (Soporte Modo Demo y Persistencia)
  const [sesionQuimica, setSesionQuimica] = useState(() => {
    if (sesionProp) return sesionProp;
    try {
      const saved = localStorage.getItem('sesion_modulo_quimico');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (sesionProp) {
      setSesionQuimica(sesionProp);
    }
  }, [sesionProp]);

  // Estado para Carrusel Automático de Fotos Químicas
  const [imgCarruselIdx, setImgCarruselIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setImgCarruselIdx((prev) => (prev + 1) % IMAGENES_CARRUSEL.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // 2. Estado de Navegación del Módulo
  const [categoriaActiva, setCategoriaActiva] = useState('DOMOS');
  const [subpuntoActivo, setSubpuntoActivo] = useState('DOMO_ALTA');
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [mostrarAuditoria, setMostrarAuditoria] = useState(false);
  const [modalGraficoAbierto, setModalGraficoAbierto] = useState(false);

  // 3. Estado de Datos de Muestreo y Auditoría
  const [muestras, setMuestras] = useState([]);
  const [auditorias, setAuditorias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensajeFeedback, setMensajeFeedback] = useState(null);

  // 3.5. Estado de Filas Dinámicas e Inmutabilidad por Subpunto
  const HORAS_DEFECTO = ['10:00', '16:00', '22:00', '05:00'];
  const [filasExtra, setFilasExtra] = useState({});

  // Map de subpuntos activos por cada categoría en la vista continua
  const [subpuntosActivosMap, setSubpuntosActivosMap] = useState({
    DOMOS: 'DOMO_ALTA',
    VAPOR: 'VAPOR_SC_ALTA',
    CONDENSADO: 'CONDENSADO',
    ALIMENTACION: 'AGUA_ALIMENTACION',
    PLANTAS_AGUA: 'PLANTA_DESMI',
    CIRCULACION_CLORACION: 'AGUA_CIRCULACION'
  });

  // Rastrear borradores no guardados para el Botón Maestro
  const [paramsBorrador, setParamsBorrador] = useState({});
  const [subpuntoParaGrafico, setSubpuntoParaGrafico] = useState('DOMO_ALTA');
  const [catParaGrafico, setCatParaGrafico] = useState(PUNTOS_MUESTREO[0]);

  const handleParamChange = (subpuntoId, hora, paramsObj) => {
    const key = `${subpuntoId}_${hora}`;
    setParamsBorrador(prev => ({
      ...prev,
      [key]: { subpuntoId, hora, paramsObj }
    }));
  };

  // Guardar Todos los Análisis (Planilla Completa)
  const handleGuardarTodo = async () => {
    setGuardando(true);
    setMensajeFeedback(null);

    const keys = Object.keys(paramsBorrador);

    // Recopilar todos los datos presentes en los borradores y muestras locales
    const registrosGuardar = [];
    const timestamp = new Date().toISOString();

    if (keys.length > 0) {
      for (const k of keys) {
        const { subpuntoId, hora, paramsObj } = paramsBorrador[k];
        const tieneDatos = Object.values(paramsObj).some(v => v !== undefined && v !== null && String(v).trim() !== '');
        if (!tieneDatos) continue;

        const muestraExistente = muestras.find(m => m.punto_muestreo === subpuntoId && m.hora === hora);

        registrosGuardar.push({
          id: muestraExistente?.id || undefined,
          fecha: fechaSeleccionada,
          hora: hora,
          punto_muestreo: subpuntoId,
          parametros: paramsObj,
          usuario_email: sesionQuimica.email,
          rol: sesionQuimica.rol,
          created_at: timestamp
        });
      }
    }

    if (registrosGuardar.length === 0) {
      setMensajeFeedback({
        tipo: 'info',
        texto: 'Por favor ingrese o modifique algún valor en las tablas antes de guardar la planilla.'
      });
      setGuardando(false);
      return;
    }

    if (supabase) {
      try {
        const { error: errSave } = await supabase
          .from('analisis_quimicos')
          .upsert(registrosGuardar, { onConflict: 'id' });

        if (!errSave) {
          await supabase.from('auditoria_quimica').insert([{
            timestamp: timestamp,
            usuario_email: sesionQuimica.email,
            rol: sesionQuimica.rol,
            accion: 'INGRESO_MASIVO',
            punto_muestreo: 'PLANILLA_COMPLETA',
            detalle: {
              fecha: fechaSeleccionada,
              cantidad_registros: registrosGuardar.length
            }
          }]);
        }
      } catch (e) {
        console.warn('Error guardando en Supabase:', e);
      }
    }

    const copiaMuestras = [...muestras];
    registrosGuardar.forEach(reg => {
      const idx = copiaMuestras.findIndex(m => m.punto_muestreo === reg.punto_muestreo && m.hora === reg.hora);
      if (idx >= 0) {
        copiaMuestras[idx] = { ...copiaMuestras[idx], parametros: reg.parametros };
      } else {
        copiaMuestras.push(reg);
      }
    });

    setMuestras(copiaMuestras);

    try {
      localStorage.setItem(`quimica_muestras_${fechaSeleccionada}`, JSON.stringify(copiaMuestras));
    } catch (_) {}

    setMensajeFeedback({
      tipo: 'success',
      texto: `✅ Planilla Completa Guardada Exitosamente: Se procesaron y auditaron ${registrosGuardar.length} muestra(s).`
    });
    setGuardando(false);
    cargarAuditoria();
  };

  const obtenerFilasSubpunto = (subpuntoId) => {
    const base = HORAS_DEFECTO.map(h => ({
      id: `default_${subpuntoId}_${h}`,
      hora: h,
      esDefault: true,
      isDeletable: false
    }));

    const muestrasSub = muestras.filter(m => m.punto_muestreo === subpuntoId);
    const horasGuardadasExtra = muestrasSub
      .map(m => m.hora)
      .filter(h => !HORAS_DEFECTO.includes(h));

    const extrasLocales = (filasExtra[subpuntoId] || []);

    const extrasNormalizadas = extrasLocales.map(item => {
      if (typeof item === 'string') {
        return {
          id: `extra_${subpuntoId}_${item}`,
          hora: item,
          esDefault: false,
          isDeletable: true
        };
      }
      return {
        ...item,
        esDefault: false,
        isDeletable: true
      };
    });

    horasGuardadasExtra.forEach(h => {
      if (!extrasNormalizadas.some(e => e.hora === h)) {
        extrasNormalizadas.push({
          id: `saved_${subpuntoId}_${h}`,
          hora: h,
          esDefault: false,
          isDeletable: true
        });
      }
    });

    return [...base, ...extrasNormalizadas];
  };

  // Agregar una nueva fila extra inmutable usando crypto.randomUUID() o timestamp
  const handleAgregarFilaExtra = (subpuntoId) => {
    const ahora = new Date();
    const horaStr = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `extra_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const nuevaFilaObj = {
      id: uuid,
      hora: horaStr,
      isDeletable: true,
      esDefault: false
    };

    setFilasExtra(prev => {
      const listActual = prev[subpuntoId] || [];
      return {
        ...prev,
        [subpuntoId]: [...listActual, nuevaFilaObj]
      };
    });
  };

  const handleCambiarHoraFilaExtra = (subpuntoId, horaVieja, horaNueva) => {
    if (!horaNueva) return;
    setFilasExtra(prev => {
      const listActual = prev[subpuntoId] || [];
      const nuevaLista = listActual.map(item => {
        if (typeof item === 'object' && (item.hora === horaVieja || item.id === horaVieja)) {
          return { ...item, hora: horaNueva };
        }
        if (typeof item === 'string' && item === horaVieja) {
          return { id: `extra_${Date.now()}`, hora: horaNueva, isDeletable: true, esDefault: false };
        }
        return item;
      });
      return { ...prev, [subpuntoId]: nuevaLista };
    });
  };

  const handleEliminarFilaRow = async (subpuntoId, filaObj) => {
    if (filaObj.esDefault || !filaObj.isDeletable) {
      alert('Las filas por defecto (10:00, 16:00, 22:00, 05:00) son obligatorias y no se pueden eliminar.');
      return;
    }

    const horaStr = filaObj.hora;
    const muestra = muestras.find(m => m.punto_muestreo === subpuntoId && m.hora === horaStr);

    if (muestra) {
      await handleEliminarMuestra(subpuntoId, horaStr);
    }

    setFilasExtra(prev => {
      const listActual = prev[subpuntoId] || [];
      const filtrada = listActual.filter(item => {
        if (typeof item === 'object') return item.id !== filaObj.id && item.hora !== horaStr;
        return item !== horaStr;
      });
      return { ...prev, [subpuntoId]: filtrada };
    });
  };

  // 4. Carga Inicial de Datos desde Supabase / LocalStorage
  useEffect(() => {
    if (sesionQuimica) {
      cargarMuestras();
      cargarAuditoria();
    }
  }, [sesionQuimica, fechaSeleccionada]);

  // Actualizar subpunto activo cuando cambia la categoría
  useEffect(() => {
    const catObj = PUNTOS_MUESTREO.find(p => p.id === categoriaActiva);
    if (catObj && catObj.subpuntos.length > 0) {
      setSubpuntoActivo(catObj.subpuntos[0].id);
    }
  }, [categoriaActiva]);

  // Cargar Muestras desde Supabase
  const cargarMuestras = async () => {
    setCargando(true);
    let datosCargados = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('analisis_quimicos')
          .select('*')
          .eq('fecha', fechaSeleccionada)
          .order('hora', { ascending: true });

        if (!error && data) {
          datosCargados = data;
        }
      } catch (err) {
        console.warn('Advertencia Supabase:', err);
      }
    }

    // Respaldar / Cargar en LocalStorage si falla Supabase o sin datos
    if (!datosCargados || datosCargados.length === 0) {
      try {
        const saved = localStorage.getItem(`quimica_muestras_${fechaSeleccionada}`);
        if (saved) datosCargados = JSON.parse(saved);
      } catch (_) {}
    }

    setMuestras(datosCargados || []);
    setCargando(false);
  };

  // Cargar Auditoría desde Supabase
  const cargarAuditoria = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('auditoria_quimica')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (!error && data) {
        setAuditorias(data);
      }
    } catch (_) {}
  };

  // Logout del módulo químico
  const handleLogoutQuimico = () => {
    localStorage.removeItem('sesion_modulo_quimico');
    setSesionQuimica(null);
    if (onLogoutProp) onLogoutProp();
  };

  // Validar si un parámetro ingresado sale del rango operacional estricto
  const esFueraDeRango = (paramConfig, valor) => {
    if (valor === undefined || valor === null || valor === '') return false;
    const num = parseFloat(String(valor).replace(',', '.'));
    if (isNaN(num)) return false;

    // Regla Específica Hierro: Alerta SOLO si es estrictamente mayor a 0.02 (> 0.02)
    if (paramConfig.key === 'hierro') {
      return num > 0.02;
    }

    // Validación por límites máximos estrictos (>= o >)
    if (paramConfig.maxStrict !== undefined) {
      if (paramConfig.maxStrict === 0 && num > 0) return true;
      if (paramConfig.maxStrict > 0 && num >= paramConfig.maxStrict) return true;
    }

    if (paramConfig.min !== undefined && num < paramConfig.min) return true;
    if (paramConfig.max !== undefined && num > paramConfig.max) return true;
    return false;
  };

  const obtenerMotivoFueraRango = (paramConfig, valor) => {
    if (valor === undefined || valor === null || valor === '') return null;
    const num = parseFloat(String(valor).replace(',', '.'));
    if (isNaN(num)) return null;

    if (paramConfig.key === 'hierro' && num > 0.02) {
      return `⚠️ Sobre norma (> 0,02)`;
    }

    if (paramConfig.maxStrict !== undefined) {
      if (paramConfig.maxStrict === 0 && num > 0) return `⚠️ Fuera de norma (> 0)`;
      if (paramConfig.maxStrict > 0 && num >= paramConfig.maxStrict) return `⚠️ Fuera de norma (≥ ${paramConfig.maxStrict})`;
    }

    if (paramConfig.min !== undefined && num < paramConfig.min) return `⚠️ Bajo norma (< ${paramConfig.min})`;
    if (paramConfig.max !== undefined && num > paramConfig.max) return `⚠️ Sobre norma (> ${paramConfig.max})`;
    return null;
  };

  // Obtener la fila de muestra para un punto y hora específicos
  const obtenerFilaMuestra = (subpuntoId, hora) => {
    return muestras.find(m => m.punto_muestreo === subpuntoId && m.hora === hora) || {
      fecha: fechaSeleccionada,
      hora: hora,
      punto_muestreo: subpuntoId,
      parametros: {}
    };
  };

  // Guardar o Actualizar una muestra ejecutando auditoría paralela en Supabase
  const handleGuardarMuestra = async (subpuntoId, hora, nuevosParametros) => {
    setGuardando(true);
    setMensajeFeedback(null);

    const muestraExistente = muestras.find(m => m.punto_muestreo === subpuntoId && m.hora === hora);
    const esEdicion = Boolean(muestraExistente && muestraExistente.id);

    const registroMuestra = {
      id: muestraExistente?.id || undefined,
      fecha: fechaSeleccionada,
      hora: hora,
      punto_muestreo: subpuntoId,
      parametros: nuevosParametros,
      usuario_email: sesionQuimica.email,
      rol: sesionQuimica.rol,
      created_at: new Date().toISOString()
    };

    let guardadoExitoso = false;

    if (supabase) {
      try {
        // 1. Guardar en analisis_quimicos
        const { data: dataSave, error: errSave } = await supabase
          .from('analisis_quimicos')
          .upsert([registroMuestra], { onConflict: 'id' })
          .select();

        if (!errSave) {
          // 2. Insertar registro de auditoría paralela
          await supabase.from('auditoria_quimica').insert([{
            timestamp: new Date().toISOString(),
            usuario_email: sesionQuimica.email,
            rol: sesionQuimica.rol,
            accion: esEdicion ? 'EDICION' : 'INGRESO',
            punto_muestreo: subpuntoId,
            detalle: {
              fecha: fechaSeleccionada,
              hora: hora,
              parametros: nuevosParametros
            }
          }]);
          guardadoExitoso = true;
        }
      } catch (e) {
        console.warn('Error guardando en Supabase:', e);
      }
    }

    // Actualizar estado local
    const copiaMuestras = [...muestras];
    const idx = copiaMuestras.findIndex(m => m.punto_muestreo === subpuntoId && m.hora === hora);
    if (idx >= 0) {
      copiaMuestras[idx] = { ...copiaMuestras[idx], parametros: nuevosParametros };
    } else {
      copiaMuestras.push(registroMuestra);
    }
    setMuestras(copiaMuestras);

    // Guardar copia local en LocalStorage
    try {
      localStorage.setItem(`quimica_muestras_${fechaSeleccionada}`, JSON.stringify(copiaMuestras));
    } catch (_) {}

    setMensajeFeedback({
      tipo: 'success',
      texto: `Muestra (${subpuntoId} - ${hora}) guardada correctamente y auditada.`
    });
    setGuardando(false);

    // Recargar tabla de auditorías
    cargarAuditoria();
  };

  // Eliminar una muestra con auditoría paralela
  const handleEliminarMuestra = async (subpuntoId, hora) => {
    const muestra = muestras.find(m => m.punto_muestreo === subpuntoId && m.hora === hora);
    if (!muestra) return;

    if (!window.confirm(`¿Está seguro de eliminar la muestra de ${subpuntoId} de las ${hora}?`)) return;

    setGuardando(true);

    if (supabase && muestra.id) {
      try {
        await supabase.from('analisis_quimicos').delete().eq('id', muestra.id);
        await supabase.from('auditoria_quimica').insert([{
          timestamp: new Date().toISOString(),
          usuario_email: sesionQuimica.email,
          rol: sesionQuimica.rol,
          accion: 'BORRADO',
          punto_muestreo: subpuntoId,
          detalle: { id: muestra.id, fecha: fechaSeleccionada, hora: hora }
        }]);
      } catch (e) {}
    }

    const filtradas = muestras.filter(m => !(m.punto_muestreo === subpuntoId && m.hora === hora));
    setMuestras(filtradas);
    try {
      localStorage.setItem(`quimica_muestras_${fechaSeleccionada}`, JSON.stringify(filtradas));
    } catch (_) {}

    setMensajeFeedback({ tipo: 'success', texto: 'Registro eliminado y auditado correctamente.' });
    setGuardando(false);
    cargarAuditoria();
  };

  // Si no hay sesión autenticada, renderizar LoginQuimico
  if (!sesionQuimica) {
    return <LoginQuimico onLoginExitoso={(s) => setSesionQuimica(s)} onVolver={onVolver} modoNocturno={modoNocturno} />;
  }

  const categoriaObjActiva = PUNTOS_MUESTREO.find(p => p.id === categoriaActiva);

  return (
    <div className={`min-h-screen p-3 sm:p-6 transition-colors duration-300 font-sans ${
      modoNocturno ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* 1. ENCABEZADO SUPERIOR Y NAVEGACIÓN */}
      <div className="max-w-7xl mx-auto space-y-4 mb-6">
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-xl flex flex-wrap items-center justify-between gap-4 backdrop-blur-md ${
          modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {/* Título e Icono */}
          <div className="flex items-center gap-3">
            <button
              onClick={onVolver}
              className={`p-2.5 rounded-xl border transition-all ${
                modoNocturno ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
              title="Volver a Bitácora Principal"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-3 bg-gradient-to-tr from-cyan-600 to-teal-600 rounded-xl shadow-md">
              <FlaskConical className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                Análisis Químicos & Control de Agua
              </h1>
              <p className={`text-xs font-semibold ${modoNocturno ? 'text-slate-400' : 'text-slate-500'}`}>
                Central Nueva Renca — Trazabilidad y Auditoría Técnica
              </p>
            </div>
          </div>

          {/* Badge de Sesión y Acciones */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className={`px-3 py-2 rounded-xl border flex items-center gap-2 font-mono ${
              modoNocturno ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="font-bold">{sesionQuimica.email}</span>
              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                sesionQuimica.rol === 'Químico' 
                  ? 'bg-purple-900/80 text-purple-200 border border-purple-700' 
                  : sesionQuimica.rol === 'Veolia' 
                  ? 'bg-blue-900/80 text-blue-200 border border-blue-700'
                  : 'bg-emerald-900/80 text-emerald-200 border border-emerald-700'
              }`}>
                {sesionQuimica.rol}
              </span>
            </div>

            <button
              onClick={() => setModalGraficoAbierto(true)}
              className="px-3.5 py-2 rounded-xl font-bold border border-cyan-400/50 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-lg shadow-cyan-900/40 transition-all flex items-center gap-1.5 cursor-pointer transform hover:scale-[1.02]"
              title="Visualizar gráfico de tendencias históricas de hasta 1 Año"
            >
              <TrendingUp className="w-4 h-4 text-white animate-pulse" />
              <span>Ver Tendencias 📈</span>
            </button>

            <button
              onClick={() => setMostrarAuditoria(!mostrarAuditoria)}
              className={`px-3.5 py-2 rounded-xl font-bold border transition-all flex items-center gap-1.5 ${
                mostrarAuditoria
                  ? 'bg-cyan-600 text-white border-cyan-500 shadow-md'
                  : modoNocturno
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Auditoría</span>
            </button>

            <button
              onClick={handleLogoutQuimico}
              className="p-2 rounded-xl border border-red-800/60 bg-red-950/40 text-red-400 hover:bg-red-900/60 transition-all"
              title="Cerrar Sesión Química"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alerta de Feedback */}
        {mensajeFeedback && (
          <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 shadow-md ${
            mensajeFeedback.tipo === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
              : 'bg-red-950/80 border-red-700 text-red-300'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{mensajeFeedback.texto}</span>
            </div>
            <button onClick={() => setMensajeFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Selector de Fecha */}
        <div className={`p-3.5 rounded-xl border shadow-sm flex flex-wrap items-center justify-between gap-3 ${
          modoNocturno ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Fecha de Muestreo:</span>
            <input
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                modoNocturno ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <button
            onClick={() => { cargarMuestras(); cargarAuditoria(); }}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all ${
              modoNocturno ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
            <span>Refrescar Datos</span>
          </button>
        </div>
      </div>

      {/* 2. MODAL O PANE DE AUDITORÍA / TRAZABILIDAD */}
      {mostrarAuditoria ? (
        <div className="max-w-7xl mx-auto mb-6">
          <div className={`p-5 rounded-2xl border shadow-xl space-y-4 ${
            modoNocturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-black uppercase tracking-wider flex items-center gap-2 text-cyan-400">
                <History className="w-5 h-5 text-cyan-400" />
                Registro de Auditoría y Trazabilidad (Últimos 50 Eventos)
              </h2>
              <button
                onClick={() => setMostrarAuditoria(false)}
                className="text-xs font-bold px-3 py-1 bg-slate-800 rounded-lg text-slate-300 hover:text-white"
              >
                Cerrar Auditoría
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className={`border-b ${modoNocturno ? 'border-slate-800 text-slate-400 bg-slate-950/60' : 'border-slate-300 text-slate-600 bg-slate-100'}`}>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Usuario</th>
                    <th className="p-3">Rol</th>
                    <th className="p-3">Acción</th>
                    <th className="p-3">Punto Muestreo</th>
                    <th className="p-3">Detalle JSON</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {auditorias.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-500">No hay registros de auditoría aún.</td>
                    </tr>
                  ) : (
                    auditorias.map((aud) => (
                      <tr key={aud.id} className={modoNocturno ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                        <td className="p-3 font-semibold text-slate-300">{new Date(aud.timestamp).toLocaleString()}</td>
                        <td className="p-3 text-cyan-300 font-bold">{aud.usuario_email}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            aud.rol === 'Químico' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-teal-950 text-teal-300 border border-teal-800'
                          }`}>
                            {aud.rol}
                          </span>
                        </td>
                        <td className="p-3 font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            aud.accion === 'INGRESO' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            aud.accion === 'EDICION' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                            'bg-red-950 text-red-300 border border-red-800'
                          }`}>
                            {aud.accion}
                          </span>
                        </td>
                        <td className="p-3 text-slate-200 font-bold">{aud.punto_muestreo}</td>
                        <td className="p-3 text-[11px] text-slate-400 max-w-xs truncate">{JSON.stringify(aud.detalle)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* 3. VISTA PRINCIPAL POR PESTAÑAS DE CATEGORÍA QUÍMICA */
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* BANNER DINÁMICO CON CARRUSEL ANIMADO DE FOTOS */}
          <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl group">
            {/* Imágenes con transición suave de opacidad (Fade-in) */}
            {IMAGENES_CARRUSEL.map((img, idx) => (
              <div
                key={img.url}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  idx === imgCarruselIdx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.titulo}
                  className="w-full h-full object-cover transform scale-105 group-hover:scale-100 transition-transform duration-700"
                />
                {/* Capa negra semitransparente estilo bg-black/40 y gradiente corporativo */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-black/40" />
              </div>
            ))}

            {/* Contenido e información sobre la foto */}
            <div className="absolute bottom-0 left-0 right-0 p-5 z-20 flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-1 max-w-xl backdrop-blur-md bg-slate-950/60 p-3.5 rounded-xl border border-white/10 shadow-lg">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-[11px] uppercase tracking-widest">
                  <FlaskConical className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>Laboratorio & Control de Procesos Químicos</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white drop-shadow">
                  {IMAGENES_CARRUSEL[imgCarruselIdx].titulo}
                </h3>
                <p className="text-xs text-slate-300 font-medium">
                  {IMAGENES_CARRUSEL[imgCarruselIdx].subtitulo}
                </p>
              </div>

              {/* Controles de Navegación y Puntos del Carrusel */}
              <div className="flex items-center gap-3 z-20 backdrop-blur-md bg-slate-950/70 p-2 rounded-xl border border-white/15 shadow-md">
                <button
                  onClick={() => setImgCarruselIdx((prev) => (prev - 1 + IMAGENES_CARRUSEL.length) % IMAGENES_CARRUSEL.length)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  title="Imagen Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex gap-1.5">
                  {IMAGENES_CARRUSEL.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImgCarruselIdx(i)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        i === imgCarruselIdx ? 'w-6 bg-cyan-400' : 'w-2 bg-slate-600 hover:bg-slate-400'
                      }`}
                      title={`Ir a imagen ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setImgCarruselIdx((prev) => (prev + 1) % IMAGENES_CARRUSEL.length)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  title="Siguiente Imagen"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Botones de Navegación Rápida por Secciones (Scroll Suave) */}
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none sticky top-16 z-30 py-2 bg-slate-950/80 backdrop-blur-md rounded-xl border border-slate-800/80 px-2">
            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1 px-2 shrink-0">
              <Layers className="w-3.5 h-3.5" />
              <span>Vista Continua:</span>
            </span>
            {PUNTOS_MUESTREO.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  const el = document.getElementById(`sec_${cat.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs shrink-0 transition-all border flex items-center gap-1.5 cursor-pointer ${
                  modoNocturno
                    ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
                <span>{cat.nombre.split(' (')[0]}</span>
              </button>
            ))}
          </div>

          {/* VISTA CONTINUA: TODAS LAS SECCIONES DE PLANILLA APILADAS VERTICALMENTE */}
          <div className="space-y-8">
            {PUNTOS_MUESTREO.map((catObj) => {
              const subpuntoActivoEnCat = subpuntosActivosMap[catObj.id] || catObj.subpuntos[0].id;
              return (
                <div
                  id={`sec_${catObj.id}`}
                  key={catObj.id}
                  className={`p-4 sm:p-6 rounded-2xl border shadow-xl space-y-5 backdrop-blur-md transition-all ${
                    modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
                    <div>
                      <h2 className="text-base font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                        <FlaskConical className="w-5 h-5 text-teal-400" />
                        <span>{catObj.nombre}</span>
                      </h2>
                      <p className={`text-xs mt-0.5 ${modoNocturno ? 'text-slate-400' : 'text-slate-500'}`}>
                        Planilla de control químico continuo para {catObj.nombre}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {catObj.subpuntos.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setSubpuntosActivosMap(prev => ({ ...prev, [catObj.id]: sub.id }))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            subpuntoActivoEnCat === sub.id
                              ? 'bg-teal-600 text-white border-teal-400 shadow-md'
                              : modoNocturno
                              ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                              : 'bg-slate-100 border-slate-300 text-slate-700'
                          }`}
                        >
                          {sub.nombre}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          setSubpuntoParaGrafico(subpuntoActivoEnCat);
                          setCatParaGrafico(catObj);
                          setModalGraficoAbierto(true);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border border-cyan-400/50 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer ml-1"
                        title={`Ver gráfico de tendencia histórica de ${catObj.nombre}`}
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-white" />
                        <span>Ver Tendencias 📈</span>
                      </button>
                    </div>
                  </div>

                  {/* TABLA DE TOMA DE MUESTRAS POR HORARIOS */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className={`border-b ${
                          modoNocturno ? 'border-slate-800 text-slate-300 bg-slate-950' : 'border-slate-300 text-slate-700 bg-slate-100'
                        }`}>
                          <th className="p-3.5 border-r border-slate-800 w-24 shrink-0">Hora</th>
                          {catObj.parametros.map((p) => (
                            <th key={p.key} className="p-3.5 text-center border-r border-slate-800 w-28 min-w-[110px]">
                              <span className="block font-bold text-slate-100 text-xs">{p.label}</span>
                              <span className="text-[11px] text-amber-400 font-bold block mt-0.5">
                                {p.textRango || (p.unit ? `(${p.unit})` : `(Norma: ${p.min} - ${p.max})`)}
                              </span>
                            </th>
                          ))}
                          <th className="p-3.5 text-center w-36 shrink-0">Acciones / Guardar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {obtenerFilasSubpunto(subpuntoActivoEnCat).map((filaObj) => (
                          <FilaMuestraRow
                            key={filaObj.id || `${subpuntoActivoEnCat}_${filaObj.hora}`}
                            filaObj={filaObj}
                            subpuntoActivo={subpuntoActivoEnCat}
                            fechaSeleccionada={fechaSeleccionada}
                            categoriaObjActiva={catObj}
                            modoNocturno={modoNocturno}
                            obtenerFilaMuestra={obtenerFilaMuestra}
                            esFueraDeRango={esFueraDeRango}
                            obtenerMotivoFueraRango={obtenerMotivoFueraRango}
                            handleGuardarMuestra={handleGuardarMuestra}
                            handleEliminarFilaRow={handleEliminarFilaRow}
                            handleCambiarHoraFilaExtra={handleCambiarHoraFilaExtra}
                            onParamChange={handleParamChange}
                            guardando={guardando}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Botón "+ Agregar Análisis" Extra */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleAgregarFilaExtra(subpuntoActivoEnCat)}
                      className="px-4 py-2 rounded-xl border border-cyan-500/50 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer transform hover:scale-[1.01]"
                    >
                      <Plus className="w-4 h-4 text-cyan-400" />
                      <span>+ Agregar Análisis</span>
                    </button>

                    <span className="text-[11px] text-slate-400 font-mono">
                      Total análisis cargados: <strong className="text-white">{obtenerFilasSubpunto(subpuntoActivoEnCat).length}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* BARRA FLOTANTE MAESTRA: GUARDAR TODOS LOS ANÁLISIS AL FINAL DE LA PÁGINA */}
          <div className="sticky bottom-4 z-40 mt-8 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 border-2 border-cyan-500/60 shadow-2xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 animate-pulse">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Guardado Maestro de Planilla Completa</h3>
                <p className="text-xs text-cyan-300 font-mono">Guarda y audita todas las secciones de la planilla continua en 1 solo clic</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGuardarTodo}
              disabled={guardando}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-black text-sm uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-teal-900/50 transition-all cursor-pointer transform hover:scale-105"
            >
              <Save className="w-5 h-5" />
              <span>Guardar Todos los Análisis</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE GRÁFICOS DE TENDENCIA HISTÓRICA DE HASTA 1 AÑO */}
      <GraficosTendenciaModal
        isOpen={modalGraficoAbierto}
        onClose={() => setModalGraficoAbierto(false)}
        puntoMuestreoId={subpuntoParaGrafico}
        puntoNombre={catParaGrafico?.subpuntos?.find(s => s.id === subpuntoParaGrafico)?.nombre || catParaGrafico?.nombre || 'Control Químico'}
        parametrosDisponibles={catParaGrafico?.parametros || []}
        modoNocturno={modoNocturno}
      />
    </div>
  );
}
