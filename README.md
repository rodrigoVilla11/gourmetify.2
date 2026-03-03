# StockQuickly

MVP de gestión de stock para negocios gastronómicos.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Prisma ORM** + SQLite (listo para migrar a Postgres)
- **Sin autenticación** (modo local, MVP)

## Cómo levantar el proyecto

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# El archivo ya tiene DATABASE_URL="file:./dev.db"

# 3. Crear base de datos y correr migraciones
npm run db:migrate

# 4. (Opcional) Cargar datos de prueba
npm run db:seed

# 5. Iniciar servidor de desarrollo
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en el navegador.

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run db:migrate` | Crea/actualiza el schema en la DB |
| `npm run db:seed` | Carga datos de prueba |
| `npm run db:studio` | Abre Prisma Studio (UI para la DB) |
| `npm run db:reset` | Resetea la DB y re-aplica migraciones |

## Funcionalidades

### Ingredientes
- CRUD completo con unidades (KG, G, L, mL, unidades)
- Stock actual, stock mínimo y alerta de stock bajo
- Costo por unidad y moneda (ARS/EUR/USD)
- Asociación con proveedor

### Proveedores
- CRUD completo
- Vista de ingredientes asociados

### Productos
- CRUD con receta/BOM (Bill of Materials)
- Soporte de **conversión de unidades** en BOM (ej: ingrediente en KG, BOM en G)
- **Merma (wastagePct)**: porcentaje extra de consumo por desperdicio

### Ventas
- Registro de venta multi-producto
- **Descuento automático de stock** al confirmar (transacción atómica)
- Permite stock negativo con **warning visible**
- Ledger de movimientos por venta

### Ajustes de Stock
- Entrada/salida manual con motivo
- Historial de ajustes

### Dashboard
- Ingredientes bajo mínimo
- Últimas 5 ventas
- Top 5 productos más vendidos (últimos 30 días)
- KPIs: total ingredientes, productos, ventas de hoy

## Conversión de unidades

La lógica vive en `src/utils/units.ts`:

- Masa: `KG <-> G` (base: G)
- Volumen: `L <-> ML` (base: ML)
- Count: `UNIT` (sin conversión)
- Conversiones entre familias distintas (ej. KG -> L) lanza error

## Migrar a Postgres

1. Cambiá `provider = "sqlite"` a `provider = "postgresql"` en `prisma/schema.prisma`
2. Actualizá `DATABASE_URL` en `.env` con tu connection string de Postgres
3. Corré `npm run db:migrate`

## Estructura de carpetas

```
src/
  app/
    (dashboard)/     # Route group con sidebar layout
      page.tsx       # Dashboard
      ingredients/   # Ingredientes
      products/      # Productos + BOM
      suppliers/     # Proveedores
      sales/         # Ventas
      adjustments/   # Ajustes de stock
    api/             # API Routes
  components/
    ui/              # Primitivos (Button, Input, Modal, Table, etc.)
    layout/          # Sidebar
  lib/               # prisma.ts, validators.ts
  utils/             # units.ts, currency.ts, cn.ts
  types/             # index.ts
prisma/
  schema.prisma      # Schema completo
  seed.ts            # Datos de prueba
```
