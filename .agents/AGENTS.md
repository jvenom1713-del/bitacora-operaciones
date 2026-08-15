# REGLAS Y PROTECCIÓN PERMANENTE — GENERACIÓN DIARIA (CENTRAL NUEVA RENCA)

> **REGLA ESTRICTA DE INMUTABILIDAD**: Este archivo define las reglas operacionales fijas y validadas para el cálculo y renderizado de la matriz de **Generación Diaria**. Bajo ninguna circunstancia se deben volver a inyectar o hardcodear los valores residuales obsoletos (`53.4`, `5046`, `40.3`, `2`, `14`).

---

## 1. Reglas de Negocio Oficiales

1. **SISTEMA PROM (USD/MWh)**:
   - Calculado a partir de la pestaña **`TCO`** del libro `PO{YYMMDD}.xlsx` promediando los costos por bloque horario según el tipo de gas con que opere Nueva Renca (ej: *Gas Natural A / GNL*).
   - Valor base oficial del programa 15: **`56.7 USD/MWh`**.

2. **POT ESPERA (MWh)**:
   - Suma total acumulada de energía generada en las 24 horas del día ($\sum H_1 \dots H_{24}$, Columna AC de la pestaña `PROGRAMA`).
   - Valor base oficial del programa 15: **`4004 MWh`**.

3. **COSTO MARGINAL CEN (USD/MWh)**:
   - Extraído directamente de la **celda `AC8`** de la pestaña **`PROGRAMA`** del libro `PRG{YYMMDD}.xlsx`.
   - Valor base oficial del programa 15: **`52.9 USD/MWh`**.

4. **FUEGOS SUPLEMEN (MW)**:
   - Suma de los MW atribuibles a la fila de Fuegos Suplementarios (`FA`) **únicamente en aquellas horas donde la generación por fuegos sea mayor a 32 MW** (`gen_fa > 32.0`).

5. **HRS CARGA BASE (hrs)**:
   - Conteo de horas del día (1 a 24) en las que la generación total sumada de la planta es **mayor o igual a 330 MW** (`gen_total >= 330`).
   - Valor base oficial del programa 15: **`0 hrs`**.

6. **HRS MIN TEC (hrs)**:
   - Conteo de horas del día (1 a 24) en las que la planta opera en régimen de Mínimo Técnico (**$\approx 160\text{ MW}$**, o entre $> 0\text{ MW}$ y $< 330\text{ MW}$).
   - Valor base oficial del programa 15: **`22 hrs`**.

7. **HRS FUEGOS SUPLEM (hrs)**:
   - Conteo de horas del día (1 a 24) en las que la generación de fuegos suplementarios es **estrictamente mayor a 32 MW** (`gen_fa > 32.0`).
   - Valor base oficial del programa 15: **`0 hrs`**.

---

## 2. Archivos Protegidos y Componentes
- `frontend/src/App.jsx`
- `frontend/src/components/DashboardIniciarTurno.jsx`
- `frontend/src/components/VistaConsultaHojaTurno.jsx`
- `backend/excel_processor.py`
- `backend/cen_downloader.py`
- `backend/main.py`
- `backend/server.py`

## 3. Regla de Persistencia vs Reset en Cierre de Ciclo

- **LO ÚNICO QUE SE BORRA AL CERRAR EL CICLO DE 24H**: El cuerpo de texto redactado de la bitácora (`novedades` / `textoBitacora`).
- **SECCIONES QUE SE MANTIENEN Y NO SE BORRAN** (Modificables manualmente por el operador):
  1. `Generación Diaria` (Sincronizada con CEN / Actualizada por operador)
  2. `Estado de Planta`
  3. `Abastecimiento`
  4. `Equipos Principales de Operación`
  5. `Señales Forzadas`
  6. `Instrucciones Operacionales`

---

## 4. Flujo de Aprobación y Seguridad de Inicio de Sesión

1. **Mensaje de Error de Contraseña**:
   - Para cualquier intento fallido de contraseña en la portada de login, el mensaje oficial devuelto debe ser exactamente: **`Contraseña equivocada.`**

2. **Bloqueo del Botón del Jefe de Turno**:
   - El botón de aprobación y firma del **Jefe de Turno** debe estar **estrictamente bloqueado y deshabilitado** mientras el **Operador de Sala** no haya enviado formalmente la bitácora a revisión (`estado !== 'EN_REVISION'`).
   - Solamente al pasar al estado `EN_REVISION`, se habilita el botón para ingresar la clave autorizada del Jefe de Turno.

Cualquier cambio futuro en la aplicación **debe conservar intactas las reglas de negocio, persistencia, flujo de aprobación y seguridad** aquí documentadas.
