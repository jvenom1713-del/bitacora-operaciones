import React, { useState, useEffect, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { ArrowLeft, FileText, Zap, Layers, ShieldCheck, CheckCircle2, Edit3, Save, X, AlertTriangle, RefreshCw, BookOpen, Grid, Printer, Send, Lock, Unlock, ClipboardList, Clock } from 'lucide-react';

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
  equipoTurno = {}, 
  modoNocturno, 
  onVolverMenu,
  // Props compartidas con DashboardIniciarTurno
  textoBitacora = {},
  setTextoBitacora,
  matrizEquipos = [],
  setMatrizEquipos,
  parametrosGeneracion,
  setParametrosGeneracion,
  esJefeTurno = false
}) {
  const folioStr = turnoActivo?.folio || '2428-A';
  const fechaStr = turnoActivo?.fecha || '29-07-2026';

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
  const [instrucciones, setInstrucciones] = useState(
    '• Mantener presión en colector secundario por encima de 4.2 bar.\n• Verificar aislamiento en VTR G tras cada ciclo de arranque.\n• Coordinación constante con CEN ante variaciones de frecuencia en barra 220 kV.'
  );
  const [senalesForzadas, setSenalesForzadas] = useState(
    '• FCV094: Señal manual forzada por arreglo provisorio en actuador neumático.\n• VTR B: Interlock de disparo omitido por mantención de estructura.'
  );
  const [guardado, setGuardado] = useState(false);

  const [observacionesJefe, setObservacionesJefe] = useState('');
  const [enviandoCierre, setEnviandoCierre] = useState(false);
  const [estadoTurnoCierre, setEstadoTurnoCierre] = useState(turnoActivo?.estado || 'ABIERTO');
  const [mensajeCierre, setMensajeCierre] = useState(null);
  const [mostrarModalResumenOperativo, setMostrarModalResumenOperativo] = useState(false);

  const [datosGenLocal, setDatosGenLocal] = useState({
    costoMarginal: '40.3',
    potEspera: '5046',
    fuegosSuplemen: '0',
    hrsCargaBase: '2',
    hrsMinTec: '14'
  });

  const datosGen = (parametrosGeneracion && parametrosGeneracion.potEspera && parametrosGeneracion.potEspera !== '--')
    ? parametrosGeneracion
    : datosGenLocal;

  useEffect(() => {
    fetch('/api/resumen-generacion-diaria')
      .then(res => res.json())
      .then(data => {
        if (data && data.status !== 'error') {
          const actualizados = {
            costoMarginal: data.costoMarginal || '40.3',
            potEspera: data.potEspera || '5046',
            fuegosSuplemen: data.fuegosSuplemen || '0',
            hrsCargaBase: data.hrsCargaBase || '2',
            hrsMinTec: data.hrsMinTec || '14'
          };
          setDatosGenLocal(actualizados);
          if (setParametrosGeneracion) {
            setParametrosGeneracion(prev => ({ ...prev, ...actualizados }));
          }
        }
      })
      .catch(err => console.error("Error al cargar resumen generacion en consulta:", err));
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
    { codigo: 'VTR_A', nombre_equipo: 'Transformador VTR A', estado: 'En servicio' },
    { codigo: 'VTR_B', nombre_equipo: 'Transformador VTR B', estado: 'Indisponible' },
    { codigo: 'VTR_G', nombre_equipo: 'Transformador VTR G', estado: 'Limitado baja velocidad' },
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
                      <span style="font-size: 7.5px; font-weight: 700; color: #64748b;">TURNO DIURNO:</span>
                      <div style="font-family: monospace; font-size: 8.5px; color: #334155; white-space: pre-wrap; background: #ffffff; padding: 3px; border: 1px solid #e2e8f0; border-radius: 3px; margin-top: 1px; max-height: 45px; overflow: hidden;">
                        ${textos.nuevaRencaDia1 || 'Sin novedades.'}
                      </div>
                    </div>
                    <div>
                      <span style="font-size: 7.5px; font-weight: 700; color: #64748b;">TURNO NOCTURNO:</span>
                      <div style="font-family: monospace; font-size: 8.5px; color: #334155; white-space: pre-wrap; background: #ffffff; padding: 3px; border: 1px solid #e2e8f0; border-radius: 3px; margin-top: 1px; max-height: 45px; overflow: hidden;">
                        ${textos.nuevaRencaDia2 || 'Sin novedades.'}
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
                        ${textos.bop || 'Sin fragilidades.'}
                      </div>
                    </div>
                    <div>
                      <span style="font-size: 7.5px; font-weight: 700; color: #64748b;">TURBINA VAPOR:</span>
                      <div style="font-family: monospace; font-size: 8.5px; color: #334155; white-space: pre-wrap; background: #ffffff; padding: 3px; border: 1px solid #e2e8f0; border-radius: 3px; margin-top: 1px; max-height: 45px; overflow: hidden;">
                        ${textos.turbinaVapor || 'Sin fragilidades.'}
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
                      <span style="font-size: 7.5px; font-weight: 700; color: #64748b;">TURNO DIURNO:</span>
                      <div style="font-family: monospace; font-size: 8.5px; color: #334155; white-space: pre-wrap; background: #ffffff; padding: 3px; border: 1px solid #e2e8f0; border-radius: 3px; margin-top: 1px; max-height: 40px; overflow: hidden;">
                        ${textos.losVientosDia1 || 'Sin novedades.'}
                      </div>
                    </div>
                    <div>
                      <span style="font-size: 7.5px; font-weight: 700; color: #64748b;">TURNO NOCTURNO:</span>
                      <div style="font-family: monospace; font-size: 8.5px; color: #334155; white-space: pre-wrap; background: #ffffff; padding: 3px; border: 1px solid #e2e8f0; border-radius: 3px; margin-top: 1px; max-height: 40px; overflow: hidden;">
                        ${textos.losVientosDia2 || 'Sin novedades.'}
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
                      <span style="font-size: 7.5px; font-weight: 700; color: #64748b;">TURNO DIURNO:</span>
                      <div style="font-family: monospace; font-size: 8.5px; color: #334155; white-space: pre-wrap; background: #ffffff; padding: 3px; border: 1px solid #e2e8f0; border-radius: 3px; margin-top: 1px; max-height: 40px; overflow: hidden;">
                        ${textos.santaLidiaDia1 || 'Sin novedades.'}
                      </div>
                    </div>
                    <div>
                      <span style="font-size: 7.5px; font-weight: 700; color: #64748b;">TURNO NOCTURNO:</span>
                      <div style="font-family: monospace; font-size: 8.5px; color: #334155; white-space: pre-wrap; background: #ffffff; padding: 3px; border: 1px solid #e2e8f0; border-radius: 3px; margin-top: 1px; max-height: 40px; overflow: hidden;">
                        ${textos.santaLidiaDia2 || 'Sin novedades.'}
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
                  <th style="padding: 3px 5px; border: 1px solid #cbd5e1;">EQUIPO / SEÑAL</th>
                  <th style="padding: 3px 5px; border: 1px solid #cbd5e1;">CÓDIGO</th>
                  <th style="padding: 3px 5px; border: 1px solid #cbd5e1;">ESTADO</th>
                  <th style="padding: 3px 5px; border: 1px solid #cbd5e1;">DETALLE / OBSERVACIÓN</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 3px 5px; border: 1px solid #cbd5e1; font-weight: 700;">Bomba Agua Alimentación A</td>
                  <td style="padding: 3px 5px; border: 1px solid #cbd5e1; font-family: monospace;">B-101A</td>
                  <td style="padding: 3px 5px; border: 1px solid #cbd5e1;"><span style="background: #fef3c7; color: #d97706; padding: 1px 4px; border-radius: 3px; font-weight: 700;">En Observación</span></td>
                  <td style="padding: 3px 5px; border: 1px solid #cbd5e1;">RTD cojinete 3 en seguimiento (>85°C)</td>
                </tr>
                <tr>
                  <td style="padding: 3px 5px; border: 1px solid #cbd5e1; font-weight: 700;">Compresor Aire Servicio 2</td>
                  <td style="padding: 3px 5px; border: 1px solid #cbd5e1; font-family: monospace;">COMP-02</td>
                  <td style="padding: 3px 5px; border: 1px solid #cbd5e1;"><span style="background: #fee2e2; color: #dc2626; padding: 1px 4px; border-radius: 3px; font-weight: 700;">Falla</span></td>
                  <td style="padding: 3px 5px; border: 1px solid #cbd5e1;">Disparo por alta presión de descarga</td>
                </tr>
                <tr>
                  <td style="padding: 3px 5px; border: 1px solid #cbd5e1; font-weight: 700;">Lockout Falla Transf. (86T)</td>
                  <td style="padding: 3px 5px; border: 1px solid #cbd5e1; font-family: monospace;">L86TFOT</td>
                  <td style="padding: 3px 5px; border: 1px solid #cbd5e1;"><span style="background: #fee2e2; color: #dc2626; padding: 1px 4px; border-radius: 3px; font-weight: 700;">FORZADA</span></td>
                  <td style="padding: 3px 5px; border: 1px solid #cbd5e1;">Forzado preventivo por pruebas relé 86T</td>
                </tr>
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
                  <div style="font-size: 9.5px; font-weight: 800; color: #0f172a;">${equipoTurno?.jdt || 'Ariel Torres'}</div>
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

    if (passTrim !== '12345' && passTrim !== 'admin') {
      setErrorPasswordJefe('Contraseña incorrecta.');
      return;
    }

    setErrorPasswordJefe(null);
    setMostrarModalPasswordJefe(false);
    await handleAprobarYCerrarHoja(passTrim);
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

      const contenidoTexto = `
Central Nueva Renca - Hoja de Turno Consolidada
Folio: ${folioStr} | Fecha: ${fechaStr} | Turno: ${turnoBitacora}

1. RESUMEN DE GENERACIÓN DIARIA:
- Día 1: ${textos.nuevaRencaDia1}
- Día 2: ${textos.nuevaRencaDia2}

2. FRAGILIDADES OPERACIONALES:
BOP: ${textos.bop}
Turbina Vapor: ${textos.turbinaVapor}

3. INSTRUCCIONES OPERACIONALES ESPECIALES:
${instrucciones}

4. SEÑALES FORZADAS:
${senalesForzadas}
`;

      const res = await fetch('/api/turnos/aprobar', {
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
          cerrado_por_nombre: usuarioActual?.nombre || equipoTurno?.jdt || 'Norman Galaz (Jefe de Turno)'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Error al aprobar la bitácora');
      }

      setEstadoTurnoCierre('CERRADO');
      setMensajeCierre({ texto: data.mensaje || 'Bitácora aprobada y PDF guardado correctamente. Redirigiendo al Menú...', tipo: 'success' });
      setTimeout(() => {
        onVolverMenu();
      }, 1200);
    } catch (err) {
      setMensajeCierre({ texto: err.message, tipo: 'error' });
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
    if (!estado) return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    if (estado.includes('Indisponible')) return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (estado.includes('Limitado') || estado.includes('fragilidad')) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (estado.includes('mantención') || estado.includes('Fuera')) return 'bg-red-600/20 text-red-400 border-red-600/30';
    if (estado.includes('reserva')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  };

  return (
    <div className={`min-h-screen w-full flex flex-col font-sans transition-colors duration-300 ${
      modoNocturno ? 'bg-[#040d1a] text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>

      {/* BARRA SUPERIOR */}
      <header className={`sticky top-0 z-40 border-b shadow-lg backdrop-blur-md px-6 py-4 transition-colors ${
        modoNocturno ? 'bg-[#06162d]/95 border-blue-900/60' : 'bg-white/95 border-slate-300'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-orange-500 shrink-0" />
            <div>
              <h1 className="text-xl font-black text-orange-500 tracking-tight">GMETROPOLITANA</h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Hoja de Turno Consolidada • Fecha: {fechaStr}
              </p>
            </div>
          </div>

          {/* Badge Centrado CENTRAL NUEVA RENCA */}
          <div className="flex-1 flex justify-center px-2">
            <span className="text-sm sm:text-base md:text-lg px-4 py-1.5 rounded-xl bg-orange-600 text-white font-black uppercase tracking-wider shadow-md text-center">
              CENTRAL NUEVA RENCA
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Badge de Estado en la parte derecha */}
            {estadoTurnoCierre === 'CERRADO' ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/30 text-red-300 border border-red-500/60 text-xs font-black shadow-md">
                <Lock className="w-4 h-4 text-red-500 shrink-0" />
                <span>BITÁCORA CERRADA</span>
              </span>
            ) : estadoTurnoCierre === 'EN_REVISION' ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/30 text-red-300 border border-red-500/60 text-xs font-black shadow-md animate-pulse">
                <Lock className="w-4 h-4 text-red-500 shrink-0" />
                <span>EL JEFE DE TURNO ESTÁ EN REVISIÓN</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black shadow-md">
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
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 border border-blue-400/40 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Volver al Menú</span>
            </button>
          </div>
        </div>
      </header>

      {/* BANNER JDT */}
      {esJefeTurno && (
        <div className="bg-emerald-900/40 border-b border-emerald-700/40 px-6 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-emerald-300">
            <AlertTriangle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Jefe de Turno:</strong> Puede editar cualquier campo de esta hoja. Los cambios se sincronizan automáticamente con la bitácora del operador de sala de control.
            </span>
          </div>
        </div>
      )}

      <main id="hoja-turno-container" className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* TARJETA DOTACIÓN */}
        <div className={`rounded-xl border shadow-md overflow-hidden ${modoNocturno ? 'bg-[#091b33] border-blue-900/60' : 'bg-white border-slate-300'}`}>
          <div className="bg-gradient-to-r from-blue-800 to-blue-900 px-4 py-2 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between">
            <span>CENTRAL NUEVA RENCA — INFORMACIÓN DEL TURNO Y DOTACIÓN</span>
            <span className="font-mono text-[11px] text-cyan-300">FOLIO: {folioStr}</span>
          </div>
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-4 text-xs font-semibold text-center ${modoNocturno ? 'bg-slate-950/60' : 'bg-slate-50'}`}>
            {[
              { label: 'Rotación Guardia', value: equipoTurno?.rotacion || 'TIGRES', color: modoNocturno ? 'text-amber-400' : 'text-amber-700' },
              { label: 'Jefe de Turno (JDT)', value: equipoTurno?.jdt || 'Norman Galaz', color: modoNocturno ? 'text-slate-100' : 'text-slate-900' },
              { label: 'Operador Sala Control (OSC)', value: equipoTurno?.osc || 'Jorge Albornoz', color: modoNocturno ? 'text-slate-100' : 'text-slate-900' },
              { label: 'Operador Turno (OT)', value: equipoTurno?.ot || 'Matías Cisternas', color: modoNocturno ? 'text-slate-100' : 'text-slate-900' },
            ].map((item, i) => (
              <div key={i} className={`p-2.5 rounded-lg border ${modoNocturno ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <span className={`${modoNocturno ? 'text-slate-400' : 'text-slate-500'} block text-[10px] uppercase`}>{item.label}:</span>
                <strong className={`${item.color} font-black text-sm`}>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* ─── SECCIÓN 1: GENERACIÓN DIARIA ─────────────────────────── */}
        <div className={`rounded-xl border shadow-xl overflow-hidden ${modoNocturno ? 'bg-[#091b33] border-blue-900/60' : 'bg-white border-slate-300'}`}>
          <div className="bg-slate-800/90 px-4 py-3 border-b border-slate-700 font-extrabold text-sm text-white uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              1. RESUMEN DE GENERACIÓN DIARIA — CENTRAL NUEVA RENCA
            </span>
          </div>
          <div className={`p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs font-semibold ${modoNocturno ? 'bg-slate-950/60' : 'bg-slate-50'}`}>
            {[
              { label: 'Costo Marginal CEN', value: `${datosGen.costoMarginal} USD/MWh`, color: modoNocturno ? 'text-cyan-300' : 'text-cyan-800' },
              { label: 'Potencia Esperada', value: `${datosGen.potEspera} MW`, color: modoNocturno ? 'text-emerald-400' : 'text-emerald-800' },
              { label: 'Fuegos Suplementarios', value: `${datosGen.fuegosSuplemen} MW`, color: modoNocturno ? 'text-amber-400' : 'text-amber-800' },
              { label: 'Horas Carga Base', value: `${datosGen.hrsCargaBase} hrs`, color: modoNocturno ? 'text-slate-100' : 'text-slate-900' },
              { label: 'Mínimo Técnico', value: `${datosGen.hrsMinTec} hrs`, color: modoNocturno ? 'text-purple-300' : 'text-purple-900' },
            ].map((item, i) => (
              <div key={i} className={`p-3.5 rounded-xl border text-center ${modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <span className={`${modoNocturno ? 'text-slate-400' : 'text-slate-500'} block mb-1`}>{item.label}:</span>
                <strong className={`${item.color} text-base font-mono font-black`}>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* ─── SECCIÓN 2: BITÁCORA OPERACIONAL DEL TURNO ─────────────── */}
        <div className={`rounded-xl border shadow-xl overflow-hidden ${modoNocturno ? 'bg-[#091b33] border-blue-900/60' : 'bg-white border-slate-300'}`}>
          <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-blue-900 px-4 py-3 border-b border-blue-800 font-extrabold text-sm text-white uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              2. BITÁCORA DIARIA DEL TURNO OPERATIVO — NOVEDADES Y EVENTOS
            </span>
            <div className="flex items-center gap-2">
              {esJefeTurno && !editandoBitacora && (
                <button onClick={iniciarEditarBitacora}
                  className="text-xs px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 flex items-center gap-1 cursor-pointer transition-all">
                  <Edit3 className="w-3 h-3" /> Editar
                </button>
              )}
              {esJefeTurno && editandoBitacora && (
                <div className="flex gap-1">
                  <button onClick={guardarBitacora}
                    className="text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 cursor-pointer">
                    <Save className="w-3 h-3" /> Guardar
                  </button>
                  <button onClick={cancelarBitacora}
                    className="text-xs px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center gap-1 cursor-pointer">
                    <X className="w-3 h-3" /> Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={`p-5 space-y-4 ${modoNocturno ? 'bg-slate-950/60' : 'bg-slate-50'}`}>
            {/* Central Nueva Renca */}
            <div className={`p-4 rounded-xl space-y-2 border ${modoNocturno ? 'bg-slate-900/90 border-blue-900/40' : 'bg-white border-slate-200 shadow-sm'}`}>
              <span className={`font-bold block text-xs uppercase pb-1 flex items-center gap-2 border-b ${modoNocturno ? 'text-cyan-400 border-slate-800' : 'text-blue-900 border-slate-200'}`}>
                Central Nueva Renca — Día {new Date().getDate()}
              </span>
              {editandoBitacora ? (
                <RichTextEditorField
                  value={borradorBitacora.nuevaRencaDia1 ?? textos.nuevaRencaDia1}
                  onChange={val => setBorradorBitacora(prev => ({ ...prev, nuevaRencaDia1: val }))}
                  placeholder="Escriba aquí los eventos operacionales de Central Nueva Renca..."
                  className={modoNocturno ? 'border-blue-700/60 text-slate-100 bg-slate-950/80' : 'border-slate-300 text-slate-900 bg-white'}
                />
              ) : (
                <div
                  className={`font-sans leading-relaxed text-sm sm:text-base pt-1 font-normal whitespace-pre-line ${
                    modoNocturno ? 'text-slate-100 [&_b]:font-black [&_b]:text-amber-400 [&_div]:my-1' : 'text-slate-900 [&_b]:font-black [&_b]:text-blue-900 [&_div]:my-1'
                  }`}
                  dangerouslySetInnerHTML={{ __html: (textos.nuevaRencaDia1 || 'Sin novedades registradas para el turno operativo.').replace(/\n/g, '<br/>') }}
                />
              )}
            </div>
          </div>
        </div>

        {/* ─── SECCIÓN 3: FRAGILIDADES OPERACIONALES ─────────────────── */}
        <div className={`rounded-xl border shadow-xl overflow-hidden ${modoNocturno ? 'bg-[#091b33] border-blue-900/60' : 'bg-white border-slate-300'}`}>
          <div className="bg-amber-900/80 px-4 py-3 border-b border-amber-800 font-extrabold text-sm text-white uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              3. FRAGILIDADES OPERACIONALES (BOP & TURBINA VAPOR)
            </span>
            <div className="flex items-center gap-2">
              {esJefeTurno && !editandoFragilidades && (
                <button onClick={iniciarEditarBitacora}
                  className="text-xs px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 rounded-lg border border-amber-500/40 flex items-center gap-1 cursor-pointer transition-all">
                  <Edit3 className="w-3 h-3" /> Editar
                </button>
              )}
              {esJefeTurno && editandoFragilidades && (
                <div className="flex gap-1">
                  <button onClick={guardarBitacora}
                    className="text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 cursor-pointer">
                    <Save className="w-3 h-3" /> Guardar
                  </button>
                  <button onClick={cancelarBitacora}
                    className="text-xs px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center gap-1 cursor-pointer">
                    <X className="w-3 h-3" /> Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={`p-5 space-y-4 text-xs font-semibold ${modoNocturno ? 'bg-slate-950/60' : 'bg-slate-50'}`}>
            {/* BOP */}
            <div className={`p-4 rounded-xl space-y-2 border ${modoNocturno ? 'bg-slate-900/90 border-amber-900/40' : 'bg-white border-amber-200 shadow-sm'}`}>
              <span className={`font-bold block text-xs uppercase pb-1 border-b ${modoNocturno ? 'text-amber-400 border-slate-800' : 'text-amber-900 border-amber-200 font-extrabold'}`}>Sistemas Auxiliares BOP:</span>
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
            <div className={`p-4 rounded-xl space-y-2 border ${modoNocturno ? 'bg-slate-900/90 border-amber-900/40' : 'bg-white border-amber-200 shadow-sm'}`}>
              <span className={`font-bold block text-xs uppercase pb-1 border-b ${modoNocturno ? 'text-amber-400 border-slate-800' : 'text-amber-900 border-amber-200 font-extrabold'}`}>Turbina de Vapor (TV):</span>
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
        <div className={`rounded-xl border shadow-xl overflow-hidden ${modoNocturno ? 'bg-[#091b33] border-blue-900/60' : 'bg-white border-slate-300'}`}>
          <div className="bg-slate-800/90 px-4 py-3 border-b border-slate-700 font-extrabold text-sm text-white uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              4. INSTRUCCIONES OPERACIONALES ESPECIALES Y SEÑALES FORZADAS
            </span>
            <div className="flex items-center gap-2">
              {esJefeTurno && !editandoInstrucciones && (
                <button onClick={() => setEditandoInstrucciones(true)}
                  className="text-xs px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 rounded-lg border border-blue-500/40 flex items-center gap-1 cursor-pointer transition-all">
                  <Edit3 className="w-3 h-3" /> Editar
                </button>
              )}
              {esJefeTurno && editandoInstrucciones && (
                <div className="flex gap-1">
                  <button onClick={() => { setEditandoInstrucciones(false); mostrarGuardado(); }}
                    className="text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 cursor-pointer">
                    <Save className="w-3 h-3" /> Guardar
                  </button>
                  <button onClick={() => setEditandoInstrucciones(false)}
                    className="text-xs px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center gap-1 cursor-pointer">
                    <X className="w-3 h-3" /> Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={`p-5 space-y-4 text-xs font-semibold ${modoNocturno ? 'bg-slate-950/60' : 'bg-slate-50'}`}>
            <div className={`p-4 rounded-xl space-y-2 border ${modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-blue-200 shadow-sm'}`}>
              <strong className={`block text-xs uppercase pb-1.5 flex items-center gap-2 border-b ${modoNocturno ? 'text-cyan-400 border-slate-800' : 'text-blue-900 border-blue-200 font-extrabold'}`}>
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                Instrucciones Operacionales Especiales
              </strong>
              {editandoInstrucciones ? (
                <RichTextEditorField
                  value={instrucciones}
                  onChange={val => setInstrucciones(val)}
                  placeholder="Escriba aquí instrucciones operacionales..."
                  className={modoNocturno ? 'border-blue-700/60 text-slate-100 bg-slate-950/80' : 'border-slate-300 text-slate-900 bg-white'}
                />
              ) : (
                <div
                  className={`space-y-1.5 font-sans text-sm leading-relaxed pt-1 font-normal whitespace-pre-line ${
                    modoNocturno ? 'text-slate-100 [&_b]:font-black [&_b]:text-cyan-300 [&_div]:my-1' : 'text-slate-900 [&_b]:font-black [&_b]:text-blue-900 [&_div]:my-1'
                  }`}
                  dangerouslySetInnerHTML={{ __html: (instrucciones || 'Sin instrucciones.').replace(/\n/g, '<br/>') }}
                />
              )}
            </div>
            <div className={`p-4 rounded-xl space-y-2 border ${modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-amber-200 shadow-sm'}`}>
              <strong className={`block text-xs uppercase pb-1.5 flex items-center gap-2 border-b ${modoNocturno ? 'text-amber-400 border-slate-800' : 'text-amber-900 border-amber-200 font-extrabold'}`}>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Señales Forzadas y/o Manuales en Planta
              </strong>
              {editandoInstrucciones ? (
                <RichTextEditorField
                  value={senalesForzadas}
                  onChange={val => setSenalesForzadas(val)}
                  placeholder="Escriba aquí señales forzadas..."
                  className={modoNocturno ? 'border-amber-700/60 text-amber-200 bg-slate-950/80' : 'border-slate-300 text-slate-900 bg-white'}
                />
              ) : (
                <div
                  className={`space-y-1.5 font-sans text-sm leading-relaxed pt-1 font-normal whitespace-pre-line ${
                    modoNocturno ? 'text-amber-200 [&_b]:font-black [&_b]:text-amber-300 [&_div]:my-1' : 'text-slate-900 [&_b]:font-black [&_b]:text-amber-800 [&_div]:my-1'
                  }`}
                  dangerouslySetInnerHTML={{ __html: (senalesForzadas || 'Sin señales.').replace(/\n/g, '<br/>') }}
                />
              )}
            </div>
          </div>
        </div>

        {/* ─── SECCIÓN 5: MATRIZ DE EQUIPOS EN OPERACIÓN (EDITABLE JDT) ── */}
        <div className={`rounded-xl border shadow-xl overflow-hidden ${modoNocturno ? 'bg-[#091b33] border-blue-900/60' : 'bg-white border-slate-300'}`}>
          <div className="bg-slate-800/90 px-4 py-3 border-b border-slate-700 font-extrabold text-sm text-white uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-amber-400" />
              5. EQUIPOS CON INDISPONIBILIDAD — CENTRAL NUEVA RENCA
            </span>
            <div className="flex items-center gap-2">
              {esJefeTurno && !editandoEquipos && (
                <button onClick={iniciarEditarEquipos}
                  className="text-xs px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 rounded-lg border border-emerald-500/40 flex items-center gap-1 cursor-pointer transition-all">
                  <Edit3 className="w-3 h-3" /> Editar Estados
                </button>
              )}
              {esJefeTurno && editandoEquipos && (
                <div className="flex gap-1">
                  <button onClick={guardarEquipos}
                    className="text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 cursor-pointer">
                    <Save className="w-3 h-3" /> Guardar
                  </button>
                  <button onClick={cancelarEquipos}
                    className="text-xs px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center gap-1 cursor-pointer">
                    <X className="w-3 h-3" /> Cancelar
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
              /* Modo Vista — solo equipos con alguna indisponibilidad */
              (() => {
                const ESTADOS_NORMALES = ['En servicio', 'En reserva'];
                const equiposConProblema = equipos.filter(eq => !ESTADOS_NORMALES.includes(eq.estado));
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

        {/* SECCIÓN 6: CIERRE DE TURNO Y RESUMEN OPERATIVO */}
        <div className={`rounded-2xl p-6 shadow-xl space-y-6 border ${modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300'}`}>
          <div className={`flex items-center justify-between border-b pb-4 ${modoNocturno ? 'border-slate-800' : 'border-slate-200'}`}>
            <span className={`font-bold text-sm flex items-center gap-2 ${modoNocturno ? 'text-emerald-400' : 'text-emerald-800'}`}>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              6. FIRMA Y APROBACIÓN DE CIERRE DE TURNO
            </span>

            {/* Badge de Estado en el lado derecho */}
            <div className="flex items-center gap-2">
              {estadoTurnoCierre === 'CERRADO' ? (
                <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/30 text-red-300 border border-red-500/60 text-xs font-black shadow-md">
                  <Lock className="w-4 h-4 text-red-500 shrink-0" />
                  <span>BITÁCORA CERRADA</span>
                </span>
              ) : estadoTurnoCierre === 'EN_REVISION' ? (
                <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/30 text-red-300 border border-red-500/60 text-xs font-black shadow-md animate-pulse">
                  <Lock className="w-4 h-4 text-red-500 shrink-0" />
                  <span>EL JEFE DE TURNO ESTÁ EN REVISIÓN</span>
                </span>
              ) : (
                <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black shadow-md">
                  <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>BITÁCORA ABIERTA</span>
                </span>
              )}
            </div>
          </div>

          {/* BOTÓN PRINCIPAL EN CIERRE DE TURNO */}
          <div className="grid grid-cols-1 gap-4">
            {/* BOTÓN 1: Cierre de Turno */}
            <button
              onClick={handleAbrirModalPassword}
              disabled={enviandoCierre || estadoTurnoCierre === 'CERRADO' || estadoTurnoCierre === 'EN_REVISION'}
              className={`p-5 rounded-xl border transition-all shadow-xl flex items-center justify-center gap-3 ${
                estadoTurnoCierre === 'CERRADO'
                  ? 'bg-slate-800 text-emerald-400 border-emerald-700/60 cursor-not-allowed'
                  : estadoTurnoCierre === 'EN_REVISION'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/80 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/50 shadow-emerald-900/30 font-black cursor-pointer transform hover:scale-[1.02] active:scale-95'
              }`}
            >
              {estadoTurnoCierre === 'CERRADO' ? (
                <Lock className="w-5 h-5 text-emerald-400" />
              ) : estadoTurnoCierre === 'EN_REVISION' ? (
                <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
              ) : (
                <Send className="w-5 h-5 text-white" />
              )}
              <div className="text-left">
                <span className="block font-black text-sm uppercase">
                  {estadoTurnoCierre === 'CERRADO' ? '1. Bitácora Cerrada' : '1. Cierre de Turno'}
                </span>
                <span className="text-[11px] font-normal opacity-90">
                  {estadoTurnoCierre === 'CERRADO'
                    ? 'Bitácora aprobada y cerrada oficialmente'
                    : estadoTurnoCierre === 'EN_REVISION'
                      ? 'En revisión por el Jefe de Turno'
                      : 'Autorizar firma JDT y cerrar turno'}
                </span>
              </div>
            </button>
          </div>

          {estadoTurnoCierre === 'CERRADO' ? (
            <div className="bg-emerald-950/60 border border-emerald-700/50 p-4 rounded-xl text-emerald-200 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>BITÁCORA APROBADA Y CERRADA — El documento oficial en PDF ha sido almacenado correctamente.</span>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Cerrado por (Jefe de Turno Autorizante):</span>
                <span className="font-bold text-emerald-400 font-mono">{usuarioActual?.nombre || equipoTurno?.jdt || 'Norman Galaz (Jefe de Turno)'}</span>
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
          )}
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
                    <strong className="text-cyan-300 text-sm font-mono font-bold">{datosGen.costoMarginal} USD/MWh</strong>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Potencia Esperada</span>
                    <strong className="text-emerald-400 text-sm font-mono font-bold">{datosGen.potEspera} MW</strong>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Fuegos Suplementarios</span>
                    <strong className="text-amber-400 text-sm font-mono font-bold">{datosGen.fuegosSuplemen} MW</strong>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Horas Carga Base</span>
                    <strong className="text-slate-100 text-sm font-mono font-bold">{datosGen.hrsCargaBase} hrs</strong>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Mínimo Técnico</span>
                    <strong className="text-purple-300 text-sm font-mono font-bold">{datosGen.hrsMinTec} hrs</strong>
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

        {/* PIE DE PÁGINA */}
        <div className="pt-4 pb-8 border-t border-slate-800 text-xs text-slate-400">
          <span className="font-bold text-slate-300">Central Nueva Renca</span> • Documento Consolidado de Hoja de Turno
          {esJefeTurno && <span className="text-emerald-400 ml-2">• Los cambios persisten en la sesión activa</span>}
        </div>

      </main>
    </div>
  );
}
