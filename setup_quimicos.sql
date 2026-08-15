-- =======================================================
-- SCRIPT DE BASE DE DATOS Y AUDITORÍA: MÓDULO ANÁLISIS QUÍMICOS
-- Ejecutar en el SQL Editor de Supabase
-- =======================================================

-- Habilitar extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla principal usando JSONB para flexibilidad de parámetros de muestreo
CREATE TABLE IF NOT EXISTS analisis_quimicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  punto_muestreo TEXT NOT NULL,
  parametros JSONB NOT NULL,
  usuario_email TEXT NOT NULL,
  rol TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Trazabilidad / Auditoría Paralela
CREATE TABLE IF NOT EXISTS auditoria_quimica (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usuario_email TEXT NOT NULL,
  rol TEXT NOT NULL,
  accion TEXT NOT NULL, -- "INGRESO", "EDICION", "BORRADO"
  punto_muestreo TEXT NOT NULL,
  detalle JSONB
);

-- Habilitar permisos de lectura/escritura pública o RLS si aplica
ALTER TABLE analisis_quimicos DISABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_quimica DISABLE ROW LEVEL SECURITY;
