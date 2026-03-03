"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { formatQty } from "@/utils/units";
import { formatCurrency } from "@/utils/currency";
import type { Unit } from "@/types";
import { PAYMENT_METHOD_LABELS } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface SaleDetail {
  id: string;
  date: string;
  total: string;
  notes: string | null;
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
}

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sales/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSale(data);
        setLoading(false);
      });
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

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detalle de Venta</h1>
          <p className="text-sm text-gray-500 mt-1">
            {format(new Date(sale.date), "PPPP 'a las' HH:mm", { locale: es })}
          </p>
        </div>
        <Link href="/sales">
          <Button variant="secondary">← Volver</Button>
        </Link>
      </div>

      <Card title="Productos vendidos">
        <div className="divide-y divide-gray-100">
          {sale.items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between py-3">
              <span className="font-medium text-gray-900">{item.product.name}</span>
              <div className="flex items-center gap-3">
                <Badge variant="info">{parseFloat(item.quantity)}× unidades</Badge>
                <span className="text-sm text-gray-500">
                  {formatCurrency(parseFloat(item.product.salePrice) * parseFloat(item.quantity), "ARS")}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Total</span>
          <span className="text-lg font-bold text-gray-900">{formatCurrency(sale.total, "ARS")}</span>
        </div>
        {sale.notes && (
          <p className="mt-4 text-sm text-gray-500 italic">Nota: {sale.notes}</p>
        )}
      </Card>

      {sale.combos && sale.combos.length > 0 && (
        <Card title="Combos vendidos">
          <div className="divide-y divide-gray-100">
            {sale.combos.map((sc) => (
              <div key={sc.id} className="flex items-center justify-between py-3">
                <span className="font-medium text-gray-900">{sc.combo.name}</span>
                <div className="flex items-center gap-3">
                  <Badge variant="success">{parseFloat(sc.quantity)}× unidades</Badge>
                  <span className="text-sm text-gray-500">{formatCurrency(sc.price, "ARS")}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {sale.payments && sale.payments.length > 0 && (
        <Card title="Pagos">
          <div className="divide-y divide-gray-100">
            {sale.payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between py-3">
                <span className="text-gray-700">
                  {PAYMENT_METHOD_LABELS[payment.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ?? payment.paymentMethod}
                </span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(payment.amount, "ARS")}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Total pagado</span>
            <span className="font-bold text-gray-900">
              {formatCurrency(
                sale.payments.reduce((s, p) => s + parseFloat(p.amount), 0).toString(),
                "ARS"
              )}
            </span>
          </div>
        </Card>
      )}

      <Card title="Movimientos de stock generados">
        <div className="divide-y divide-gray-100">
          {sale.stockMovements.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Sin movimientos (producto sin receta)</p>
          ) : (
            sale.stockMovements.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <span className="text-gray-700">{m.ingredient.name}</span>
                <Badge variant={parseFloat(m.delta) < 0 ? "danger" : "success"}>
                  {parseFloat(m.delta) > 0 ? "+" : ""}
                  {formatQty(m.delta, m.ingredient.unit)}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
