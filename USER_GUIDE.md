# StockQuickly — Manual de Usuario

> Guía completa para dueños y encargados de negocios gastronómicos.
> Está pensada para usuarios sin conocimientos técnicos.

---

## Índice

1. [¿Qué es StockQuickly?](#1-qué-es-stockquickly)
2. [Primeros pasos — Configuración inicial](#2-primeros-pasos--configuración-inicial)
3. [Usuarios y roles](#3-usuarios-y-roles)
4. [Configuración del negocio](#4-configuración-del-negocio)
5. [Ingredientes](#5-ingredientes)
6. [Preparaciones](#6-preparaciones)
7. [Productos](#7-productos)
8. [Combos](#8-combos)
9. [Descuentos y Adicionales (Extras)](#9-descuentos-y-adicionales-extras)
10. [Carga Masiva — Importación y Exportación Excel](#10-carga-masiva--importación-y-exportación-excel)
11. [Comandas (Sistema de Pedidos)](#11-comandas-sistema-de-pedidos)
12. [Ventas](#12-ventas)
13. [Clientes](#13-clientes)
14. [Repartidores](#14-repartidores)
15. [Menú Público Online](#15-menú-público-online)
16. [Caja Diaria](#16-caja-diaria)
17. [Caja General](#17-caja-general)
18. [Gastos](#18-gastos)
19. [Proveedores](#19-proveedores)
20. [Pedidos a Proveedores](#20-pedidos-a-proveedores)
21. [Facturas de Proveedores](#21-facturas-de-proveedores)
22. [Cuentas Corrientes](#22-cuentas-corrientes)
23. [Ajustes de Stock](#23-ajustes-de-stock)
24. [Consumo de Insumos](#24-consumo-de-insumos)
25. [Empleados](#25-empleados)
26. [Horarios de Trabajo](#26-horarios-de-trabajo)
27. [Fichador](#27-fichador)
28. [Marcaciones de Tiempo](#28-marcaciones-de-tiempo)
29. [Resultados (Balance mensual)](#29-resultados-balance-mensual)
30. [Analytics de Ventas](#30-analytics-de-ventas)
31. [Dashboard](#31-dashboard)
32. [Flujos completos recomendados](#32-flujos-completos-recomendados)

---

## 1. ¿Qué es StockQuickly?

StockQuickly es un sistema de gestión para negocios gastronómicos. Permite administrar en un solo lugar:

- El inventario de ingredientes y el stock en tiempo real
- Los productos, recetas y combos del menú
- Los pedidos y ventas (sistema de comandas tipo POS)
- La caja diaria y los ingresos/egresos
- Los proveedores, facturas y pagos
- El equipo de trabajo y sus horarios

**A quién está dirigido:** dueños de pizzerías, restaurantes, hamburgueserías, cafeterías, dark kitchens y cualquier negocio que venda comida.

---

## 2. Primeros pasos — Configuración inicial

### Qué es

La primera vez que entrás al sistema, necesitás crear la cuenta de administrador y configurar el negocio. Solo se hace una vez.

### Paso a paso

1. Abrí el navegador y andá a la dirección del sistema (la que te dio tu proveedor o instalador).
2. Te va a redirigir automáticamente a `/setup`.
3. Completá los datos:
   - **Nombre del negocio** (por ejemplo: "La Pizzería del Centro")
   - **Identificador único** (slug, por ejemplo: `pizzeria-centro` — sin espacios ni caracteres especiales)
   - **Nombre de usuario** del administrador
   - **Contraseña** (mínimo 8 caracteres, recordala bien)
4. Hacé clic en **Crear cuenta**.
5. Te va a redirigir al login. Ingresá con los datos que acabás de crear.

### Consejos

- El **identificador del negocio** se usa en la URL del menú público (por ejemplo: `tusistema.com/menu/pizzeria-centro`). Elegilo bien desde el principio porque no es fácil cambiarlo después.
- Anotá la contraseña del administrador en un lugar seguro.

---

## 3. Usuarios y roles

### Qué es

El módulo de usuarios permite crear cuentas para cada persona que trabaja en el negocio, con distintos niveles de acceso según su rol.

### Roles disponibles

| Rol | Qué puede hacer |
|---|---|
| **ADMIN** | Todo. Acceso completo a todos los módulos |
| **ENCARGADO** | Igual que ADMIN, excepto gestión de usuarios |
| **CAJERA** | Solo Caja diaria, Facturas de proveedores y Fichador |
| **EMPLEADO** | Solo Fichador (fichar entrada/salida) |

### Para qué se usa en un negocio real

- El dueño tiene rol **ADMIN**.
- El encargado de turno tiene rol **ENCARGADO**.
- La persona en la caja tiene rol **CAJERA**.
- Los cocineros y mozos que fichan entrada/salida tienen rol **EMPLEADO**.

### Cómo usarlo paso a paso

1. Andá a **Usuarios** en el menú lateral.
2. Hacé clic en **+ Nuevo usuario**.
3. Completá:
   - **Nombre de usuario** (el que usará para ingresar)
   - **Contraseña** (provisional, puede cambiarla después)
   - **Rol** (elegí el que corresponde)
   - **Empleado** (opcional: vinculalo con un empleado del módulo Empleados)
4. Hacé clic en **Guardar**.

### Qué datos impacta

- Los usuarios controlan quién puede acceder a cada sección del sistema.
- Un usuario vinculado a un empleado puede usarse en el Fichador.

### Consejos

- No compartas contraseñas. Cada persona debe tener su propia cuenta.
- Si un empleado deja el negocio, desactivá su usuario (botón "Desactivar") en lugar de borrarlo. Así mantienen el historial de sus marcaciones y ventas.

### Errores comunes

- **"No puedo crear usuarios":** Solo el ADMIN puede hacerlo. Si no ves la sección, tu rol no lo permite.
- **"Me sale 'Acceso denegado'":** Probablemente tu usuario no tiene el rol necesario para esa sección.

---

## 4. Configuración del negocio

### Qué es

La sección de Configuración permite personalizar todos los aspectos operativos del negocio: métodos de pago aceptados, horarios de atención, zonas de delivery, imagen del negocio y plan contratado.

### Para qué se usa en un negocio real

Es lo primero que deberías completar luego de crear tu cuenta. Define cómo funciona tu negocio en el sistema.

### Cómo usarlo paso a paso

1. Andá a **Configuración** en el menú lateral.
2. Completá cada sección:

**Perfil del negocio:**
- Nombre, categoría (pizzería, restaurante, cafetería, etc.)
- Teléfono y WhatsApp (se muestra en el menú público)
- Instagram y sitio web
- Descripción (texto corto que aparece en el menú público)

**Métodos de pago:**
- Activá los que aceptás: Efectivo, Transferencia, Mercado Pago, etc.
- Para cada método podés configurar un **ajuste de precio** (descuento o recargo en %). Ejemplo: "Transferencia → 5% de descuento".
- Para Transferencia: agregá el alias o CBU de tu cuenta bancaria.
- Para Mercado Pago: agregá el link de pago.

**Horarios de atención:**
- Configurá los días y horarios en que está abierto el negocio.
- Para cerrar un día, marcá "Cerrado".
- Podés agregar un segundo turno (por ejemplo, almuerzo y cena).

**Modalidades de venta:**
- Activá las que usás: Salón, Delivery, Para llevar (Takeaway).

**Zonas de delivery:**
- Solo si tenés delivery habilitado.
- Podés dibujar zonas circulares (por radio en km) o zonas personalizadas en el mapa.
- A cada zona le asignás un precio de envío.
- El sistema verifica automáticamente si la dirección del cliente está dentro de una zona al tomar el pedido.

**Colores e imagen:**
- Subí el logo del negocio y una imagen de portada.
- Elegí los colores principales del menú público.

### Qué datos impacta

- Los métodos de pago configurados son los que aparecen disponibles al cobrar en el POS.
- Las zonas de delivery se verifican automáticamente en las comandas.
- El horario de atención puede condicionar el Fichador (entrada antes de tiempo).

### Consejos

- Configurá los métodos de pago antes de empezar a vender. Si no están activos, no van a aparecer al cobrar.
- Las zonas de delivery requieren ingresar la dirección del negocio primero (lat/long).

---

## 5. Ingredientes

### Qué es

Los ingredientes son las materias primas que usás para preparar tus productos. El sistema rastrea cuánto stock tenés de cada uno y te avisa cuando baja del mínimo.

### Para qué se usa en un negocio real

Una pizzería carga: harina, levadura, queso mozzarella, tomate, aceite, etc. Cada vez que se vende una pizza, el sistema descuenta automáticamente la harina, el queso y los demás ingredientes que lleva esa pizza.

### Cómo usarlo paso a paso

**Para cargar un nuevo ingrediente:**

1. Andá a **Ingredientes** en el menú lateral.
2. Hacé clic en **+ Nuevo ingrediente**.
3. Completá los datos:
   - **Nombre:** "Harina 000" (claro y específico)
   - **Unidad:** KG, G, L, ML, o UNIT (ver tabla abajo)
   - **Stock actual:** cuánto tenés ahora mismo
   - **Stock mínimo:** a partir de qué cantidad querés que el sistema te avise
   - **Costo por unidad:** cuánto te cuesta cada unidad (en la misma unidad que elegiste)
   - **Moneda:** ARS, USD o EUR
   - **Proveedor:** el proveedor del que lo comprás (opcional)
4. Hacé clic en **Guardar**.

**Tabla de unidades:**

| Unidad | Cuándo usarla |
|---|---|
| KG | Sólidos que se pesan en kilos (harina, queso, carne) |
| G | Sólidos en gramos (especias, ingredientes pequeños) |
| L | Líquidos en litros (aceite, leche, salsas) |
| ML | Líquidos en mililitros (extractos, aderezos pequeños) |
| UNIT | Cosas que se cuentan (huevos, porciones, cajitas) |

> **Tip:** KG y G son compatibles entre sí. L y ML también. Podés cargar el ingrediente en KG y usarlo en la receta en G.

### Qué datos impacta

- El stock de cada ingrediente baja automáticamente cada vez que se vende un producto que lo lleva (en el momento en que el pedido pasa a "En preparación").
- El costo de los ingredientes calcula automáticamente el costo de las preparaciones y productos.
- Si el stock baja del mínimo, aparece una alerta en el Dashboard y en la lista de ingredientes.

### Consejos

- Cargá el costo real de cada ingrediente. Eso permite que el sistema calcule el margen de ganancia de tus productos automáticamente.
- Fijá el stock mínimo con tiempo suficiente para que puedas hacer el pedido antes de quedarte sin stock. Si normalmente tardás 2 días en recibir, el mínimo debería cubrir 3-4 días de uso.
- Usá nombres claros. "Queso" es ambiguo. "Queso mozzarella bloque" es mejor.

### Errores comunes

- **"No me descuenta el stock":** El stock se descuenta cuando el pedido pasa al estado "En preparación" en Comandas, no cuando se crea. Verificá en qué estado está la comanda.
- **"Me sale el stock en negativo":** El sistema permite stock negativo con una advertencia pero no bloquea la venta. Hacé un ajuste de stock manual para corregirlo.
- **"No encuentro el ingrediente en el BOM (receta) del producto":** Verificá que el ingrediente esté activo (visible en la lista).

---

## 6. Preparaciones

### Qué es

Una preparación es un producto semielaborado que fabricás en tu cocina a partir de ingredientes, y que luego usás en la elaboración de los productos finales. También puede contener otras preparaciones (sub-recetas).

### Para qué se usa en un negocio real

**Ejemplos reales:**
- Una **masa de pizza** (harina + levadura + agua + sal) → se usa en varias pizzas diferentes.
- Una **salsa de tomate** (tomates + ajo + aceite + especias) → base para varias pizzas y pastas.
- Un **dressing de ensalada** → se aplica en varios platos.

La ventaja: en lugar de cargar los mismos 5 ingredientes en cada pizza, cargás la masa como preparación y la asociás a todos los productos que la llevan.

### Cómo usarlo paso a paso

**Crear una preparación:**

1. Andá a **Preparaciones** en el menú lateral.
2. Hacé clic en **+ Nueva preparación**.
3. Completá los datos generales:
   - **Nombre:** "Masa para pizza"
   - **Unidad:** la unidad en que se mide la preparación final (UNIT = una masa, KG = por kilo)
   - **Rendimiento:** cuántas unidades produce una tanda. Ejemplo: si hacés 6 masas en una tanda, ponés 6.
   - **Merma %:** porcentaje que se pierde en el proceso. Si de 1 kg de ingredientes sale 0.9 kg de preparación, la merma es 10%.
   - **Notas:** observaciones de proceso (opcional)
4. Agregá los ingredientes de la receta:
   - Hacé clic en **+ Agregar ingrediente**
   - Elegí el ingrediente del desplegable
   - Indicá la cantidad y la unidad
   - Indicá la merma de ese ingrediente específico (% que se pierde al procesarlo)
5. Si la preparación lleva otras preparaciones (sub-recetas), agregalas en la sección **Sub-preparaciones**.
6. Guardá.

**Producir (fabricar) una preparación:**

1. En la lista de preparaciones, hacé clic en el botón **Producir** de la preparación correspondiente.
2. Indicá cuántas **tandas** vas a producir.
3. El sistema te muestra qué ingredientes va a descontar y cuánto stock va a agregar.
4. Confirmá con **Producir**.

### Qué datos impacta

- Al **producir** una preparación: se descuenta stock de los ingredientes usados y se suma stock a la preparación.
- El costo de la preparación se calcula automáticamente según los ingredientes y la merma.
- Las preparaciones afectan el costo de los productos que las usan.

### Consejos

- Antes de vender, producí las preparaciones que necesitás. Por ejemplo, si mañana abrís, hacé las masas hoy. El sistema registra el stock de cada preparación.
- Usá el campo **Merma %** honestamente. Si sabés que una preparación pierde el 8% en cocción, ponelo. Eso hace más preciso el costo calculado.
- Una preparación puede usarse como ingrediente de otra preparación. Esto sirve para recetas complejas con varias etapas.

### Errores comunes

- **"Me dice que no hay stock de un ingrediente para producir":** El sistema te avisa pero no bloquea. Podés producir igual; simplemente el ingrediente quedará en negativo.
- **"La preparación no aparece en los productos":** Verificá que la preparación esté activa.

---

## 7. Productos

### Qué es

Los productos son los ítems del menú que vendés a tus clientes. Pueden tener una receta con ingredientes y/o preparaciones, y el sistema calcula automáticamente su costo.

### Para qué se usa en un negocio real

Una pizzería carga todas sus pizzas como productos: "Pizza Mozzarella", "Pizza Napolitana", "Empanada de Carne", etc. Cada uno tiene su receta (qué lleva y en qué cantidad), su precio de venta y su categoría.

### Cómo usarlo paso a paso

**Crear un producto:**

1. Andá a **Productos** en el menú lateral.
2. Hacé clic en **+ Nuevo producto**.
3. Completá los datos principales:
   - **Nombre:** "Pizza Mozzarella"
   - **SKU:** código propio (opcional pero recomendado). Ejemplo: "PIZ-001"
   - **Precio de venta:** cuánto cobrás
   - **Costo** (se calcula automáticamente si cargás la receta, o podés ingresarlo manual)
   - **Moneda:** ARS, USD o EUR
   - **Categoría:** "Pizzas", "Bebidas", "Postres", etc.
   - **Descripción:** texto que aparece en el menú público (opcional)
   - **Imagen:** foto del producto (opcional pero atractiva para el menú)
4. Cargá la receta (**Ingredientes directos**):
   - Hacé clic en **+ Agregar ingrediente**
   - Elegí el ingrediente, la cantidad, la unidad y el % de merma
5. Cargá las preparaciones que lleva (**Preparaciones**):
   - Hacé clic en **+ Agregar preparación**
   - Elegí la preparación, la cantidad y la unidad
6. El sistema muestra el **margen %** en tiempo real (precio de venta vs costo calculado).
7. Hacé clic en **Guardar**.

**Categorías de productos:**

- Las categorías agrupan los productos en el menú y en el POS.
- Podés crear categorías desde el mismo formulario de producto o desde la sección de Productos.
- Cada categoría tiene un nombre y un color (para identificarla visualmente).

### Qué datos impacta

- El costo de los productos determina el margen de ganancia.
- La receta determina qué stock se descuenta cuando se vende el producto.
- Los productos aparecen en el POS (Comandas), en el menú público y en los reportes.

### Consejos

- Usá el **SKU** para identificar tus productos fácilmente. Si después importás o exportás datos en Excel, el SKU es la clave que evita errores.
- El margen en verde es ganancia; en rojo estás perdiendo dinero en ese producto. Revisalos regularmente.
- Si un producto no tiene receta cargada, el sistema no puede descontar stock ni calcular el costo real.
- Usá **categorías** para que el menú quede ordenado. Tus clientes van a navegar por categorías.

### Errores comunes

- **"El costo del producto no se actualiza":** Si cambiaste el precio de un ingrediente, el costo del producto se recalcula la próxima vez que editás el producto y guardás.
- **"No veo el producto en el POS":** Verificá que el producto esté activo. Los productos inactivos no aparecen en Comandas.

---

## 8. Combos

### Qué es

Un combo es un paquete que agrupa varios productos a un precio especial. El cliente lo elige como una unidad y paga el precio del combo, no la suma de los productos individuales.

### Para qué se usa en un negocio real

**Ejemplos:**
- "Combo Familiar": 2 pizzas grandes + 1 gaseosa → $12.000 (vs $14.500 por separado)
- "Menú del día": 1 plato principal + postre + bebida → precio especial
- "Happy Hour": 2 hamburguesas + 2 papas + 2 cervezas

### Cómo usarlo paso a paso

1. Andá a **Combos** en el menú lateral.
2. Hacé clic en **+ Nuevo combo**.
3. Completá:
   - **Nombre:** "Combo Familiar"
   - **SKU:** código propio (opcional). Ejemplo: "COM-001"
   - **Precio de venta:** el precio especial del combo
   - **Moneda:** ARS, USD o EUR
   - **Notas:** descripción del combo (opcional)
4. Agregá los productos del combo:
   - Hacé clic en **+ Agregar producto**
   - Elegí el producto y la cantidad (cuántas unidades de ese producto lleva el combo)
5. El sistema calcula automáticamente el costo del combo (suma de costos de cada producto × cantidad) y muestra el margen.
6. Guardá.

### Qué datos impacta

- Cuando se vende un combo en Comandas, se descuenta el stock de cada producto componente del combo (con sus respectivas recetas).
- Los combos aparecen en el POS y en el menú público.
- Las ventas de combos aparecen en los reportes de ventas.

### Consejos

- El precio del combo debería ser menor a la suma de los productos individuales, de lo contrario no tiene sentido comercial.
- Verificá que todos los productos que forman el combo estén activos antes de crear el combo.
- Si cambiás el precio de un producto componente, el costo del combo se actualiza automáticamente.

---

## 9. Descuentos y Adicionales (Extras)

### Qué es

Este módulo permite configurar dos tipos de ajustes de precio:

- **Descuentos:** reducen el precio de un pedido o producto (en $ fijos o en %).
- **Adicionales (Extras):** son ingredientes o toppings opcionales que el cliente puede agregar a un producto, gratis o con costo extra.

### Para qué se usa en un negocio real

**Descuentos:**
- "10% OFF los martes" → descuento porcentual automático los martes
- "Pago en efectivo: 5% de descuento" → vinculado al método de pago
- "Descuento para clientes frecuentes" → aplicado manualmente al cobrar

**Adicionales:**
- "Doble queso": topping de queso extra con costo adicional
- "Sin cebolla": modificación sin cargo
- "Salsa BBQ extra": aderezo adicional pagado

### Cómo usarlo paso a paso

**Crear un descuento:**

1. Andá a **Descuentos y Adicionales** → pestaña **Descuentos**.
2. Hacé clic en **+ Nuevo descuento**.
3. Completá:
   - **Nombre:** "Descuento martes"
   - **Tipo:** Porcentaje (%) o Monto fijo ($)
   - **Valor:** 10 (para 10%)
   - **Aplica a:** Todo el pedido / Un producto específico / Una categoría
   - **Condiciones opcionales:**
     - Días de la semana (ej: solo martes)
     - Rango horario (ej: 12:00-14:00)
     - Métodos de pago (ej: solo efectivo)
   - **Activo:** sí/no
4. Guardá.

**Crear un adicional (extra):**

1. Andá a la pestaña **Adicionales**.
2. Hacé clic en **+ Nuevo adicional**.
3. Completá:
   - **Nombre:** "Doble queso"
   - **Precio:** 0 si es gratis, o el precio del extra
   - **Es gratis:** activalo si no tiene costo
   - **Afecta stock:** activalo si el extra descuenta stock de un ingrediente
   - Si afecta stock: elegí el ingrediente y la cantidad que consume
   - **Aplica a:** Todos los productos / Productos específicos / Categorías
4. Guardá.

### Qué datos impacta

- Los descuentos reducen el total cobrado en la venta.
- Los adicionales con costo aumentan el total de la venta.
- Los adicionales que afectan stock descuentan ingredientes.
- Todo queda registrado en el detalle de cada venta.

### Consejos

- Los descuentos por método de pago se configuran mejor desde **Configuración → Métodos de pago**, no desde aquí.
- Desactivá los descuentos cuando dejan de estar vigentes en lugar de borrarlos. Así conservás el historial.
- Probá los extras en el POS antes de publicar el menú, para asegurarte de que aparecen correctamente.

---

## 10. Carga Masiva — Importación y Exportación Excel

### Qué es

La Carga Masiva permite importar o exportar de una sola vez todos los ingredientes, preparaciones, productos y combos del negocio usando un archivo Excel con varias hojas. También permite exportar todos los datos actuales para editarlos fuera del sistema y volver a importarlos.

### Para qué se usa en un negocio real

- Cuando abrís un negocio nuevo y querés cargar todo el menú de una vez.
- Cuando cambiás todos los precios y no querés editarlos uno a uno.
- Cuando otro sistema te puede exportar la lista de productos y querés importarla.
- Cuando un contador o encargado quiere trabajar con los datos en Excel y después subirlos de vuelta.

### Estructura del archivo Excel (7 hojas)

El archivo tiene una hoja por tipo de dato y hojas de detalle para las recetas:

| Hoja | Qué contiene |
|---|---|
| **Ingredientes** | Lista de materias primas con stock y costos |
| **Preparaciones** | Lista de recetas semielaboradas |
| **Preparaciones_Detalle** | Ingredientes de cada preparación (receta) |
| **Productos** | Lista de productos del menú |
| **Productos_Detalle** | Ingredientes y preparaciones de cada producto (receta) |
| **Combos** | Lista de combos |
| **Combos_Detalle** | Productos que forman cada combo |

**Regla clave:** las referencias entre hojas se hacen por **nombre** (no por código interno). Si en Preparaciones_Detalle decís que "Masa para pizza" usa el ingrediente "Harina 000", ese nombre debe existir exactamente igual en la hoja Ingredientes (o ya estar cargado en el sistema).

### Cómo usarlo paso a paso

**Flujo de trabajo recomendado:**

1. Andá a **Carga Masiva** en el menú lateral.
2. Hacé clic en **Descargar plantilla** — te baja un Excel con ejemplos de cómo completar cada hoja.
3. Abrí el archivo en Excel o Google Sheets.
4. Completá cada hoja siguiendo los ejemplos:
   - Primero completá **Ingredientes**
   - Luego **Preparaciones** y **Preparaciones_Detalle**
   - Luego **Productos** y **Productos_Detalle**
   - Por último **Combos** y **Combos_Detalle**
5. Guardá el archivo como `.xlsx`.
6. Volvé al sistema y hacé clic en **Importar archivo**.
7. Elegí tu archivo.
8. El sistema te muestra una **previsualización** con lo que va a crear o actualizar, separado por pestañas.
9. Revisá los resultados. Si hay errores, están en la pestaña **Errores**.
10. Si todo está bien, hacé clic en **Confirmar importación**.
11. El sistema aplica todos los cambios y te muestra el resumen final.

**Para exportar los datos actuales:**

1. Hacé clic en **Exportar datos actuales**.
2. Se baja un archivo Excel con todo lo que hay en el sistema, en el mismo formato de 7 hojas.
3. Podés editarlo y volver a importarlo.

### Columnas de cada hoja

**Ingredientes:**
`Nombre* | Unidad* | Stock_Actual | Stock_Minimo | Costo_Por_Unidad | Moneda | Proveedor`

**Preparaciones:**
`Nombre* | Unidad* | Rendimiento | Merma_Pct | Notas`

**Preparaciones_Detalle:**
`Preparacion* | Tipo* | Referencia* | Cantidad* | Unidad* | Merma_Pct`

> Tipo = `ingrediente` o `preparacion`

**Productos:**
`Nombre* | SKU | Precio_Venta | Moneda | Categoria | Descripcion`

**Productos_Detalle:**
`Producto* | Tipo* | Referencia* | Cantidad* | Unidad* | Merma_Pct`

> Tipo = `ingrediente` o `preparacion`

**Combos:**
`Nombre* | SKU | Precio_Venta | Moneda | Notas`

**Combos_Detalle:**
`Combo* | Producto* | Cantidad`

> `*` = campo obligatorio

### Qué datos impacta

- **Ingredientes:** crea o actualiza stock, costos y proveedor.
- **Preparaciones:** crea o actualiza las recetas semielaboradas.
- **Productos:** crea o actualiza menú, precios y recetas.
- **Combos:** crea o actualiza los paquetes.
- Todos los costos se recalculan automáticamente al importar.

### Consejos

- Completá las hojas **en orden** (ingredientes → preparaciones → productos → combos). Las referencias deben existir antes de usarse.
- Si un ingrediente de la hoja Preparaciones_Detalle no existe en Ingredientes, esa línea de la receta se ignora (aparece como advertencia).
- El sistema hace **upsert**: si el nombre o SKU ya existe, actualiza el registro. Si no existe, lo crea.
- Para actualizar solo precios, podés tener solo la hoja Productos con Nombre, SKU y Precio_Venta. Las hojas vacías no se procesan.

### Errores comunes

- **"Error de referencia":** Un ingrediente mencionado en Preparaciones_Detalle no existe en Ingredientes ni en el sistema. Revisá los nombres (deben ser exactamente iguales, incluyendo mayúsculas).
- **"Unidad inválida":** Las unidades válidas son exactamente: `KG`, `G`, `L`, `ML`, `UNIT` (en mayúsculas).
- **"El archivo no tiene datos":** El archivo debe tener al menos una fila de datos debajo de los encabezados.

---

## 11. Comandas (Sistema de Pedidos)

### Qué es

Comandas es el sistema de punto de venta (POS) del negocio. Desde acá se toman los pedidos, se asignan a mesas o clientes, se gestionan en tiempo real con un tablero Kanban y se cobra al cliente.

### Para qué se usa en un negocio real

Es la pantalla principal que usa el personal durante el servicio. El mozo toma el pedido, lo carga en el sistema, y el cocinero lo ve en la pantalla de cocina. Cuando el pedido está listo, el mozo lo entrega y cobra.

### Cómo usarlo paso a paso

La pantalla tiene dos pestañas principales:

---

#### Pestaña "Nueva" — Tomar un pedido

1. Seleccioná la **modalidad** del pedido:
   - **Salón** → mesa del local
   - **Para llevar** → el cliente retira en el local
   - **Delivery** → se entrega a domicilio

2. Si es delivery: ingresá la dirección del cliente. El sistema verifica si está dentro de una zona de envío y calcula el costo.

3. Buscá el **cliente** por teléfono o nombre (opcional pero recomendado para fidelización).

4. Hacé clic en los **productos** del menú (aparecen en la grilla). Cada clic agrega una unidad al pedido del panel derecho.

5. Si el producto tiene extras disponibles, aparece un botón para seleccionarlos.

6. Si hay combos, aparecen en una sección separada. También se agregan con clic.

7. Revisá el resumen del pedido en el panel derecho: productos, cantidades, extras, descuentos automáticos, costo de envío y total.

8. Elegí cómo proceder:
   - **Comandar** → guarda el pedido SIN cobrar. Ideal para mesas que pagan al final.
   - **Cobrar** → abre la pantalla de pago para cobrar ahora mismo.

**Para cobrar:**

1. Seleccioná el método de pago (podés usar más de uno, por ejemplo parte en efectivo y parte en transferencia).
2. Ingresá el monto de cada método.
3. Hacé clic en **Confirmar cobro**.

---

#### Pestaña "Activos" — Tablero Kanban

Acá se gestiona el estado de todos los pedidos activos en tiempo real. Tiene 3 columnas:

| Columna | Qué significa |
|---|---|
| **NUEVO** (azul) | El pedido fue tomado, aún no empezó a prepararse |
| **EN PREPARACIÓN** (naranja) | Está siendo preparado en cocina |
| **LISTO** (verde) | Está listo para servir o para que el repartidor lo lleve |

**Para mover un pedido:**

- Arrastrá la tarjeta a la siguiente columna.
- O usá los botones en cada tarjeta: "Preparar →", "Listo →", "Entregar ✓".

> **Importante:** cuando un pedido pasa a "EN PREPARACIÓN", el sistema descuenta automáticamente el stock de todos los ingredientes.

**Para cobrar desde el Kanban:**

- En la tarjeta del pedido, hacé clic en **Cobrar**.
- Abre una ventana de pago igual que en la pestaña Nueva.

**Para cancelar un pedido:**

- Hacé clic en **Cancelar** en la tarjeta.
- Si el pedido ya estaba en preparación, podés elegir si querés **devolver el stock** al inventario.

El tablero se actualiza automáticamente cada 30 segundos.

---

### Qué datos impacta

- Crea una **venta** en el sistema con todos sus ítems.
- **Descuenta el stock** de ingredientes cuando el pedido pasa a "En preparación".
- Registra el **método de pago** y el **monto cobrado**.
- Si hay cliente asociado, queda en el historial de ese cliente.
- Afecta la **Caja diaria** y los **reportes de ventas**.

### Consejos

- Configurá bien los métodos de pago en Configuración antes de empezar a vender.
- Usá el campo de cliente para tener historial. Con el teléfono alcanza.
- Para delivery, siempre ingresá la dirección para que el sistema valide la zona.
- El tablero Kanban es ideal para tener en una pantalla en la cocina. Puede ser una tablet o computadora dedicada.

### Errores comunes

- **"No aparecen los productos en el POS":** Verificá que los productos estén activos y que tengan precio de venta mayor a cero.
- **"El sistema no me deja pasar el pedido a En Preparación":** Esto no debería pasar normalmente. Si pasa, recargá la página.
- **"El stock no bajó":** El stock baja cuando el pedido pasa a "En preparación", no cuando se crea. Revisá en qué estado está la comanda.

---

## 12. Ventas

### Qué es

La sección de Ventas muestra el historial completo de todas las transacciones del negocio con filtros, análisis y la posibilidad de exportar los datos.

### Para qué se usa en un negocio real

- Revisar cuánto se vendió en el día, la semana o el mes.
- Ver qué productos se vendieron más.
- Detectar ventas pendientes de cobro.
- Consultar el detalle de una venta específica (qué llevaba, cómo pagó el cliente).
- Exportar el registro para contabilidad.

### Cómo usarlo paso a paso

1. Andá a **Ventas** en el menú lateral.
2. Usá los filtros para acotar el período:
   - **Hoy, Semana, Mes** (botones rápidos)
   - **Personalizado** → seleccioná fechas manualmente
3. Las tarjetas superiores muestran: total de ventas, ingresos, ticket promedio, cancelaciones.
4. Los gráficos muestran: ventas por día, por hora del día y por día de la semana.
5. La tabla muestra cada venta con: fecha, cliente, productos, método de pago y total.
6. Hacé clic en una venta para ver su detalle completo.
7. Para exportar: hacé clic en **Exportar Excel** para bajar el listado.

**Colores en la tabla:**

- **Borde izquierdo verde:** la venta está cobrada.
- **Borde izquierdo naranja:** la venta está pendiente de cobro.
- **Fila en gris/apagado:** la venta fue cancelada.

### Qué datos impacta

Esta sección es solo de lectura — no modifica datos. Es para consulta y análisis.

### Consejos

- Revisá las ventas pendientes de cobro (borde naranja) al cierre de cada turno.
- Los gráficos de hora y día de la semana te ayudan a entender cuándo hay más demanda para organizar mejor el personal.
- Exportá el Excel mensualmente para llevar a tu contador.

---

## 13. Clientes

### Qué es

El módulo de clientes almacena la información de cada comprador: nombre, teléfono, email, y el historial de sus pedidos.

### Para qué se usa en un negocio real

- Identificar a los clientes frecuentes.
- Tener el historial de compras de cada cliente.
- Buscar un cliente por teléfono al tomar un pedido de delivery.
- Ofrecer trato personalizado ("siempre pide sin cebolla").

### Cómo usarlo paso a paso

**Buscar un cliente:**

1. Andá a **Clientes** en el menú lateral.
2. Escribí en el buscador el nombre o teléfono.
3. Hacé clic en la fila para ver el detalle y el historial de compras.

**Crear un cliente:**

1. Hacé clic en **+ Nuevo cliente**.
2. Completá: Nombre, Teléfono (único), Email, Notas.
3. Guardá.

> También podés crear clientes directamente desde el POS (Comandas) al tomar un pedido.

### Qué datos impacta

- Los clientes se asocian a las ventas.
- El historial de compras se actualiza automáticamente cada vez que el cliente hace un pedido.

### Consejos

- El teléfono es el identificador único. Si dos personas tienen el mismo teléfono, el sistema los trata como la misma persona.
- Usá el campo Notas para preferencias del cliente: "sin picante", "dirección habitual", etc.

---

## 14. Repartidores

### Qué es

El módulo de repartidores permite registrar a las personas que hacen las entregas a domicilio y asignarles los pedidos de delivery.

### Para qué se usa en un negocio real

- Saber qué pedidos tiene asignado cada repartidor.
- Llevar un registro de cuántas entregas hizo cada uno.
- Calcular comisiones o asignar turnos de delivery.

### Cómo usarlo paso a paso

1. Andá a **Repartidores** en el menú lateral.
2. Hacé clic en **+ Nuevo repartidor**.
3. Completá: Nombre y Teléfono.
4. Guardá.

Para asignar un repartidor a un pedido, hacelo desde el POS (Comandas) al procesar un pedido de delivery.

### Qué datos impacta

- Los repartidores quedan asociados a las ventas de delivery.
- El módulo muestra el resumen de entregas por repartidor.

---

## 15. Menú Público Online

### Qué es

El menú público es una página web que pueden ver tus clientes desde su celular o computadora, sin necesidad de instalar nada. Muestra tus productos organizados por categorías con fotos y precios.

### Para qué se usa en un negocio real

- Compartir el menú con los clientes por WhatsApp.
- Que los clientes hagan pedidos online desde casa.
- Reemplazar la carta física del local.

### Cómo funciona

- La URL del menú es automática: `[tu-sistema]/menu/[tu-slug]`
- El slug lo configuraste en el setup inicial.
- El menú muestra todos los productos activos organizados por categoría.
- Los clientes pueden agregar productos al carrito y hacer su pedido.
- El pedido ingresa automáticamente al sistema como una nueva comanda.

### Cómo activarlo

1. Andá a **Configuración** → sección **Modalidades**.
2. Activá las modalidades que querés ofrecer (Delivery, Para llevar, Salón).
3. Completá la información del negocio (nombre, descripción, imagen).
4. Asegurate de que los productos tengan foto y descripción.
5. Compartí el link del menú.

### Consejos

- Subí buenas fotos a los productos. El menú con fotos convierte mucho mejor que sin fotos.
- Configurá bien las zonas de delivery para que los clientes sepan si llegás a su dirección.
- Actualizá los precios y disponibilidad regularmente.

---

## 16. Caja Diaria

### Qué es

La Caja Diaria registra el movimiento de dinero de un turno de trabajo: cuánto efectivo había al abrir, cuánto entraron por ventas, cuánto se gastó y cuánto debería quedar al cerrar.

### Para qué se usa en un negocio real

Es la rendición de caja de cada turno. Al abrir el negocio, se registra el vuelto inicial. Al cerrar, se registra el dinero real en la caja. La diferencia es el resultado del turno.

### Cómo usarlo paso a paso

**Abrir la caja (al inicio del turno):**

1. Andá a **Caja Diaria** en el menú lateral.
2. Si no hay turno activo, verás un botón **Abrir caja**.
3. Hacé clic en Abrir caja.
4. Ingresá el **saldo inicial** (el dinero que había en la caja antes de empezar).
5. Agregá notas si querés (opcional).
6. Confirmá.

**Durante el turno:**

- El sistema muestra en tiempo real: ventas cobradas, gastos del turno y balance neto.
- Si necesitás registrar un gasto (compra de efectivo, servicio pagado en mano), hacé clic en **+ Registrar gasto**.
- Completá: monto, descripción, categoría, método de pago.

**Cerrar la caja (al final del turno):**

1. Hacé clic en **Cerrar caja**.
2. Ingresá el **saldo final** (cuánto hay físicamente en la caja al contar).
3. El sistema compara el saldo esperado vs el real y muestra la diferencia.
4. Agregá notas y confirmá.

### Qué datos impacta

- Las ventas cobradas durante el turno se toman de las ventas registradas en Comandas.
- Los gastos registrados en la Caja Diaria se suman al módulo de Gastos.
- Al cerrar, el turno queda registrado en el histórico de la Caja General.

### Consejos

- Abrí la caja al inicio de cada turno, no a mitad. Los datos de ventas anteriores al turno no quedan correctamente asignados.
- Si encontrás diferencia entre el saldo esperado y el real, registralo en las notas para auditarlo después.
- Si el negocio trabaja con varios turnos al día, abrí y cerrá una caja por turno.

### Errores comunes

- **"No puedo abrir una segunda caja":** Si ya hay un turno activo, tenés que cerrar el anterior primero.
- **"Las ventas no aparecen en la caja":** Las ventas deben estar cobradas (pagadas). Los pedidos pendientes de cobro no suman en la caja hasta que se paguen.

---

## 17. Caja General

### Qué es

La Caja General muestra el resumen financiero de un período (días, semanas, meses) combinando ventas, gastos, ingresos extra y pagos a proveedores.

### Para qué se usa en un negocio real

Es la visión completa de cuánto entró y cuánto salió de dinero en el negocio en un período determinado.

### Cómo usarlo paso a paso

1. Andá a **Caja General** en el menú lateral.
2. Seleccioná el rango de fechas con los campos **Desde** y **Hasta**.
3. Hacé clic en **Actualizar**.
4. Las tarjetas superiores muestran: Ventas, Ingresos extra, Gastos y Balance neto.
5. El desglose muestra:
   - Ingresos por método de pago (cuánto entró en efectivo, cuánto por transferencia, etc.)
   - Gastos por categoría
6. Para agregar un ingreso extra (que no sea una venta): hacé clic en **+ Nuevo Ingreso**.

### Qué datos impacta

Esta sección es principalmente de consulta. La acción de registrar ingresos extra crea un registro de IncomeEntry.

### Consejos

- Usá esta sección para comparar períodos (esta semana vs la semana pasada).
- Los ingresos extra son útiles para registrar: depósitos bancarios recibidos, subsidios, etc.
- Para un balance mensual más completo, usá la sección **Resultados**.

---

## 18. Gastos

### Qué es

El módulo de Gastos permite registrar todos los egresos del negocio que no son pagos a proveedores: alquiler, servicios, sueldos, limpieza, etc.

### Para qué se usa en un negocio real

Registrás todos los costos fijos y variables del negocio para tener una visión real de la rentabilidad.

**Ejemplos de gastos:**
- Alquiler del local
- Factura de electricidad
- Sueldo del personal
- Insumos de limpieza
- Publicidad en redes
- Reparaciones

### Cómo usarlo paso a paso

**Registrar un gasto:**

1. Andá a **Gastos** en el menú lateral.
2. Hacé clic en **+ Nuevo gasto**.
3. Completá:
   - **Monto:** el importe del gasto
   - **Descripción:** qué fue el gasto (ejemplo: "Alquiler marzo")
   - **Categoría:** agrupa los gastos para los reportes (ver abajo)
   - **Método de pago:** cómo se pagó
   - **Fecha:** cuándo ocurrió
   - **Notas:** info adicional (opcional)
4. Guardá.

**Gestionar categorías de gastos:**

1. Andá a la pestaña **Categorías**.
2. Hacé clic en **+ Nueva categoría**.
3. Poné el nombre (ejemplo: "Servicios", "Alquiler", "Personal") y elegí un color.
4. Guardá.

### Qué datos impacta

- Los gastos impactan el Balance neto en Caja General y Caja Diaria.
- Aparecen categorizados en los **Resultados** mensuales.
- Afectan el balance neto del negocio.

### Consejos

- Creá las categorías antes de empezar a cargar gastos. Luego es difícil recategorizar.
- Categorías recomendadas: Alquiler, Servicios (luz/gas/internet), Personal, Insumos, Publicidad, Mantenimiento, Varios.
- Cargá todos los gastos, incluso los pequeños. El detalle hace la diferencia en el análisis de rentabilidad.

---

## 19. Proveedores

### Qué es

El módulo de Proveedores almacena la información de los proveedores del negocio y las condiciones de pago acordadas con cada uno.

### Para qué se usa en un negocio real

- Tener el teléfono y email de cada proveedor a mano.
- Saber cuáles tienen crédito y cuántos días de plazo te dan.
- Asociar cada ingrediente a su proveedor.
- Gestionar las facturas y pagos pendientes.

### Cómo usarlo paso a paso

1. Andá a **Proveedores** en el menú lateral.
2. Hacé clic en **+ Nuevo proveedor**.
3. Completá:
   - **Nombre:** "Molinos del Sur"
   - **Teléfono:** para contacto rápido
   - **Email:** para pedidos
   - **Notas:** información de contacto o condiciones especiales
   - **Términos de pago:**
     - *Contra entrega:* pagás al recibir la mercadería
     - *Inmediato:* pagás al momento
     - *A crédito:* tenés X días para pagar
   - **Días de crédito:** solo si elegiste "A crédito"
4. Guardá.

### Qué datos impacta

- Los proveedores aparecen en el módulo de Ingredientes (para saber de quién comprás cada insumo).
- Se usan en Pedidos a Proveedores y Facturas.
- Los pagos a proveedores impactan el balance en Resultados.

### Consejos

- Configurá bien los términos de pago. Eso alimenta el módulo de Cuentas Corrientes con las fechas de vencimiento correctas.
- Si importás ingredientes en Excel, podés relacionarlos con su proveedor por nombre.

---

## 20. Pedidos a Proveedores

### Qué es

El módulo de Pedidos a Proveedores (Purchase Orders) permite crear órdenes de compra para tus proveedores, hacer seguimiento de su estado y registrar la mercadería cuando llega.

### Para qué se usa en un negocio real

Cuando necesitás reponer stock, creás un pedido indicando qué ingredientes querés comprar y en qué cantidad. Cuando llega la mercadería, la recibís en el sistema y el stock se actualiza automáticamente.

### Cómo usarlo paso a paso

**Crear un pedido:**

1. Andá a **Pedidos a Proveedores** en el menú lateral.
2. Hacé clic en **+ Nuevo pedido**.
3. Elegí el **proveedor**.
4. Agregá los ingredientes que querés pedir:
   - Hacé clic en **+ Agregar ítem**
   - Elegí el ingrediente, la cantidad, la unidad y el precio unitario esperado
5. Agregá notas si es necesario.
6. Guardá. El pedido queda en estado **BORRADOR**.

**Enviar el pedido:**

1. En la lista de pedidos, hacé clic en el pedido.
2. Hacé clic en **Enviar pedido**.
3. El estado cambia a **ENVIADO**.
4. El sistema genera un texto que podés copiar y enviar por WhatsApp al proveedor.

**Recibir la mercadería:**

1. Cuando llega el pedido, andá al detalle del pedido.
2. Hacé clic en **Registrar recepción**.
3. Para cada ítem, confirmá la cantidad real recibida (puede diferir de lo pedido).
4. Confirmá.
5. El sistema automáticamente suma el stock a los ingredientes correspondientes y registra el costo.

### Estados del pedido

| Estado | Qué significa |
|---|---|
| **Borrador** | Creado, no enviado al proveedor |
| **Enviado** | El proveedor lo recibió |
| **Recibido** | La mercadería llegó y el stock fue actualizado |
| **Cancelado** | El pedido no se realizará |

### Qué datos impacta

- Al **recibir** el pedido: aumenta el stock de los ingredientes (crea StockMovements de tipo PURCHASE).
- Si el precio unitario difiere del costo registrado del ingrediente: actualiza el costo del ingrediente.
- La recepción genera un registro en el historial de costos del ingrediente.

### Consejos

- Siempre registrá la recepción aunque sea igual a lo pedido. Es la única forma de que el stock suba automáticamente.
- Si recibís menos de lo que pediste, podés ingresarlo así. El resto quedará pendiente.
- Podés adjuntar la factura del proveedor en la sección de facturas del pedido.

---

## 21. Facturas de Proveedores

### Qué es

El módulo de Facturas de Proveedores permite registrar las facturas que te envían los proveedores, hacer seguimiento de las que están pagas y las que están pendientes.

### Para qué se usa en un negocio real

- Saber cuánto le debés a cada proveedor.
- Registrar cuándo pagaste cada factura.
- Tener un historial para la contabilidad.

### Cómo usarlo paso a paso

**Registrar una factura:**

1. Andá a **Facturas de Proveedores** en el menú lateral.
2. Hacé clic en **+ Nueva factura**.
3. Completá:
   - **Proveedor**
   - **Número de factura** (el que figura en el documento)
   - **Monto total**
   - **Fecha** de la factura
   - **Fecha de vencimiento** (cuándo vence el plazo)
   - **Notas** (opcional)
   - Podés subir una **imagen** de la factura (foto o PDF)
4. Guardá.

**Registrar un pago:**

1. Abrí el detalle de la factura.
2. Hacé clic en **+ Registrar pago**.
3. Ingresá: monto, método de pago, fecha.
4. El estado de la factura cambia automáticamente según lo que pagaste:
   - **PENDIENTE** → **PARCIAL** → **PAGADA**

### Estados de una factura

| Estado | Qué significa |
|---|---|
| **Pendiente** | No se pagó nada |
| **Parcial** | Se pagó parte |
| **Pagada** | Se pagó el total |

### Qué datos impacta

- Los pagos a proveedores aparecen en los **Resultados** mensuales.
- Afectan el balance en **Cuentas Corrientes**.

---

## 22. Cuentas Corrientes

### Qué es

Las Cuentas Corrientes muestran cuánto le debés a cada proveedor: el total de facturas menos lo pagado, con el estado de cada deuda.

### Para qué se usa en un negocio real

Es la pantalla que revisás para saber a quién le debés pagar esta semana y cuánto. Evita olvidar facturas vencidas.

### Cómo usarlo paso a paso

1. Andá a **Cuentas Corrientes** en el menú lateral.
2. La tabla muestra cada proveedor con su balance pendiente.
3. Usá el filtro **"Solo con deuda"** para ver solo los que tenés pendiente.
4. Para pagar: hacé clic en **Pagar** en la fila del proveedor.
5. Elegí la factura, el monto a pagar y el método.
6. Confirmá el pago.

### Qué datos impacta

- Actualiza el estado de la factura correspondiente.
- Afecta el balance en Resultados y Caja General.

### Consejos

- Revisá las Cuentas Corrientes al menos una vez por semana para no acumular deudas vencidas.
- Filtrá por proveedor si querés ver solo lo que le debés a uno específico.

---

## 23. Ajustes de Stock

### Qué es

Los Ajustes de Stock permiten corregir manualmente el inventario de ingredientes o preparaciones cuando el sistema no refleja la realidad.

### Para qué se usa en un negocio real

- Después de hacer un inventario físico y encontrar diferencias.
- Para registrar una merma o rotura no prevista (se cayó un recipiente, algo se venció).
- Para corregir un error de carga.

### Cómo usarlo paso a paso

1. Andá a **Ajustes de Stock** en el menú lateral.
2. Elegí si querés ajustar un **ingrediente** o una **preparación**.
3. Seleccioná el ítem del desplegable.
4. Ves el stock actual.
5. Ingresá el **delta** (la diferencia):
   - Si querés subir el stock en 5: ingresá `+5`
   - Si querés bajar el stock en 3: ingresá `-3`
6. Escribí el **motivo** del ajuste (obligatorio para mantener el historial).
7. Hacé clic en **Aplicar ajuste**.

### Qué datos impacta

- Modifica directamente el stock del ingrediente o preparación.
- Crea un registro en el historial de movimientos de stock.
- Aparece en los reportes de movimientos.

### Consejos

- Siempre escribí un motivo claro: "Inventario físico 15/03", "Rotura accidente", "Corrección error carga".
- Hacé inventarios físicos periódicos (semanales o mensuales) y ajustá las diferencias.

---

## 24. Consumo de Insumos

### Qué es

El módulo de Consumo muestra cuánto de cada ingrediente se usó en un período y cuánto costó eso, calculado a partir de las ventas realizadas.

### Para qué se usa en un negocio real

- Entender cuánto cuesta producir lo que vendés (costo de la mercadería vendida).
- Detectar si el consumo es mayor al esperado (posibles mermas o robos).
- Planificar cuánto comprar para la próxima semana.

### Cómo usarlo paso a paso

1. Andá a **Consumo de Insumos** en el menú lateral.
2. Seleccioná el período: Hoy, Esta semana, Este mes, o fecha personalizada.
3. La tabla muestra cada ingrediente con:
   - Cantidad consumida (calculada a partir de las ventas)
   - Costo unitario
   - Costo total de ese ingrediente en el período
4. Al final hay un resumen del costo total de materia prima del período.

### Qué datos impacta

Esta sección es de solo lectura. Los datos vienen de los movimientos de stock generados por las ventas.

### Consejos

- Comparalo con el stock físico cada tanto. Si el consumo calculado difiere mucho del stock real, puede haber mermas no registradas.
- Usalo para estimar qué comprar: si consumís 20 kg de harina por semana, sabés que necesitás pedir al menos eso para la próxima semana.

---

## 25. Empleados

### Qué es

El módulo de Empleados guarda la ficha de cada persona que trabaja en el negocio con sus datos de contacto y tarifa horaria.

### Para qué se usa en un negocio real

- Tener los datos de contacto del equipo centralizados.
- Asociar cada empleado a un usuario del sistema (para el login).
- Calcular el sueldo estimado según horas trabajadas.

### Cómo usarlo paso a paso

1. Andá a **Empleados** en el menú lateral.
2. Hacé clic en **+ Nuevo empleado**.
3. Completá:
   - **Nombre y apellido**
   - **Rol** (cocinero, mozo, cajero, etc.) — informativo, no afecta el acceso
   - **Tasa horaria** (para calcular sueldos estimados)
   - **Teléfono y email** (opcionales)
4. Guardá.

### Qué datos impacta

- Los empleados aparecen en el Fichador para que puedan fichar.
- Las horas trabajadas se calculan en el módulo de Resultados.
- La ficha de empleado puede vincularse a un usuario del sistema.

---

## 26. Horarios de Trabajo

### Qué es

El módulo de Horarios permite configurar los turnos de trabajo de cada empleado por día de la semana, y marcar los días de descanso.

### Para qué se usa en un negocio real

- Que el sistema sepa cuándo debería estar cada empleado.
- El Fichador usa estos horarios para no permitir que alguien fiche antes de su turno.
- Calcula las horas y el sueldo estimado de cada empleado para el mes.

### Cómo usarlo paso a paso

1. Andá a **Horarios** en el menú lateral.
2. Seleccioná el **empleado** del desplegable.
3. **Horario semanal:**
   - Para cada día (lunes a domingo) podés configurar hasta 2 turnos.
   - En cada turno ingresá la hora de entrada y de salida.
   - Hacé clic en **Guardar horario**.
4. **Días de descanso:**
   - En el calendario mensual, hacé clic en los días que el empleado no trabaja.
   - Los días marcados como descanso quedan destacados en el calendario.
5. La tabla de sueldos estimados muestra las horas del mes × tarifa horaria.

### Qué datos impacta

- El Fichador verifica los horarios antes de permitir fichar.
- Los Resultados usan las horas estimadas para calcular el costo de personal.

---

## 27. Fichador

### Qué es

El Fichador es una pantalla pensada para estar siempre visible en el negocio (en una tablet o computadora), donde los empleados registran su entrada y salida sin necesidad de un usuario propio.

### Para qué se usa en un negocio real

El cocinero llega, elige su nombre en la pantalla del fichador y toca "Entrada". Cuando termina su turno, toca "Salida". El sistema registra exactamente cuántas horas trabajó.

### Cómo usarlo paso a paso

1. Andá a **Fichador** en el menú lateral.
2. El empleado elige su nombre en el desplegable.
3. Verá la hora actual y su horario programado para hoy.
4. Para registrar entrada: toca el botón **ENTRADA** (grande, verde).
5. Para registrar salida: toca el botón **SALIDA** (grande, rojo).
6. El sistema muestra cuánto tiempo lleva trabajando.

> **Nota:** el botón de ENTRADA puede estar desactivado si el empleado intenta fichar mucho antes de que empiece su turno (el sistema no permite fichar más de 1 minuto antes de la hora programada).

### Qué datos impacta

- Crea registros de marcación que alimentan el módulo de Tiempo Trabajado.
- Las horas se calculan en Resultados como costo de personal.

### Consejos

- Poné el Fichador en una tablet fija en el ingreso a la cocina o al local.
- No hace falta que los empleados tengan usuario del sistema para usar el Fichador.

---

## 28. Marcaciones de Tiempo

### Qué es

Las Marcaciones muestran el registro histórico de entradas y salidas de todos los empleados, con la duración de cada turno y la posibilidad de exportar los datos.

### Para qué se usa en un negocio real

- Controlar las horas trabajadas de cada empleado.
- Exportar el reporte para calcular sueldos.
- Ver si alguien se olvidó de fichar la salida.

### Cómo usarlo paso a paso

1. Andá a **Marcaciones** en el menú lateral.
2. Filtrá por período (desde/hasta) y por empleado si querés.
3. La tabla muestra: empleado, fecha, hora de entrada, hora de salida, duración.
4. Si hay un registro sin salida, aparece marcado como "Abierto".
5. Para exportar: hacé clic en **Exportar Excel**.

### Consejos

- Revisá semanalmente si hay turnos sin cierre (empleados que olvidaron fichar la salida).
- Si un empleado olvidó fichar, podés corregirlo editando el registro.

---

## 29. Resultados (Balance mensual)

### Qué es

La sección de Resultados muestra el estado de resultados del negocio mes a mes: cuánto ingresó, cuánto se gastó y si el negocio ganó o perdió dinero.

### Para qué se usa en un negocio real

Es la pantalla que muestra la rentabilidad real del negocio. Equivale a un balance mensual simplificado.

### Cómo usarlo paso a paso

1. Andá a **Resultados** en el menú lateral.
2. Usá las flechas **← →** para navegar entre meses.
3. Las tarjetas superiores muestran: Ingresos, Costos y Resultado neto.
4. El detalle desglosa:
   - **Ingresos:** ventas + otros ingresos, desglosados por método de pago
   - **Costos:** costo de materia prima (CMV), gastos operativos, pagos a proveedores, sueldos estimados
5. Si el resultado neto es positivo: el negocio fue rentable ese mes. Si es negativo: gastaste más de lo que ingresaste.

### Qué datos impacta

Esta sección es de solo lectura. Consolida datos de ventas, gastos, proveedores y personal.

### Consejos

- Para que los Resultados sean precisos, es importante registrar todos los gastos en el módulo de Gastos y todos los pagos a proveedores en Facturas.
- Comparás mes a mes para detectar tendencias: ¿aumentaron los costos? ¿bajaron las ventas?
- Compartí este reporte mensualmente con tu contador.

---

## 30. Analytics de Ventas

### Qué es

Analytics es un módulo de análisis de ventas con gráficos interactivos para entender mejor el comportamiento del negocio en el tiempo.

### Para qué se usa en un negocio real

- ¿A qué hora vendemos más? → para organizar el personal.
- ¿Qué día de la semana es el más ocupado? → para planificar compras.
- ¿Cuáles son los productos más vendidos? → para saber qué priorizar.
- ¿Cómo se distribuyen los métodos de pago? → para gestionar efectivo.

### Cómo usarlo paso a paso

1. Andá a **Analytics** en el menú lateral.
2. Elegí el período:
   - Última semana, Último mes, Últimos 3 meses, Este año
   - O un rango personalizado con **Aplicar**
3. Los gráficos se muestran automáticamente:
   - Ventas por día (línea de tiempo)
   - Ventas por hora del día (barras)
   - Ventas por día de la semana (barras)
   - Top productos más vendidos (horizontal)
   - Métodos de pago (tarjetas con % y montos)

### Consejos

- La franja horaria de mayor venta te dice cuándo necesitás más personal disponible.
- El gráfico de top productos ayuda a decidir qué productos promover o descontinuar.
- Compará el mismo período en distintas semanas para detectar caídas o picos estacionales.

---

## 31. Dashboard

### Qué es

El Dashboard es la pantalla de inicio del sistema. Muestra un resumen rápido del estado actual del negocio.

### Qué contiene

- **KPIs del día:** total de ventas de hoy, ingresos cobrados, cantidad de ingredientes y productos activos.
- **Alertas de stock bajo:** ingredientes que bajaron del mínimo configurado.
- **Pedidos activos:** cuántos pedidos hay en estado Nuevo, En Preparación y Listo.
- **Ventas recientes:** los últimos pedidos realizados.
- **Top productos:** los más vendidos en los últimos 30 días.

### Para qué se usa

Es la primera pantalla que abrís al iniciar el día para tener una visión rápida del estado del negocio antes de empezar el servicio.

### Consejos

- Revisá las **alertas de stock bajo** todas las mañanas. Si hay ingredientes en rojo, hacé el pedido ese día.
- El Dashboard se actualiza cada vez que lo cargás o al hacer clic en el botón de refresh.

---

## 32. Flujos completos recomendados

### Flujo para abrir un negocio nuevo

1. **Setup inicial** → crear cuenta admin + nombre del negocio
2. **Configuración** → métodos de pago, horarios, modalidades
3. **Proveedores** → cargar tus proveedores
4. **Ingredientes** → cargar materias primas con stock inicial y costos
5. **Preparaciones** → cargar recetas semielaboradas (masas, salsas, etc.)
6. **Productos** → cargar el menú con recetas y precios
7. **Combos** → crear paquetes (si aplica)
8. **Descuentos y Extras** → configurar promos y toppings
9. **Empleados + Usuarios** → dar acceso al equipo
10. **Horarios** → configurar turnos de trabajo
11. ¡Listo! Empezar a vender desde **Comandas**

> **Tip:** En lugar de cargar todo uno por uno, usá la **Carga Masiva** para importar ingredientes, preparaciones, productos y combos de golpe desde Excel.

---

### Flujo del día a día

**Al abrir:**
1. Revisar el **Dashboard** → alertas de stock bajo
2. Abrir la **Caja Diaria** con el saldo inicial
3. Producir las **Preparaciones** del día en cocina
4. Empezar a tomar pedidos en **Comandas**

**Durante el servicio:**
1. Tomar pedidos en **Comandas** → pestaña "Nueva"
2. Gestionar estados en el **Kanban** → pestaña "Activos"
3. Registrar gastos en **Caja Diaria** si los hay

**Al cerrar:**
1. Revisar pedidos pendientes de cobro en **Ventas**
2. Cerrar la **Caja Diaria** con el saldo final
3. Revisar **Cuentas Corrientes** si hay facturas por pagar

---

### Flujo de reposición de stock

1. **Dashboard** → detectar ingredientes en stock bajo
2. **Pedidos a Proveedores** → crear un pedido con lo que necesitás
3. Enviar el pedido al proveedor
4. Cuando llega la mercadería: **Pedidos a Proveedores** → Registrar recepción
5. El stock sube automáticamente
6. Si llega con factura: **Facturas de Proveedores** → registrar la factura
7. Al pagar: **Cuentas Corrientes** → registrar el pago

---

### Flujo de cierre mensual

1. **Resultados** → revisar el balance del mes
2. **Analytics** → analizar tendencias de ventas
3. **Consumo** → revisar costo de materia prima
4. **Gastos** → verificar que todos los gastos del mes estén cargados
5. **Cuentas Corrientes** → saldar deudas con proveedores
6. **Marcaciones** → exportar horas trabajadas para calcular sueldos
7. **Ventas** → exportar el listado para el contador

---

*Última actualización: Marzo 2026*
