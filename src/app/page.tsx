import Link from "next/link";

// ── Brand colors ──────────────────────────────────────────────────────────────
const BRAND = "#0f2f26";
const BRAND_MID = "#1a4d3f";

// ── Data ──────────────────────────────────────────────────────────────────────

const PAIN_POINTS = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    title: "Stock descontrolado",
    desc: "No sabés cuánto hay, cuándo reponer ni cuánto estás perdiendo por merma.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
      </svg>
    ),
    title: "Costos mal calculados",
    desc: "El precio de venta no refleja el costo real. Perdés plata sin darte cuenta.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
      </svg>
    ),
    title: "Caja poco clara",
    desc: "No tenés claridad sobre qué entró, qué salió y cómo cerró el día.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    title: "Pedidos mal gestionados",
    desc: "Las comandas se pierden, se confunden o llegan tarde. El cliente lo nota.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197" />
      </svg>
    ),
    title: "Sin control del equipo",
    desc: "No sabés quién fichó, qué horas trabajó ni cómo se distribuye la carga.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "Cero métricas útiles",
    desc: "Tomás decisiones de precio, stock y personal a intuición, sin datos reales.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Configurás tu negocio",
    desc: "Definís métodos de pago, zonas de delivery, modalidades y horarios de atención. Todo en minutos.",
  },
  {
    n: "02",
    title: "Cargás tu menú y recetas",
    desc: "Ingresás ingredientes, preparaciones, productos y combos con sus costos reales. El sistema calcula solo.",
  },
  {
    n: "03",
    title: "Operás con orden",
    desc: "Tomás comandas, gestionás la caja, registrás gastos y controlás stock en tiempo real.",
  },
  {
    n: "04",
    title: "Crecés con datos",
    desc: "Analizás rentabilidad, costos, ventas y resultados para tomar mejores decisiones cada mes.",
  },
];

const MODULES = [
  { emoji: "📦", title: "Stock en tiempo real", desc: "Control de ingredientes con alertas de stock bajo y predicciones de consumo." },
  { emoji: "🍽️", title: "Productos y recetas", desc: "BOM completo con costo automático, ingredientes y preparaciones vinculadas." },
  { emoji: "🥣", title: "Preparaciones", desc: "Gestioná bases, salsas y elaboraciones con sus propios costos e insumos." },
  { emoji: "🎁", title: "Combos", desc: "Armá combos de productos con precio diferenciado y control de stock integrado." },
  { emoji: "📋", title: "Comandas y KDS", desc: "Sistema de pedidos con Kanban, monitor de cocina y delivery integrado." },
  { emoji: "💳", title: "Ventas y cobros", desc: "Cobros con múltiples medios de pago, descuentos y adición de extras por venta." },
  { emoji: "💰", title: "Caja diaria", desc: "Apertura, cierre, gastos y balance del turno en un solo lugar." },
  { emoji: "📊", title: "Analytics y resultados", desc: "Rentabilidad por producto, costos reales y tendencias de ventas." },
  { emoji: "🚛", title: "Proveedores y compras", desc: "Pedidos de compra, facturas y seguimiento de proveedores." },
  { emoji: "👥", title: "Equipo y fichador", desc: "Alta de empleados, registro de entrada/salida y horarios de trabajo." },
  { emoji: "📥", title: "Carga masiva Excel", desc: "Importá y exportá ingredientes, productos y combos desde una planilla." },
  { emoji: "🎓", title: "Tutoriales internos", desc: "El sistema te enseña a usarlo con guías paso a paso y tours interactivos." },
];

const TRUST_ITEMS = [
  { emoji: "🎯", title: "Pensado para gastronomía real", desc: "No es un sistema genérico adaptado. Está construido específicamente para restaurantes, deliveries, cafeterías y dark kitchens." },
  { emoji: "🔗", title: "Todo conectado", desc: "Stock, costos, ventas, caja y equipo se actualizan en tiempo real. Una sola carga, múltiples impactos." },
  { emoji: "📈", title: "Orientado a rentabilidad", desc: "Cada función apunta a que conozcas mejor tus costos, mejores tus márgenes y crezcas con datos." },
  { emoji: "⚡", title: "Fácil de adoptar", desc: "Onboarding guiado, tutoriales integrados y soporte para que tu equipo lo use desde el día uno." },
];

