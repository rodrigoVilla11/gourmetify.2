import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CreateSaleSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { buildExcel, excelResponse } from "@/utils/excel";
import { format as fmtDate } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");

    if (format === "xlsx") {
      const sales = await prisma.sale.findMany({
        include: { items: { include: { product: true } }, payments: true },
        orderBy: { date: "desc" },
      });
      const rows: (string | number | null)[][] = [];
      for (const sale of sales) {
        for (const item of sale.items) {
          rows.push([
            fmtDate(sale.date, "dd/MM/yyyy"),
            fmtDate(sale.date, "HH:mm"),
            item.product.name,
            item.quantity.toNumber(),
            sale.total.toNumber(),
            sale.notes ?? "",
          ]);
        }
        if (sale.items.length === 0) {
          rows.push([fmtDate(sale.date, "dd/MM/yyyy"), fmtDate(sale.date, "HH:mm"), "", "", sale.total.toNumber(), sale.notes ?? ""]);
        }
      }
      const buf = buildExcel(["Fecha", "Hora", "Producto", "Cantidad", "Total", "Notas"], rows, "Ventas");
      return excelResponse(buf, "ventas.xlsx");
    }

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const isPaidParam = searchParams.get("isPaid");
    const orderStatusParam = searchParams.get("orderStatus");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(200, parseInt(searchParams.get("limit") ?? "20"));
    const skip = (page - 1) * limit;

    const where = {
      ...(from || to ? {
        date: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
        },
      } : {}),
      ...(isPaidParam !== null ? { isPaid: isPaidParam === "true" } : {}),
      ...(orderStatusParam ? { orderStatus: { in: orderStatusParam.split(",") } } : {}),
    };

    const [total, sales] = await prisma.$transaction([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          date: true,
          total: true,
          notes: true,
          isPaid: true,
          orderType: true,
          orderStatus: true,
          startedAt: true,
          readyAt: true,
          deliveredAt: true,
          deliveryAddress: true,
          customerId: true,
          customerName: true,
          customer: { select: { id: true, name: true, phone: true } },
          items: {
            select: {
              productId: true,
              quantity: true,
              product: { select: { name: true } },
            },
          },
          payments: { select: { paymentMethod: true, amount: true } },
          combos: {
            select: {
              id: true,
              quantity: true,
              price: true,
              combo: { select: { name: true } },
            },
          },
        },
        orderBy: { date: "desc" },
      }),
    ]);

    return NextResponse.json({ data: sales, meta: { total, page, limit } });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener ventas", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, notes, customerId, customerName, orderType, deliveryAddress, items, comboItems, payments } = CreateSaleSchema.parse(body);
    const isPaid = !!(payments && payments.length > 0);

    // ── Step 1: Load products to compute total ─────────────────────────────────
    const productIds = items.map((i) => i.productId);
    const products = productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds }, isActive: true },
          select: { id: true, salePrice: true },
        })
      : [];

    if (productIds.length > 0 && products.length !== productIds.length) {
      const foundIds = products.map((p) => p.id);
      const missing = productIds.filter((id) => !foundIds.includes(id));
      return NextResponse.json(
        { error: `Productos no encontrados o inactivos: ${missing.join(", ")}`, code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // ── Step 1b: Load combos to compute total ──────────────────────────────────
    const comboIds = (comboItems ?? []).map((c) => c.comboId);
    const combos = comboIds.length > 0
      ? await prisma.combo.findMany({
          where: { id: { in: comboIds }, isActive: true },
          select: { id: true, salePrice: true },
        })
      : [];

    if (comboIds.length > 0 && combos.length !== comboIds.length) {
      const foundIds = combos.map((c) => c.id);
      const missing = comboIds.filter((id) => !foundIds.includes(id));
      return NextResponse.json(
        { error: `Combos no encontrados o inactivos: ${missing.join(", ")}`, code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // ── Step 2: Compute sale total ─────────────────────────────────────────────
    const productMap = new Map(products.map((p) => [p.id, p]));
    const comboMap = new Map(combos.map((c) => [c.id, c]));

    const saleTotal =
      items.reduce((sum, item) => {
        const product = productMap.get(item.productId)!;
        return sum + Number(product.salePrice) * item.quantity;
      }, 0) +
      (comboItems ?? []).reduce((sum, ci) => {
        const combo = comboMap.get(ci.comboId)!;
        return sum + Number(combo.salePrice) * ci.quantity;
      }, 0);

    // ── Step 3: Create sale (NO stock deduction — happens on EN_PREPARACION) ───
    const sale = await prisma.sale.create({
      data: {
        date: date ? new Date(date) : new Date(),
        notes,
        total: saleTotal,
        customerId: customerId ?? null,
        customerName: customerName ?? null,
        orderType,
        orderStatus: "NUEVO",
        isPaid,
        deliveryAddress: deliveryAddress ?? null,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
        ...(comboItems && comboItems.length > 0
          ? {
              combos: {
                create: comboItems.map((ci) => ({
                  comboId: ci.comboId,
                  quantity: ci.quantity,
                  price: Number(comboMap.get(ci.comboId)!.salePrice) * ci.quantity,
                })),
              },
            }
          : {}),
        ...(payments && payments.length > 0
          ? {
              payments: {
                create: payments.map((p) => ({
                  paymentMethod: p.paymentMethod,
                  amount: p.amount,
                })),
              },
            }
          : {}),
      },
    });

    revalidateTag("dashboard");
    return NextResponse.json({ sale }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: e.issues[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "Error al registrar venta", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
