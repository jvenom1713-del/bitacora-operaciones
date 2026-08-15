import React, { useState } from 'react';
import { FlaskConical, Lock, Mail, ShieldCheck, AlertCircle, ArrowLeft, Sun, Moon, Zap } from 'lucide-react';

export default function LoginQuimico({ onLoginExitoso, onVolver, modoNocturno, setModoNocturno }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleIngresoDemo = (rolDemo, emailDemo) => {
    const usuarioSesion = {
      email: emailDemo,
      rol: rolDemo,
      loginAt: new Date().toISOString()
    };

    try {
      localStorage.setItem('sesion_modulo_quimico', JSON.stringify(usuarioSesion));
    } catch (_) {}

    onLoginExitoso(usuarioSesion);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const emailTrim = email.trim();
    const passTrim = password.trim();

    if (!emailTrim) {
      setErrorMsg('Por favor ingrese su correo corporativo.');
      return;
    }

    // Lógica de validación estricta de roles por contraseña
    let rolAsignado = null;
    if (passTrim === '1234') {
      rolAsignado = 'Operador Terreno';
    } else if (passTrim === '12345') {
      rolAsignado = 'Químico';
    } else if (passTrim === '123456') {
      rolAsignado = 'Veolia';
    } else {
      setErrorMsg('Contraseña equivocada.');
      return;
    }

    const usuarioSesion = {
      email: emailTrim,
      rol: rolAsignado,
      loginAt: new Date().toISOString()
    };

    try {
      localStorage.setItem('sesion_modulo_quimico', JSON.stringify(usuarioSesion));
    } catch (_) {}

    onLoginExitoso(usuarioSesion);
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
      {setModoNocturno && (
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={() => setModoNocturno(!modoNocturno)}
            title={modoNocturno ? "Cambiar a Modo Diurno" : "Cambiar a Modo Nocturno"}
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
      )}

      {/* 3. Tarjeta de Login Dividida (Split Card Layout) */}
      <div className={`relative z-10 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border flex flex-col md:flex-row transition-all duration-300 ${
        modoNocturno 
          ? 'bg-slate-900/95 border-slate-800 shadow-black/60' 
          : 'bg-white/95 border-slate-200 shadow-2xl'
      }`}>
        
        {/* === PANEL IZQUIERDO: Azul-Cian Corporativo GMETROPOLITANA === */}
        <div className="md:w-1/2 bg-gradient-to-br from-[#061b2e] via-[#09354d] to-[#041321] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          
          {/* Formas Abstractas de Fondo */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            {/* BRAND LOGO */}
            <div className="mb-6 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-tr from-cyan-600 to-teal-600 rounded-xl shadow-md">
                <FlaskConical className="w-7 h-7 text-white animate-pulse" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-cyan-400 leading-none">
                <span className="text-white">G</span>METROPOLITANA
              </h1>
            </div>

            {/* Subtítulos */}
            <div className="space-y-1 pl-1 border-l-2 border-cyan-500/60">
              <p className="text-sm font-semibold text-cyan-100">
                Módulo de Análisis Químicos
              </p>
              <p className="text-xs text-cyan-300/80 font-medium">
                Control de Agua, Vapor y Trazabilidad por Roles
              </p>
            </div>
          </div>

          {/* Tarjeta Inferior Informativa de Roles */}
          <div className="mt-12 relative z-10">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-4 shadow-inner">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-200 block mb-2 text-center">
                Autenticación por Contraseña de Rol
              </span>
              <div className="space-y-1.5 text-xs font-mono text-cyan-100">
                <div className="flex justify-between border-b border-white/10 pb-1">
                  <span>Operador Terreno:</span>
                  <span className="font-bold text-cyan-300">1234</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-1">
                  <span>Químico:</span>
                  <span className="font-bold text-teal-300">12345</span>
                </div>
                <div className="flex justify-between">
                  <span>Veolia:</span>
                  <span className="font-bold text-emerald-300">123456</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === PANEL DERECHO: Formulario de Ingreso === */}
        <div className={`md:w-1/2 p-8 sm:p-10 flex flex-col justify-between transition-colors duration-300 ${
          modoNocturno ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'
        }`}>
          
          <div>
            <div className="mb-6">
              <h2 className={`text-2xl font-bold tracking-tight mb-1 ${
                modoNocturno ? 'text-white' : 'text-slate-900'
              }`}>
                Acceso Químicos
              </h2>
              <p className={`text-xs ${
                modoNocturno ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Ingrese su correo y la contraseña de su rol asignado
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
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
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@generadora.cl"
                    className={`w-full text-sm rounded-xl pl-10 pr-3.5 py-2.5 border transition-all focus:outline-none focus:ring-2 ${
                      modoNocturno
                        ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-500 focus:ring-cyan-500/40 focus:border-cyan-500'
                        : 'bg-slate-50/80 border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-cyan-500/40 focus:border-cyan-500'
                    }`}
                  />
                </div>
              </div>

              {/* Campo Contraseña */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${
                  modoNocturno ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Contraseña de Rol
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full text-sm rounded-xl pl-10 pr-3.5 py-2.5 border transition-all focus:outline-none focus:ring-2 ${
                      modoNocturno
                        ? 'bg-slate-800/90 border-slate-700 text-white focus:ring-cyan-500/40 focus:border-cyan-500'
                        : 'bg-slate-50/80 border-slate-200 text-slate-900 focus:ring-cyan-500/40 focus:border-cyan-500'
                    }`}
                  />
                </div>
              </div>

              {/* Botón Iniciar Sesión (Cian / Teal Corporativo) */}
              <button
                type="submit"
                className="w-full mt-2 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-teal-900/30 hover:shadow-teal-900/50 transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>Ingresar a Análisis Químicos</span>
              </button>
            </form>

            {/* Acceso Rápido Modo Demo (1-Click) */}
            <div className="mt-4 p-3 rounded-xl border border-cyan-500/30 bg-cyan-950/40 shadow-inner">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-2 flex items-center justify-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce" />
                <span>Acceso Rápido Modo Demo</span>
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => handleIngresoDemo('Químico', 'quimico.demo@generadora.cl')}
                  className="py-2 px-2 rounded-lg bg-teal-900/60 border border-teal-500/40 text-teal-200 font-bold hover:bg-teal-700/80 transition-all text-center cursor-pointer"
                >
                  🧪 Químico
                </button>
                <button
                  type="button"
                  onClick={() => handleIngresoDemo('Operador Terreno', 'operador.demo@generadora.cl')}
                  className="py-2 px-2 rounded-lg bg-cyan-900/60 border border-cyan-500/40 text-cyan-200 font-bold hover:bg-cyan-700/80 transition-all text-center cursor-pointer"
                >
                  🔧 Terreno
                </button>
                <button
                  type="button"
                  onClick={() => handleIngresoDemo('Veolia', 'veolia.demo@generadora.cl')}
                  className="py-2 px-2 rounded-lg bg-emerald-900/60 border border-emerald-500/40 text-emerald-200 font-bold hover:bg-emerald-700/80 transition-all text-center cursor-pointer"
                >
                  💧 Veolia
                </button>
              </div>
            </div>
          </div>

          {/* Enlace Discreto: Volver al Portal Principal */}
          <div className="mt-6 pt-4 border-t border-slate-700/40 text-center">
            <button
              type="button"
              onClick={onVolver}
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
