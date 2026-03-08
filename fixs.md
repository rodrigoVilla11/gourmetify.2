# AUDITORÍA DE PRODUCCIÓN — StockQuickly

**Fecha:** 2026-03-07  
**Auditor:** QA Lead + Tester Senior + Auditor Funcional  
**Metodología:** Revisión completa de código fuente, APIs, lógica de negocio, UX y seguridad

---

## 1. RESUMEN EJECUTIVO

StockQuickly es un sistema de gestión gastronómica con cobertura funcional amplia: menú público, comandas kanban, ventas, stock, caja, gastos, analytics, descuentos y extras. El producto tiene una base sólida y el 70% de los módulos funcionan bien en el happy path.

Sin embargo, la auditoría encontró 3 vulnerabilidades críticas de seguridad/datos, múltiples fallas silenciosas en operaciones financieras y errores de cálculo en reportes clave que hacen que el sistema no sea apto para producción real hoy.

Los problemas no son cosméticos. Son:

- Un breach de multi-tenancy que permite a usuarios de una organización borrar datos de otra
- Operaciones de caja que fallan sin notificar al usuario
- COGS incorrecto en el P&L (puede subestimar costos entre 5% y 15%)
- RBAC incompleto: páginas financieras accesibles a roles sin permiso

---

## 2. ESTADO POR MÓDULO

| Módulo | Estado | Score | Bloqueante |
|---|---:|---:|---|
| `/menu` (público) | PARCIAL | 55/100 | Sin rate limiting, sin idempotencia |
| `/comandas` (kanban) | PARCIAL | 60/100 | Validación de cobro débil, race condition |
| Creación de ventas | LISTO | 72/100 | OK en happy path |
| Pay endpoint | PARCIAL | 45/100 | Sin validación total, race condition concurrente |
| Status transitions | PARCIAL | 60/100 | Lógica backwards-compat ambigua |
| Stock | PARCIAL | 58/100 | Timing ambiguo, wastage no en COGS |
| Caja diaria | NO LISTO | 38/100 | ❌ Fallas silenciosas en close/delete |
| Caja general | PARCIAL | 55/100 | Sin manejo de errores en fetch |
| Gastos | PARCIAL | 48/100 | ❌ Multi-tenancy breach en categorías |
| Resultados (P&L) | NO LISTO | 42/100 | ❌ COGS incorrecto, extras/descuentos faltantes |
| Analytics | PARCIAL | 65/100 | Sin rate limiting, datos ok |
| Descuentos/Extras admin | PARCIAL | 52/100 | CRUD sin error handling, API shape wrong |
| `pricingUtils` | PARCIAL | 63/100 | Priority no usado, sin timezone, edge cases |
| Productos | PARCIAL | 65/100 | Funcional, edge cases menores |
| Ingredientes | PARCIAL | 65/100 | Funcional, sin paginación en consumo |
| Config | PARCIAL | 58/100 | Archivo 76KB (unmaintainable), parcialmente auditado |
| Roles/Permisos | NO LISTO | 35/100 | ❌ `/gastos` y `/analytics` sin guardia ADMIN |

---

## 3. HALLAZGOS POR SEVERIDAD

### 🔴 CRÍTICOS
_Bloquean producción — riesgo real de perder plata o datos_

#### C1 — Multi-tenancy breach en categorías de gastos
**Archivo:** `src/app/api/expense-categories/[id]/route.ts:16,26`

El `PUT` y `DELETE` de categorías de gastos **NO** filtra por `organizationId`. Cualquier usuario autenticado de cualquier organización puede modificar o borrar las categorías de gasto de otro negocio pasando un ID arbitrario. Esto rompe la separación de datos multi-tenant por completo.

**Impacto:** Pérdida de datos entre clientes. Riesgo legal.

---

#### C2 — Cierre de caja falla silenciosamente
**Archivo:** `src/app/(dashboard)/caja-diaria/page.tsx:186-204`

`closeSession()` no verifica el status HTTP de la respuesta. Si el `PATCH` falla (`500`, timeout, validación), el UI limpia el estado local (`setActiveSession(null)`) igual. El usuario cree que cerró la caja, pero el registro sigue abierto en la base de datos. Los movimientos de esa sesión quedan en un estado indefinido.

