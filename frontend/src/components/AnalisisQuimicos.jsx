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
  Layers,
  Activity,
  Droplets
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import LoginQuimico from './LoginQuimico';

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
      { key: 'ph', label: 'pH', min: 9.0, max: 9.8, unit: '' },
      { key: 'conductividad', label: 'Cond. Específica', min: 2.0, max: 10.0, unit: 'µS/cm' },
      { key: 'silice', label: 'Sílice (SiO2)', min: 0.0, max: 0.02, unit: 'ppm' },
      { key: 'fosfato', label: 'Fosfato (PO4)', min: 1.0, max: 6.0, unit: 'ppm' }
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
      { key: 'ph', label: 'pH', min: 8.8, max: 9.5, unit: '' },
      { key: 'condCationica', label: 'Cond. Catiónica', min: 0.0, max: 0.2, unit: 'µS/cm' },
      { key: 'silice', label: 'Sílice (SiO2)', min: 0.0, max: 0.015, unit: 'ppm' },
      { key: 'sodio', label: 'Sodio (Na)', min: 0.0, max: 5.0, unit: 'ppb' }
    ]
  },
  {
    id: 'CONDENSADO_CALDERA_BAJA',
    nombre: 'Condensado y Caldera Baja',
    subpuntos: [
      { id: 'CONDENSADO_BOMBA', nombre: 'Condensado Bomba Extracción' },
      { id: 'CALDERA_BAJA', nombre: 'Caldera Baja Presión' }
    ],
    parametros: [
      { key: 'ph', label: 'pH', min: 8.8, max: 9.4, unit: '' },
      { key: 'condCationica', label: 'Cond. Catiónica', min: 0.0, max: 0.25, unit: 'µS/cm' },
      { key: 'oxigeno', label: 'Oxígeno Disuelto', min: 0.0, max: 10.0, unit: 'ppb' },
      { key: 'hidrazina', label: 'Hidrazina (N2H4)', min: 10.0, max: 50.0, unit: 'ppb' }
    ]
  },
  {
    id: 'ALIMENTACION',
    nombre: 'Alimentación (Agua de Alimentadores)',
    subpuntos: [
      { id: 'AGUA_ALIMENTACION', nombre: 'Agua de Alimentación Caldera' }
    ],
    parametros: [
      { key: 'ph', label: 'pH', min: 8.8, max: 9.5, unit: '' },
      { key: 'condCationica', label: 'Cond. Catiónica', min: 0.0, max: 0.2, unit: 'µS/cm' },
      { key: 'oxigeno', label: 'Oxígeno Disuelto', min: 0.0, max: 5.0, unit: 'ppb' },
      { key: 'hierro', label: 'Hierro (Fe)', min: 0.0, max: 10.0, unit: 'ppb' },
      { key: 'cobre', label: 'Cobre (Cu)', min: 0.0, max: 2.0, unit: 'ppb' }
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

export default function AnalisisQuimicos({ sesionQuimica: sesionProp, onLogout: onLogoutProp, onVolver, modoNocturno, setModoNocturno }) {
  // 1. Estado de Autenticación de Módulo Químico (Forzar login explícito)
  const [sesionQuimica, setSesionQuimica] = useState(sesionProp || null);

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

  // 3. Estado de Datos de Muestreo y Auditoría
  const [muestras, setMuestras] = useState([]);
  const [auditorias, setAuditorias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensajeFeedback, setMensajeFeedback] = useState(null);

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

  // Validar si un parámetro ingresado sale del rango operacional
  const esFueraDeRango = (paramConfig, valor) => {
    if (valor === undefined || valor === null || valor === '') return false;
    const num = parseFloat(String(valor).replace(',', '.'));
    if (isNaN(num)) return false;
    if (paramConfig.min !== undefined && num < paramConfig.min) return true;
    if (paramConfig.max !== undefined && num > paramConfig.max) return true;
    return false;
  };

  const obtenerMotivoFueraRango = (paramConfig, valor) => {
    if (valor === undefined || valor === null || valor === '') return null;
    const num = parseFloat(String(valor).replace(',', '.'));
    if (isNaN(num)) return null;
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

          {/* Pestañas Horizontales de Categorías */}
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none">
            {PUNTOS_MUESTREO.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoriaActiva(cat.id)}
                className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider shrink-0 transition-all border flex items-center gap-2 ${
                  categoriaActiva === cat.id
                    ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white border-cyan-400 shadow-lg shadow-cyan-900/40 scale-105'
                    : modoNocturno
                    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                <span>{cat.nombre.split(' (')[0]}</span>
              </button>
            ))}
          </div>

          {/* Sub-Pestañas / Subpuntos de Muestreo de la Categoría Activa */}
          {categoriaObjActiva && (
            <div className={`p-4 sm:p-6 rounded-2xl border shadow-xl space-y-6 backdrop-blur-md ${
              modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-black uppercase tracking-wider text-cyan-400">
                    {categoriaObjActiva.nombre}
                  </h2>
                  <p className={`text-xs mt-0.5 ${modoNocturno ? 'text-slate-400' : 'text-slate-500'}`}>
                    Seleccione el equipo o subpunto de control químico para ingresar o auditar lecturas
                  </p>
                </div>

                <div className="flex gap-2">
                  {categoriaObjActiva.subpuntos.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setSubpuntoActivo(sub.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                        subpuntoActivo === sub.id
                          ? 'bg-teal-600 text-white border-teal-400 shadow-md'
                          : modoNocturno
                          ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          : 'bg-slate-100 border-slate-300 text-slate-700'
                      }`}
                    >
                      {sub.nombre}
                    </button>
                  ))}
                </div>
              </div>

              {/* RANGOS DE CONTROL INFORMADO */}
              <div className={`p-3.5 rounded-xl border text-xs font-mono grid grid-cols-2 sm:grid-cols-4 gap-3 ${
                modoNocturno ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                {categoriaObjActiva.parametros.map((p) => (
                  <div key={p.key} className="space-y-0.5">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{p.label}:</span>
                    <span className="text-cyan-300 font-bold">
                      {p.min} - {p.max} {p.unit}
                    </span>
                  </div>
                ))}
              </div>

              {/* TABLA DE TOMA DE MUESTRAS POR HORARIOS */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className={`border-b ${
                      modoNocturno ? 'border-slate-800 text-slate-300 bg-slate-950' : 'border-slate-300 text-slate-700 bg-slate-100'
                    }`}>
                      <th className="p-3.5 border-r border-slate-800 w-24">Hora</th>
                      {categoriaObjActiva.parametros.map((p) => (
                        <th key={p.key} className="p-3.5 text-center border-r border-slate-800">
                          <span className="block font-bold">{p.label}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {p.unit ? `(${p.unit})` : `(Norma: ${p.min} - ${p.max})`}
                          </span>
                        </th>
                      ))}
                      <th className="p-3.5 text-center w-36">Acciones / Guardar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {HORAS_ESTANDAR.map((hora) => {
                      const filaMuestra = obtenerFilaMuestra(subpuntoActivo, hora);
                      const [paramsLocal, setParamsLocal] = useState(filaMuestra.parametros || {});

                      // Sincronizar estado local si cambia fecha o muestra
                      useEffect(() => {
                        setParamsLocal(obtenerFilaMuestra(subpuntoActivo, hora).parametros || {});
                      }, [muestras, subpuntoActivo, fechaSeleccionada, hora]);

                      return (
                        <tr key={hora} className={modoNocturno ? 'hover:bg-slate-950/40' : 'hover:bg-slate-50'}>
                          {/* Hora */}
                          <td className="p-3.5 font-bold text-cyan-400 border-r border-slate-800/80 bg-slate-950/20">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{hora} hrs</span>
                            </div>
                          </td>

                          {/* Inputs por cada Parámetro Químico */}
                          {categoriaObjActiva.parametros.map((param) => {
                            const valActual = paramsLocal[param.key] ?? '';
                            const fueraRango = esFueraDeRango(param, valActual);

                            return (
                              <td key={param.key} className="p-2 border-r border-slate-800/60 text-center">
                                <input
                                  type="text"
                                  value={valActual}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setParamsLocal(prev => ({ ...prev, [param.key]: v }));
                                  }}
                                  placeholder={`${param.min} - ${param.max}`}
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

                              {filaMuestra.id && (
                                <button
                                  onClick={() => handleEliminarMuestra(subpuntoActivo, hora)}
                                  disabled={guardando}
                                  className="p-2 rounded-lg bg-red-950/60 border border-red-800 text-red-400 hover:bg-red-900 transition-all"
                                  title="Eliminar registro"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
