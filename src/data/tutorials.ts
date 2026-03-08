/**
 * tutorials.ts
 * Structured tutorial content sourced from USER_GUIDE.md.
 * Each module has written content + optional in-page tour steps.
 */

export type TutorialDifficulty = "básico" | "intermedio" | "avanzado";
export type ImpactArea =
  | "stock"
  | "ventas"
  | "caja"
  | "costos"
  | "reportes"
  | "equipo"
  | "proveedores";

export interface TourStep {
  /** Matches the data-tour="..." attribute on the target DOM element */
  target: string;
  title: string;
  content: string;
}

export interface TutorialModule {
  slug: string;
  title: string;
  emoji: string;
  shortDescription: string;
  difficulty: TutorialDifficulty;
  readTimeMinutes: number;
  category: string;
  /** The actual app page this tutorial refers to */
  pageHref?: string;
  impactAreas: ImpactArea[];
  content: {
    queEs: string;
    paraQueSirve: string;
    pasos: { title: string; description: string }[];
    queAfecta: { area: ImpactArea; description: string }[];
    consejos: string[];
    erroresComunes: { error: string; solucion: string }[];
  };
  /** In-page tour steps (requires data-tour attrs on the target page) */
  tourSteps?: TourStep[];
  relatedSlugs?: string[];
}

// ── Impact area display metadata ──────────────────────────────────────────────

export const IMPACT_META: Record<
  ImpactArea,
  { label: string; color: string; emoji: string }
> = {
  stock: { label: "Stock", color: "bg-blue-100 text-blue-800", emoji: "📦" },
  ventas: { label: "Ventas", color: "bg-emerald-100 text-emerald-800", emoji: "🛒" },
  caja: { label: "Caja", color: "bg-yellow-100 text-yellow-800", emoji: "💰" },
  costos: { label: "Costos", color: "bg-orange-100 text-orange-800", emoji: "🧮" },
  reportes: { label: "Reportes", color: "bg-purple-100 text-purple-800", emoji: "📊" },
  equipo: { label: "Equipo", color: "bg-pink-100 text-pink-800", emoji: "👥" },
  proveedores: { label: "Proveedores", color: "bg-indigo-100 text-indigo-800", emoji: "🚚" },
};

export const DIFFICULTY_META: Record<
  TutorialDifficulty,
  { label: string; color: string }
> = {
  básico: { label: "Básico", color: "bg-green-100 text-green-700" },
  intermedio: { label: "Intermedio", color: "bg-amber-100 text-amber-700" },
  avanzado: { label: "Avanzado", color: "bg-red-100 text-red-700" },
};

// ── Tutorial categories (display order) ───────────────────────────────────────

export const TUTORIAL_CATEGORIES: Record<string, { label: string; emoji: string; description: string }> = {
  Inicio: { label: "Inicio", emoji: "🚀", description: "Primeros pasos para configurar el sistema" },
  Inventario: { label: "Inventario", emoji: "📦", description: "Gestión de ingredientes, preparaciones, productos y combos" },
  Ventas: { label: "Ventas", emoji: "💳", description: "Comandas, cobros, clientes y pedidos" },
  Finanzas: { label: "Finanzas", emoji: "💰", description: "Caja, gastos, facturas y resultados" },
  Proveedores: { label: "Proveedores", emoji: "🏭", description: "Gestión de proveedores y pedidos de compra" },
  Equipo: { label: "Equipo", emoji: "👥", description: "Empleados, fichador y horarios" },
  Reportes: { label: "Reportes", emoji: "📊", description: "Análisis y métricas del negocio" },
};

// ── All tutorial modules ───────────────────────────────────────────────────────

