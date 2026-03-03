import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateTimeLogSchema } from "@/lib/validators";
import { ZodError } from "zod";

type Params = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const data = UpdateTimeLogSchema.parse(body);

    const checkIn = data.checkIn ? new Date(data.checkIn) : undefined;
    const checkOut = data.checkOut ? new Date(data.checkOut) : data.checkOut === null ? null : undefined;

    // Recalculate duration if both times are provided
    let duration: number | undefined;
    if (checkIn && checkOut) {
      duration = Math.round(((checkOut.getTime() - checkIn.getTime()) / 3_600_000) * 100) / 100;
    }

    const timeLog = await prisma.timeLog.update({
      where: { id: params.id },
      data: {
        ...(checkIn !== undefined ? { checkIn } : {}),
        ...(checkOut !== undefined ? { checkOut } : {}),
        ...(duration !== undefined ? { duration } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: { employee: true },
    });

    return NextResponse.json(timeLog);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al actualizar fichaje", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await prisma.timeLog.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar fichaje", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
