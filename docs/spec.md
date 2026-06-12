# 🏓 Sistema de Turnos — Jorge Newbery Tenis de Mesa
**Wilde, Buenos Aires, Argentina — Especificación Completa v8.0 + actualizaciones**

Documento de referencia para implementación desde cero. Incluye diseño UI/UX validado, modelo de datos, flujos de negocio, stack técnico, seed de prueba y prompt listo para Claude Code. Cualquier IA con este documento puede implementar el sistema desde cero.

---

## 1. Resumen Ejecutivo

Aplicación web responsive (PWA) para gestión de turnos de tenis de mesa. Cada jugador tiene un plan fijo semanal asignado por el admin. El sistema genera las reservas automáticamente. El jugador solo gestiona excepciones. El admin/colaborador gestiona jugadores, turnos, pagos y aprueba solicitudes.

| Atributo | Valor |
|---|---|
| Club | Jorge Newbery TDM — Wilde, Buenos Aires, Argentina |
| Colores | Negro #111111 + Verde #1E7A34 + Blanco #FFFFFF |
| Jugadores | ~100 pre-registrados, ~30 activos por semana |
| Plataforma | PWA (Progressive Web App) — instalable en celular sin App Store |
| Idioma | Español argentino en todo el UI y notificaciones |
| Zona horaria | America/Argentina/Buenos_Aires (UTC-3) |
| Modelo central | Plan fijo semanal por jugador + cron job de generación automática |

---

## 2. Identidad Visual

### 2.1 Paleta de Colores

| Variable | Hex | Uso |
|---|---|---|
| `--negro` | `#111111` | Fondo principal de toda la app |
| `--card-bg` | `#1C1C1C` | Fondo de cards y paneles |
| `--card-border` | `#2A2A2A` | Bordes de cards |
| `--border2` | `#333333` | Bordes secundarios |
| `--verde` | `#1E7A34` | Color primario — botones, badges activos, acentos |
| `--verde-dark` | `#145224` | Verde oscuro — hover de botones |
| `--verde-light` | `#1A3A22` | Verde muy oscuro — fondo de chips asignados |
| `--blanco` | `#FFFFFF` | Texto principal sobre fondos oscuros |
| `--gris-texto` | `#888888` | Texto secundario |
| `--amarillo` | `#D97706` | Estados de espera, casi lleno |
| `--rojo` | `#F87171` | Estados llenos, errores, no-show |

### 2.2 Escudo del Club

El escudo es un círculo con fondo negro, borde verde #1E7A34, banda diagonal blanca y letras J y N en verde. Componente `Shield` en `src/components/ui/Shield.tsx`. Actualmente usa la imagen real del club (`/logo.jpg`):

```tsx
export function Shield({ size = 48, className = '' }) {
  return (
    <img src="/logo.jpg" width={size} height={size}
      alt="Club Jorge Newbery — Tenis de Mesa"
      className={`rounded-full object-cover ${className}`}
    />
  )
}
```

SVG de referencia (fallback):
```svg
<svg width="32" height="32" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="15" fill="#111" stroke="#1E7A34" stroke-width="1.5"/>
  <line x1="8" y1="4" x2="24" y2="28" stroke="white" stroke-width="7"/>
  <text x="8" y="15" font-size="8" font-weight="500" fill="#1E7A34" font-family="Arial">J</text>
  <text x="17" y="25" font-size="8" font-weight="500" fill="#1E7A34" font-family="Arial">N</text>
</svg>
```

### 2.3 Componentes UI Globales

| Componente | Especificación |
|---|---|
| Fondo app | negro #111111 — toda la app es dark mode |
| Cards | `background: #1C1C1C; border: 1px solid #2A2A2A; border-radius: 12px` |
| Botón primario | `background: #1E7A34; color: white; border-radius: 8px; hover: #145224` |
| Botón cancelar | `background: transparent; border: 1px solid #444; color: #AAA` |
| Botón peligro | `background: transparent; border: 1px solid #EF4444; color: #F87171` |
| Inputs | `background: #252525; border: 1px solid #333; color: white; focus: border #1E7A34` |
| Select/Dropdown | `background: #1C1C1C; color: white` — **NUNCA** usar select nativo sin estilar |
| Badges ovalados | `border-radius: 99px; padding: 2px 10px; font-size: 11px; font-weight: 500` |
| Barra de progreso | `height: 4px; background: #2A2A2A;` fill según estado (verde/naranja/rojo) |
| Navbar jugador | TDM Newbery \| Turnos \| Mi Plan \| [Avatar] Nombre ▼ |
| Navbar admin | TDM Newbery \| Jugadores \| Solicitudes \| Asistencia \| Pagos \| Editor \| Config \| [Avatar] |

---

## 3. Horarios de Turno

| Día | day_of_week | Turno 1 | Turno 2 | Turno 3 |
|---|---|---|---|---|
| Lunes | 1 | 16:30 – 18:30 | 18:30 – 20:15 | 20:15 – 22:00 |
| Martes | 2 | 16:30 – 18:30 | 18:30 – 20:15 | 20:15 – 22:00 |
| Miércoles | 3 | 16:30 – 18:30 | 18:30 – 20:15 | 20:15 – 22:00 |
| Jueves | 4 | 16:30 – 18:30 | 18:30 – 20:15 | 20:15 – 22:00 |
| Viernes | 5 | 17:00 – 19:00 | — | — |
| Sábado | 6 | 10:00 – 11:30 | 11:30 – 13:30 | — |

Total: 14 turnos semanales. Cupo default: 12 jugadores. Todos configurables desde panel admin sin tocar código.

---

## 4. Roles y Permisos

Un usuario puede tener rol dual (ej: jugador + admin). La app detecta los roles del array y muestra selector de vista al iniciar sesión.

| Acción | Jugador | Colaborador | Admin |
|---|---|---|---|
| Ver calendario (7 días desde hoy) | ✅ | ✅ | ✅ |
| Ver su plan fijo actual | ✅ | ✅ | ✅ |
| Cancelar turno puntual propio | ✅ | ✅ | ✅ |
| Reservar turno extra puntual | ✅ | ✅ | ✅ |
| Solicitar cambio de plan fijo | ✅ | ✅ | ✅ |
| Configurar perfil y preferencias | ✅ | ✅ | ✅ |
| Ver quiénes están anotados en un turno | ❌ | ✅ | ✅ |
| Marcar asistencia post-turno | ❌ | ✅ | ✅ |
| Registrar pagos | ❌ | ✅ | ✅ |
| Gestionar lista de espera manualmente | ❌ | ✅ | ✅ |
| Ver actividad de jugadores | ❌ | ✅ | ✅ |
| Aprobar / rechazar registros nuevos | ❌ | ❌ | ✅ |
| Aprobar / rechazar cambios de plan | ❌ | ❌ | ✅ |
| Asignar plan fijo (editor drag & drop) | ❌ | ❌ | ✅ |
| Crear / modificar / desactivar turnos | ❌ | ❌ | ✅ |
| Cancelar instancias puntuales (feriados) | ❌ | ❌ | ✅ |
| Habilitar / suspender / deshabilitar jugadores | ❌ | ❌ | ✅ |
| Importar CSV de pre-registro | ❌ | ❌ | ✅ |
| Ver estadísticas globales | ❌ | ❌ | ✅ |
| Configurar parámetros del sistema | ❌ | ❌ | ✅ |

### Definición de Roles

Los roles son fijos (no configurables). Un usuario puede tener múltiples roles simultáneamente. El rol `player` es el rol por defecto y no puede quitarse.

| Rol | Menú / Accesos | Descripción |
|---|---|---|
| `player` (jugador) | Turnos, Mi Plan, Mi Perfil | Rol por defecto. Todos los usuarios lo tienen. Landing: `/calendario`. No se puede quitar. |
| `collaborator` (colaborador) | Jugadores, Solicitudes, Asistencia, Editor (solo tab Configurar) | Acceso operativo. Landing al activar rol: `/asistencia`. |
| `admin` | Jugadores, Solicitudes, Asistencia, Pagos, Editor, Config | Control total. Landing al activar rol: `/asistencia`. |

