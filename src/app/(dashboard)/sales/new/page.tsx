"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/utils/currency";
import type { Currency, PaymentMethod } from "@/types";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/types";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  salePrice: string;
  currency: Currency;
  isActive: boolean;
}

interface Combo {
  id: string;
  name: string;
  sku: string | null;
  salePrice: string;
  currency: Currency;
  isActive: boolean;
}

interface SaleRow {
  productId: string;
  quantity: number;
}

interface ComboRow {
  comboId: string;
  quantity: number;
}

interface PaymentRow {
  paymentMethod: PaymentMethod;
  amount: string;
}

interface Warning {
  ingredientId?: string;
  preparationId?: string;
  name: string;
  currentStock: number;
  required: number;
  deficit: number;
}

export default function NewSalePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [rows, setRows] = useState<SaleRow[]>([{ productId: "", quantity: 1 }]);
  const [comboRows, setComboRows] = useState<ComboRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/products?isActive=true").then((r) => r.json()),
      fetch("/api/combos?isActive=true").then((r) => r.json()),
    ]).then(([prodData, comboData]) => {
      setProducts(prodData.data ?? []);
      setCombos(comboData.data ?? []);
    });
  }, []);

  // Regular product rows
  const addRow = () => setRows((prev) => [...prev, { productId: "", quantity: 1 }]);
  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));
  const updateRow = (index: number, field: keyof SaleRow, value: string | number) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));

  // Combo rows
  const addComboRow = () => setComboRows((prev) => [...prev, { comboId: "", quantity: 1 }]);
  const removeComboRow = (index: number) => setComboRows((prev) => prev.filter((_, i) => i !== index));
  const updateComboRow = (index: number, field: keyof ComboRow, value: string | number) =>
    setComboRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));

  // Payments
  const addPayment = () =>
    setPayments((prev) => [...prev, { paymentMethod: "EFECTIVO", amount: "" }]);
  const removePayment = (index: number) =>
    setPayments((prev) => prev.filter((_, i) => i !== index));
  const updatePayment = (index: number, field: keyof PaymentRow, value: string) =>
    setPayments((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));

  const productsTotal = rows.reduce((sum, row) => {
    const product = products.find((p) => p.id === row.productId);
    if (!product) return sum;
    return sum + parseFloat(product.salePrice) * row.quantity;
  }, 0);

  const combosTotal = comboRows.reduce((sum, row) => {
    const combo = combos.find((c) => c.id === row.comboId);
    if (!combo) return sum;
    return sum + parseFloat(combo.salePrice) * row.quantity;
  }, 0);

  const saleTotal = productsTotal + combosTotal;
  const paymentsTotal = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setWarnings([]);

    const validRows = rows.filter((r) => r.productId && r.quantity > 0);
    const validComboRows = comboRows.filter((r) => r.comboId && r.quantity > 0);

    if (validRows.length === 0 && validComboRows.length === 0) {
      setError("Agregá al menos un producto o combo con cantidad válida.");
      return;
    }

    const ids = validRows.map((r) => r.productId);
    if (new Set(ids).size !== ids.length) {
      setError("No podés agregar el mismo producto dos veces. Sumá las cantidades.");
      return;
    }

    const validPayments = payments
      .filter((p) => p.paymentMethod && parseFloat(p.amount) > 0)
      .map((p) => ({ paymentMethod: p.paymentMethod, amount: parseFloat(p.amount) }));

    setSaving(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: date || undefined,
          notes: notes || undefined,
          items: validRows,
          ...(validComboRows.length > 0 ? { comboItems: validComboRows } : {}),
          ...(validPayments.length > 0 ? { payments: validPayments } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al registrar venta");
        return;
      }
      setSuccessId(data.sale.id);
      setWarnings(data.warnings ?? []);
      if (data.warnings?.length === 0) {
        router.push("/sales");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const usedProductIds = rows.map((r) => r.productId).filter(Boolean);
  const usedComboIds = comboRows.map((r) => r.comboId).filter(Boolean);

  if (successId) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Venta registrada</h1>
        <Alert variant="success" title="Venta guardada correctamente">
          Los ingredientes fueron descontados automáticamente del stock.
        </Alert>
        {warnings.length > 0 && (
          <Alert variant="warning" title={`Stock bajo en ${warnings.length} item(s)`}>
            <ul className="mt-2 space-y-1">
              {warnings.map((w, i) => (
                <li key={i} className="text-sm">
                  <strong>{w.name}</strong>: requerido {w.required.toFixed(3)}, disponible{" "}
                  {w.currentStock.toFixed(3)}, déficit {w.deficit.toFixed(3)}
                </li>
              ))}
            </ul>
          </Alert>
        )}
        <div className="flex gap-3">
          <Button onClick={() => router.push("/sales")}>Ver ventas</Button>
          <Button variant="secondary" onClick={() => router.push(`/sales/${successId}`)}>
            Ver detalle
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Venta</h1>
        <p className="text-sm text-gray-500 mt-1">El stock se descuenta automáticamente al confirmar</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Products + Combos */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Productos vendidos</h2>
            <div className="flex gap-2">
              {combos.length > 0 && (
                <Button type="button" size="sm" variant="secondary" onClick={addComboRow}>
                  + Combo
                </Button>
              )}
              <Button type="button" size="sm" variant="secondary" onClick={addRow}>
                + Producto
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {/* Regular product rows */}
            {rows.map((row, index) => {
              const selectedProduct = products.find((p) => p.id === row.productId);
              const availableProducts = products.filter(
                (p) => !usedProductIds.includes(p.id) || p.id === row.productId
              );

              return (
                <div key={`prod-${index}`} className="flex items-end gap-3">
                  <div className="flex-1">
                    <Select
                      label={index === 0 && comboRows.length === 0 ? "Producto" : undefined}
                      value={row.productId}
                      onChange={(e) => updateRow(index, "productId", e.target.value)}
                      placeholder="Seleccionar producto..."
                    >
                      {availableProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.sku ? `(${p.sku})` : ""} — {formatCurrency(p.salePrice, p.currency)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-32">
                    <Input
                      label={index === 0 && comboRows.length === 0 ? "Cant." : undefined}
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={row.quantity}
                      onChange={(e) => updateRow(index, "quantity", parseFloat(e.target.value))}
                    />
                  </div>
                  {selectedProduct && (
                    <div className="pb-2">
                      <Badge variant="info">
                        {formatCurrency(parseFloat(selectedProduct.salePrice) * row.quantity, selectedProduct.currency)}
                      </Badge>
                    </div>
                  )}
                  {(rows.length > 1 || comboRows.length > 0) && (
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="pb-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}

            {/* Combo rows */}
            {comboRows.length > 0 && (
              <div className="pt-2 border-t border-dashed border-gray-200">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Combos</p>
                {comboRows.map((row, index) => {
                  const selectedCombo = combos.find((c) => c.id === row.comboId);
                  const availableCombos = combos.filter(
                    (c) => !usedComboIds.includes(c.id) || c.id === row.comboId
                  );
                  return (
                    <div key={`combo-${index}`} className="flex items-end gap-3 mb-3">
                      <div className="flex-1">
                        <Select
                          value={row.comboId}
                          onChange={(e) => updateComboRow(index, "comboId", e.target.value)}
                          placeholder="Seleccionar combo..."
                        >
                          {availableCombos.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.sku ? `(${c.sku})` : ""} — {formatCurrency(c.salePrice, c.currency)}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={row.quantity}
                          onChange={(e) => updateComboRow(index, "quantity", parseInt(e.target.value))}
                        />
                      </div>
                      {selectedCombo && (
                        <div className="pb-2">
                          <Badge variant="success">
                            {formatCurrency(parseFloat(selectedCombo.salePrice) * row.quantity, selectedCombo.currency)}
                          </Badge>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeComboRow(index)}
                        className="pb-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {saleTotal > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end items-center gap-2">
              <span className="text-sm text-gray-500">Total calculado:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(saleTotal, "ARS")}</span>
            </div>
          )}
        </div>

        {/* Payments */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Forma de pago</h2>
              <p className="text-xs text-gray-400 mt-0.5">Opcional — podés registrar uno o más métodos</p>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={addPayment}>
              + Agregar método
            </Button>
          </div>

          {payments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">Sin métodos de pago registrados</p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment, index) => (
                <div key={index} className="flex items-end gap-3">
                  <div className="flex-1">
                    {index === 0 && (
                      <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
                    )}
                    <select
                      value={payment.paymentMethod}
                      onChange={(e) => updatePayment(index, "paymentMethod", e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-40">
                    <Input
                      label={index === 0 ? "Monto" : undefined}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={payment.amount}
                      onChange={(e) => updatePayment(index, "amount", e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePayment(index)}
                    className="pb-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {saleTotal > 0 && (
                <div className="mt-2 pt-3 border-t border-gray-100 flex justify-between items-center text-sm">
                  <span className="text-gray-500">Suma de pagos:</span>
                  <span
                    className={
                      Math.abs(paymentsTotal - saleTotal) < 0.01
                        ? "font-semibold text-emerald-600"
                        : "font-semibold text-amber-600"
                    }
                  >
                    {formatCurrency(paymentsTotal, "ARS")}
                    {Math.abs(paymentsTotal - saleTotal) >= 0.01 && (
                      <span className="ml-2 text-xs font-normal text-amber-500">
                        (diferencia: {formatCurrency(Math.abs(paymentsTotal - saleTotal), "ARS")})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Detalles</h2>
          <Input
            label="Fecha (opcional)"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            helper="Por defecto se usa la fecha y hora actual"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Mesa 5, delivery, etc."
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" isLoading={saving} size="lg">
            Confirmar venta
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => router.push("/sales")}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