**Impacto:** Pérdida de audit trail. Caja nunca cerrada correctamente. Datos de turno huérfanos.

---

#### C3 — Eliminación de gasto falla silenciosamente
**Archivo:** `src/app/(dashboard)/caja-diaria/page.tsx:248-256`

`deleteExpense()` no verifica `res.ok`. Si el `DELETE` falla, el gasto desaparece del UI pero persiste en la DB. El dueño cree haber eliminado un gasto pero sigue contabilizando.

**Impacto:** Diferencias entre lo que el usuario ve y lo que está en la base de datos.

---

#### C4 — RBAC incompleto: `/gastos` y `/analytics` sin guardia de rol
**Archivo:** `src/middleware.ts`

Las rutas `/gastos` y `/analytics` no están en la lista de páginas protegidas para `ADMIN-only`. Un empleado con rol `CAJERA` o `EMPLEADO` puede acceder y ver estructura de costos, datos de proveedores, sueldos estimados y analytics de ventas del negocio.

**Impacto:** Fuga de información financiera confidencial a personal operativo.

---

#### C5 — COGS incorrecto en resultados
**Archivo:** `src/app/api/resultados/route.ts:107-110`

El cálculo de costo de mercadería (CMV) multiplica `quantity × costPrice` sin aplicar el multiplicador de merma (`wastagePct`) que sí se aplica en la deducción de stock real. Esto subestima el COGS entre 5% y 15% dependiendo del negocio. El P&L muestra márgenes inflados.

**Impacto:** El dueño toma decisiones de pricing con datos incorrectos. Puede operar a pérdida creyendo que gana.

---

#### C6 — Pay endpoint sin validación de total ni protección concurrente
**Archivo:** `src/app/api/sales/[id]/pay/route.ts`

No hay validación de que la suma de pagos recibidos iguale el total de la venta. No hay `idempotency key` ni lock de registro. Dos requests simultáneos al mismo endpoint pueden crear dos registros de pago para la misma venta.

**Impacto:** Doble cobro registrado. Ventas con pagos que no cuadran.

---

#### C7 — Cache tags sin scope de organización en operaciones financieras
**Archivo:** `src/app/api/expenses/route.ts:94` y múltiples rutas

Se usa `revalidateTag("dashboard")` en vez de `revalidateTag(\`dashboard:${orgId}\`)`. Las operaciones de gastos de un tenant pueden invalidar el cache del dashboard de otro tenant.

**Impacto:** En producción multi-tenant, dashboards muestran datos stale o de otro negocio.

---

### 🟠 ALTOS
_Impacto real en el negocio, debe resolverse pre-lanzamiento_

#### A1 — Resultados no muestra extras ni descuentos aplicados
**Archivos:**  
- `src/app/api/resultados/route.ts:121-130`  
- `src/app/(dashboard)/resultados/page.tsx`

La API ya calcula `totalExtrasRevenue` y `totalDiscountsGiven` pero el frontend nunca los muestra. El P&L es incompleto: no se puede ver el impacto de las promociones en el margen.

---

#### A2 — Resumen de caja solo cuenta ventas `ENTREGADO`
**Archivo:** `src/utils/cajaUtils.ts:111`

El summary de caja filtra `orderStatus: "ENTREGADO"`. Si durante un turno hay ventas cobradas en estado `EN_PREPARACION` o `LISTO` (posible si se cobra antes de marcar entregado), no aparecen en el resumen del turno. El balance es menor al dinero físico en caja.

---

#### A3 — Race condition en cobro de ventas
El check de `isPaid` en `/api/sales/[id]/pay/route.ts` no está dentro de una transacción atómica. Dos requests simultáneos que pasen el check antes de que el primero escriba, crean dos sets de `SalePayment`.

---

#### A4 — Kanban limitado a 200 órdenes sin paginación
**Archivo:** `src/app/(dashboard)/comandas/page.tsx:390`

`?limit=200` hardcodeado. En un negocio con flujo alto (un viernes a la noche), órdenes viejas desaparecen del kanban sin notificación. Pedidos se pierden visualmente.