**Asignación de roles:** desde la pantalla de detalle del jugador (`/jugadores/[id]`):
- **Jugador:** siempre marcado, deshabilitado (no se puede quitar).
- **Colaborador:** toggle, guarda inmediatamente al hacer click.
- **Admin:** toggle, guarda inmediatamente al hacer click.

**Landing page y navegación:**
- Usuario con rol jugador (incluyendo duales jugador+colaborador, jugador+admin): landing en `/calendario`. Siempre inicia como jugador.
- Usuario sin rol jugador (admin puro): landing en `/asistencia`.
- El rol activo NO se persiste entre sesiones. Cada nuevo login comienza como jugador. El cambio es manual mediante el `RoleSwitcher` en el header, cuyo estado se guarda en cookie `_active_role` para sobrevivir remontadas de layout de Next.js.

---

## 5. Flujos del Jugador

### 5.1 Cancelación Puntual

| Paso | Actor | Descripción |
|---|---|---|
| 1 | Jugador | Toca '✕ Cancelar este turno' en una card del calendario. |
| 2 | Sistema | Verifica si faltan más de 2hs (configurable). Si menos → registra como 'cancelled_late' igual. |
| 3 | Sistema | Cambia `booking.status = 'cancelled'`. Libera el cupo. Activa flujo de lista de espera. |
| 4 | Sistema | Si hay lista de espera → WA al primero. Si no → broadcast al grupo + WA a favoritos. |

### 5.2 Lista de Espera — Flujo Completo

| Paso | Actor | Descripción |
|---|---|---|
| 1 | Sistema | Detecta cupo liberado. Identifica al primero en lista de espera FIFO. |
| 2 | Sistema | Envía WA: '¡Hola [Nombre]! Se liberó un lugar en el turno del [Día] [Hora]. Respondé SI para confirmar o NO para rechazar. Link: [url] (válido 30 min)' |
| 3a | Jugador | Responde SI/si/s/1 al WA → bot confirma automáticamente. |
| 3b | Jugador | Toca el link → confirma en la app con un botón. |
| 3c | Sistema | Si no responde en el tiempo límite → pasa al siguiente en la lista. |
| 4 | Sistema | Si nadie confirma → mensaje al grupo del club + WA individual a jugadores con ese turno en favoritos. |

- El worker de WhatsApp usa Upstash Redis para mapear número WA → oferta activa.
- Variantes aceptadas: `si`, `sí`, `SI`, `Sí`, `s`, `1` → confirma. `no`, `NO`, `n`, `2` → rechaza.

---

## 6. Flujo de Registro

### 6.1 Dos Escenarios

| Escenario | Descripción |
|---|---|
| Jugador pre-cargado | El admin importó CSV previo. Al ingresar DNI → los campos se **pre-completan** con los datos del CSV pero **todos son editables** (el jugador puede corregir errores, actualizar teléfono, etc.). El paso 2 muestra sus turnos en solo lectura. Al completar → pasa directo a `active` sin revisión del admin. |
| Jugador nuevo | DNI no existe. Completa todo desde cero. Al terminar queda en `status='pending'` esperando aprobación del admin. Aparece en Solicitudes → Nuevos registros. |

### 6.2 Paso 1 — Datos Personales

| Campo | Requerido | Comportamiento con pre-registro |
|---|---|---|
| DNI | Sí | Dispara búsqueda en tiempo real. Solo lectura una vez encontrado. |
| Nombre | Sí | Pre-completado, editable |
| Apellido | Sí | Pre-completado, editable |
| Apodo | No | Vacío, editable |
| Teléfono/WhatsApp | Sí | Pre-completado si existe en CSV, editable |
| Email | Sí | Siempre vacío (no estaba en el pre-registro), editable |
| Contraseña | Sí | Siempre vacío, editable |

### 6.3 Paso 2 — Preferencia de Turnos

| Sub-paso | Descripción |
|---|---|
| 1. Cantidad de días | Selector: 1 \| 2 \| 3 \| 4 \| 5 veces por semana. |
| 2. Opción A | Lista de checkboxes con todos los training_slots activos agrupados por día. Seleccionar exactamente N turnos. |
| 3. Opción B | Misma lista. Seleccionar otros N turnos distintos (segunda preferencia). |
| 4. Confirmar | Resumen + botón enviar. Valida que A y B tengan exactamente N turnos. Crea `registration_request`. |

### 6.4 Aprobación por Admin

| Paso | Actor | Descripción |
|---|---|---|
| 1 | Sistema | Notifica al admin por WA + badge en panel: 'Nuevo registro pendiente — [Nombre]' |
| 2 | Admin | Panel → Solicitudes → Nuevos registros → expande el card del jugador |
| 3 | Admin | Ve datos + Opción A con disponibilidad N/12 + Opción B con disponibilidad N/12. ⚠ si lleno (pero NO bloquea). |
| 4 | Admin | Toca: 'Aprobar con Opción A' / 'Aprobar con Opción B' / 'Ajustar manualmente' / 'Rechazar' |
| 5 | Sistema | Al aprobar: crea `slot_assignments`, cambia status a 'active', notifica al jugador por WA + email. |

> ✅ Notificación al jugador: '¡Tu registro fue aprobado! Tus turnos son: [lista]. Ya podés ver tu calendario.'

---

## 7. Área del Jugador — Pantallas

### 7.1 Navegación

Navbar con dos secciones + menú de usuario. Sin más pantallas visibles en la navegación principal.

| Elemento | Descripción |
|---|---|
| 📅 Turnos | Pantalla principal. Activa por default al entrar. |
| 📋 Mi Plan | Plan fijo actual + solicitud de cambio de días. |
| [Avatar] Nombre ▼ | Dropdown con: Mi Perfil / Preferencias / Salir. El rol se muestra en español: Jugador / Colaborador / Administrador. |

### 7.2 Calendario — Pantalla Principal

| Elemento | Especificación |
|---|---|
| Rango | 7 días corridos desde hoy. Sin domingo (no hay turnos). |
| Layout | Una fila por día con header: 'Martes 9 de junio [Hoy]'. Día actual en verde. |
| Columnas | Lun–Jue: 3 columnas. Viernes: 1 columna. Sábado: 2 columnas. |
| Visibilidad | TODOS los turnos siempre visibles aunque estén llenos. Sin toggle de ocultar. |
| Barra de progreso | 4px de altura, muestra % de ocupación. Verde < 80%, naranja 80-99%, rojo 100%+ |

| Estado card | Borde | Badge | Botón |
|---|---|---|---|
| Libre (>3 cupos) | `#2A2A2A` | Verde: 'X libres' | ✓ Reservar (verde) |
| Poco cupo (1–3) | `#2A2A2A` | Naranja: 'X libres' | ✓ Reservar (verde) |
| Lleno | `#3A1A1A` | Rojo: 'Lleno' | ⏳ Anotarme a la espera |
| Confirmado | `#1E7A34` | — | ✓ Confirmado / ✕ Cancelar este turno |
| En espera | `#D97706` | — | ⏳ En espera — posición #N / ✕ Salir de la espera |

### 7.3 Mi Plan

| Sección | Descripción |
|---|---|
| Plan actual | Grilla visual de días y horarios asignados. Solo lectura. Ej: 'Lunes 18:30–20:15, Miércoles 18:30–20:15' |
| Solicitar cambio | Flujo: seleccionar slots a abandonar → slots nuevos deseados → fecha de inicio → confirmar. Crea `plan_change_request`. |
| Historial de solicitudes | Lista con estado: pendiente / aprobada / rechazada. Permite cancelar si está pendiente. |