export const TUTORIALS: TutorialModule[] = [
  // ── INICIO ────────────────────────────────────────────────────────────────

  {
    slug: "configuracion",
    title: "Configuración del negocio",
    emoji: "⚙️",
    shortDescription:
      "Configurá los métodos de pago, horarios, modalidades y zonas de delivery del negocio.",
    difficulty: "básico",
    readTimeMinutes: 4,
    category: "Inicio",
    pageHref: "/config",
    impactAreas: ["ventas", "caja"],
    content: {
      queEs:
        "La Configuración es el punto de partida de todo el sistema. Desde acá definís cómo opera tu negocio: qué métodos de pago aceptás, en qué horarios atendés, qué modalidades ofrecés (salón, delivery, takeaway) y cuáles son las zonas de envío con sus precios.",
      paraQueSirve:
        "Una pizzería configura: efectivo sin recargo, transferencia con 5% descuento, Mercado Pago con 3% recargo; horario lunes a domingo de 18:00 a 23:00; modalidades salón y delivery; zonas de delivery con precio $500 hasta 3km y $800 hasta 6km.",
      pasos: [
        {
          title: "Andá a Configuración",
          description: "Hacé clic en 'Configuración' en el menú lateral izquierdo.",
        },
        {
          title: "Completá el perfil del negocio",
          description:
            "Ingresá el nombre, categoría, teléfono, WhatsApp, Instagram y descripción. Esta info aparece en el menú público.",
        },
        {
          title: "Configurá los métodos de pago",
          description:
            "Activá los métodos que aceptás (Efectivo, Transferencia, MP, etc.). Para cada uno podés configurar un descuento o recargo porcentual.",
        },
        {
          title: "Configurá los horarios de atención",
          description:
            "Para cada día de la semana, indicá si abrís, el horario de apertura y cierre. Podés agregar un segundo turno (almuerzo y cena).",
        },
        {
          title: "Activá las modalidades",
          description:
            "Marcá las modalidades que ofrecés: Salón, Para llevar (Takeaway), Delivery.",
        },
        {
          title: "Configurá zonas de delivery (si usás delivery)",
          description:
            "Ingresá la dirección del negocio, dibujá las zonas en el mapa y asignales un precio de envío.",
        },
      ],
      queAfecta: [
        {
          area: "ventas",
          description:
            "Los métodos de pago configurados son los únicos disponibles al cobrar en el POS.",
        },
        {
          area: "caja",
          description:
            "Los descuentos y recargos por método de pago afectan el total cobrado.",
        },
      ],
      consejos: [
        "Configurá los métodos de pago ANTES de empezar a vender. Si no están activos, no van a aparecer al cobrar.",
        "Para las zonas de delivery, necesitás ingresar primero la dirección del negocio para que el mapa se centre correctamente.",
        "Si cambiás los horarios de atención, el Fichador (control de entrada/salida del personal) también los usa.",
        "Subí el logo y una foto de portada. El menú público con imagen se ve mucho más profesional.",
      ],
      erroresComunes: [
        {
          error: "No aparece el método de pago al cobrar en Comandas",
          solucion:
            "Andá a Configuración → Métodos de pago y verificá que el método esté activado (toggle encendido).",
        },
        {
          error: "Las zonas de delivery no aparecen en el mapa",
          solucion:
            "Tenés que ingresar la dirección del negocio primero para que el sistema pueda geolocalizar el punto de origen.",
        },
      ],
    },
    relatedSlugs: ["usuarios", "comandas"],
  },

  {
    slug: "usuarios",
    title: "Usuarios y roles",
    emoji: "👤",
    shortDescription:
      "Creá cuentas de acceso para tu equipo con distintos niveles de permiso según el rol.",
    difficulty: "básico",
    readTimeMinutes: 3,
    category: "Inicio",
    pageHref: "/users",
    impactAreas: ["equipo"],
    content: {
      queEs:
        "El módulo de Usuarios permite crear cuentas individuales para cada miembro del equipo. Cada cuenta tiene un rol que determina a qué partes del sistema puede acceder esa persona.",
      paraQueSirve:
        "El dueño tiene rol ADMIN (acceso completo). El encargado de turno tiene ENCARGADO (igual que admin sin gestión de usuarios). La cajera tiene CAJERA (solo caja y fichador). Los cocineros tienen EMPLEADO (solo fichador).",
      pasos: [
        {
          title: "Andá a Usuarios",
          description: "Hacé clic en 'Usuarios' en el menú lateral. Solo visible para ADMIN.",
        },
        {
          title: "Creá un nuevo usuario",
          description: "Hacé clic en '+ Nuevo usuario'.",
        },
        {
          title: "Completá los datos",
          description:
            "Nombre de usuario (para el login), contraseña provisional, rol (ADMIN/ENCARGADO/CAJERA/EMPLEADO) y empleado vinculado (opcional).",
        },
        {
          title: "Guardá",
          description:
            "El usuario ya puede ingresar al sistema con sus credenciales.",
        },
      ],
      queAfecta: [
        {
          area: "equipo",
          description:
            "Los usuarios controlan quién puede acceder a qué sección del sistema.",
        },
      ],
      consejos: [
        "No compartas contraseñas. Cada persona debe tener su propia cuenta.",
        "Si un empleado deja el negocio, desactivá su usuario (no lo borres). Así se mantiene el historial de sus ventas y marcaciones.",
        "Vinculá el usuario al empleado correspondiente para que pueda usar el Fichador.",
        "Cambié la contraseña provisional en el primer login.",
      ],
      erroresComunes: [
        {
          error: "No puedo crear usuarios / No veo la sección Usuarios",
          solucion:
            "Solo el rol ADMIN puede gestionar usuarios. Si no ves la sección, tu usuario no tiene permisos suficientes.",
        },
        {
          error: "El usuario puede ver páginas que no debería",
          solucion:
            "Verificá que el rol asignado sea el correcto. CAJERA solo accede a Caja Diaria, Facturas y Fichador.",
        },
      ],
    },
    relatedSlugs: ["configuracion", "empleados"],
  },

  // ── INVENTARIO ────────────────────────────────────────────────────────────

  {
    slug: "ingredientes",
    title: "Ingredientes",
    emoji: "🧂",
    shortDescription:
      "Gestioná las materias primas del negocio con stock en tiempo real, costos y alertas de reposición.",
    difficulty: "básico",
    readTimeMinutes: 4,
    category: "Inventario",
    pageHref: "/ingredients",
    impactAreas: ["stock", "costos"],
    content: {
      queEs:
        "Los ingredientes son las materias primas que usás para elaborar tus productos. El sistema rastrea cuánto stock tenés de cada uno, calcula el costo y te avisa cuando baja del mínimo configurado.",
      paraQueSirve:
        "Una pizzería carga: harina 000 (KG, $1500/kg, stock mínimo 10kg), queso mozzarella (KG, $4500/kg), tomate (L), aceite (L), sal (KG). Cada vez que se vende una pizza, el sistema descuenta automáticamente los ingredientes que lleva.",
      pasos: [
        {
          title: "Andá a Ingredientes",
          description: "Hacé clic en 'Ingredientes' en el menú lateral, sección Inventario.",
        },
        {
          title: "Creá un nuevo ingrediente",
          description: "Hacé clic en '+ Nuevo ingrediente'.",
        },
        {
          title: "Completá el nombre y la unidad",
          description:
            "Nombre claro y específico (ej: 'Harina 000', no solo 'Harina'). Unidad: KG, G, L, ML o UNIT según corresponda.",
        },
        {
          title: "Ingresá el stock inicial y el mínimo",
          description:
            "Stock actual = cuánto tenés ahora. Stock mínimo = a partir de qué cantidad querés que el sistema te avise.",
        },
        {
          title: "Ingresá el costo por unidad",
          description:
            "Cuánto te cuesta cada unidad del ingrediente (en la misma unidad que elegiste). Esto permite calcular el costo de tus productos.",
        },
        {
          title: "Asignale un proveedor (opcional)",
          description:
            "Seleccioná de quién lo comprás. Podés crear el proveedor en el momento.",
        },
        {
          title: "Guardá",
          description: "El ingrediente queda activo y disponible para armar recetas.",
        },
      ],
      queAfecta: [
        {
          area: "stock",
          description:
            "El stock baja automáticamente cuando los pedidos pasan a 'En preparación' en Comandas.",
        },
        {
          area: "costos",
          description:
            "El costo del ingrediente alimenta el cálculo de costo de preparaciones y productos.",
        },
      ],
      consejos: [
        "Usá nombres claros y específicos: 'Queso mozzarella en bloque' en lugar de solo 'Queso'.",
        "Fijá el stock mínimo con margen suficiente para hacer el pedido antes de quedarte sin nada. Si tardás 2 días en recibir, el mínimo debería cubrir 3-4 días de uso.",
        "KG y G son compatibles entre sí. Podés cargar el ingrediente en KG y usarlo en la receta en G.",
        "Actualizá el costo regularmente cuando cambian los precios de los proveedores.",
      ],
      erroresComunes: [
        {
          error: "El stock no bajó después de una venta",
          solucion:
            "El stock se descuenta cuando el pedido pasa al estado 'EN PREPARACIÓN' en el tablero Kanban de Comandas, no al crear el pedido.",
        },
        {
          error: "El ingrediente no aparece en el formulario de un producto",
          solucion:
            "Verificá que el ingrediente esté activo (no desactivado). Los ingredientes inactivos no aparecen en las recetas.",
        },
        {
          error: "El stock quedó en negativo",
          solucion:
            "El sistema permite stock negativo con una advertencia. Usá Ajustes de Stock para corregirlo manualmente.",
        },
      ],
    },
    tourSteps: [
      {
        target: "ingredients-header",
        title: "Gestión de Ingredientes",
        content:
          "Acá administrás todas las materias primas de tu negocio. Podés ver el stock actual, las alertas de reposición y los costos.",
      },
      {
        target: "new-ingredient-btn",
        title: "Crear ingrediente",
        content:
          "Este botón abre el formulario para cargar un nuevo ingrediente con su unidad, stock, costo y proveedor.",
      },
      {
        target: "ingredients-import",
        title: "Importar desde Excel",
        content:
          "Podés cargar muchos ingredientes de una sola vez subiendo un archivo Excel. Ideal para cargar el inventario inicial.",
      },
      {
        target: "ingredients-filters",
        title: "Filtros de búsqueda",
        content:
          "Filtrá por nombre, unidad, proveedor o estado de stock (normal, bajo o crítico) para encontrar rápido lo que necesitás.",
      },
      {
        target: "ingredients-table",
        title: "Lista de ingredientes",
        content:
          "Cada fila muestra el nombre, stock actual, stock mínimo, costo y proveedor. Las filas con borde naranja están por debajo del stock mínimo.",
      },
    ],
    relatedSlugs: ["preparaciones", "productos", "ajustes-stock"],
  },

  {
    slug: "preparaciones",
    title: "Preparaciones",
    emoji: "🍲",
    shortDescription:
      "Creá recetas semielaboradas (masas, salsas, bases) que luego usás en múltiples productos.",
    difficulty: "intermedio",
    readTimeMinutes: 5,
    category: "Inventario",
    pageHref: "/preparaciones",
    impactAreas: ["stock", "costos"],
    content: {
      queEs:
        "Una preparación es un producto semielaborado que fabricás en la cocina y que luego usás en varios productos del menú. Tiene su propia receta de ingredientes, un rendimiento (cuánto produce) y un costo calculado automáticamente.",
      paraQueSirve:
        "En una pizzería: 'Masa para pizza' (harina + levadura + agua + sal → 1 masa) se usa en todas las pizzas. 'Salsa de tomate' se usa en pizzas y pastas. En lugar de cargar los 5 ingredientes en cada pizza, usás la preparación.",
      pasos: [
        {
          title: "Andá a Preparaciones",
          description: "Hacé clic en 'Preparaciones' en el menú lateral.",
        },
        {
          title: "Creá una nueva preparación",
          description: "Hacé clic en '+ Nueva preparación'.",
        },
        {
          title: "Definí el nombre y la unidad",
          description:
            "Ejemplo: Nombre = 'Masa para pizza', Unidad = UNIT (porque producís 1 masa por tanda).",
        },
        {
          title: "Ingresá el rendimiento y la merma",
          description:
            "Rendimiento = cuántas unidades produce una tanda (ej: 6 masas). Merma % = lo que se pierde en el proceso (ej: 5% por horneado).",
        },
        {
          title: "Agregá los ingredientes de la receta",
          description:
            "Hacé clic en '+ Agregar ingrediente'. Seleccioná el ingrediente, la cantidad, la unidad y el % de merma de ese ingrediente.",
        },
        {
          title: "Guardá",
          description:
            "El sistema calcula automáticamente el costo de la preparación en base a los ingredientes y la merma.",
        },
        {
          title: "Producir (fabricar) la preparación",
          description:
            "Cuando hacés la preparación en cocina, tocá 'Producir', ingresá cuántas tandas hiciste, y el sistema descuenta los ingredientes y suma el stock de la preparación.",
        },
      ],
      queAfecta: [
        {
          area: "stock",
          description:
            "Al producir: baja el stock de los ingredientes usados y sube el stock de la preparación.",
        },
        {
          area: "costos",
          description:
            "El costo calculado de la preparación alimenta el costo de los productos que la usan.",
        },
      ],
      consejos: [
        "Antes de la apertura, producí las preparaciones que vas a necesitar. El sistema mantiene el stock de cada preparación.",
        "Usá el % de merma honestamente. Si una masa pierde 8% al hornear, ponelo. Hace más preciso el costo calculado.",
        "Una preparación puede usar otras preparaciones como ingrediente. Útil para recetas de varias etapas.",
        "El costo de la preparación se muestra en la lista y se usa para calcular el margen de los productos.",
      ],
      erroresComunes: [
        {
          error: "No tengo suficiente stock para producir",
          solucion:
            "El sistema te avisa pero no bloquea. Podés producir igual y el ingrediente quedará en negativo. Corregí con un ajuste de stock o un pedido al proveedor.",
        },
        {
          error: "La preparación no aparece en la receta de un producto",
          solucion: "Verificá que la preparación esté activa.",
        },
      ],
    },
    relatedSlugs: ["ingredientes", "productos"],
  },

  {
    slug: "productos",
    title: "Productos",
    emoji: "🍕",
    shortDescription:
      "Creá y gestioná el menú completo con precios, recetas, categorías e imágenes.",
    difficulty: "intermedio",
    readTimeMinutes: 5,
    category: "Inventario",
    pageHref: "/products",
    impactAreas: ["ventas", "stock", "costos"],
    content: {
      queEs:
        "Los productos son los ítems del menú que vendés a tus clientes. Cada producto tiene precio de venta, una receta (ingredientes y/o preparaciones que lo componen), categoría e imagen. El sistema calcula el costo y el margen de ganancia automáticamente.",
      paraQueSirve:
        "Una pizzería carga: 'Pizza Mozzarella' ($5000, categoría Pizzas, receta: 1 masa + 200g queso + 150ml salsa). El sistema calcula que el costo es $1800, el margen es 64% y descuenta esos ingredientes cada vez que se vende.",
      pasos: [
        {
          title: "Andá a Productos",
          description: "Hacé clic en 'Productos' en el menú lateral.",
        },
        {
          title: "Creá un nuevo producto",
          description: "Hacé clic en '+ Nuevo producto'.",
        },
        {
          title: "Ingresá los datos básicos",
          description:
            "Nombre, SKU (código propio, ej: PIZ-001), precio de venta, moneda y categoría.",
        },
        {
          title: "Agregá la receta con ingredientes",
          description:
            "En la sección 'Ingredientes directos', hacé clic en '+ Agregar ingrediente'. Elegí el ingrediente, la cantidad, la unidad y el % de merma.",
        },
        {
          title: "Agregá preparaciones si las usa",
          description:
            "En la sección 'Preparaciones', agregá las preparaciones semielaboradas que lleva el producto (ej: masa, salsa).",
        },
        {
          title: "Revisá el margen de ganancia",
          description:
            "El sistema muestra en tiempo real el costo calculado y el margen %. Verde = ganancia, rojo = pérdida.",
        },
        {
          title: "Guardá",
          description:
            "El producto queda activo en el menú, disponible en el POS y en el menú público.",
        },
      ],
      queAfecta: [
        {
          area: "ventas",
          description:
            "Los productos activos aparecen en el POS (Comandas) y en el menú público para que los clientes los compren.",
        },
        {
          area: "stock",
          description:
            "La receta determina qué stock se descuenta cuando se vende el producto.",
        },
        {
          area: "costos",
          description:
            "El costo calculado se muestra en la lista con el margen % para ayudarte a fijar precios.",
        },
      ],
      consejos: [
        "Usá el SKU (código). Si después hacés una importación masiva de Excel, el SKU es la clave para actualizar el producto correcto.",
        "El margen en verde es ganancia; en rojo estás perdiendo plata en ese producto. Revisalos cuando cambien los costos.",
        "Si no cargás la receta, el sistema no puede descontar stock ni calcular el costo real.",
        "Subí una foto al producto. En el menú público, los productos con foto se venden mucho más.",
      ],
      erroresComunes: [
        {
          error: "El costo del producto no se actualiza cuando cambio el precio de un ingrediente",
          solucion:
            "El costo se recalcula la próxima vez que editás el producto y lo guardás. También se actualiza al importar desde Excel.",
        },
        {
          error: "El producto no aparece en el POS (Comandas)",
          solucion:
            "Verificá que el producto esté activo y que tenga precio de venta mayor a cero.",
        },
      ],
    },
    tourSteps: [
      {
        target: "products-header",
        title: "Módulo de Productos",
        content:
          "Desde acá gestionás todo el menú del negocio: precios, recetas, categorías e imágenes de cada producto.",
      },
      {
        target: "new-product-btn",
        title: "Crear nuevo producto",
        content:
          "Este botón abre el formulario completo para cargar un producto con su nombre, precio, categoría y receta de ingredientes.",
      },
      {
        target: "products-import",
        title: "Importar / Exportar Excel",
        content:
          "Podés cargar muchos productos a la vez desde un archivo Excel, o exportar todos los productos actuales para editarlos.",
      },
      {
        target: "products-filter",
        title: "Filtros",
        content:
          "Filtrá por nombre, categoría o mostrá solo los inactivos. Útil cuando tenés un menú grande.",
      },
      {
        target: "products-table",
        title: "Lista de productos",
        content:
          "Cada producto muestra su SKU, precio, costo calculado y margen de ganancia. El margen en verde es bueno; en rojo estás perdiendo plata.",
      },
    ],
    relatedSlugs: ["ingredientes", "preparaciones", "combos"],
  },

  {
    slug: "combos",
    title: "Combos",
    emoji: "🎁",
    shortDescription:
      "Creá paquetes de productos a un precio especial para aumentar el ticket promedio.",
    difficulty: "básico",
    readTimeMinutes: 3,
    category: "Inventario",
    pageHref: "/combos",
    impactAreas: ["ventas", "costos"],
    content: {
      queEs:
        "Un combo agrupa varios productos y los vende como un paquete a un precio especial (menor a la suma de los productos por separado). El sistema calcula el costo del combo y el margen automáticamente.",
      paraQueSirve:
        "'Combo Familiar': 2 pizzas grandes + 1 gaseosa a $12.000 (vs $14.500 por separado). 'Menú del día': plato + postre + bebida a precio especial.",
      pasos: [
        {
          title: "Andá a Combos",
          description: "Hacé clic en 'Combos' en el menú lateral.",
        },
        {
          title: "Creá un nuevo combo",
          description: "Hacé clic en '+ Nuevo combo'.",
        },
        {
          title: "Ingresá los datos del combo",
          description:
            "Nombre, SKU (ej: COM-001), precio de venta especial, moneda y notas descriptivas.",
        },
        {
          title: "Agregá los productos del combo",
          description:
            "Hacé clic en '+ Agregar producto', seleccioná el producto y cuántas unidades incluye el combo.",
        },
        {
          title: "Revisá el costo y margen",
          description:
            "El sistema calcula el costo total del combo y el margen de ganancia.",
        },
        {
          title: "Guardá",
          description:
            "El combo queda disponible en el POS y en el menú público.",
        },
      ],
      queAfecta: [
        {
          area: "ventas",
          description:
            "Los combos aparecen en el POS y en el menú público como una opción de compra.",
        },
        {
          area: "costos",
          description:
            "El costo del combo se calcula sumando los costos de cada producto componente.",
        },
      ],
      consejos: [
        "El precio del combo debe ser menor a la suma de los productos individuales para tener sentido comercial.",
        "Verificá que todos los productos del combo estén activos antes de crearlo.",
        "Usá combos para aumentar el ticket promedio: un cliente que iba a comprar 1 pizza puede terminar llevando el combo de 2.",
      ],
      erroresComunes: [
        {
          error: "No aparece el combo en el POS",
          solucion:
            "Verificá que el combo esté activo y que todos los productos que lo componen también estén activos.",
        },
      ],
    },
    relatedSlugs: ["productos"],
  },

  {
    slug: "descuentos-extras",
    title: "Descuentos y Adicionales",
    emoji: "🏷️",
    shortDescription:
      "Configurá descuentos automáticos por día, horario o método de pago, y toppings opcionales para los productos.",
    difficulty: "intermedio",
    readTimeMinutes: 4,
    category: "Inventario",
    pageHref: "/adicionales-y-descuentos",
    impactAreas: ["ventas", "caja"],
    content: {
      queEs:
        "Este módulo tiene dos partes: los Descuentos (que reducen el precio) y los Adicionales o Extras (toppings o modificaciones que el cliente puede pedir). Ambos son opcionales y altamente configurables.",
      paraQueSirve:
        "Descuentos: '10% OFF los martes', '5% de descuento pagando en efectivo', 'Happy Hour 15% OFF de 18 a 20hs'. Adicionales: 'Doble queso ($500 extra)', 'Sin cebolla (gratis)', 'Extra salsa BBQ ($200)'.",
      pasos: [
        {
          title: "Andá a Descuentos y Adicionales",
          description: "Hacé clic en 'Descuentos y Extras' en el menú lateral.",
        },
        {
          title: "Creá un descuento (pestaña Descuentos)",
          description:
            "Hacé clic en '+ Nuevo descuento'. Elegí el tipo (% o monto fijo), el valor y a qué aplica (todo el pedido, un producto, una categoría).",
        },
        {
          title: "Configurá condiciones opcionales",
          description:
            "Podés limitar el descuento a ciertos días de la semana, rangos horarios o métodos de pago.",
        },
        {
          title: "Creá un adicional (pestaña Adicionales)",
          description:
            "Hacé clic en '+ Nuevo adicional'. Ingresá el nombre, precio (0 si es gratis), y a qué productos aplica.",
        },
        {
          title: "Configurá si afecta el stock",
          description:
            "Si el extra descuenta un ingrediente del inventario (ej: extra queso), activá 'Afecta stock' y seleccioná el ingrediente y cantidad.",
        },
      ],
      queAfecta: [
        {
          area: "ventas",
          description:
            "Los descuentos reducen el total cobrado. Los adicionales con costo lo aumentan.",
        },
        {
          area: "caja",
          description:
            "Los descuentos y extras quedan registrados en cada venta y aparecen en los reportes.",
        },
      ],
      consejos: [
        "Desactivá los descuentos cuando dejen de estar vigentes en lugar de borrarlos. Así conservás el historial.",
        "Probá los extras en el POS antes de publicar para asegurarte de que aparecen correctamente.",
        "Los descuentos por método de pago se configuran mejor desde Configuración → Métodos de pago.",
      ],
      erroresComunes: [
        {
          error: "El descuento no se aplica en el POS",
          solucion:
            "Verificá que el descuento esté activo y que las condiciones configuradas coincidan (día, horario, método de pago).",
        },
      ],
    },
    relatedSlugs: ["configuracion", "comandas"],
  },

  {
    slug: "carga-masiva",
    title: "Carga Masiva Excel",
    emoji: "📥",
    shortDescription:
      "Importá o exportá todo el inventario (ingredientes, preparaciones, productos y combos) de una sola vez usando un archivo Excel.",
    difficulty: "intermedio",
    readTimeMinutes: 5,
    category: "Inicio",
    pageHref: "/importacion",
    impactAreas: ["stock", "costos", "ventas"],
    content: {
      queEs:
        "La Carga Masiva permite importar o exportar de una vez todos los ingredientes, preparaciones, productos y combos usando un archivo Excel con 7 hojas. Es ideal para cargar el inventario inicial o actualizar muchos precios a la vez.",
      paraQueSirve:
        "Al abrir un negocio nuevo, en lugar de cargar 50 ingredientes y 30 productos uno por uno, completás el Excel y los importás todos en 5 minutos. También podés exportar, editar precios en Excel y volver a importar.",
      pasos: [
        {
          title: "Andá a Carga Masiva",
          description:
            "Hacé clic en 'Carga Masiva' en el menú lateral, sección Inventario.",
        },
        {
          title: "Descargá la plantilla",
          description:
            "Hacé clic en 'Descargar plantilla'. Te baja un Excel con 7 hojas y ejemplos.",
        },
        {
          title: "Completá el Excel",
          description:
            "Llenás las hojas en orden: Ingredientes → Preparaciones → Preparaciones_Detalle → Productos → Productos_Detalle → Combos → Combos_Detalle.",
        },
        {
          title: "Subí el archivo",
          description:
            "Hacé clic en 'Importar archivo' y seleccioná tu Excel. El sistema lo analiza.",
        },
        {
          title: "Revisá la previsualización",
          description:
            "El sistema te muestra exactamente qué va a crear y qué va a actualizar, separado por pestañas. Si hay errores, aparecen en la pestaña 'Errores'.",
        },
        {
          title: "Confirmá la importación",
          description:
            "Si todo está bien, hacé clic en 'Confirmar importación'. Los cambios se aplican y el sistema te muestra el resumen.",
        },
      ],
      queAfecta: [
        {
          area: "stock",
          description: "Crea o actualiza el stock inicial de los ingredientes.",
        },
        {
          area: "costos",
          description:
            "Actualiza los costos de ingredientes y recalcula los costos de preparaciones y productos.",
        },
        {
          area: "ventas",
          description:
            "Los productos y combos creados quedan disponibles en el POS y en el menú público.",
        },
      ],
      consejos: [
        "Completá las hojas en orden: ingredientes primero, combos al final. Las referencias deben existir antes de usarse.",
        "Las referencias entre hojas se hacen por nombre (exactamente igual, incluyendo mayúsculas y tildes).",
        "Primero exportá los datos actuales, editá el Excel y volvé a importar. Es el ciclo más seguro.",
        "Si una fila tiene errores, esa fila se salta. Las demás se importan igual.",
      ],
      erroresComunes: [
        {
          error: "Error de referencia: ingrediente no encontrado",
          solucion:
            "El nombre del ingrediente en Preparaciones_Detalle debe ser exactamente igual al de la hoja Ingredientes (con las mismas mayúsculas y tildes).",
        },
        {
          error: "Unidad inválida",
          solucion:
            "Las unidades válidas son exactamente: KG, G, L, ML, UNIT (todas en mayúsculas).",
        },
      ],
    },
    relatedSlugs: ["ingredientes", "productos", "preparaciones"],
  },

  // ── VENTAS ────────────────────────────────────────────────────────────────

  {
    slug: "comandas",
    title: "Comandas (POS)",
    emoji: "🖥️",
    shortDescription:
      "El sistema de punto de venta donde tomás pedidos, los gestionás en cocina y cobrás al cliente.",
    difficulty: "intermedio",
    readTimeMinutes: 6,
    category: "Ventas",
    pageHref: "/comandas",
    impactAreas: ["ventas", "stock", "caja"],
    content: {
      queEs:
        "Comandas es el corazón operativo del sistema. Desde acá se toman los pedidos de los clientes, se gestionan en tiempo real a través de un tablero Kanban (Nuevo → En Preparación → Listo → Entregado) y se cobra al final.",
      paraQueSirve:
        "El mozo toma un pedido de mesa, lo carga en el sistema, la cocina lo ve en pantalla, lo prepara, lo marca como listo. El mozo lo entrega y cobra. Todo el flujo queda registrado: stock descontado, caja actualizada.",
      pasos: [
        {
          title: "Elegí la modalidad del pedido",
          description:
            "Seleccioná Salón, Para llevar o Delivery en los botones superiores.",
        },
        {
          title: "Buscá al cliente (opcional pero recomendado)",
          description:
            "Escribí el teléfono o nombre del cliente para asociar el pedido. Si es cliente nuevo, podés crearlo en el momento.",
        },
        {
          title: "Seleccioná los productos",
          description:
            "Hacé clic en los productos de la grilla. Cada clic agrega una unidad al pedido del panel derecho. También podés agregar combos.",
        },
        {
          title: "Elegí los extras (si aplica)",
          description:
            "Si el producto tiene adicionales configurados, aparece un botón para seleccionarlos.",
        },
        {
          title: "Comandar o Cobrar",
          description:
            "'Comandar' guarda el pedido sin cobrar (el cliente paga después). 'Cobrar' abre la pantalla de pago para cobrar ahora.",
        },
        {
          title: "Gestioná los pedidos en el Kanban",
          description:
            "En la pestaña 'Activos', mové los pedidos por las columnas: NUEVO → EN PREPARACIÓN (descuenta stock) → LISTO → ENTREGADO.",
        },
      ],
      queAfecta: [
        {
          area: "ventas",
          description: "Cada pedido crea una venta registrada en el sistema.",
        },
        {
          area: "stock",
          description:
            "El stock se descuenta cuando el pedido pasa a 'EN PREPARACIÓN'.",
        },
        {
          area: "caja",
          description:
            "Los pedidos cobrados suman a la caja del turno activo.",
        },
      ],
      consejos: [
        "Configurá los métodos de pago en Configuración antes de empezar a vender.",
        "Para delivery, siempre ingresá la dirección del cliente para que el sistema valide la zona y calcule el envío.",
        "El tablero Kanban en la pestaña 'Activos' es ideal en una tablet fija en cocina.",
        "Podés cobrar con múltiples métodos en la misma venta (mitad efectivo, mitad transferencia).",
      ],
      erroresComunes: [
        {
          error: "No aparecen productos en el POS",
          solucion:
            "Verificá que los productos estén activos y con precio de venta mayor a cero.",
        },
        {
          error: "El stock no bajó después del pedido",
          solucion:
            "El stock baja cuando el pedido pasa a 'EN PREPARACIÓN' en el Kanban. Si el pedido está en 'NUEVO', el stock aún no cambió.",
        },
        {
          error: "No puedo cobrar porque no hay métodos de pago",
          solucion:
            "Andá a Configuración → Métodos de pago y activá al menos uno.",
        },
      ],
    },
    relatedSlugs: ["productos", "clientes", "caja-diaria"],
  },

  {
    slug: "ventas",
    title: "Ventas",
    emoji: "📋",
    shortDescription:
      "Historial completo de ventas con gráficos, filtros por fecha y exportación a Excel.",
    difficulty: "básico",
    readTimeMinutes: 3,
    category: "Ventas",
    pageHref: "/sales",
    impactAreas: ["ventas", "reportes"],
    content: {
      queEs:
        "La sección Ventas muestra el registro histórico de todas las transacciones con filtros por período, estadísticas y gráficos de análisis. También permite exportar el listado a Excel.",
      paraQueSirve:
        "Al final del día, el dueño revisa cuánto se vendió, el ticket promedio, qué se vendió más y si hay pedidos sin cobrar. También exporta el listado mensual para el contador.",
      pasos: [
        {
          title: "Andá a Ventas",
          description: "Hacé clic en 'Ventas' en el menú lateral.",
        },
        {
          title: "Seleccioná el período",
          description:
            "Usá los botones rápidos (Hoy, Semana, Mes) o ingresá un rango personalizado.",
        },
        {
          title: "Revisá las estadísticas",
          description:
            "Las tarjetas superiores muestran: total de ventas, ingresos, ticket promedio y cancelaciones.",
        },
        {
          title: "Analizá los gráficos",
          description:
            "Ventas por día (línea de tiempo), por hora y por día de la semana.",
        },
        {
          title: "Revisá los pedidos pendientes",
          description:
            "Las filas con borde naranja son ventas sin cobrar. Verificá que no queden sin cerrar al final del turno.",
        },
        {
          title: "Exportá si necesitás",
          description:
            "Hacé clic en 'Exportar Excel' para bajar el listado del período.",
        },
      ],
      queAfecta: [
        {
          area: "ventas",
          description: "Solo lectura. Esta sección no modifica datos.",
        },
        {
          area: "reportes",
          description:
            "Los datos de ventas alimentan los Resultados mensuales y Analytics.",
        },
      ],
      consejos: [
        "Revisá las ventas pendientes de cobro (borde naranja) al cierre de cada turno.",
        "Los gráficos por hora y día de la semana te dicen cuándo hay más demanda para organizar el personal.",
        "Exportá el listado mensualmente para llevar a tu contador.",
      ],
      erroresComunes: [
        {
          error: "No veo las ventas de hoy",
          solucion:
            "Verificá que el filtro de fecha esté en 'Hoy'. El filtro por defecto puede mostrar otro período.",
        },
      ],
    },
    relatedSlugs: ["comandas", "caja-diaria", "resultados"],
  },

  {
    slug: "clientes",
    title: "Clientes",
    emoji: "👥",
    shortDescription:
      "Base de datos de clientes con historial de pedidos para fidelización y delivery.",
    difficulty: "básico",
    readTimeMinutes: 2,
    category: "Ventas",
    pageHref: "/clientes",
    impactAreas: ["ventas"],
    content: {
      queEs:
        "El módulo de Clientes guarda la información de cada comprador y su historial de pedidos. Permite identificar clientes frecuentes, buscarlos por teléfono al tomar un pedido y ofrecer atención personalizada.",
      paraQueSirve:
        "Al tomar un pedido de delivery, buscás el cliente por teléfono y ya aparece su nombre y última dirección. También podés ver cuántas veces compró y qué pidió históricamente.",
      pasos: [
        {
          title: "Andá a Clientes",
          description: "Hacé clic en 'Clientes' en el menú lateral.",
        },
        {
          title: "Buscá un cliente",
          description: "Escribí el nombre o teléfono en el buscador.",
        },
        {
          title: "Creá un nuevo cliente",
          description:
            "Hacé clic en '+ Nuevo cliente'. Ingresá nombre, teléfono (único) y datos opcionales.",
        },
        {
          title: "Consultá el historial",
          description:
            "Hacé clic en la fila del cliente para ver todos sus pedidos anteriores.",
        },
      ],
      queAfecta: [
        {
          area: "ventas",
          description:
            "Los clientes se asocian a las ventas. El historial se actualiza automáticamente.",
        },
      ],
      consejos: [
        "Usá el campo Notas para preferencias del cliente: 'sin picante', 'piso 3 sin ascensor', etc.",
        "El teléfono es el identificador único. Si dos personas tienen el mismo teléfono, el sistema los trata como la misma persona.",
        "Podés crear clientes directamente desde el POS al tomar el pedido, sin salir de la pantalla.",
      ],
      erroresComunes: [
        {
          error: "No puedo guardar el cliente: teléfono duplicado",
          solucion:
            "Ese teléfono ya está registrado para otro cliente. Buscalo por teléfono para encontrar el registro existente.",
        },
      ],
    },
    relatedSlugs: ["comandas"],
  },

  // ── FINANZAS ──────────────────────────────────────────────────────────────

  {
    slug: "caja-diaria",
    title: "Caja Diaria",
    emoji: "🏦",
    shortDescription:
      "Registrá la apertura y cierre de cada turno de trabajo con ingresos, gastos y balance.",
    difficulty: "básico",
    readTimeMinutes: 4,
    category: "Finanzas",
    pageHref: "/caja-diaria",
    impactAreas: ["caja", "ventas"],
    content: {
      queEs:
        "La Caja Diaria es la rendición de caja de cada turno. Al abrir el negocio registrás el vuelto inicial; durante el turno quedan registrados las ventas cobradas y los gastos; al cerrar, comparás el saldo esperado con el real.",
      paraQueSirve:
        "Al abrir: 'Caja inicial: $5.000'. Durante el turno: ventas suman automáticamente, gastos se registran manualmente. Al cerrar: 'Caja real: $52.300, esperado: $51.800, diferencia: $500'.",
      pasos: [
        {
          title: "Abrí la caja al inicio del turno",
          description:
            "Andá a Caja Diaria → hacé clic en 'Abrir caja' → ingresá el saldo inicial (el dinero que hay en la caja antes de empezar).",
        },
        {
          title: "Durante el turno: las ventas se registran solas",
          description:
            "Cada vez que cobrás en Comandas, el monto suma automáticamente a la caja activa.",
        },
        {
          title: "Registrá los gastos del turno",
          description:
            "Si pagaste algo en efectivo (un proveedor, un delivery, etc.), hacé clic en '+ Registrar gasto': monto, descripción, categoría.",
        },
        {
          title: "Cerrá la caja al final del turno",
          description:
            "Hacé clic en 'Cerrar caja' → ingresá el saldo final (cuánto hay físicamente) → confirmá.",
        },
        {
          title: "Revisá la diferencia",
          description:
            "El sistema muestra saldo esperado vs real. Una diferencia positiva significa que sobra dinero; negativa, que falta.",
        },
      ],
      queAfecta: [
        {
          area: "caja",
          description:
            "El turno cerrado pasa al historial de la Caja General.",
        },
        {
          area: "ventas",
          description:
            "Solo las ventas cobradas (pagadas) se reflejan en la caja.",
        },
      ],
      consejos: [
        "Abrí la caja al inicio de cada turno, no a mitad. Los datos de ventas previas al turno no quedan bien asignados.",
        "Si el negocio tiene varios turnos, abrí y cerrá una caja por turno.",
        "Anotá en las notas del cierre si hay una diferencia y su motivo.",
      ],
      erroresComunes: [
        {
          error: "Las ventas no aparecen en la caja",
          solucion:
            "Solo las ventas cobradas (con pago registrado) aparecen en la caja. Los pedidos pendientes de cobro no suman hasta que se pagan.",
        },
        {
          error: "No puedo abrir una segunda caja",
          solucion: "Tenés que cerrar el turno activo antes de abrir uno nuevo.",
        },
      ],
    },
    tourSteps: [
      {
        target: "caja-session-status",
        title: "Estado del turno",
        content:
          "Acá ves si hay un turno activo (verde) o no hay ninguno abierto (gris). Siempre abrí la caja al empezar el día.",
      },
      {
        target: "caja-open-btn",
        title: "Abrir caja",
        content:
          "Este botón inicia un nuevo turno. Tenés que ingresar el saldo inicial (el dinero en la caja antes de empezar).",
      },
      {
        target: "caja-stats",
        title: "Balance del turno",
        content:
          "Las tarjetas muestran en tiempo real: ventas cobradas, saldo de apertura, gastos del turno y balance neto.",
      },
      {
        target: "caja-expense-btn",
        title: "Registrar gasto",
        content:
          "Si pagaste algo en efectivo durante el turno (proveedor, delivery, etc.), registralo acá para que el balance sea correcto.",
      },
    ],
    relatedSlugs: ["comandas", "gastos", "resultados"],
  },

  {
    slug: "gastos",
    title: "Gastos",
    emoji: "💸",
    shortDescription:
      "Registrá todos los egresos del negocio: alquiler, servicios, personal y otros costos operativos.",
    difficulty: "básico",
    readTimeMinutes: 3,
    category: "Finanzas",
    pageHref: "/gastos",
    impactAreas: ["caja", "reportes"],
    content: {
      queEs:
        "El módulo de Gastos permite registrar todos los costos operativos que no son compras a proveedores de ingredientes: alquiler, electricidad, sueldos, publicidad, limpieza, mantenimiento, etc.",
      paraQueSirve:
        "Al final del mes sabés exactamente cuánto gastaste en alquiler ($80.000), servicios ($12.000), personal ($200.000) y otros. Eso permite calcular la rentabilidad real del negocio.",
      pasos: [
        {
          title: "Andá a Gastos",
          description: "Hacé clic en 'Gastos' en el menú lateral.",
        },
        {
          title: "Creá las categorías (si es la primera vez)",
          description:
            "Andá a la pestaña 'Categorías' y creá las categorías que usás: Alquiler, Servicios, Personal, Publicidad, Mantenimiento, Varios.",
        },
        {
          title: "Registrá un gasto",
          description:
            "Hacé clic en '+ Nuevo gasto'. Ingresá: monto, descripción, categoría, método de pago y fecha.",
        },
        {
          title: "Filtrá y revisá",
          description:
            "Usá los filtros de fecha y categoría para analizar los gastos del período.",
        },
      ],
      queAfecta: [
        {
          area: "caja",
          description:
            "Los gastos reducen el balance neto en Caja Diaria y Caja General.",
        },
        {
          area: "reportes",
          description:
            "Aparecen categorizados en los Resultados mensuales como costos operativos.",
        },
      ],
      consejos: [
        "Creá las categorías antes de empezar a cargar gastos. Después es difícil recategorizar.",
        "Categorías recomendadas: Alquiler, Servicios, Personal, Insumos, Publicidad, Mantenimiento, Varios.",
        "Cargá todos los gastos, incluso los pequeños. El detalle es la diferencia entre saber o no saber si el negocio es rentable.",
      ],
      erroresComunes: [
        {
          error: "Los gastos no aparecen en los Resultados",
          solucion:
            "Verificá que la fecha del gasto corresponda al mes que estás consultando en Resultados.",
        },
      ],
    },
    relatedSlugs: ["caja-diaria", "resultados"],
  },

  // ── PROVEEDORES ───────────────────────────────────────────────────────────

  {
    slug: "proveedores",
    title: "Proveedores",
    emoji: "🚚",
    shortDescription:
      "Gestioná los contactos de proveedores con sus condiciones de pago y los ingredientes que te abastecen.",
    difficulty: "básico",
    readTimeMinutes: 3,
    category: "Proveedores",
    pageHref: "/suppliers",
    impactAreas: ["proveedores", "costos"],
    content: {
      queEs:
        "El módulo de Proveedores almacena los datos de contacto de cada proveedor y las condiciones de pago (contra entrega, inmediato o a crédito con X días). Se vinculan con los ingredientes que suministran.",
      paraQueSirve:
        "'Molinos del Sur' → suministra Harina 000 y Harina Integral, paga a 30 días. 'Lácteos García' → queso mozzarella, contra entrega.",
      pasos: [
        {
          title: "Andá a Proveedores",
          description: "Hacé clic en 'Proveedores' en el menú lateral.",
        },
        {
          title: "Creá un nuevo proveedor",
          description: "Hacé clic en '+ Nuevo proveedor'.",
        },
        {
          title: "Completá los datos de contacto",
          description: "Nombre, teléfono, email y notas (condiciones especiales).",
        },
        {
          title: "Configurá los términos de pago",
          description:
            "Elegí: Contra entrega, Inmediato o A crédito. Si elegís crédito, ingresá cuántos días de plazo tenés.",
        },
        {
          title: "Guardá",
          description:
            "El proveedor queda disponible para asignar a ingredientes y crear pedidos y facturas.",
        },
      ],
      queAfecta: [
        {
          area: "proveedores",
          description:
            "Los proveedores se usan en Pedidos, Facturas y Cuentas Corrientes.",
        },
        {
          area: "costos",
          description:
            "El historial de costos del ingrediente se actualiza cuando recibís pedidos.",
        },
      ],
      consejos: [
        "Configurá bien los términos de pago. Eso alimenta Cuentas Corrientes con fechas de vencimiento correctas.",
        "Asignale a cada ingrediente su proveedor. Así cuando el stock baja, sabés a quién llamar.",
      ],
      erroresComunes: [
        {
          error: "No puedo asignar un proveedor al ingrediente",
          solucion:
            "El proveedor debe estar creado primero en el módulo Proveedores antes de poder asignarlo.",
        },
      ],
    },
    relatedSlugs: ["pedidos-proveedores", "ingredientes"],
  },

  {
    slug: "pedidos-proveedores",
    title: "Pedidos a Proveedores",
    emoji: "📦",
    shortDescription:
      "Creá órdenes de compra, hacé seguimiento y registrá la recepción para actualizar el stock automáticamente.",
    difficulty: "intermedio",
    readTimeMinutes: 4,
    category: "Proveedores",
    pageHref: "/pedidos-proveedores",
    impactAreas: ["stock", "proveedores"],
    content: {
      queEs:
        "El módulo de Pedidos a Proveedores (Purchase Orders) permite crear órdenes de compra con los ingredientes que necesitás, hacer seguimiento del estado del pedido y registrar la mercadería cuando llega para actualizar el stock automáticamente.",
      paraQueSirve:
        "El encargado ve que el stock de harina está bajo. Crea un pedido: 50kg de harina a $1.500/kg. Lo envía al proveedor (el sistema genera el texto para WhatsApp). Cuando llega, lo recibe en el sistema: el stock sube 50kg automáticamente.",
      pasos: [
        {
          title: "Creá el pedido",
          description:
            "Hacé clic en '+ Nuevo pedido', seleccioná el proveedor y agregá los ingredientes con cantidad y precio unitario.",
        },
        {
          title: "Enviá el pedido al proveedor",
          description:
            "Desde el detalle del pedido, hacé clic en 'Enviar pedido'. El estado cambia a ENVIADO y podés copiar el mensaje para WhatsApp.",
        },
        {
          title: "Cuando llega la mercadería: registrá la recepción",
          description:
            "Hacé clic en 'Registrar recepción'. Para cada ítem, confirmá la cantidad real recibida. Podés anotar si llegó menos de lo pedido.",
        },
        {
          title: "Confirmá",
          description:
            "El stock de cada ingrediente sube automáticamente y se registra el costo de compra.",
        },
      ],
      queAfecta: [
        {
          area: "stock",
          description:
            "Al recibir el pedido, el stock de cada ingrediente sube automáticamente.",
        },
        {
          area: "proveedores",
          description:
            "Queda un historial de pedidos por proveedor y se registra el precio de compra.",
        },
      ],
      consejos: [
        "Siempre registrá la recepción aunque sea igual a lo pedido. Es la única forma de que el stock suba automáticamente.",
        "Podés adjuntar la factura del proveedor en la sección de facturas del pedido.",
        "Revisá el Dashboard regularmente para ver qué ingredientes están por debajo del stock mínimo.",
      ],
      erroresComunes: [
        {
          error: "El stock no subió después de recibir el pedido",
          solucion:
            "Tenés que usar el botón 'Registrar recepción' desde el detalle del pedido. Si solo cambiaste el estado a RECIBIDO sin registrar recepción, el stock no se actualiza.",
        },
      ],
    },
    relatedSlugs: ["proveedores", "ingredientes", "cuentas-corrientes"],
  },

  // ── EQUIPO ────────────────────────────────────────────────────────────────

  {
    slug: "empleados",
    title: "Empleados",
    emoji: "👨‍🍳",
    shortDescription:
      "Gestioná la ficha de cada empleado con su rol, tarifa horaria y datos de contacto.",
    difficulty: "básico",
    readTimeMinutes: 3,
    category: "Equipo",
    pageHref: "/employees",
    impactAreas: ["equipo", "reportes"],
    content: {
      queEs:
        "El módulo de Empleados guarda la ficha de cada persona que trabaja en el negocio: nombre, rol, tarifa horaria y contacto. Se vincula con el Fichador para el control de presencia y con los Resultados para el cálculo de sueldos estimados.",
      paraQueSirve:
        "Registrás: 'Juan Pérez - Cocinero - $500/hora'. Juan ficha entrada/salida en el Fichador. Al final del mes, los Resultados muestran cuántas horas trabajó y el sueldo estimado.",
      pasos: [
        {
          title: "Andá a Empleados",
          description: "Hacé clic en 'Empleados' en el menú lateral.",
        },
        {
          title: "Creá un nuevo empleado",
          description: "Hacé clic en '+ Nuevo empleado'.",
        },
        {
          title: "Completá la ficha",
          description:
            "Nombre, apellido, rol (informativo), tarifa horaria, teléfono y email.",
        },
        {
          title: "Vinculalo con un usuario del sistema (opcional)",
          description:
            "Si el empleado necesita acceder al sistema (no solo fichar), creá un usuario en Usuarios y vinculálo a este empleado.",
        },
      ],
      queAfecta: [
        {
          area: "equipo",
          description:
            "El empleado aparece en el Fichador y en Horarios de Trabajo.",
        },
        {
          area: "reportes",
          description:
            "Las horas trabajadas y el sueldo estimado aparecen en los Resultados mensuales.",
        },
      ],
      consejos: [
        "Cargá la tarifa horaria real. Eso hace más preciso el cálculo de costos de personal en los Resultados.",
        "Si un empleado deja el negocio, desactiválo (no lo borres). Se preserva el historial de marcaciones.",
      ],
      erroresComunes: [
        {
          error: "El empleado no aparece en el Fichador",
          solucion:
            "Verificá que el empleado esté activo. Los empleados inactivos no aparecen en el Fichador.",
        },
      ],
    },
    relatedSlugs: ["fichador", "usuarios", "resultados"],
  },

  {
    slug: "fichador",
    title: "Fichador",
    emoji: "⏰",
    shortDescription:
      "Pantalla de control de asistencia donde los empleados registran su entrada y salida.",
    difficulty: "básico",
    readTimeMinutes: 2,
    category: "Equipo",
    pageHref: "/fichador",
    impactAreas: ["equipo", "reportes"],
    content: {
      queEs:
        "El Fichador es una pantalla pensada para estar siempre visible en el negocio (en una tablet fija), donde los empleados registran su entrada y salida tocando su nombre y un botón grande. No necesitan usuario ni contraseña.",
      paraQueSirve:
        "Juan llega a trabajar, busca su nombre en la pantalla del fichador y toca 'ENTRADA'. Al terminar su turno, toca 'SALIDA'. El sistema registra exactamente cuántas horas trabajó.",
      pasos: [
        {
          title: "Configurá una tablet o computadora fija",
          description:
            "Abrí el sistema en una tablet o PC fija en el ingreso a la cocina o al local. Dejala siempre en la pantalla del Fichador.",
        },
        {
          title: "El empleado elige su nombre",
          description: "Seleccioná el nombre en el desplegable.",
        },
        {
          title: "Tocá ENTRADA",
          description:
            "El botón verde ENTRADA registra el ingreso. Si el turno programado no empezó todavía, el botón está desactivado.",
        },
        {
          title: "Al terminar: tocá SALIDA",
          description:
            "El botón rojo SALIDA cierra la marcación y muestra cuántas horas trabajó.",
        },
      ],
      queAfecta: [
        {
          area: "equipo",
          description:
            "Crea registros de marcación que se ven en el módulo de Marcaciones.",
        },
        {
          area: "reportes",
          description:
            "Las horas trabajadas se calculan en los Resultados como costo de personal.",
        },
      ],
      consejos: [
        "Configurá los horarios de cada empleado en el módulo Horarios para que el Fichador sepa cuándo pueden entrar.",
        "Si un empleado olvidó fichar la salida, podés corregirlo en el módulo de Marcaciones.",
      ],
      erroresComunes: [
        {
          error: "El botón ENTRADA está desactivado",
          solucion:
            "El sistema no permite fichar más de 1 minuto antes del turno programado. Verificá el horario del empleado en Horarios de Trabajo.",
        },
      ],
    },
    relatedSlugs: ["empleados", "horarios"],
  },

  // ── REPORTES ──────────────────────────────────────────────────────────────

  {
    slug: "resultados",
    title: "Resultados (Balance mensual)",
    emoji: "📊",
    shortDescription:
      "Estado de resultados mensual con ingresos, costos y rentabilidad del negocio.",
    difficulty: "intermedio",
    readTimeMinutes: 4,
    category: "Reportes",
    pageHref: "/resultados",
    impactAreas: ["ventas", "caja", "reportes", "costos"],
    content: {
      queEs:
        "Los Resultados muestran el estado de resultados mensual del negocio: cuánto ingresó, cuánto se gastó en cada categoría y si el negocio ganó o perdió dinero ese mes. Es el reporte más importante para el dueño.",
      paraQueSirve:
        "A fin de mes: ingresos $850.000 (ventas + otros), costos $650.000 (materia prima + gastos + sueldos + proveedores), resultado neto: $+200.000. El negocio fue rentable.",
      pasos: [
        {
          title: "Andá a Resultados",
          description: "Hacé clic en 'Resultados' en el menú lateral.",
        },
        {
          title: "Navegá entre meses",
          description: "Usá las flechas ← → para ir al mes que querés ver.",
        },
        {
          title: "Revisá las tarjetas superiores",
          description:
            "Ingresos (verde), Costos (rojo), Resultado neto (verde si ganancia, rojo si pérdida).",
        },
        {
          title: "Analizá el desglose",
          description:
            "Ventas + otros ingresos por un lado. Costos de materia prima, gastos operativos, proveedores y sueldos por el otro.",
        },
        {
          title: "Compará con meses anteriores",
          description:
            "Navegá entre meses para detectar tendencias: ¿aumentaron los costos? ¿bajaron las ventas?",
        },
      ],
      queAfecta: [
        {
          area: "reportes",
          description:
            "Solo lectura. Consolida datos de ventas, gastos, proveedores y personal.",
        },
      ],
      consejos: [
        "Para que los Resultados sean precisos, registrá todos los gastos en Gastos y todos los pagos a proveedores en Facturas.",
        "Compartí este reporte mensualmente con tu contador.",
        "Si el resultado es negativo, analizá qué categoría de costos creció. Muchas veces es el costo de materia prima o el personal.",
      ],
      erroresComunes: [
        {
          error: "Los Resultados no coinciden con lo que me imagino",
          solucion:
            "Verificá que todos los gastos estén cargados en el módulo Gastos y que todos los pedidos estén cobrados en Comandas.",
        },
      ],
    },
    relatedSlugs: ["ventas", "gastos", "caja-diaria", "analytics"],
  },

  {
    slug: "analytics",
    title: "Analytics de Ventas",
    emoji: "📈",
    shortDescription:
      "Gráficos interactivos de ventas por período, hora, día de la semana y producto más vendido.",
    difficulty: "básico",
    readTimeMinutes: 3,
    category: "Reportes",
    pageHref: "/analytics",
    impactAreas: ["ventas", "reportes"],
    content: {
      queEs:
        "Analytics muestra gráficos interactivos para analizar las ventas: tendencias en el tiempo, picos por hora del día, días de mayor demanda, productos más vendidos y distribución de métodos de pago.",
      paraQueSirve:
        "Descubrís que el 60% de las ventas ocurren entre las 20:00 y 22:00, y que los viernes y sábados concentran el 45% de las ventas semanales. Eso te permite organizar mejor el personal y las compras.",
      pasos: [
        {
          title: "Andá a Analytics",
          description: "Hacé clic en 'Analytics' en el menú lateral.",
        },
        {
          title: "Elegí el período",
          description:
            "Usá los botones rápidos (Última semana, Mes, 3 meses, Este año) o ingresá un rango personalizado.",
        },
        {
          title: "Analizá los gráficos",
          description:
            "Ventas por día, ventas por hora, ventas por día de la semana, top productos y métodos de pago.",
        },
      ],
      queAfecta: [
        {
          area: "ventas",
          description: "Solo lectura. Los datos vienen de las ventas registradas.",
        },
        {
          area: "reportes",
          description: "Complementa los Resultados mensuales con análisis visual.",
        },
      ],
      consejos: [
        "La franja horaria de mayor venta te dice cuándo necesitás más personal. Organizá los turnos en base a eso.",
        "El gráfico de top productos ayuda a decidir qué promover más o qué discontinuar.",
        "Comparás el mismo período en distintas semanas para detectar caídas o picos estacionales.",
      ],
      erroresComunes: [
        {
          error: "Los gráficos no muestran datos",
          solucion:
            "Verificá que el período seleccionado tenga ventas registradas. Si el negocio es nuevo, puede que no haya suficientes datos aún.",
        },
      ],
    },
    relatedSlugs: ["ventas", "resultados"],
  },
];

// ── Helper functions ──────────────────────────────────────────────────────────

export function getTutorialBySlug(slug: string): TutorialModule | undefined {
  return TUTORIALS.find((t) => t.slug === slug);
}

export function getTutorialsByCategory(
  category: string
): TutorialModule[] {
  return TUTORIALS.filter((t) => t.category === category);
}

export function getAllCategories(): string[] {
  return Object.keys(TUTORIAL_CATEGORIES).filter((cat) =>
    TUTORIALS.some((t) => t.category === cat)
  );
}

export const TOTAL_TUTORIALS = TUTORIALS.length;