// ── Components ────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight" style={{ color: BRAND }}>
          Gourmetify
        </span>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <a href="#funcionalidades" className="hover:text-gray-900 transition-colors">Funcionalidades</a>
          <a href="#como-funciona" className="hover:text-gray-900 transition-colors">Cómo funciona</a>
          <a href="#para-quien" className="hover:text-gray-900 transition-colors">Para quién</a>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
          >
            Iniciar sesión
          </Link>
          <a
            href="#contacto"
            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-sm"
            style={{ backgroundColor: BRAND }}
          >
            Solicitar demo
          </a>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative pt-32 pb-24 px-6 overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(15,47,38,0.07) 0%, transparent 70%)`,
        }}
      />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(${BRAND} 1px, transparent 1px), linear-gradient(90deg, ${BRAND} 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Tag */}
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border"
          style={{ color: BRAND, borderColor: "rgba(15,47,38,0.2)", backgroundColor: "rgba(15,47,38,0.05)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Software de gestión gastronómica
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.05] tracking-tight">
          Gestioná todo tu negocio{" "}
          <span
            className="relative inline-block"
            style={{ color: BRAND }}
          >
            gastronómico
            <svg
              className="absolute -bottom-2 left-0 w-full"
              viewBox="0 0 300 12"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M2 9C50 3 100 1 150 4 200 7 250 3 298 9"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.4"
              />
            </svg>
          </span>{" "}
          en un solo lugar.
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Stock, costos, comandas, caja, equipo y resultados. Todo conectado, en tiempo real,
          pensado para que tu negocio funcione con orden y crezca con datos.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="#contacto"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white shadow-lg transition-all hover:opacity-90 hover:-translate-y-0.5"
            style={{ backgroundColor: BRAND }}
          >
            Solicitar demo gratuita
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
          <a
            href="#funcionalidades"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all hover:-translate-y-0.5"
          >
            Ver funcionalidades
          </a>
        </div>

        {/* Social proof mini */}
        <p className="text-sm text-gray-400">
          Restaurantes · Deliveries · Cafeterías · Dark kitchens · Sushi · Fast food
        </p>
      </div>

      {/* Dashboard mockup */}
      <div className="max-w-5xl mx-auto mt-16 px-4">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200/80 bg-white">

          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 border-b border-gray-200">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 mx-3 h-4 bg-white border border-gray-200 rounded-md" />
          </div>

          {/* Dashboard layout */}
          <div className="flex bg-gray-50" style={{ minHeight: 400 }}>

            {/* Sidebar — hidden on mobile, visible md+ */}
            <aside
              className="hidden md:flex flex-col shrink-0 w-44 border-r border-gray-200/80"
              style={{ backgroundColor: BRAND }}
            >
              {/* Logo */}
              <div className="px-4 py-3 border-b border-white/10">
                <span className="text-sm font-bold text-white tracking-tight">Gourmetify</span>
              </div>
              {/* Nav items */}
              <nav className="flex-1 px-2 py-3 space-y-0.5">
                {[
                  { label: "Dashboard", active: true },
                  { label: "Ingredientes", active: false },
                  { label: "Productos", active: false },
                  { label: "Preparaciones", active: false },
                  { label: "Comandas", active: false },
                  { label: "Caja diaria", active: false },
                  { label: "Gastos", active: false },
                  { label: "Resultados", active: false },
                  { label: "Empleados", active: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={
                      item.active
                        ? { backgroundColor: "rgba(255,255,255,0.15)", color: "white" }
                        : { color: "rgba(255,255,255,0.5)" }
                    }
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.active ? "white" : "rgba(255,255,255,0.3)" }} />
                    {item.label}
                  </div>
                ))}
              </nav>
              {/* User footer */}
              <div className="px-3 py-3 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/20 shrink-0" />
                  <div className="space-y-0.5">
                    <div className="h-2 bg-white/30 rounded w-16" />
                    <div className="h-1.5 bg-white/20 rounded w-10" />
                  </div>
                </div>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 p-4 space-y-3 overflow-hidden">

              {/* Page header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 w-24 bg-gray-800 rounded-md" />
                  <div className="h-2.5 w-32 bg-gray-300 rounded mt-1" />
                </div>
                <div className="h-6 w-24 bg-white border border-gray-200 rounded-lg" />
              </div>

              {/* KPI cards — 2×2 on mobile, 4 cols on md+ */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {/* Ingredientes */}
                <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: "rgba(15,47,38,0.08)" }}>
                    <svg className="w-4 h-4" style={{ color: BRAND }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">48</p>
                    <p className="text-[10px] text-gray-500 font-medium">Ingredientes</p>
                    <p className="text-[10px] font-semibold text-amber-600">3 bajo mínimo</p>
                  </div>
                </div>

                {/* Productos */}
                <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: "rgba(15,47,38,0.08)" }}>
                    <svg className="w-4 h-4" style={{ color: BRAND }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">34</p>
                    <p className="text-[10px] text-gray-500 font-medium">Productos</p>
                  </div>
                </div>

                {/* Ventas hoy */}
                <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-blue-50">
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-4.125-2.625-3.375 2.25-3.375-2.25L4.5 21.75V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">23</p>
                    <p className="text-[10px] text-gray-500 font-medium">Ventas hoy</p>
                  </div>
                </div>

                {/* Recaudado hoy */}
                <div className="rounded-xl border p-3 shadow-sm flex items-center gap-2.5 bg-emerald-600 border-emerald-600">
                  <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-emerald-500">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">$84.500</p>
                    <p className="text-[10px] font-medium text-emerald-100">Recaudado hoy</p>
                  </div>
                </div>
              </div>

              {/* Kanban status */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-900">Pedidos activos</span>
                  <span className="text-[10px] font-medium text-emerald-600">Ver comandas →</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-blue-700">8</p>
                      <p className="text-[10px] font-medium text-blue-500">Nuevos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-700">5</p>
                      <p className="text-[10px] font-medium text-amber-500">En prep.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-emerald-700">3</p>
                      <p className="text-[10px] font-medium text-emerald-500">Listos</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2-col bottom — hidden on mobile */}
              <div className="hidden sm:grid grid-cols-2 gap-2.5">
                {/* Low stock */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-gray-900">Stock bajo</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">3</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-medium">Ver →</span>
                  </div>
                  {[
                    { name: "Harina 000", pct: 20, critical: false },
                    { name: "Tomate perita", pct: 8, critical: true },
                    { name: "Mozzarella", pct: 35, critical: false },
                  ].map((ing) => (
                    <div key={ing.name} className="px-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium text-gray-700">{ing.name}</span>
                        <span className={`text-[9px] font-semibold ${ing.critical ? "text-red-500" : "text-amber-500"}`}>
                          {ing.pct}%
                        </span>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full">
                        <div
                          className={`h-1 rounded-full ${ing.critical ? "bg-red-400" : "bg-amber-400"}`}
                          style={{ width: `${ing.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top products */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                    <span className="text-[11px] font-semibold text-gray-900">Más vendidos</span>
                    <span className="text-[10px] text-emerald-600 font-medium">Ver →</span>
                  </div>
                  {[
                    { name: "Pizza Napolitana", sales: 12, pct: 100 },
                    { name: "Hamburguesa Clásica", sales: 9, pct: 75 },
                    { name: "Combo Sushi 16pz", sales: 6, pct: 50 },
                  ].map((p, i) => (
                    <div key={p.name} className="px-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-bold ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : "text-amber-600"}`}>
                          #{i + 1}
                        </span>
                        <span className="text-[10px] font-medium text-gray-700 truncate">{p.name}</span>
                        <span className="ml-auto text-[9px] text-gray-400 shrink-0">{p.sales} uds</span>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full">
                        <div className="h-1 rounded-full" style={{ width: `${p.pct}%`, backgroundColor: BRAND }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PainPoints() {
  return (
    <section className="py-24 px-6 bg-gray-950">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-emerald-400 mb-3 uppercase tracking-widest">El problema</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            Dirigir un negocio gastronómico<br className="hidden sm:block" /> sin las herramientas correctas es agotador.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PAIN_POINTS.map((p) => (
            <div
              key={p.title}
              className="p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white mb-4">
                {p.icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-1">{p.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: BRAND }}>
            Cómo funciona
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Empezás en minutos.<br className="hidden sm:block" /> Operás con orden desde el primer día.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step, i) => (
            <div key={step.n} className="relative">
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-5 left-full w-full h-px bg-gradient-to-r from-gray-200 to-transparent -translate-x-6 z-0" />
              )}
              <div className="relative z-10">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold text-white mb-5 shadow-md"
                  style={{ backgroundColor: BRAND }}
                >
                  {step.n}
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Modules() {
  return (
    <section id="funcionalidades" className="py-24 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: BRAND }}>
            Módulos
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Todo lo que necesitás,<br className="hidden sm:block" /> en un solo sistema.
          </h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto text-sm leading-relaxed">
            Cada módulo fue diseñado para resolver un problema real de la operación gastronómica.
            Y todos hablan entre sí.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((m) => (
            <div
              key={m.title}
              className="group bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all duration-200"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
                style={{ backgroundColor: "rgba(15,47,38,0.07)" }}
              >
                {m.emoji}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1.5 group-hover:text-[#0f2f26] transition-colors">
                {m.title}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForOwners() {
  return (
    <section id="para-quien" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: BRAND }}>
              Para dueños y encargados
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
              No es solo un punto de venta.<br />
              Es tu herramienta para tomar mejores decisiones.
            </h2>
            <p className="text-gray-500 leading-relaxed">
              Gourmetify está pensado para los que dirigen el negocio: dueños, socios y encargados
              que necesitan visibilidad real sobre costos, rentabilidad y operación, sin depender
              de planillas ni suposiciones.
            </p>
            <ul className="space-y-3">
              {[
                "Sabés cuánto cuesta cada plato antes de ponerle precio",
                "Ves qué producto rinde más y cuál te come el margen",
                "Controlás caja, gastos y proveedores desde el mismo lugar",
                "Tu equipo trabaja con orden y vos tenés los datos que importan",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" style={{ color: BRAND }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <a
              href="#contacto"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: BRAND }}
            >
              Quiero ver cómo funciona
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
          </div>

          {/* Stat cards visual */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Módulos integrados", value: "12+", sub: "Todo conectado" },
              { label: "Control de costos", value: "Real", sub: "Por ingrediente" },
              { label: "Toma de decisiones", value: "Con datos", sub: "No con intuición" },
              { label: "Operación", value: "Ordenada", sub: "Desde el día uno" },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
              >
                <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
                <p className="text-xs font-semibold text-gray-800">{card.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section className="py-24 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: BRAND }}>
            Por qué Gourmetify
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Construido para la gastronomía real.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.title}
              className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-4">{item.emoji}</div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="contacto" className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div
          className="rounded-3xl p-12 text-center space-y-7 relative overflow-hidden"
          style={{ backgroundColor: BRAND }}
        >
          {/* Background texture */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 80% 20%, white 0%, transparent 50%), radial-gradient(circle at 20% 80%, white 0%, transparent 50%)`,
            }}
          />

          <div className="relative z-10 space-y-6">
            <p className="text-emerald-300 text-sm font-semibold uppercase tracking-widest">
              Empezá hoy
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              Tu negocio merece más<br className="hidden sm:block" /> que una planilla de Excel.
            </h2>
            <p className="text-white/70 text-base max-w-xl mx-auto leading-relaxed">
              Pedí una demo gratuita y te mostramos cómo Gourmetify se adapta a tu operación.
              Sin compromiso, sin tecnicismos.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="https://wa.me/5491100000000?text=Hola!%20Me%20interesa%20conocer%20Gourmetify"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold bg-white transition-all hover:bg-gray-100 hover:-translate-y-0.5"
                style={{ color: BRAND }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Hablar por WhatsApp
              </a>
              <a
                href="mailto:hola@gourmetify.app"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white border border-white/30 hover:bg-white/10 transition-all hover:-translate-y-0.5"
              >
                Enviar un mail
              </a>
            </div>
            <p className="text-white/40 text-xs">
              También podés iniciar sesión si ya tenés una cuenta.{" "}
              <Link href="/login" className="underline hover:text-white/70 transition-colors">
                Entrar al sistema →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 py-10 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
        <span className="font-bold text-base" style={{ color: BRAND }}>Gourmetify</span>
        <p>© {new Date().getFullYear()} Gourmetify. Todos los derechos reservados.</p>
        <Link href="/login" className="hover:text-gray-600 transition-colors">
          Acceso al sistema →
        </Link>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <Hero />
        <PainPoints />
        <HowItWorks />
        <Modules />
        <ForOwners />
        <Trust />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