### 7.4 Mi Perfil

Ruta: `/perfil`. Carga datos desde `player_profiles` usando `account_id = auth.user.id`.

| Sección | Campos |
|---|---|
| Datos personales | Nombre* \| Apellido* \| Apodo (opcional, placeholder: 'Como te conocen en el club') \| Fecha de nacimiento \| Localidad \| Teléfono/WhatsApp* |
| Datos deportivos | Código TMT (opcional) \| Código Fetemba (opcional). Subtítulo: 'Usados para torneos'. |
| Acceso | Email (solo lectura, con texto: 'El email no se puede cambiar') \| Nueva contraseña \| Confirmar contraseña |

> ⚠️ **BUG CONOCIDO:** el useEffect que carga los datos debe mapear TODOS los campos del perfil. Query correcta:  
> `.select('name,lastname,nickname,phone_whatsapp,birth_date,locality,tmt_code,fetemba_code')`

### 7.5 Preferencias

Ruta: `/preferencias`. Tres secciones simples.

| Sección | Contenido |
|---|---|
| Avisos por WhatsApp | Toggle: 'Recordatorio 24hs antes' (descripción: 'Te avisa el día anterior a cada turno') \| Toggle: 'Avisos de cupo libre en favoritos' (descripción: 'Te avisa cuando se libera un lugar en tus turnos favoritos') |
| Notificaciones push | Estado: 'Desactivadas en este dispositivo' + Botón 'Activar'. Activa el Web Push del service worker. |
| Turnos favoritos | Lista de todos los `training_slots` activos agrupados por día (LUNES, MARTES, etc.). Cada slot es una row con estrella (☆/⭐) para marcar/desmarcar. Botón 'Guardar favoritos'. Guarda en tabla `favorite_slots`. |

> **IMPORTANTE:** NO mostrar el teléfono en Preferencias — va en /perfil.

---

## 8. Panel de Administración — Pantallas

### 8.1 Navbar Admin

```
Jugadores | Solicitudes (badge contador) | Asistencia | Pagos | Editor | Config | [Avatar] Admin Newbery ▼
```

Sin sección de Estadísticas en el navbar — no tiene utilidad definida actualmente.

### 8.2 Jugadores — /jugadores

| Elemento | Descripción |
|---|---|
| Listado | Círculo de color (estado de cuenta) + nombre completo + email + badge de clases/semana. |
| Círculo de estado | 🟢 Verde: Activo \| ⚫ Gris: Sin cuenta (pre_registered) \| 🔵 Azul: Pendiente \| 🟡 Amarillo: Suspendido \| 🔴 Rojo: Deshabilitado. Tooltip con el texto del estado al hover. |
| Badges clases | 1 clase/semana \| 2 clases/semana \| 3 clases/semana \| 4 o más clases/semana |
| Filtros | Buscador (nombre, email, DNI) + Selector estado — con fondo oscuro |
| Exportar CSV | Botón superior derecho |

**Detalle del jugador — /jugadores/[id]**

| Sección | Contenido |
|---|---|
| Header | Avatar con iniciales + nombre completo + email + estado (Activo/Suspendido/Deshabilitado) |
| Datos personales | Nombre*, Apellido*, Apodo, Fecha nacimiento, Localidad, Email (solo lectura), DNI (solo lectura), Teléfono/WA, Toggle WA |
| Datos deportivos | Código TMT, Código Fetemba |
| Plan fijo | Lista de slots asignados con botón 'Editar plan' que lleva al editor drag & drop |
| Estado | Activo → [Suspender] [Deshabilitar] \| Suspendido → [Habilitar] [Deshabilitar] \| Deshabilitado → [Habilitar]. **SIN baja física.** |
| Roles | Checkboxes: Jugador (siempre marcado, deshabilitado) \| Colaborador (toggle) \| Admin (toggle). Guarda inmediatamente al hacer click. |
| Pagos | Tabla de pagos con fecha, período, monto, notas. Botón '+ Registrar pago' (modal) + Exportar CSV. |
| Actividad (90 días) | SOLO excepciones al plan fijo: cancelaciones puntuales, reservas extra, cambios de plan. NO mostrar bookings `type='auto'`. Tipos en español: 'Reserva extra', 'Cancelación', 'Cancelación tardía', 'No se presentó'. |

### 8.3 Solicitudes — /solicitudes

Dos tabs con badge de contador cada uno.

| Tab | Contenido |
|---|---|
| Nuevos registros | Card expandible por jugador: nombre, email, DNI, días/semana solicitados, fecha. Al expandir: Opción A con disponibilidad N/12 + Opción B con disponibilidad N/12. ⚠ si lleno. Botones: Aprobar A \| Aprobar B \| Ajustar \| Rechazar. |
| Cambios de plan | Card expandible: jugador, fecha propuesta. Al expandir: 'Turnos a dar de baja' (en rojo) + 'Turnos a agregar' (en verde) con disponibilidad N/12. Botones: Aprobar \| Rechazar. |

### 8.4 Asistencia — /asistencia

| Elemento | Descripción |
|---|---|
| Selector de fecha | Date picker en esquina superior derecha. Default: fecha actual. |
| Tabs de turno | Botones con los turnos del día seleccionado. Ej: 'Miércoles 16:30' \| 'Miércoles 18:30' \| 'Miércoles 20:15' |
| Lista de anotados | Cards oscuras con nombre + DNI de cada jugador con booking confirmada en esa instancia. |
| Botones por jugador | **Presente** \| **Ausente** \| **No se presentó** — botones de selección exclusiva (3 opciones, sin "Canceló tarde") |
| Botón Todos | '✓ Todos' en el header del turno — marca a todos como Presente de un click |
| Header del turno | 'Miércoles 16:30', 'X/Y anotados' (cupo ocupado sobre cupo máximo). Sin contador de presentes separado. |
| Cancelar clase | Botón secundario con borde rojo. Al confirmar cancela la instancia completa y notifica a los anotados. |

### 8.5 Pagos — /pagos

| Elemento | Descripción |
|---|---|
| Resumen | 3 cards grandes: N Al día (verde) \| N Debe el mes (naranja) \| N Debe meses anteriores (rojo) |
| Listado | Todos los jugadores activos con semáforo + botón '+ Pago' inline. Click en jugador → detalle del jugador. |
| Modal registrar pago | Campos: Jugador (pre-seleccionado si viene del detalle), Monto, Fecha, Período (mes+año), Método (Efectivo/Transferencia), Notas opcionales. |
| Exportar CSV | Botón en esquina superior derecha. Exporta la lista filtrada. |

### 8.6 Editor de Turnos — /editor-turnos

Dos tabs en la parte superior derecha.

**Tab 'Asignar jugadores'** *(solo admin — colaborador no ve este tab)*

| Elemento | Descripción |
|---|---|
| Selector de día | Botones: [Lunes] [Martes] [Miércoles] [Jueves] [Viernes] [Sábado]. Un día visible a la vez. |
| Panel izquierdo | 'SIN ASIGNAR' — lista solo los jugadores SIN `slot_assignment` activo para ese día. Si todos asignados: 'Todos asignados'. |
| Slots (columnas) | Cada turno del día es una columna. Header: '16:30-18:30 (15/12)' + badge de estado ovalado. |
| Badge de estado slot | 'Con lugar' (verde, <80%) \| 'Casi lleno' (naranja, 80-99%) \| 'Completo' (rojo, =100%) \| 'Sobre cupo' (rojo brillante con borde, >100%) |
| Drag & drop | Arrastrar jugador del panel al slot → asigna. Arrastrar de vuelta al panel → quita. Usar `@dnd-kit` con `'use client'`. |
| Guardar | Botón 'Guardar cambios'. INSERT para nuevos, UPDATE `valid_until` para quitados (NO DELETE). |
| Instrucción | 'Arrastrá jugadores hacia un turno para asignarlos, o de vuelta al panel Sin asignar para quitarlos.' |

