"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { formatCurrency } from "@/utils/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PAYMENT_TERMS_LABELS, INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/types";
import type { InvoiceStatus, PaymentMethod } from "@/types";

interface SupplierPayment {
  id: string;
  amount: string;
  currency: string;
  date: string;
  paymentMethod: string;
  notes: string | null;
  invoiceId: string | null;
}

interface SupplierInvoice {
  id: string;
  amount: string;
  currency: string;
  date: string;
  dueDate: string | null;
  invoiceNumber: string | null;
  status: string;
  imageUrl: string | null;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  onHand: string;
}

interface SupplierDetail {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  paymentTerms: string;
  creditDays: number;
  ingredients: Ingredient[];
  invoices: SupplierInvoice[];
  supplierPayments: SupplierPayment[];
}

const STATUS_BADGE: Record<string, "danger" | "warning" | "success" | "neutral"> = {
  PENDING: "danger",
  PARTIAL: "warning",
  PAID: "success",
};

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSupplier = useCallback(async () => {
    const res = await fetch(`/api/suppliers/${id}`);
    const data = await res.json();
    setSupplier(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchSupplier(); }, [fetchSupplier]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Spinner />
      </div>
    );
  }

  if (!supplier) {
    return <p className="text-gray-500">Proveedor no encontrado</p>;
  }

  const totalInvoiced = supplier.invoices.reduce((s, inv) => s + parseFloat(inv.amount), 0);
  const totalPaid = supplier.supplierPayments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const balance = totalInvoiced - totalPaid;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Proveedor</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/suppliers">
            <Button variant="secondary">← Volver</Button>
          </Link>
          <Link href={`/facturas-proveedores?supplierId=${supplier.id}`}>
            <Button variant="secondary">Ver facturas</Button>
          </Link>
        </div>
      </div>

      {/* Info card */}
      <Card title="Información">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-2">
          {supplier.phone && (
            <div>
              <p className="text-xs text-gray-500">Teléfono</p>
              <p className="text-sm font-medium text-gray-900">{supplier.phone}</p>
            </div>
          )}
          {supplier.email && (
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{supplier.email}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500">Condición de pago</p>
            <p className="text-sm font-medium text-gray-900">
              {PAYMENT_TERMS_LABELS[supplier.paymentTerms as keyof typeof PAYMENT_TERMS_LABELS] ?? supplier.paymentTerms}
              {supplier.paymentTerms === "CREDIT" && supplier.creditDays > 0
                ? ` (${supplier.creditDays} días)`
                : ""}
            </p>
          </div>
          {supplier.notes && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500">Notas</p>
              <p className="text-sm text-gray-700 italic">{supplier.notes}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Cuenta corriente */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total facturado</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalInvoiced, "ARS")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total pagado</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalPaid, "ARS")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Saldo pendiente</p>
          <p className={`text-xl font-bold ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {formatCurrency(balance, "ARS")}
          </p>
        </div>
      </div>

      {/* Invoices */}
      {supplier.invoices.length > 0 && (
        <Card title="Facturas">
          <div className="divide-y divide-gray-100">
            {supplier.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {inv.invoiceNumber ? `#${inv.invoiceNumber}` : "Sin número"} ·{" "}
                    {format(new Date(inv.date), "dd/MM/yyyy", { locale: es })}
                  </p>
                  {inv.dueDate && (
                    <p className="text-xs text-gray-400">
                      Vence: {format(new Date(inv.dueDate), "dd/MM/yyyy", { locale: es })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900">{formatCurrency(inv.amount, "ARS")}</span>
                  <Badge variant={STATUS_BADGE[inv.status] ?? "neutral"}>
                    {INVOICE_STATUS_LABELS[inv.status as InvoiceStatus] ?? inv.status}
                  </Badge>
                  <Link href={`/facturas-proveedores/${inv.id}`}>
                    <Button size="sm" variant="ghost">Ver</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Payments */}
      {supplier.supplierPayments.length > 0 && (
        <Card title="Pagos registrados">
          <div className="divide-y divide-gray-100">
            {supplier.supplierPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {PAYMENT_METHOD_LABELS[payment.paymentMethod as PaymentMethod] ?? payment.paymentMethod}
                  </p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(payment.date), "dd/MM/yyyy", { locale: es })}
                    {payment.notes && ` · ${payment.notes}`}
                  </p>
                </div>
                <span className="font-semibold text-emerald-600">{formatCurrency(payment.amount, "ARS")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ingredients */}
      {supplier.ingredients.length > 0 && (
        <Card title={`Ingredientes (${supplier.ingredients.length})`}>
          <div className="divide-y divide-gray-100">
            {supplier.ingredients.map((ing) => (
              <div key={ing.id} className="flex items-center justify-between py-3">
                <Link
                  href={`/ingredients/${ing.id}`}
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  {ing.name}
                </Link>
                <Badge variant="neutral">
                  {parseFloat(ing.onHand).toFixed(2)} {ing.unit}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