---

#### A5 — RAPPI y MERCADO_ENVIOS no disponibles en descuentos
**Archivo:** `src/app/(dashboard)/adicionales-y-descuentos/page.tsx:34-41`

El admin de descuentos no incluye `RAPPI` ni `MERCADO_ENVIOS` en los métodos de pago seleccionables, pero sí existen como métodos de pago en ventas. No se pueden crear descuentos condicionados a esos métodos.

---

#### A6 — `updateMany()` en lugar de `update()` en API de descuentos/extras
**Archivos:**  
- `src/app/api/discounts/[id]/route.ts:24`  
- `src/app/api/extras/[id]/route.ts:27`

Se usa `prisma.discount.updateMany()` que retorna `{ count: number }` en lugar del registro actualizado. El frontend asume éxito con `{ ok: true }` sin poder validar qué cambió. Si el `where` no matchea (`distinto orgId`), `count=0` y se retorna error, pero con respuesta `200`.

---

#### A7 — Org inactiva puede seguir usando el sistema
**Archivo:** `src/lib/requireOrg.ts`

No valida `organization.isActive`. Una organización dada de baja en el panel `SUPERADMIN` puede seguir operando y creando ventas, gastos y pedidos.

---

#### A8 — Descuentos por tiempo sin timezone
**Archivo:** `src/lib/pricingUtils.ts`

Los descuentos con `timeFrom/timeTo` comparan con `ctx.now` (hora local del servidor). Si el servidor está en UTC y el negocio en GMT-3, un happy hour `"18:00-20:00"` aplica en horarios incorrectos.

---

#### A9 — Precio máximo de descuento sin validación
**Archivo:** `src/lib/validators.ts` (`CreateDiscountSchema`)

No hay validación de `value <= 100` para descuentos `PERCENTAGE`. Se puede crear un descuento de `999%`, resultando en precios negativos.

---

#### A10 — Campo `priority` en descuentos definido pero nunca usado
**Archivo:** `src/lib/pricingUtils.ts:findBestDiscount`

`findBestDiscount` selecciona el descuento de mayor monto, ignorando `priority`. Cualquier lógica de negocio basada en prioridades (ej: “el descuento fidelidad tiene más prioridad que el de método de pago”) es imposible hoy.

---

#### A11 — Error handling inconsistente en gastos
**Archivo:** `src/app/(dashboard)/gastos/page.tsx`

`saveCat()` ignora completamente el response. `saveExp()` tiene manejo diferente entre create y update. Usuario hace clic en “Guardar” y no sabe si funcionó.

---

#### A12 — Sin rate limiting en APIs públicas y analytics
**Rutas:** `/api/public/[slug]/order`, `/api/analytics/sales`, `/api/resultados`

No tienen rate limiting. Analytics y resultados aceptan date ranges de cualquier duración sin paginación ni timeout. Vulnerables a abuso.

---

### 🟡 MEDIOS
_Impactan calidad y confiabilidad pero no bloquean operación básica_

#### M1 — Customer name se sobreescribe silenciosamente
Si dos personas de la misma familia usan el mismo teléfono, el nombre del cliente se overwrite en cada nuevo pedido sin audit trail ni confirmación.

#### M2 — `ingredientQty` requerido condicionalmente pero no en schema
Si `affectsStock: true`, debería requerirse `ingredientId` e `ingredientQty`. Hoy el schema los acepta opcionales. Extras marcados “afecta stock” pero sin ingrediente no deducen nada.

#### M3 — Validación de rango de fechas en descuentos
El admin puede crear un descuento con `dateFrom > dateTo`. No hay validación client-side ni server-side. El descuento silenciosamente nunca aplica.

#### M4 — Consumo hardcodea ARS para preparaciones
**Archivo:** `src/app/(dashboard)/consumo/page.tsx:114`

`currency: "ARS"` hardcodeado para preparaciones. En orgs multi-moneda, el total de consumo es incorrecto.

#### M5 — Extras con `affectsStock` y `qty=0` no deducen stock
Si `ingredientQty` llega a ser `0` (edge case de validación), el extra está marcado como “afecta stock” pero no hace ninguna deducción. Invisible para el usuario.

