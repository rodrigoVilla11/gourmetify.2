"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { formatQty } from "@/utils/units";
import { formatCurrency } from "@/utils/currency";
import type { Unit } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ORDER_STATUS_INFO: Record<string, { label: string; className: string }> = {
  NUEVO:          { label: "Nuevo",          className: "bg-blue-100 text-blue-700" },
  EN_PREPARACION: { label: "En preparación", className: "bg-amber-100 text-amber-700" },
  LISTO:          { label: "Listo",          className: "bg-emerald-100 text-emerald-700" },
  ENTREGADO:      { label: "Entregado",      className: "bg-gray-100 text-gray-600" },
  CANCELADO:      { label: "Cancelado",      className: "bg-rose-100 text-rose-600" },
};

const PM_LABELS: Record<string, { label: string; icon: string }> = {
  EFECTIVO:       { label: "Efectivo",       icon: "💵" },
  TRANSFERENCIA:  { label: "Transferencia",  icon: "🏦" },
  DEBITO:         { label: "Débito",         icon: "💳" },
  CREDITO:        { label: "Crédito",        icon: "💳" },
  ONLINE:         { label: "Mercado Pago",   icon: "📱" },
  RAPPI:          { label: "Rappi",          icon: "🛵" },
  MERCADO_ENVIOS: { label: "Mercado Envíos", icon: "📦" },
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  SALON:    "Salón",
  TAKEAWAY: "Para llevar",
  DELIVERY: "Delivery",
};

interface SaleDetail {
  id: string;
  date: string;
  total: string;
  notes: string | null;
  orderType: string;
  orderStatus: string;
  isPaid: boolean;
  deliveryAddress: string | null;
  deliveryFee: string | null;
  extrasAmount: string | null;
  discountAmount: string | null;
  customerId: string | null;
  customerName: string | null;
  customer: { id: string; name: string; phone: string | null; email: string | null; address: string | null } | null;
  items: { productId: string; quantity: string; product: { name: string; salePrice: string } }[];
  combos: { id: string; comboId: string; quantity: string; price: string; combo: { id: string; name: string } }[];
  payments: { id: string; paymentMethod: string; amount: string }[];
  stockMovements: {
    id: string;
    delta: string;
    type: string;
    reason: string | null;
    ingredient: { name: string; unit: Unit };
  }[];
  preparationMovements: {
    id: string;
    delta: string;
    type: string;
    reason: string | null;
    preparation: { id: string; name: string; unit: Unit };
  }[];
}

