"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Table, Column } from "@/components/ui/Table";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/Badge";
import { downloadExcel } from "@/utils/excel";
import { formatCurrency } from "@/utils/currency";

interface SaleItem { productId: string; quantity: string; product: { name: string } }
interface Sale {
  id: string;
  date: string;
  total: string;
  notes: string | null;
  items: SaleItem[];
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/sales?limit=50");
    const { data, meta } = await res.json();
    setSales(data);
    setTotal(meta.total);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const columns: Column<Sale>[] = [
    {
      key: "date",
      header: "Fecha",
      render: (s) => format(new Date(s.date), "dd/MM/yyyy HH:mm", { locale: es }),
    },
    {
      key: "items",
      header: "Productos",
      render: (s) => (
        <div className="flex flex-wrap gap-1">
          {s.items.map((item) => (
            <Badge key={item.productId} variant="info">
              {parseFloat(item.quantity)}× {item.product.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "total",
      header: "Total",
      render: (s) => (
        <span className="font-semibold text-gray-900">{formatCurrency(s.total, "ARS")}</span>
      ),
    },
    {
      key: "notes",
      header: "Notas",
      className: "hidden sm:table-cell",
      render: (s) => s.notes ?? <span className="text-gray-400">—</span>,
    },
    {
      key: "actions",
      header: "",
      render: (s) => (
        <Link href={`/sales/${s.id}`}>
          <Button size="sm" variant="ghost">Ver detalle</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
          <p className="text-sm text-gray-500 mt-1">{total} ventas registradas</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => downloadExcel("/api/sales?format=xlsx", "ventas.xlsx")}>
            Exportar Excel
          </Button>
          <Link href="/sales/new">
            <Button>+ Nueva Venta</Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          data={sales}
          isLoading={loading}
          rowKey={(s) => s.id}
          emptyMessage="No hay ventas registradas"
        />
      </div>
    </div>
  );
}
