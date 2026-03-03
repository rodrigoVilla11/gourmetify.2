import { NextRequest, NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Archivo no enviado", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const url = await uploadToCloudinary(buffer);

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Error al subir imagen", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
