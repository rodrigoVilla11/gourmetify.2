# TODO — StockQuickly MVP

Items pendientes para las próximas iteraciones.

## Alta Prioridad

- [ ] **Auth básica**: email/password con JWT o NextAuth.js. Actualmente sin protección.
- [ ] **Validación de formularios en el cliente**: Integrar `zodResolver` de react-hook-form con los schemas de Zod para feedback inmediato.
- [ ] **Paginación**: Las listas de ventas, movimientos e ingredientes no paginan más allá de los límites configurados.
- [ ] **Detalle de ingrediente**: Página `/ingredients/[id]` con historial de movimientos de stock del ingrediente.
- [ ] **Detalle de producto**: Página `/products/[id]` con BOM en lectura, costo estimado total.
- [ ] **Compras (PURCHASE)**: Módulo para registrar entrada de stock desde proveedores, generando movimiento tipo PURCHASE y actualizando onHand.

## Media Prioridad

- [ ] **Búsqueda y filtros**: Filtro por nombre en todas las listas. Filtro de ventas por fecha.
- [ ] **Exportar CSV/Excel**: Exportar ingredientes, ventas, movimientos.
- [ ] **Skeleton loading**: Reemplazar el Spinner genérico con skeleton screens por página.
- [ ] **Toast notifications**: Notificaciones de éxito/error (actualmente solo Alert inline).
- [ ] **Sidebar responsive**: Hamburger menu para mobile.
- [ ] **Manejo de errores de API**: Mostrar mensajes de error del API en los formularios en lugar de silenciarlos.

## Baja Prioridad / Futuro

- [ ] **Multi-moneda**: Convertir precios a una moneda base para reportes.
- [ ] **Reportes**: Gráfico de ventas por período, costo de materiales por producto.
- [ ] **Clientes**: Asociar ventas a clientes (para facturación futura).
- [ ] **Facturación**: Comprobantes de venta.
- [ ] **Inventario periódico**: Wizard para hacer inventario y ajustar stock masivamente.
- [ ] **Notificaciones de stock bajo**: Email o push cuando un ingrediente baja del mínimo.
- [ ] **Multi-tenant / Sucursales**: Soporte para múltiples locales.
- [ ] **Migración a Postgres**: Cambiar `provider` en schema.prisma y connection string.
- [ ] **Tests**: Unit tests para `utils/units.ts` y la lógica de descuento de ventas.
- [ ] **Deploy**: Dockerfile + variables de entorno para producción.

## Bugs Conocidos

- En el formulario de producto, al cambiar el ingrediente de un BOM row, la unidad no se resetea automáticamente al valor por defecto del nuevo ingrediente.
- El seed no re-aplica los descuentos de stock si se corre dos veces (usa `upsert` pero los movimientos son idempotentes solo para la venta demo).
