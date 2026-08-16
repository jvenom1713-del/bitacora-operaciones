import React, { useState } from 'react';
import { Sun, Moon, ArrowLeft, Zap, Activity, ShieldCheck } from 'lucide-react';

export default function LoginPortada({ 
  usuarios = [], 
  usuarioActual, 
  setUsuarioActual, 
  onLogin, 
  onVolverPortal,
  modoNocturno, 
  setModoNocturno 
}) {
  const [email, setEmail] = useState(usuarioActual?.email || 'jalbornoz@generadora.cl');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  const calcularTurnoActual = () => {
    const hora = new Date().getHours();
    if (hora >= 8 && hora < 20) {
      return 'Turno Diurno';
    } else {
      return 'Turno Nocturno';
    }
  };

  const [turnoSeleccionado] = useState(calcularTurnoActual);

  const handleAccesoDirecto = (tipoRol) => {
    let userToUse;
    if (tipoRol === 'OPERADOR') {
      userToUse = usuarios.find(u => u.email?.toLowerCase()?.includes('albornoz') || u.rol_codigo === 'OPERADOR_SALA') || {
        id: 2,
        nombre: 'Jorge Albornoz',
        email: 'jalbornoz@generadora.cl',
        rol_codigo: 'OPERADOR_SALA',
        rol_nombre: 'Operador Sala de Control'
      };
    } else {
      userToUse = usuarios.find(u => u.email?.toLowerCase()?.includes('atorres') || u.rol_codigo === 'JEFE_TURNO') || {
        id: 1,
        nombre: 'Ariel Torres',
        email: 'atorres@generadora.cl',
        rol_codigo: 'JEFE_TURNO',
        rol_nombre: 'Jefe de Turno'
      };
    }
    setUsuarioActual(userToUse);
    onLogin(userToUse);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const emailTrim = email.trim().toLowerCase();
    const passTrim = password.trim();

    // 1. Buscar usuario en el catálogo de usuarios
    let userFound = usuarios.find(x => x.email.toLowerCase() === emailTrim);

    // Lista de correos de Jefes de Turno conocidos
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

    const esJefeOAdmin = (userFound && (userFound.rol_codigo === 'JEFE_TURNO' || userFound.rol_codigo === 'ADMIN')) ||
                         JEFES_EMAILS.includes(emailTrim);

    // 2. Validación estricta de contraseñas:
    // Jefes de Turno: 12345
    // Operadores Sala de Control: 1234
    if (esJefeOAdmin) {
      if (passTrim !== '12345') {
        setErrorMsg('Contraseña equivocada.');
        return;
      }
    } else {
      if (passTrim !== '1234') {
        setErrorMsg('Contraseña equivocada.');
        return;
      }
    }

    // 3. Asignar usuario seleccionado o generar perfil dinámico corporativo
    const userToUse = userFound || {
      id: Date.now(),
      nombre: emailTrim.split('@')[0].toUpperCase(),
      email: emailTrim,
      rol_codigo: esJefeOAdmin ? 'JEFE_TURNO' : 'OPERADOR_SALA',
      rol_nombre: esJefeOAdmin ? 'Jefe de Turno' : 'Operador Sala de Control'
    };

    setUsuarioActual(userToUse);
    onLogin(userToUse);
  };

  return (
    <div className={`relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 transition-colors duration-300 ${
      modoNocturno ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>

      {/* 1. Fondo de Planta Industrial con Superposición y Desenfoque */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
        style={{ backgroundImage: `url('/power_plant_bg.png')` }}
      />
      <div className={`absolute inset-0 backdrop-blur-sm transition-opacity duration-300 ${
        modoNocturno ? 'bg-slate-950/80' : 'bg-slate-900/40'
      }`} />

      {/* 2. Botón Flotante Superior Derecho para Modo Nocturno / Diurno */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={() => setModoNocturno(!modoNocturno)}
          title={modoNocturno ? "Cambiar a Modo Diurno" : "Cambiar a Modo Nocturno (Cuidar la vista)"}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border backdrop-blur-md transition-all duration-200 transform hover:scale-105 ${
            modoNocturno
              ? 'bg-slate-800/90 border-slate-700 text-amber-400 hover:bg-slate-800 hover:border-amber-400/50'
              : 'bg-white/90 border-slate-200 text-slate-700 hover:bg-white hover:text-amber-600'
          }`}
        >
          {modoNocturno ? (
            <>
              <Sun className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-slate-200">Modo Diurno</span>
            </>
          ) : (
            <>
              <Moon className="w-5 h-5 fill-slate-700 text-slate-700" />
              <span className="text-xs font-bold text-slate-700">Modo Nocturno</span>
            </>
          )}
        </button>
      </div>

      {/* 3. Tarjeta de Login Centrada (Split Card) */}
      <div className={`relative z-10 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border flex flex-col md:flex-row transition-all duration-300 ${
        modoNocturno 
          ? 'bg-slate-900/95 border-slate-800 shadow-black/60' 
          : 'bg-white/95 border-slate-200 shadow-2xl'
      }`}>
        
        {/* === PANEL IZQUIERDO: Azul Corporativo GMETROPOLITANA === */}
        <div className="md:w-1/2 bg-gradient-to-br from-[#0a2540] via-[#0e3b68] to-[#082038] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          
          {/* Formas Abstractas de Fondo */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-60 h-60 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            {/* BRAND LOGO - GMETROPOLITANA EN MAYÚSCULAS EN NARANJA */}
            <div className="mb-6">
              <h1 className="text-3xl font-black tracking-tight text-orange-500 leading-none">
                <span className="text-white">G</span>METROPOLITANA
              </h1>
            </div>

            {/* Subtítulos */}
            <div className="space-y-1 pl-1 border-l-2 border-orange-500/60">
              <p className="text-sm font-semibold text-blue-100">
                Plataforma Operativa
              </p>
              <p className="text-xs text-blue-300/80 font-medium">
                Administración de Bitácoras GM
              </p>
            </div>
          </div>

          {/* Tarjeta Inferior de Turno Asignado */}
          <div className="mt-12 relative z-10">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-4 shadow-inner">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200 block mb-2 text-center">
                Turno Asignado
              </span>
              <div className="flex items-center justify-center gap-2 bg-blue-950/60 border border-blue-400/30 px-4 py-2 rounded-lg text-xs font-semibold text-blue-100">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{turnoSeleccionado}</span>
              </div>
            </div>
          </div>
        </div>

        {/* === PANEL DERECHO: Formulario de Ingreso === */}
        <div className={`md:w-1/2 p-8 sm:p-10 flex flex-col justify-center transition-colors duration-300 ${
          modoNocturno ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'
        }`}>
          
          <div className="mb-5">
            <h2 className={`text-2xl font-bold tracking-tight mb-1 ${
              modoNocturno ? 'text-white' : 'text-slate-900'
            }`}>
              Ingreso a Bitácora
            </h2>
            <p className={`text-xs ${
              modoNocturno ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Seleccione un acceso directo sin credenciales o ingrese con su cuenta
            </p>
          </div>

          {/* --- SECCIÓN INGRESOS SIN CREDENCIALES --- */}
          <div className="mb-5 p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/40 shadow-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Ingreso Sin Credenciales
              </span>
              <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/90 px-2 py-0.5 rounded-full border border-emerald-500/40">
                1-Clic
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAccesoDirecto('OPERADOR')}
                className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transform hover:scale-[1.02]"
              >
                <Activity className="w-4 h-4 text-emerald-200" />
                <div className="flex flex-col text-left">
                  <span className="leading-tight">Sala de Control</span>
                  <span className="text-[9.5px] font-normal text-emerald-200">Operador</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAccesoDirecto('JEFE')}
                className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transform hover:scale-[1.02]"
              >
                <ShieldCheck className="w-4 h-4 text-blue-200" />
                <div className="flex flex-col text-left">
                  <span className="leading-tight">Jefe de Turno</span>
                  <span className="text-[9.5px] font-normal text-blue-200">Supervisión</span>
                </div>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-ping" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Campo Correo Corporativo */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${
                modoNocturno ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Correo Corporativo
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@generadora.cl"
                  className={`w-full text-sm rounded-xl px-3.5 py-2.5 border transition-all focus:outline-none focus:ring-2 ${
                    modoNocturno
                      ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-500 focus:ring-orange-500/40 focus:border-orange-500'
                      : 'bg-slate-50/80 border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-orange-500/40 focus:border-orange-500'
                  }`}
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${
                modoNocturno ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full text-sm rounded-xl px-3.5 py-2.5 border transition-all focus:outline-none focus:ring-2 ${
                    modoNocturno
                      ? 'bg-slate-800/90 border-slate-700 text-white focus:ring-orange-500/40 focus:border-orange-500'
                      : 'bg-slate-50/80 border-slate-200 text-slate-900 focus:ring-orange-500/40 focus:border-orange-500'
                  }`}
                />
              </div>
            </div>

            {/* Botón Principal Iniciar Sesión (Naranja Corporativo) */}
            <button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-[#ea580c] to-[#d97706] hover:from-[#d97706] hover:to-[#ea580c] text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-orange-600/30 hover:shadow-orange-600/50 transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] text-sm"
            >
              Iniciar Sesión Bitácora
            </button>
          </form>

          {/* Enlace Discreto: Volver al Portal Principal */}
          <div className="mt-6 pt-4 border-t border-slate-700/40 text-center">
            <button
              type="button"
              onClick={onVolverPortal}
              className={`inline-flex items-center gap-2 text-xs font-bold transition-all hover:underline ${
                modoNocturno ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al portal principal</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