> ⚠️ **CRÍTICO dnd-kit:** `'use client'` obligatorio. `DndContext` envuelve panel + slots. `useDraggable({id: 'jugador-'+id})` por jugador. `useDroppable({id: 'slot-'+slotId})` por slot. `onDragEnd` recibe `{active, over}`.  
> ⚠️ **Pre-carga:** al cambiar de día, query `slot_assignments` activos para ese día y pre-poblar slots.

**Tab 'Configurar turnos'** *(admin y colaborador)*

| Elemento | Descripción |
|---|---|
| Lista de turnos | Tabla con todos los `training_slots`: día, horario, cupo, jugadores asignados (N/12), estado activo/inactivo. |
| Crear turno | Formulario: día, hora inicio, hora fin, cupo (default 12), fecha desde cuándo aplica. |
| Editar turno | Al guardar: '⚠ Este cambio afecta a N jugadores. ¿Confirmás?' → aplica + WA + Web Push a afectados. |
| Desactivar | Confirmación + notificación automática a jugadores afectados. |
| Cancelar instancia | Selector de fecha + mensaje opcional → cancela una instancia puntual (feriado) + notifica anotados. |

### 8.7 Configuración — /configuracion

| Parámetro | UI | Default | Descripción |
|---|---|---|---|
| `auto_approve_plan_change` | Toggle | false | Si activo: cambios de plan se aprueban automáticamente. |
| `cancel_cutoff_hours` | Input numérico | 2 | Horas antes del turno para cancelación normal vs tardía. |
| `booking_window_days` | Input numérico | 7 | Días de anticipación para reservas extra puntuales. |
| `waitlist_offer_minutes` | Input numérico | 30 | Minutos para confirmar cupo liberado antes de pasar al siguiente. |
| `default_slot_capacity` | Input numérico | 12 | Cupo default para nuevos turnos. |

---

## 9. Notificaciones

### 9.1 Canales

| Canal | Tecnología | Costo | Uso |
|---|---|---|---|
| WhatsApp individual | Meta WhatsApp Cloud API — número dedicado del club | ~$0.007 USD/msg | Canal principal para eventos personales |
| WhatsApp grupo | Meta WhatsApp Cloud API — mensaje al grupo del club | $0 (conv. servicio) | Turno libre sin lista de espera + turno cancelado |
| Web Push (PWA) | web-push VAPID — estándar W3C | $0 | Fallback y notificaciones urgentes |
| Email | Resend (3.000/mes gratis) | $0 | Registro, aprobaciones y comprobantes |

### 9.2 Tabla de Eventos — Defaults y Canales

Cada evento tiene un toggle ON/OFF global y canales configurables. Si el toggle está OFF, no se envía nada para ese evento.

| Evento | Destinatario | WA ind. | WA grupo | Push | Email | Default |
|---|---|---|---|---|---|---|
| Nuevo registro pendiente | Admin | ✅ | ❌ | ❌ | ❌ | ON |
| Registro aprobado | Jugador | ✅ | ❌ | ❌ | ✅ | ON |
| Registro rechazado | Jugador | ❌ | ❌ | ❌ | ✅ | ON |
| Cupo liberado — lista espera | Jugador en espera | ✅ | ❌ | ✅ | ❌ | ON |
| Turno libre — nadie confirmó | Activos sin ese turno | ❌ | ✅ | ❌ | ❌ | ON |
| Recordatorio 24hs antes | Jugador con turno | ✅ | ❌ | ❌ | ❌ | OFF |
| Cambio de plan solicitado | Admin | ✅ | ❌ | ❌ | ❌ | ON |
| Cambio de plan aprobado | Jugador | ✅ | ❌ | ❌ | ✅ | ON |
| Cambio de plan rechazado | Jugador | ❌ | ❌ | ❌ | ✅ | OFF |
| Turno cancelado por el club | Todos los anotados | ✅ | ✅ | ✅ | ❌ | ON |
| Turno modificado por el club | Jugadores afectados | ✅ | ❌ | ✅ | ❌ | ON |
| Registro de pago | Jugador | ❌ | ❌ | ❌ | ✅ | OFF |

> 💡 Los eventos en OFF pueden activarse desde Configuración en cualquier momento — sin tocar código.

### 9.3 Lógica de Envío — Orden de Verificación

1. `notif_<evento>_enabled = true` en `system_config`. Si false → no enviar nada.
2. Canales habilitados para ese evento (`notif_<evento>_channels`).
3. Preferencias personales del jugador en `notification_prefs`. El jugador solo puede DESACTIVAR canales — no puede activar canales que el admin tiene OFF.

### 9.4 Panel Admin — Notificaciones en /configuracion

Una fila por evento con:
- Toggle ON/OFF — activa o desactiva el evento completo.
- Checkboxes de canales (solo visibles si toggle está ON): WA individual | WA grupo | Web Push | Email.
- Persiste en `system_config`: `notif_<evento>_enabled` (boolean) y `notif_<evento>_channels` (JSON array).

### 9.5 Keys de system_config para Notificaciones (Seed)

```sql
INSERT INTO system_config (key, value) VALUES
('notif_nuevo_registro_admin_enabled',    'true'),
('notif_nuevo_registro_admin_channels',   '["wa_individual"]'),
('notif_registro_aprobado_enabled',       'true'),
('notif_registro_aprobado_channels',      '["wa_individual","email"]'),
('notif_registro_rechazado_enabled',      'true'),
('notif_registro_rechazado_channels',     '["email"]'),
('notif_cupo_liberado_espera_enabled',    'true'),
('notif_cupo_liberado_espera_channels',   '["wa_individual","push"]'),
('notif_turno_libre_sin_espera_enabled',  'true'),
('notif_turno_libre_sin_espera_channels', '["wa_grupo"]'),
('notif_recordatorio_24hs_enabled',       'false'),
('notif_recordatorio_24hs_channels',      '["wa_individual"]'),
('notif_cambio_plan_solicitado_enabled',  'true'),
('notif_cambio_plan_solicitado_channels', '["wa_individual"]'),
('notif_cambio_plan_aprobado_enabled',    'true'),
('notif_cambio_plan_aprobado_channels',   '["wa_individual","email"]'),
('notif_cambio_plan_rechazado_enabled',   'false'),
('notif_cambio_plan_rechazado_channels',  '["email"]'),
('notif_turno_cancelado_club_enabled',    'true'),
('notif_turno_cancelado_club_channels',   '["wa_individual","wa_grupo","push"]'),
('notif_turno_modificado_enabled',        'true'),
('notif_turno_modificado_channels',       '["wa_individual","push"]'),
('notif_registro_pago_enabled',           'false'),
('notif_registro_pago_channels',          '["email"]')
ON CONFLICT (key) DO NOTHING;
```

---

## 10. Guía de Volcado Inicial

> 💡 **Concepto clave:** los jugadores quedan en `status='pre_registered'` hasta que se registran con su DNI. El admin puede operar el sistema completo (asistencia, pagos, editor) con jugadores pre-registrados. Cuando un jugador se registra → se vincula automáticamente → pasa a `'active'` → gestiona sus turnos.

### 10.1 Orden de Ejecución

| Paso | Actor | Acción | Resultado |
|---|---|---|---|
| 1 | Admin/Dev | Ejecutar migraciones + seed de turnos en Supabase producción | `training_slots` cargados con los 14 turnos del club |
| 2 | Admin | Verificar turnos en Editor → Configurar turnos | Confirmar días, horarios y cupos correctos |
| 3 | Admin | Preparar CSV de jugadores (ver formato sección 10.2) | Archivo listo para importar |
| 4 | Admin | Importar CSV desde panel Jugadores → Importar CSV | ~100 `player_profiles` en `status=pre_registered` |
| 5 | Admin | Verificar en Editor → Asignar jugadores que los planes quedaron correctos | Confirmar que cada jugador está en sus slots |
| 6 | Admin | Verificar en Asistencia que cada turno muestra sus jugadores | Sistema operativo — admin puede registrar asistencia desde hoy |
| 7 | Admin | Enviar mensaje al grupo del club con link de registro | Jugadores se van registrando gradualmente con su DNI |
| 8 | Jugadores | Entrar a la URL, registrarse con su DNI | Cuenta activada — pueden gestionar sus propios turnos |