function Section({ title, children, badge }: { title: string; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        {badge}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sale, setSale]     = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sales/${id}`)
      .then((r) => r.json())
      .then((data) => { setSale(data); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Spinner />
      </div>
    );
  }

  if (!sale) {
    return <p className="text-gray-500">Venta no encontrada</p>;
  }

  const statusInfo = ORDER_STATUS_INFO[sale.orderStatus];
  const shortId = sale.id.slice(-6).toUpperCase();

  // Compute pricing breakdown
  const itemsSubtotal = sale.items.reduce((s, i) => s + parseFloat(i.product.salePrice) * parseFloat(i.quantity), 0)
    + sale.combos.reduce((s, c) => s + parseFloat(c.price), 0);
  const extrasAmount   = sale.extrasAmount   ? parseFloat(sale.extrasAmount)   : 0;
  const discountAmount = sale.discountAmount ? parseFloat(sale.discountAmount) : 0;
  const deliveryFee    = sale.deliveryFee    ? parseFloat(sale.deliveryFee)    : 0;
  const showBreakdown  = extrasAmount > 0 || discountAmount > 0 || deliveryFee > 0;
  // For paid orders, ground truth is payment sum (handles pre-fix records where
  // sale.total wasn't updated when discount was applied at cobrar time)
  const paymentsSum = sale.payments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const realTotal = sale.isPaid && paymentsSum > 0 ? paymentsSum : parseFloat(sale.total) - discountAmount;

  return (
    <div className="max-w-2xl space-y-5">
      {/* ── Header ── */}
      <div>
        <Link href="/sales" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-3">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Ventas
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">Venta #{shortId}</h1>
              {statusInfo && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
              )}
              {sale.orderType !== "SALON" && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
                  {ORDER_TYPE_LABELS[sale.orderType] ?? sale.orderType}
                </span>
              )}
              {!sale.isPaid && sale.orderStatus !== "CANCELADO" && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                  Sin cobrar
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {format(new Date(sale.date), "EEEE d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(realTotal.toString(), "ARS")}</p>
            {!sale.isPaid && <p className="text-xs text-amber-600 mt-0.5">Pendiente de pago</p>}
          </div>
        </div>
      </div>

      {/* ── Cliente ── */}
      {(sale.customer || sale.customerName) && (
        <Section title="Cliente">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{sale.customer?.name ?? sale.customerName}</p>
              {sale.customer?.phone && <p className="text-sm text-gray-500">{sale.customer.phone}</p>}
              {sale.customer?.email && <p className="text-xs text-gray-400">{sale.customer.email}</p>}
              {!sale.customer && sale.customerName && (
                <p className="text-xs text-gray-400">Sin cuenta registrada</p>
              )}
            </div>
            {sale.customer && (
              <Link href={`/clientes`} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                Ver perfil →
              </Link>
            )}
          </div>
        </Section>
      )}

      {/* ── Dirección delivery ── */}
      {sale.deliveryAddress && (
        <Section title="Dirección de entrega">
          <div className="flex items-start gap-2.5">
            <svg className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-gray-700">{sale.deliveryAddress}</p>
          </div>
        </Section>
      )}

      {/* ── Artículos ── */}
      <Section
        title="Artículos"
        badge={
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
            {sale.items.length + sale.combos.length} ítem{sale.items.length + sale.combos.length !== 1 ? "s" : ""}
          </span>
        }
      >
        <div className="divide-y divide-gray-50 -mx-4 -mt-3">
          {sale.items.map((item) => {
            const lineTotal = parseFloat(item.product.salePrice) * parseFloat(item.quantity);
            return (
              <div key={item.productId} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                    {parseFloat(item.quantity)}
                  </span>
                  <span className="font-medium text-gray-900">{item.product.name}</span>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-xs text-gray-400">{formatCurrency(item.product.salePrice, "ARS")} c/u</span>
                  <span className="text-sm font-semibold text-gray-900 w-20 text-right">{formatCurrency(lineTotal.toString(), "ARS")}</span>
                </div>
              </div>
            );
          })}
          {sale.combos.map((sc) => (
            <div key={sc.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-600">
                  {parseFloat(sc.quantity)}
                </span>
                <div>
                  <span className="font-medium text-gray-900">{sc.combo.name}</span>
                  <span className="ml-1.5 text-[10px] font-semibold text-violet-600 bg-violet-50 rounded px-1 py-0.5">Combo</span>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(sc.price, "ARS")}</span>
            </div>
          ))}
        </div>

        {/* Pricing breakdown */}
        <div className="border-t border-gray-100 mt-0 pt-3 space-y-1.5">
          {showBreakdown && (
            <>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span>
                <span>{formatCurrency(itemsSubtotal.toString(), "ARS")}</span>
              </div>
              {extrasAmount > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Adicionales</span>
                  <span className="text-gray-700">+{formatCurrency(extrasAmount.toString(), "ARS")}</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Envío</span>
                  <span className="text-gray-700">+{formatCurrency(deliveryFee.toString(), "ARS")}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>Descuento</span>
                  <span>−{formatCurrency(discountAmount.toString(), "ARS")}</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-1.5" />
            </>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(realTotal.toString(), "ARS")}</span>
          </div>
        </div>

        {sale.notes && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <svg className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <p className="text-xs text-amber-800 italic">{sale.notes}</p>
          </div>
        )}
      </Section>

      {/* ── Pagos ── */}
      {sale.payments && sale.payments.length > 0 && (
        <Section title="Pagos">
          <div className="divide-y divide-gray-50 -mx-4 -mt-3">
            {sale.payments.map((payment) => {
              const pm = PM_LABELS[payment.paymentMethod] ?? { label: payment.paymentMethod, icon: "💰" };
              return (
                <div key={payment.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{pm.icon}</span>
                    <span className="text-sm text-gray-700 font-medium">{pm.label}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{formatCurrency(payment.amount, "ARS")}</span>
                </div>
              );
            })}
          </div>
          {sale.payments.length > 1 && (
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
              <span className="text-xs text-gray-500">Total pagado</span>
              <span className="font-bold text-gray-900">
                {formatCurrency(
                  sale.payments.reduce((s, p) => s + parseFloat(p.amount), 0).toString(),
                  "ARS"
                )}
              </span>
            </div>
          )}
        </Section>
      )}

      {/* ── Movimientos de stock ── */}
      {(() => {
        const totalMoves = sale.stockMovements.length + (sale.preparationMovements?.length ?? 0);
        return (
          <Section
            title="Movimientos de stock"
            badge={
              totalMoves > 0
                ? <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{totalMoves}</span>
                : undefined
            }
          >
            {totalMoves === 0 ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Sin movimientos (productos sin receta asignada)
              </div>
            ) : (
              <div className="divide-y divide-gray-50 -mx-4 -mt-3">
                {sale.preparationMovements?.map((m) => {
                  const delta = parseFloat(m.delta);
                  return (
                    <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                        <span className="text-sm text-gray-700">{m.preparation.name}</span>
                        <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 rounded px-1.5 py-0.5">Preparación</span>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${delta < 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                        {delta > 0 ? "+" : ""}{formatQty(m.delta, m.preparation.unit)}
                      </span>
                    </div>
                  );
                })}
                {sale.stockMovements.map((m) => {
                  const delta = parseFloat(m.delta);
                  return (
                    <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                        <span className="text-sm text-gray-700">{m.ingredient.name}</span>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${delta < 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                        {delta > 0 ? "+" : ""}{formatQty(m.delta, m.ingredient.unit)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        );
      })()}
    </div>
  );
}