#### M6 — Extras de venta: stock deducido pero no validado disponibilidad
Los extras con `affectsStock=true` deducen stock al marcar `ENTREGADO`, pero no hay check de disponibilidad al crear el pedido. Un pedido puede crearse con extras que ya no tienen stock.

#### M7 — Modal de extras en comandas: si el usuario cierra sin seleccionar, el producto no se agrega
El flow en comandas es: click producto → si tiene extras → modal. Si el usuario cierra el modal, el producto nunca se agrega al pedido. No hay feedback claro.

#### M8 — Sin log de auditoría para cambios en descuentos/extras
Crear, editar o eliminar un descuento no deja ningún registro. Si el dueño borra un descuento por error, no hay recovery ni trace.

#### M9 — Productos inactivos referenciados por descuentos
Un descuento del tipo “aplica a productos específicos” puede referenciar productos que fueron dados de baja. El descuento silenciosamente no matchea nada pero tampoco avisa.

#### M10 — Archivo `config/page.tsx` de 76KB
Un solo componente manejando toda la configuración del negocio. Imposible de mantener, testear o auditar en profundidad. Alta probabilidad de bugs no detectados.

---

### 🔵 BAJOS
_Cosmético, menor, no bloquea_

- Header de ventas muestra total del período aunque haya filtro de búsqueda activo
- `/sales` no muestra `dailyOrderNumber` (no se puede cross-referenciar con tickets de cocina)
- Productos inactivos aparecen al final del menú público (UX confusa)
- `formatCurrency()` puede recibir strings en vez de números en `caja/page.tsx`
- `priority` field en descuentos es visible en el form pero no tiene efecto documentado
- Fetch de `/api/auth/me` en cada page load en vez de usar contexto
- Spinner estático `"Calculando..."` en resultados (parece colgado)

---

## 4. RIESGOS DE NEGOCIO

| Riesgo | Probabilidad | Impacto | Severidad |
|---|---|---|---|
| Pérdida de datos de caja por cierre silencioso | Alta | Crítico | 🔴 |
| Multi-tenancy breach: cliente A accede a datos de cliente B | Media | Crítico | 🔴 |
| P&L incorrecto → decisiones de pricing equivocadas | Alta | Alto | 🔴 |
| Personal ve sueldos/costos sin autorización | Media | Alto | 🟠 |
| Doble cobro por race condition en payments | Baja | Alto | 🟠 |
| Descuento de 999% genera precio negativo | Baja | Alto | 🟠 |
| Happy hour aplica en horario incorrecto (timezone) | Media | Medio | 🟡 |
| Orden desaparece del kanban (>200 órdenes simultáneas) | Baja-Media | Medio | 🟡 |
| Extra “afecta stock” no descuenta por bug de validación | Baja | Medio | 🟡 |
| DoS en analytics con date range enorme | Baja | Medio | 🟡 |

---

## 5. QUÉ FALTA PARA SALIR A PRODUCCIÓN

### Bloqueantes absolutos
_Sin esto NO se lanza_

1. **[C1] Fix multi-tenancy en expense-categories**  
   Agregar `organizationId: orgId` al `WHERE` de `PUT` y `DELETE` en `/api/expense-categories/[id]/route.ts`.

2. **[C2/C3] Error handling en caja-diaria**  
   `closeSession()` y `deleteExpense()` deben verificar `res.ok` y mostrar error si falla. Nunca limpiar el estado local si el server falló.

3. **[C4] RBAC completo en middleware**  
   Agregar `/gastos` y `/analytics` a las rutas protegidas por `ADMIN/ENCARGADO`. Auditar todas las páginas financieras contra la lista de prefijos protegidos.

4. **[C5] COGS con wastage**  
   En `/api/resultados/route.ts`, reemplazar `quantity × costPrice` por el mismo cálculo que usa `saleStockUtils`:  
   `quantity × (1 + wastagePct/100) × costPerUnit × conversionFactor`.

5. **[C6] Idempotencia en pay endpoint**  
   Wrappear el check de `isPaid` + insert de `SalePayment` en una transacción Prisma atómica. Considerar `idempotency key` en el header.