### 10.2 Formato del CSV de Importación

El CSV incluye los turnos asignados. Al importar, el sistema crea automáticamente los `slot_assignments`.

```csv
nombre,apellido,dni,telefono_whatsapp,email,turnos
Lucas,Rodriguez,27100001,+5491112345678,lucas@email.com,lunes_1830|miercoles_1830|jueves_1830
Maria,Gonzalez,27100002,+5491187654321,,sabado_1000
Carlos,Perez,27100003,,,viernes_1700|lunes_1630
Ana,Lopez,27100004,+5491198765432,,
```

**Formato del campo 'turnos':** `dia_HHMM` separados por `|`. Días: `lunes`, `martes`, `miercoles`, `jueves`, `viernes`, `sabado`.

Horarios válidos:
- `lunes_1630`, `lunes_1830`, `lunes_2015`
- `martes_1630`, `martes_1830`, `martes_2015`
- `miercoles_1630`, `miercoles_1830`, `miercoles_2015`
- `jueves_1630`, `jueves_1830`, `jueves_2015`
- `viernes_1700`
- `sabado_1000`, `sabado_1130`

| Caso al importar | Comportamiento |
|---|---|
| DNI ya existe en el sistema | El jugador se saltea. Se reporta en el resumen. |
| Turno válido | Se crea `slot_assignment` con `valid_from = fecha de importación`. |
| Turno inválido o inexistente | Se importa el jugador igual pero se reporta el error del turno. |
| Sin campo turnos | El jugador queda `pre_registered` sin plan. El admin asigna después desde el editor. |
| Email o teléfono vacíos | Se importa igual. El jugador los completa al registrarse. |

Resultado final: N importados / M slots asignados / K errores de turno / J ya existían.

### 10.3 Asignación de Planes Fijos en el Editor

| Paso | Descripción |
|---|---|
| 1 | Panel → Editor → Tab 'Asignar jugadores' |
| 2 | Seleccionar día. Todos los jugadores sin plan para ese día aparecen en 'Sin asignar'. |
| 3 | Arrastrar cada jugador al turno que le corresponde. |
| 4 | El badge del slot actualiza en tiempo real: Con lugar / Casi lleno / Completo / Sobre cupo. |
| 5 | Tocar 'Guardar cambios' — crea `slot_assignments` con `valid_from = hoy`. |
| 6 | Repetir para cada día de la semana. |
| 7 | Asistencia → hoy → confirmar que cada turno muestra sus jugadores anotados. |

- Un jugador que va Lunes Y Miércoles al turno 18:30 debe asignarse en ambos días por separado.
- Si un slot queda 'Sobre cupo' → el sistema lo permite pero muestra badge rojo. El admin decide.
- El cron job del domingo siguiente generará automáticamente las instancias y bookings de la semana.

### 10.4 Verificación Post-Volcado

| Verificación | Dónde verificar | Qué debe verse |
|---|---|---|
| Jugadores importados | Panel → Jugadores | ~100 jugadores en estado 'pre_registrado' |
| Planes asignados | Panel → Editor → cada día | Jugadores en sus slots, Sin asignar vacío o con pocos |
| Asistencia funcional | Panel → Asistencia → hoy | Lista de anotados en cada turno del día actual |
| Cron job activo | Supabase → pg_cron o worker logs | Instancias y bookings generadas para la semana |
| Registro funcional | Registrarse con un DNI del CSV | Sistema vincula, activa la cuenta, muestra calendario con plan asignado |

### 10.5 Mensaje Sugerido para Jugadores

📱 Texto para enviar al grupo de WhatsApp del club:

> ¡Hola a todos! Ya tenemos el nuevo sistema de turnos funcionando 🏓  
> Para acceder registrate en: [URL del sistema]  
> 1. Entrá al link desde tu celu  
> 2. Tocá Registrarse  
> 3. Ingresá tu DNI y completá tus datos  
> 4. ¡Listo! Ya podés ver tus turnos y gestionar tus clases  
> Cualquier duda consultá con el profe.

---

## 11. Stack Técnico

| Capa | Tecnología | Versión/Notas |
|---|---|---|
| Framework | Next.js | 14 — App Router, Server Components, `'use client'` donde se necesite |
| Estilos | Tailwind CSS | Con CSS variables para los colores del club |
| PWA | next-pwa o @ducanh2912/next-pwa | Service worker + Web Push + manifest.json |
| Base de datos | Supabase | PostgreSQL + Auth + Realtime + Storage. RLS en todas las tablas. |
| Auth | Supabase Auth | Email + contraseña (principal) + Google OAuth (opcional) |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable | IMPORTANTE: el componente editor debe tener `'use client'` |
| WhatsApp | Meta WhatsApp Cloud API | Número dedicado del club. Worker Node.js separado. |
| Redis | Upstash Redis | Estado temporal de ofertas de lista de espera |
| Web Push | web-push (npm, VAPID) | Sin servicio externo |
| Email | Resend | 3.000 emails/mes gratis. Solo para registro y aprobación. |
| Cron job | pg_cron (Supabase) o node-cron | Generación semanal de instancias y bookings |
| Deploy app | Render Web Service | $7/mes — sin restricción comercial |
| Deploy worker | Render Worker | $7/mes — proceso Node.js 24/7 para WhatsApp + cron |
| DB prod | Supabase Free + health check | Health check horario para evitar pausa por inactividad |

> ⚠️ Todos los componentes que usen `@dnd-kit`, `useState`, `useEffect` o event listeners DEBEN tener `'use client'` como primera línea.  
> ⚠️ Los `<select>` nativos tienen fondo blanco en algunos browsers. CSS global: `select { background: #1C1C1C; color: white; } select option { background: #1C1C1C; color: white; }`  
> ⚠️ El worker de WhatsApp necesita proceso Node.js 24/7. No puede ir en Vercel (serverless).

---

## 12. Modelo de Datos

Todas las tablas tienen Row Level Security (RLS) habilitado. UTC en la DB, display en `America/Argentina/Buenos_Aires`.

### 12.1 Tablas Principales

