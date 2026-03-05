import { printTicketHtml, ticketFmt } from "@/utils/print";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const PM_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia", DEBITO: "Débito",
  CREDITO: "Crédito", ONLINE: "Mercado Pago", RAPPI: "Rappi", MERCADO_ENVIOS: "Mercado Envíos",
};

const ORDER_TYPE_LABEL: Record<string, string> = {
  SALON: "Salón", TAKEAWAY: "Para llevar", DELIVERY: "Delivery",
};

export type KitchenTicketData = {
  orderId: string;
  date: Date;
  orderType: string;
  customerName: string | null;
  deliveryAddress: string | null;
  items: { name: string; quantity: number }[];
  notes: string | null;
};

export type ReceiptData = {
  orderId: string;
  date: Date;
  orderType: string;
  customerName: string | null;
  items: { name: string; quantity: number; unitPrice: number }[];
  total: number;
  payments: { method: string; amount: number }[];
};

/** Prints a kitchen ticket (no prices) */
export function printKitchenTicket(data: KitchenTicketData) {
  const shortId = data.orderId.slice(-6).toUpperCase();
  const timeStr = format(data.date, "HH:mm", { locale: es });
  const orderTypeLabel = ORDER_TYPE_LABEL[data.orderType] ?? data.orderType;

  const itemsHtml = data.items
    .map(i => `<div class="row"><span class="name">${i.quantity}× ${i.name}</span></div>`)
    .join("");

  const html = `
    <div class="center bold large">── COCINA ──</div>
    <div class="spacer"></div>
    <div class="row">
      <span class="bold">#${shortId}</span>
      <span>${timeStr} · ${orderTypeLabel}</span>
    </div>
    ${data.customerName ? `<div class="small">${data.customerName}</div>` : ""}
    ${data.deliveryAddress ? `<div class="small">📍 ${data.deliveryAddress}</div>` : ""}
    <hr class="divider" />
    ${itemsHtml}
    ${data.notes ? `<hr class="divider" /><div class="small">Notas: ${data.notes}</div>` : ""}
    <div class="spacer"></div>
  `;

  printTicketHtml(html);
}

/** Prints a customer receipt (with prices + payments) */
export function printReceipt(data: ReceiptData) {
  const shortId = data.orderId.slice(-6).toUpperCase();
  const dateStr = format(data.date, "dd/MM/yyyy HH:mm", { locale: es });
  const orderTypeLabel = ORDER_TYPE_LABEL[data.orderType] ?? data.orderType;

  const itemsHtml = data.items
    .map(i => {
      const sub = i.unitPrice * i.quantity;
      const priceSpan = sub > 0 ? `<span>${ticketFmt(sub)}</span>` : "";
      return `<div class="row"><span class="name">${i.quantity}× ${i.name}</span>${priceSpan}</div>`;
    })
    .join("");

  const paymentsHtml = data.payments
    .map(p => `<div class="row"><span>${PM_LABELS[p.method] ?? p.method}</span><span>${ticketFmt(p.amount)}</span></div>`)
    .join("");

  const html = `
    <div class="center bold large">RECIBO</div>
    <div class="center small">#${shortId} · ${orderTypeLabel}</div>
    <div class="center small">${dateStr}</div>
    ${data.customerName ? `<div class="center small">${data.customerName}</div>` : ""}
    <hr class="divider" />
    ${itemsHtml}
    <hr class="divider" />
    <div class="row bold"><span>TOTAL</span><span>${ticketFmt(data.total)}</span></div>
    <hr class="divider" />
    ${paymentsHtml}
    <hr class="divider" />
    <div class="center spacer"></div>
    <div class="center bold">¡Gracias!</div>
    <div class="spacer"></div>
  `;

  printTicketHtml(html);
}