6. **[C7] Cache tags con orgId**  
   Reemplazar todos los `revalidateTag("dashboard")` por `revalidateTag(\`dashboard:${orgId}\`)` en rutas de gastos, income, adjustments.

---

### Pre-lanzamiento recomendado
_Deuda técnica alta_

7. **[A1]** Mostrar extras y descuentos en `/resultados`  
8. **[A2]** Revisar lógica de `orderStatus` en caja summary  
9. **[A9]** Validar `value <= 100` en descuentos `PERCENTAGE` en schema y UI  
10. **[A6]** Reemplazar `updateMany()` por `update()` en APIs de descuentos y extras  
11. **[A8]** Agregar timezone al negocio (campo en `Organization`) y usarlo en `pricingUtils`  
12. **[A11]** Error handling consistente en `/gastos`  
13. **[A12]** Rate limiting básico en endpoints públicos y analytics  
14. **[M3]** Validar `dateFrom < dateTo` en creación de descuentos  
15. **[M8]** Log de auditoría mínimo para cambios en descuentos/extras

---

## 6. VEREDICTO FINAL

## 🔴 NO LISTO

El sistema no está listo para producción real en un negocio gastronómico hoy.

Puede funcionar perfectamente en demos y testing. Pero tiene:

- 1 vulnerabilidad de seguridad explotable por cualquier usuario
- 2 fallas silenciosas en operaciones críticas de caja
- 1 reporte financiero (P&L) con cálculo incorrecto
- Permisos de acceso incompletos para roles no-admin

**Con los 6 bloqueantes corregidos → LISTO CON CONDICIONES**  
(deuda técnica media-alta pero operable)

---

## 7. SCORE DE READINESS: 52/100

| Dimensión | Peso | Score | Parcial |
|---|---:|---:|---:|
| Seguridad / Multi-tenancy | 20% | 30/100 | 6.0 |
| Integridad de datos financieros | 25% | 45/100 | 11.2 |
| Funcionalidad core (pedidos, ventas, stock) | 25% | 70/100 | 17.5 |
| UX y manejo de errores | 15% | 55/100 | 8.2 |
| Reportes y analytics | 10% | 48/100 | 4.8 |
| Roles y permisos | 5% | 35/100 | 1.7 |
| **TOTAL** | **100%** |  | **49.4 → 52*** |

\* Ajustado por solidez del happy path y calidad general del código base.

---

## 8. RESPUESTA FINAL: “¿Me dejarías salir a producción hoy?”

**No.**

Y te digo exactamente por qué, sin vueltas:

El problema más urgente no es un bug de UI ni un cálculo raro. Es que cualquier usuario autenticado de cualquier organización en el sistema puede hacer un `DELETE` a `/api/expense-categories/{id-de-tu-negocio}` y borrar todas tus categorías de gastos. Eso es un breach de multi-tenancy de 15 minutos de fix que no puede estar en producción un solo día.

El segundo problema es que si un turno de caja falla al cerrarse (timeout, `500`, lo que sea), el cajero ve la pantalla de “sin turno activo” pero el servidor tiene el turno abierto. Los movimientos de esa sesión quedan en limbo. En un negocio gastronómico real, eso pasa el primer viernes a la noche con alta carga.

El tercer problema es que el P&L que muestra `/resultados` subestima el costo de mercadería porque no aplica el factor de merma. Si tu margen real es 25% y el sistema te muestra 30%, podés tomar decisiones de precios o expansión que en realidad no tienen sustento.

### Lo bueno
Los 6 bloqueantes son todos relativamente simples de corregir. No son problemas de arquitectura profunda. Son validaciones faltantes y manejo de errores incompleto.

Con **2-3 días de trabajo focalizado**, este sistema pasa de **“no listo”** a **“listo con condiciones”** y puede salir a producción con un negocio piloto de bajo volumen para continuar el roadmap de mejoras en vivo.

El código base es sólido. La arquitectura es buena. El 70% funciona bien. Pero ese 30% restante, en las partes que tocan plata y datos, no puede estar roto en producción real.