| Tabla | Columnas clave | Notas |
|---|---|---|
| `user_accounts` | `id UUID PK, email TEXT UNIQUE, roles TEXT[] DEFAULT '{player}', created_at TIMESTAMPTZ` | `roles` es array: `['player']`, `['admin']`, `['collaborator']`, `['player','admin']`, etc. |
| `player_profiles` | `id UUID PK, account_id UUID FK UNIQUE (nullable), dni TEXT UNIQUE, name TEXT, lastname TEXT, nickname TEXT, phone_whatsapp TEXT, birth_date DATE, locality TEXT, tmt_code TEXT, fetemba_code TEXT, status TEXT, push_subscription JSONB, notes TEXT` | `status`: `pre_registered \| pending \| active \| suspended \| disabled`. 1:1 con `user_accounts`. |
| `training_slots` | `id UUID PK, day_of_week INT (0=Dom,1=Lun...6=Sáb), start_time TIME, end_time TIME, capacity INT DEFAULT 12, active BOOLEAN` | Turnos recurrentes. Modificables desde panel sin código. |
| `slot_instances` | `id UUID PK, slot_id UUID FK, date DATE, status TEXT DEFAULT 'open', cancel_reason TEXT` | Generadas por cron job. `status`: `open \| cancelled`. |
| `slot_assignments` | `id UUID PK, profile_id UUID FK, slot_id UUID FK, valid_from DATE, valid_until DATE (nullable)` | Plan fijo. `valid_until NULL` = vigente indefinidamente. **NO hacer DELETE**, usar `valid_until`. |
| `plan_change_requests` | `id UUID PK, profile_id UUID FK, slots_to_drop UUID[], slots_to_add UUID[], proposed_start_date DATE, status TEXT DEFAULT 'pending'` | `status`: `pending \| approved \| rejected` |
| `registration_requests` | `id UUID PK, profile_id UUID FK, days_per_week INT, option_a UUID[], option_b UUID[], status TEXT DEFAULT 'pending', assigned_option TEXT` | Solicitudes de registro con preferencias de turno A y B. |
| `bookings` | `id UUID PK, profile_id UUID FK, slot_instance_id UUID FK, type TEXT, status TEXT, waitlist_position INT, created_at TIMESTAMPTZ` | `type`: `auto \| manual_extra \| manual_cancel_recovery`. `status`: `confirmed \| cancelled \| cancelled_late \| waitlist \| no_show \| present \| absent` |
| `waitlist_offers` | `id UUID PK, booking_id UUID FK, offered_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, responded_at TIMESTAMPTZ, accepted BOOL, channel TEXT` | `channel`: `whatsapp \| web`. Auditoría de cada oferta de cupo. |
| `favorite_slots` | `id UUID PK, profile_id UUID FK, slot_id UUID FK` | Opt-in para broadcast de cupo libre. |
| `notification_prefs` | `id UUID PK, profile_id UUID FK, event_type TEXT, channels JSONB` | Sobreescribe defaults del admin por jugador y evento. |
| `payments` | `id UUID PK, profile_id UUID FK, amount NUMERIC, paid_at DATE, period_month INT, period_year INT, method TEXT, notes TEXT` | Registro manual. Sin automatización. |
| `attendance` | `id UUID PK, booking_id UUID FK, present BOOL, marked_at TIMESTAMPTZ, marked_by UUID` | Marcado post-turno. |
| `system_config` | `key TEXT PK, value TEXT` | Parámetros del sistema editables desde panel. |

### 12.2 Seed de system_config

```sql
INSERT INTO system_config (key, value) VALUES
('auto_approve_plan_change', 'false'),
('cancel_cutoff_hours', '2'),
('booking_window_days', '7'),
('waitlist_offer_minutes', '30'),
('default_slot_capacity', '12')
ON CONFLICT (key) DO NOTHING;
```

### 12.3 Cron Job Semanal

Se ejecuta domingos a las 00:00 AR. Genera instancias y bookings automáticas para la semana siguiente.

```sql
-- Para cada training_slot activo, crear slot_instance por cada día de la semana siguiente
-- Para cada slot_instance, buscar slot_assignments activos:
SELECT sa.profile_id, sa.slot_id
FROM slot_assignments sa
WHERE sa.valid_from <= fecha_instancia
AND (sa.valid_until IS NULL OR sa.valid_until >= fecha_instancia)
AND sa.slot_id = <slot_instance.slot_id>
-- Crear booking type='auto', status='confirmed' para cada jugador encontrado
-- Si asignaciones > capacity: crear alerta para admin (no bloquear)
```

---

## 13. Ambiente de Desarrollo Local

| Servicio | URL local | Herramienta |
|---|---|---|
| App Next.js | localhost:3000 | `next dev` |
| Supabase DB + Auth + Realtime + Email | localhost:54321 (API) / localhost:54323 (Studio) / localhost:54324 (Inbucket email) | `npx supabase start` |
| Worker WhatsApp + cron | localhost:3001 | Node.js directo o Docker |
| Redis | localhost:6379 | `docker run -d -p 6379:6379 redis:alpine` |
| Webhook público para Meta | URL ngrok | `ngrok http 3001` |

### 13.1 Comandos de Arranque

```bash
# 1. Levantar Supabase local
npx supabase start
# Studio: http://localhost:54323 | Email UI: http://localhost:54324

# 2. Aplicar migraciones + seed completo
npx supabase db reset

# 3. Redis local
docker run -d -p 6379:6379 redis:alpine

# 4. Worker WhatsApp (en otra terminal)
cd worker && npm install && npm run dev

# 5. Exponer webhook de WhatsApp (en otra terminal)
ngrok http 3001
# Copiar la URL https://xxxx.ngrok.io y configurar en Meta Developers como webhook

# 6. App Next.js (en otra terminal)
npm install && npm run dev
# App disponible en http://localhost:3000
```

### 13.2 Variables de Entorno Requeridas

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>

# Worker WhatsApp
META_WEBHOOK_VERIFY_TOKEN=<token-secreto>
META_ACCESS_TOKEN=<sandbox-token-de-meta>
META_PHONE_NUMBER_ID=<id-del-numero-de-meta>
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (dev usa Inbucket, no se necesita en local)
RESEND_API_KEY=<solo-para-produccion>

