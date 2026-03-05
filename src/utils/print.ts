/**
 * Opens a new window with the content of a hidden div and triggers print.
 * The styles are inlined so the printed ticket looks correct on any printer,
 * including 80mm thermal printers.
 */
export function printTicketHtml(html: string) {
  const win = window.open("", "_blank", "width=420,height=700");
  if (!win) return;

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Ticket</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Courier New", Courier, monospace;
    font-size: 12px;
    width: 80mm;
    padding: 6px 8px;
    color: #000;
    background: #fff;
  }
  .center { text-align: center; }
  .right  { text-align: right; }
  .bold   { font-weight: bold; }
  .large  { font-size: 15px; }
  .small  { font-size: 10px; }
  .divider { border: none; border-top: 1px dashed #000; margin: 5px 0; }
  .row { display: flex; justify-content: space-between; gap: 4px; }
  .row .name { flex: 1; }
  .spacer { height: 6px; }
  @media print {
    @page { margin: 0; size: 80mm auto; }
    body { width: 80mm; }
  }
</style>
</head>
<body>${html}</body>
</html>`);

  win.document.close();
  // Small delay to ensure styles are applied before printing
  setTimeout(() => {
    win.focus();
    win.print();
    win.close();
  }, 150);
}

/** Formats $ amount for ticket */
export function ticketFmt(n: number) {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
