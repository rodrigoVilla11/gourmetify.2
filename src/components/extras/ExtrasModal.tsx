"use client";
import { useState, useEffect } from "react";

export type ExtraConfig = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  isFree: boolean;
  appliesTo: string;
  productIds?: string[] | null;
  categoryIds?: string[] | null;
  maxQuantity?: number | null;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  extras: ExtraConfig[];
  onConfirm: (selectedExtras: { extraId: string; quantity: number }[]) => void;
  primaryColor?: string;
  confirmLabel?: string;
}

function fmt(n: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export function ExtrasModal({ isOpen, onClose, productName, extras, onConfirm, primaryColor = "#111827", confirmLabel = "Agregar" }: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) setQuantities({});
  }, [isOpen]);

  if (!isOpen) return null;

  const setQty = (extraId: string, qty: number) => {
    const extra = extras.find((e) => e.id === extraId);
    const max = extra?.maxQuantity ?? 99;
    setQuantities((prev) => {
      const next = { ...prev };
      if (qty <= 0) { delete next[extraId]; return next; }
      next[extraId] = Math.min(qty, max);
      return next;
    });
  };

  const total = extras.reduce((sum, e) => {
    const qty = quantities[e.id] ?? 0;
    return sum + (e.isFree ? 0 : e.price * qty);
  }, 0);

  const selected = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([extraId, quantity]) => ({ extraId, quantity }));

  const handleConfirm = () => {
    onConfirm(selected);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto bg-white rounded-t-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: "80vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Adicionales</h3>
            <p className="text-xs text-gray-500 mt-0.5">{productName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Cerrar">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Extras list */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(80vh - 140px)" }}>
          {extras.map((extra) => {
            const qty = quantities[extra.id] ?? 0;
            return (
              <div key={extra.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{extra.name}</p>
                  {extra.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{extra.description}</p>
                  )}
                  <p className="text-xs font-semibold mt-0.5" style={{ color: extra.isFree ? "#059669" : "#374151" }}>
                    {extra.isFree ? "Sin cargo" : fmt(extra.price)}
                  </p>
                </div>
                {/* Stepper */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40"
                    onClick={() => setQty(extra.id, qty - 1)}
                    disabled={qty === 0}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="w-5 text-center text-sm font-semibold text-gray-900">{qty}</span>
                  <button
                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40"
                    onClick={() => setQty(extra.id, qty + 1)}
                    disabled={extra.maxQuantity != null && qty >= extra.maxQuantity}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white">
          <button
            onClick={handleConfirm}
            className="w-full h-12 rounded-2xl text-white font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            <span>{confirmLabel}</span>
            {total > 0 && <span className="opacity-80">· {fmt(total)}</span>}
          </button>
        </div>
      </div>
    </>
  );
}

/** Helper: filter extras applicable to a product */
export function getExtrasForProduct(
  product: { id: string; categoryId?: string | null },
  allExtras: ExtraConfig[],
): ExtraConfig[] {
  return allExtras.filter((e) => {
    if (e.appliesTo === "ALL") return true;
    if (e.appliesTo === "PRODUCTS") return e.productIds?.includes(product.id) ?? false;
    if (e.appliesTo === "CATEGORIES") return product.categoryId ? (e.categoryIds?.includes(product.categoryId) ?? false) : false;
    return false;
  });
}