# Web Push
VAPID_PUBLIC_KEY=<generar-con-web-push-generate-vapid-keys>
VAPID_PRIVATE_KEY=<generar-con-web-push-generate-vapid-keys>
```

### 13.3 WhatsApp Sandbox (Desarrollo)

| Paso | Descripción |
|---|---|
| 1. Crear app | Meta Developers → Crear app de tipo 'Business' → Agregar producto WhatsApp → Se genera número de test automáticamente. |
| 2. Agregar testers | Hasta 5 números personales como receptores de test (reciben WA reales durante desarrollo). |
| 3. Configurar webhook | URL de ngrok + `/api/whatsapp/webhook` como endpoint. Token debe coincidir con `META_WEBHOOK_VERIFY_TOKEN`. |
| 4. Token | El token del sandbox dura 24hs. Para producción usar System User token permanente. |

---

## 14. Infraestructura y Costos

| Componente | A — ~$17/mes (dev) | B — ~$26/mes ⭐ RECOMENDADA | C — ~$62/mes (escala) |
|---|---|---|---|
| App Next.js | Vercel Hobby — $0* | Render Web Service — $7 | Vercel Pro — $20 |
| Base de datos | Supabase Free + health check | Supabase Free + health check | Supabase Pro — $25 (backups) |
| Worker WA + Cron | Railway Hobby — $5 | Render Worker — $7 | Railway Hobby — $5 |
| Redis | Upstash Free | Render Redis Free (25MB) | Upstash Free |
| Email | Resend Free | Resend Free | Resend Free |
| Mensajes WA | Meta Cloud API ~$12 | Meta Cloud API ~$12 | Meta Cloud API ~$12 |
| Facturas | 4 proveedores | 2 proveedores (Render + Supabase) | 5 proveedores |
| Backups DB | No | No | Sí (automáticos) |
| Uso comercial | *Solo personal | Sin restricción | Sin restricción |
| Ideal para | Pruebas/desarrollo | Arranque en producción | Crecimiento del club |

> ⚠️ Opción A con Vercel Hobby: restricción de uso no comercial. Solo para desarrollo/pruebas.  
> ⚠️ Opciones A y B usan Supabase Free: configurar health check horario (GitHub Actions o cron en el worker) para evitar pausa automática por inactividad en vacaciones del club.

---

## 15. Seed de Datos de Prueba

### 15.1 Usuarios de Prueba

| Email | Contraseña | Roles | Plan fijo asignado |
|---|---|---|---|
| admin@newbery.com | password123 | `['admin']` | Sin plan (no juega) |
| profe@newbery.com | password123 | `['player','admin']` | Lun 18:30, Mié 18:30, Jue 18:30 |
| colaborador@newbery.com | password123 | `['player','collaborator']` | Mar 16:30, Jue 16:30 |
| jugador1@newbery.com | password123 | `['player']` | Sáb 10:00 (1 clase/semana) |
| jugador2@newbery.com | password123 | `['player']` | Lun 18:30, Mié 18:30 (2 clases/semana) |
| jugador3@newbery.com | password123 | `['player']` | Lun 18:30, Mié 18:30, Vie 17:00 (3 clases/semana) |

> **Todas las contraseñas en el seed deben ser `password123`.**

### 15.2 Jugadores Ficticios (30 perfiles)

| Grupo | Cantidad | Plan fijo | Estado |
|---|---|---|---|
| 1 clase/semana | 10 | 1 slot (sábado o viernes) | 8 activos, 2 pre_registered |
| 2 clases/semana | 10 | 2 slots (ej: lun + mié) | 9 activos, 1 pending |
| 3+ clases/semana | 10 | 3+ slots | 10 activos |

- Todos los perfiles con: nombre, apellido, DNI ficticio (8 dígitos), teléfono +54 9 11 XXXX-XXXX.
- Campos: `birth_date`, `locality`, `tmt_code`, `fetemba_code` (valores ficticios).
- Historial pre-generado de 8 semanas con cancelaciones y no-shows.
- Semáforo de pagos: 10 al día, 10 deben este mes, 10 deben meses anteriores (total 15 deben meses anteriores según seed).
- 1 `registration_request` pending + 1 approved.
- 1 `plan_change_request` pending + 1 approved.
- Cron job ejecutado para generar instancias y bookings de las próximas 2 semanas.
- Lunes 16:30 con 15 asignados (sobre cupo) para testear badge.

---

## 16. Bugs Conocidos y Pendientes

| Bug | Descripción | Fix |
|---|---|---|
| Mi Plan — null day_of_week | `MiPlanClient.tsx` línea ~37: TypeError al leer `training_slots.day_of_week` en `slot_assignments` sin join. | `.filter(a => a.training_slots !== null)` antes del `.sort()`. Verificar que el SELECT incluya `training_slots(*)` |
| Mi Perfil — no carga datos | Los campos del formulario aparecen vacíos aunque el jugador tiene datos en `player_profiles`. | El useEffect debe hacer query: `.select('name,lastname,nickname,phone_whatsapp,birth_date,locality,tmt_code,fetemba_code')` |
| Dropdowns fondo blanco | Los `<select>` nativos muestran fondo blanco con texto blanco en algunos browsers. | CSS global: `select { background: #1C1C1C; color: white; } select option { background: #1C1C1C; color: white; }` |
| Editor — pestaña incorrecta para colaborador | El colaborador ve ambas pestañas del Editor. Solo debe ver "Configurar turno". | Condicionar visibilidad de la pestaña "Asignar jugadores" según rol activo. |

---

## 17. Actualizaciones Post v8.0 (Implementadas)

### Estado de Cuenta "Deshabilitado"

Se agregó el valor `"disabled"` al enum `account_status` (migración `20240008_add_disabled_status.sql`). Estados válidos: `active | pending | pre_registered | suspended | disabled`.

### Pantalla de Asistencia — Cambios UI

- El encabezado de cada turno muestra "X/Y anotados". Se eliminó el contador de presentes separado.
- Los botones de marcado son solo: **Presente**, **Ausente**, **No se presentó**. Se eliminó "Canceló tarde".
- El botón "Cancelar clase" es un botón secundario con borde rojo (reemplaza el link de texto anterior).

### Login desde Red Interna (LAN)

El login de email/contraseña usa la ruta API `/api/auth/login` (server-side). El servidor Next.js se comunica con GoTrue via URL interna Docker (`http://kong:8000`), evitando el error CORS desde dispositivos en la red local.

El cliente Supabase en el browser usa dinámicamente `window.location.hostname` en lugar del hostname del build, de modo que funciona desde cualquier dispositivo en la red.

### Toggle de Rol (RoleSwitcher)

El estado del rol activo se guarda en la cookie `_active_role` para sobrevivir remontadas de layout de Next.js al navegar entre grupos de rutas `(admin)` y `(dashboard)`. El `useState` initializer lee la cookie directamente, garantizando que el cambio de rol funcione con un solo click.

### Selector de Perfil desde Avatar

Cuando un usuario tiene más de un rol, puede cambiar entre perfiles también desde el dropdown del avatar (no solo desde el RoleSwitcher del header), garantizando accesibilidad en mobile donde el header puede quedar oculto.

---

## 18. Prompt Completo para Claude Code

Copiar el siguiente bloque COMPLETO como primer mensaje en Claude Code para implementar el sistema desde cero.

```
Implementá una PWA completa de gestión de turnos para el Club Jorge Newbery
Sección Tenis de Mesa, Wilde, Argentina.

════════════════════════════════════════════════════
IDENTIDAD VISUAL
════════════════════════════════════════════════════
Dark mode completo. Colores: negro #111111 (fondo), verde #1E7A34 (primario),
blanco (texto). Escudo: SVG círculo negro con borde verde, banda diagonal blanca,
letras J y N en verde. Ver sección 2 del documento para paleta completa.
TODOS los select/dropdown con fondo #1C1C1C y texto blanco — nunca usar select nativo sin estilar.

════════════════════════════════════════════════════
STACK
════════════════════════════════════════════════════
- Next.js 14 App Router + Tailwind CSS + next-pwa
- Supabase: PostgreSQL + Auth (email+pass + Google OAuth) + Realtime + RLS
- @dnd-kit/core + @dnd-kit/sortable (editor drag & drop — REQUIERE 'use client')
- Meta WhatsApp Cloud API: worker Node.js separado, envío + recepción de mensajes
- Upstash Redis: estado temporal de ofertas de lista de espera
- web-push (VAPID): notificaciones push PWA
- Resend: emails en prod / Inbucket: emails en desarrollo local
- Deploy: Render (app + worker) + Supabase Free + health check horario

════════════════════════════════════════════════════
MODELO DE DATOS (ver sección 4 para SQL completo)
════════════════════════════════════════════════════
Tablas: user_accounts, player_profiles, training_slots, slot_instances,
slot_assignments, plan_change_requests, registration_requests, bookings,
waitlist_offers, favorite_slots, notification_prefs, payments, attendance,
system_config.

CRÍTICO — player_profiles incluye columnas:
name, lastname, nickname, phone_whatsapp, birth_date, locality,
tmt_code, fetemba_code, status, push_subscription, notes

CRÍTICO — slot_assignments:
valid_from DATE, valid_until DATE (nullable = vigente indefinidamente)
NUNCA hacer DELETE. Usar valid_until para dar de baja.

CRÍTICO — bookings.type: auto | manual_extra | manual_cancel_recovery
CRÍTICO — user_accounts.roles: TEXT[] (array, soporta rol dual)

════════════════════════════════════════════════════
TURNOS SEED (14 turnos semanales, cupo 12)
════════════════════════════════════════════════════
Lun-Jue: 16:30-18:30 / 18:30-20:15 / 20:15-22:00
Viernes: 17:00-19:00
Sábado: 10:00-11:30 / 11:30-13:30

════════════════════════════════════════════════════
REGLAS DE NEGOCIO CRÍTICAS
════════════════════════════════════════════════════
1. PLAN FIJO + CRON JOB
Cada jugador tiene slot_assignments (plan fijo semanal).
Cron job domingos 00:00 AR: genera slot_instances + bookings type='auto'
para la semana siguiente.

2. TRES OPERACIONES DEL JUGADOR
a) Cancelación puntual: cancela UNA booking. No afecta el plan.
   Libera cupo → activa lista de espera.
b) Reserva extra: booking fuera del plan. Requiere cupo disponible.
c) Cambio de plan: crea plan_change_request. Con fecha de inicio.
   auto_approve configurable (default false). Admin aprueba/rechaza.

3. LISTA DE ESPERA FIFO
Al liberarse cupo → WA al primero en espera:
'Respondé SI para confirmar o NO para rechazar. Link: [url] (válido 30 min)'
Worker escucha respuestas WA via webhook Meta. Estado en Upstash Redis.
SI/si/s/1 → confirma. NO/no/n/2 → rechaza → siguiente en lista.
Si nadie confirma → WA al grupo del club + WA a favoritos.

4. REGISTRO EN 2 PASOS
Paso 1: datos personales. DNI dispara búsqueda → pre-completa si pre-registrado.
Paso 2 (solo jugador nuevo): elegir cantidad de días/semana → checkboxes
para Opción A (N turnos) + Opción B (N turnos alternativos).
Para pre-registrado: paso 2 en solo lectura con turnos ya asignados.
Al registrar → crea registration_request. Admin aprueba desde panel.
Al aprobar → slot_assignments + notificación WA + email al jugador.

5. EDITOR DRAG & DROP
DEBE tener 'use client'. Usar @dnd-kit.
DndContext envuelve panel de jugadores + slots.
useDraggable({id: 'jugador-'+profileId}) para cada jugador.
useDroppable({id: 'slot-'+slotId}) para cada slot.
Al cargar: query slot_assignments activos para el día seleccionado.
Pre-poblar slots. Panel 'Sin asignar' muestra solo jugadores sin asignación ese día.
Al guardar: INSERT nuevos, UPDATE valid_until en quitados (NO DELETE).
Badge ovalado por slot: 'Con lugar' (verde) | 'Casi lleno' (naranja)
| 'Completo' (rojo) | 'Sobre cupo' (rojo brillante + borde).

6. UI CALENDARIO JUGADOR
7 días desde hoy (sin domingo). Filas por día, turnos en columnas.
Lun-Jue: 3 col. Vie: 1 col. Sáb: 2 col.
Todos los turnos siempre visibles aunque estén llenos.
Cards con barra de progreso 4px + badge de cupo + botón contextual.
Estados: Libre / Poco cupo / Lleno / Confirmado / En espera.

7. ROLES
player: calendario + mi plan + perfil + preferencias.
collaborator: + marcar asistencia + registrar pagos + ver lista anotados.
admin: + todo lo anterior + jugadores + solicitudes + editor + config.
Rol dual: si roles contiene más de uno, mostrar selector de vista al entrar.

8. SIN BAJA FÍSICA
player_profiles.status: active | suspended | disabled. NUNCA DELETE.

9. ACTIVIDAD DEL JUGADOR (en detalle admin)
Solo mostrar excepciones: bookings type != 'auto'.
Traducir: manual_extra → 'Reserva extra', cancelled → 'Cancelación',
cancelled_late → 'Cancelación tardía', no_show → 'No se presentó'.

10. PREFERENCIAS DEL JUGADOR
3 secciones: Avisos WA (2 toggles) + Push notifications (botón activar)
+ Turnos favoritos (checkboxes agrupados por día, guarda en favorite_slots).
NO mostrar el teléfono en Preferencias — va en /perfil.

════════════════════════════════════════════════════
SEED DE PRUEBA
════════════════════════════════════════════════════
Usuarios: admin@newbery.com/password123 (admin) |
profe@newbery.com/password123 (player+admin) |
colaborador@newbery.com/password123 (player+collaborator) |
jugador1@newbery.com/password123 (player, 1 clase/sem) |
jugador2@newbery.com/password123 (player, 2 clases/sem) |
jugador3@newbery.com/password123 (player, 3 clases/sem)

30 jugadores ficticios: 10 de 1x, 10 de 2x, 10 de 3x+.
Todos con: name, lastname, dni, phone_whatsapp, birth_date, locality,
tmt_code, fetemba_code poblados con datos ficticios.
Historial 8 semanas. Semáforo pagos: 10/10/15.
1 registration_request pending + 1 approved.
1 plan_change_request pending + 1 approved.
Lunes 16:30 con 15 asignados (sobre cupo) para testear badge.

════════════════════════════════════════════════════
ORDEN DE IMPLEMENTACIÓN
════════════════════════════════════════════════════
1.  SQL completo: tablas, RLS, índices, triggers, seed turnos, seed system_config
2.  Script importación CSV: columnas nombre,apellido,dni,telefono_whatsapp,email,turnos
    El campo turnos usa formato dia_HHMM separado por | (ej: lunes_1830|miercoles_1830)
    Al importar: crear player_profile (pre_registered) + slot_assignments automáticamente.
    Si turno inválido: importar el jugador igual y reportar el error en el resumen.
3.  docker-compose.yml: app + worker + redis (Supabase via CLI separado)
4.  Estructura Next.js + configuración PWA + manifest (colores del club)
5.  Auth: registro 2 pasos con DNI, Google OAuth, login, selector de vista rol dual
6.  Calendario jugador: 7 días, filas por día, columnas por turno, todos los estados
7.  Mi Plan: plan fijo + solicitud de cambio
8.  Mi Perfil: todos los campos (name, lastname, nickname, birth_date, locality,
    tmt_code, fetemba_code) + query correcta que cargue los datos al montar
9.  Preferencias: 2 toggles WA + push + favoritos
10. Cron job: generación semanal de instancias y bookings automáticas
11. Worker WhatsApp Cloud API: webhook Meta + envío + recepción SI/NO + Redis
12. Web Push: suscripción desde PWA + envío desde worker
13. Panel admin: Jugadores (listado + detalle completo)
14. Panel admin: Solicitudes (nuevos registros + cambios de plan)
15. Panel admin: Asistencia (por fecha + por turno + checkboxes)
16. Panel admin: Pagos (resumen + listado + modal registrar)
17. Editor drag & drop (@dnd-kit, 'use client', pre-carga, badges de estado)
18. Panel admin: Configuración (todos los parámetros de system_config)
19. Seed completo de prueba con todos los datos ficticios
20. Health check horario para Supabase Free (GitHub Actions o cron en worker)

Idioma: español argentino. Zona horaria: America/Argentina/Buenos_Aires.
UTC en DB, display en AR. Cupo default: 12.
```

---

## 19. Checklist de Validación

### Área del Jugador
- [ ] Calendario muestra 7 días desde hoy con todos los turnos y estados correctos
- [ ] Card 'Confirmado' con botón Cancelar. Card 'Lleno' con botón Anotarme a la espera.
- [ ] Mi Plan muestra el plan fijo y permite solicitar cambio de días
- [ ] Mi Perfil carga los datos del jugador al entrar (no aparece vacío)
- [ ] Preferencias: 2 toggles WA + push + estrellas de favoritos funcionando
- [ ] Menú de usuario: Mi Perfil / Preferencias / Salir. Rol en español.

### Panel Admin
- [ ] Jugadores: listado con badges de clases/semana y semáforo de pago
- [ ] Detalle jugador: todos los campos + plan + estado + pagos + actividad (solo excepciones) + roles
- [ ] Solicitudes: badges de contador + ambos tabs funcionando con cupos visibles
- [ ] Asistencia: muestra jugadores anotados por turno con 3 botones (Presente/Ausente/No se presentó)
- [ ] Pagos: resumen 3 cards + listado + modal registrar pago
- [ ] Editor: botones de días, pre-carga de asignaciones, drag & drop funcional, badges de estado
- [ ] Configuración: todos los parámetros editables

### Sistema
- [ ] Dropdowns/select con fondo oscuro en todos los browsers
- [ ] Cron job genera instancias y bookings automáticas correctamente
- [ ] Lista de espera: WA enviado + confirmación por respuesta SI/NO en WA
- [ ] Broadcast a grupo cuando no hay lista de espera
- [ ] Registro en 2 pasos con DNI: pre-completa para pre-registrados
- [ ] PWA instalable en Android y iOS Safari ≥ 16.4
- [ ] Health check horario a Supabase configurado
- [ ] Login funciona desde cualquier dispositivo en la red local (LAN)
- [ ] Toggle de rol (RoleSwitcher) funciona con un solo click

---

*Especificación v8.0 + actualizaciones — Junio 2026*
